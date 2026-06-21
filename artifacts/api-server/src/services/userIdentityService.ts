import {
  db,
  subscriptionsTable,
  userIdentityAliasesTable,
  type Subscription,
} from "@workspace/db";
import { and, eq, ne, sql } from "drizzle-orm";
import { adminAuth } from "../lib/firebase-admin";
import { logger } from "../lib/logger";
import { isPremiumNow } from "./subscription-premium-gate.js";
import { recordBillingAuditEvent } from "./subscriptionStateService.js";

type DbExec = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type IdentityAuthContext = {
  userId: string;
  email?: string | null;
  emailVerified?: boolean;
  provider?: string | null;
};

export function normalizeIdentityEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

export async function resolveSubscriptionOwnerUserId(
  firebaseUid: string,
  dbExec: DbExec = db,
): Promise<string> {
  const rows = await dbExec
    .select({ internalUserId: userIdentityAliasesTable.internalUserId })
    .from(userIdentityAliasesTable)
    .where(eq(userIdentityAliasesTable.firebaseUid, firebaseUid))
    .limit(1);
  return rows[0]?.internalUserId ?? firebaseUid;
}

async function findSubscription(userId: string, dbExec: DbExec = db): Promise<Subscription | null> {
  const rows = await dbExec
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

async function upsertAlias(input: {
  firebaseUid: string;
  internalUserId: string;
  email: string | null;
  normalizedEmail: string | null;
  provider: string | null | undefined;
  emailVerified: boolean;
}, dbExec: DbExec = db): Promise<void> {
  const now = new Date();
  await dbExec
    .insert(userIdentityAliasesTable)
    .values({
      firebaseUid: input.firebaseUid,
      internalUserId: input.internalUserId,
      email: input.email,
      normalizedEmail: input.normalizedEmail,
      provider: input.provider || "unknown",
      emailVerified: input.emailVerified,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: userIdentityAliasesTable.firebaseUid,
      set: {
        internalUserId: input.internalUserId,
        email: input.email,
        normalizedEmail: input.normalizedEmail,
        provider: input.provider || "unknown",
        emailVerified: input.emailVerified,
        updatedAt: now,
        lastSeenAt: now,
      },
    });
}

async function findPremiumOwnerByVerifiedEmail(
  normalizedEmail: string,
  currentUserId: string,
  dbExec: DbExec = db,
): Promise<string | null> {
  const aliases = await dbExec
    .select({
      internalUserId: userIdentityAliasesTable.internalUserId,
      firebaseUid: userIdentityAliasesTable.firebaseUid,
    })
    .from(userIdentityAliasesTable)
    .where(
      and(
        eq(userIdentityAliasesTable.normalizedEmail, normalizedEmail),
        eq(userIdentityAliasesTable.emailVerified, true),
        ne(userIdentityAliasesTable.firebaseUid, currentUserId),
      ),
    );

  const candidates = new Set<string>();
  for (const alias of aliases) {
    candidates.add(alias.internalUserId);
    candidates.add(alias.firebaseUid);
  }

  for (const candidate of candidates) {
    if (!candidate || candidate === currentUserId) continue;
    const sub = await findSubscription(candidate, dbExec);
    if (sub && isPremiumNow(sub)) return candidate;
  }

  return null;
}

async function findPremiumOwnerByFirebaseEmailLookup(
  normalizedEmail: string,
  currentUserId: string,
  dbExec: DbExec = db,
): Promise<string | null> {
  try {
    const userRecord = await adminAuth().getUserByEmail(normalizedEmail);
    if (!userRecord.uid || userRecord.uid === currentUserId) return null;
    const sub = await findSubscription(userRecord.uid, dbExec);
    if (!sub || !isPremiumNow(sub)) return null;

    await upsertAlias({
      firebaseUid: userRecord.uid,
      internalUserId: userRecord.uid,
      email: normalizedEmail,
      normalizedEmail,
      provider: "firebase_email_lookup",
      emailVerified: userRecord.emailVerified === true,
    }, dbExec);
    return userRecord.uid;
  } catch (err) {
    logger.debug(
      {
        email: normalizedEmail,
        error: err instanceof Error ? err.message : String(err),
      },
      "[identity] Firebase email lookup did not find a premium owner",
    );
    return null;
  }
}

export async function recoverPremiumOwnerForAuth(
  auth: IdentityAuthContext,
): Promise<string> {
  const normalizedEmail = normalizeIdentityEmail(auth.email);
  const emailVerified = auth.emailVerified === true;
  const recover = async (dbExec: DbExec): Promise<string> => {
    const currentOwner = await resolveSubscriptionOwnerUserId(auth.userId, dbExec);
    const currentSub = await findSubscription(currentOwner, dbExec);

    if (emailVerified && normalizedEmail) {
      await upsertAlias({
        firebaseUid: auth.userId,
        internalUserId: currentOwner,
        email: normalizedEmail,
        normalizedEmail,
        provider: auth.provider,
        emailVerified: true,
      }, dbExec);
    }

    if (currentSub && isPremiumNow(currentSub)) return currentOwner;
    if (!emailVerified || !normalizedEmail) return currentOwner;

    const aliasOwner =
      await findPremiumOwnerByVerifiedEmail(normalizedEmail, auth.userId, dbExec) ??
      await findPremiumOwnerByFirebaseEmailLookup(normalizedEmail, auth.userId, dbExec);

    if (!aliasOwner) return currentOwner;

    await upsertAlias({
      firebaseUid: auth.userId,
      internalUserId: aliasOwner,
      email: normalizedEmail,
      normalizedEmail,
      provider: auth.provider,
      emailVerified: true,
    }, dbExec);

    return aliasOwner;
  };

  const aliasOwner = normalizedEmail && emailVerified
    ? await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${normalizedEmail}))`);
        return recover(tx);
      })
    : await recover(db);

  if (aliasOwner === auth.userId) return aliasOwner;

  await recordBillingAuditEvent({
    userId: aliasOwner,
    source: "identity_recovery",
    eventName: "premium_identity_recovered",
    reason: "verified_email_alias",
    metadata: {
      recoveredFirebaseUid: auth.userId,
      normalizedEmail,
      provider: auth.provider ?? "unknown",
    },
  });

  logger.info(
    {
      ownerUserId: aliasOwner,
      recoveredFirebaseUid: auth.userId,
      provider: auth.provider ?? "unknown",
    },
    "[identity] recovered premium entitlement for verified email alias",
  );

  return aliasOwner;
}
