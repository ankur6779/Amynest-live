/**
 * One-shot reset for Play-certification tester accounts that were backend-granted
 * or still mirrored as RevenueCat premium. The previous revoke script only cleared
 * `provider=manual`, so a Play-synced row kept showing "AmyNest Premium is active".
 *
 * Idempotent via billing_audit_events. After this job runs, a later real
 * INITIAL_PURCHASE / native purchase_finalize can grant premium again.
 */
import {
  db,
  adminPremiumGrantsTable,
  billingAuditEventsTable,
  subscriptionsTable,
  userIdentityAliasesTable,
} from "@workspace/db";
import { eq, or } from "drizzle-orm";

export const CERTIFICATION_FORCE_FREE_EMAILS = ["champion6779@gmail.com"] as const;

export const CERTIFICATION_RESET_JOB_ID = "revoke_champion6779_2026_09_09";
export const CERTIFICATION_RESET_EVENT = "certification_premium_reset";

const NEW_PURCHASE_EVENT_TYPES = new Set(["INITIAL_PURCHASE"]);
const NEW_PURCHASE_SOURCES = new Set(["purchase_finalize"]);

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.toLowerCase().trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isCertificationForceFreeEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return (CERTIFICATION_FORCE_FREE_EMAILS as readonly string[]).includes(normalized);
}

export function shouldBlockStaleCertificationRevenueCatWrite(input: {
  forceFree: boolean;
  resetAppliedAt: Date | null;
  eventType?: string | null;
  source?: string | null;
  lastPaidEventAt?: Date | null;
  grantsPremium: boolean;
}): boolean {
  if (!input.forceFree) return false;
  if (!input.grantsPremium) return false;
  if (!input.resetAppliedAt) return false;
  if (
    input.lastPaidEventAt &&
    input.lastPaidEventAt.getTime() > input.resetAppliedAt.getTime()
  ) {
    return false;
  }
  if (input.eventType && NEW_PURCHASE_EVENT_TYPES.has(input.eventType)) return false;
  if (input.source && NEW_PURCHASE_SOURCES.has(input.source)) return false;
  return true;
}

export function freeSubscriptionResetValues(now: Date) {
  return {
    plan: "free" as const,
    status: "free" as const,
    provider: "none" as const,
    providerCustomerId: null,
    providerSubscriptionId: null,
    subscriptionState: "FREE" as const,
    store: null,
    environment: null,
    revenuecatAppUserId: null,
    originalAppUserId: null,
    productId: null,
    entitlementId: null,
    originalTransactionId: null,
    latestTransactionId: null,
    lastEventType: "certification_reset",
    lastEventAt: now,
    expiresAt: null,
    gracePeriodExpiresAt: null,
    autoRenewStatus: null,
    cancelledAt: null,
    expiredAt: null,
    lastReconciledAt: now,
    syncError: null,
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: 0,
    bonusExpiresAt: null,
    updatedAt: now,
  };
}

export async function findCertificationResetAppliedAt(): Promise<Date | null> {
  const [row] = await db
    .select({ createdAt: billingAuditEventsTable.createdAt })
    .from(billingAuditEventsTable)
    .where(eq(billingAuditEventsTable.providerEventId, CERTIFICATION_RESET_JOB_ID))
    .limit(1);
  return row?.createdAt ?? null;
}

async function emailsForUserId(userId: string): Promise<string[]> {
  const aliases = await db
    .select({
      email: userIdentityAliasesTable.email,
      normalizedEmail: userIdentityAliasesTable.normalizedEmail,
    })
    .from(userIdentityAliasesTable)
    .where(
      or(
        eq(userIdentityAliasesTable.firebaseUid, userId),
        eq(userIdentityAliasesTable.internalUserId, userId),
      ),
    );
  return [
    ...new Set(
      aliases
        .flatMap((a) => [normalizeEmail(a.normalizedEmail), normalizeEmail(a.email)])
        .filter((e): e is string => !!e),
    ),
  ];
}

export async function shouldBlockStaleCertificationRevenueCatWriteForUser(
  userId: string,
  opts: {
    eventType?: string | null;
    source?: string | null;
    grantsPremium: boolean;
  },
): Promise<boolean> {
  const emails = await emailsForUserId(userId);
  const resetAppliedAt = await findCertificationResetAppliedAt();
  const [sub] = await db
    .select({
      lastEventType: subscriptionsTable.lastEventType,
      lastEventAt: subscriptionsTable.lastEventAt,
    })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .limit(1);

  const forceFree =
    emails.some((email) => isCertificationForceFreeEmail(email)) ||
    sub?.lastEventType === "certification_reset";
  if (!forceFree) return false;

  const lastPaidEventAt =
    sub?.lastEventType && NEW_PURCHASE_EVENT_TYPES.has(sub.lastEventType)
      ? sub.lastEventAt
      : null;

  return shouldBlockStaleCertificationRevenueCatWrite({
    forceFree: true,
    resetAppliedAt,
    eventType: opts.eventType,
    source: opts.source,
    lastPaidEventAt,
    grantsPremium: opts.grantsPremium,
  });
}

async function userIdsForEmail(email: string): Promise<string[]> {
  const aliases = await db
    .select({
      internalUserId: userIdentityAliasesTable.internalUserId,
      firebaseUid: userIdentityAliasesTable.firebaseUid,
    })
    .from(userIdentityAliasesTable)
    .where(
      or(
        eq(userIdentityAliasesTable.normalizedEmail, email),
        eq(userIdentityAliasesTable.email, email),
      ),
    );
  return [...new Set(aliases.flatMap((a) => [a.internalUserId, a.firebaseUid].filter(Boolean)))];
}

async function resetUserIds(userIds: Iterable<string>, now: Date): Promise<string[]> {
  const reset = freeSubscriptionResetValues(now);
  const resetIds: string[] = [];
  for (const userId of userIds) {
    const updated = await db
      .update(subscriptionsTable)
      .set(reset)
      .where(eq(subscriptionsTable.userId, userId))
      .returning({ userId: subscriptionsTable.userId });
    if (updated.length > 0) resetIds.push(userId);
  }
  return resetIds;
}

function shouldKeepPostResetPurchase(
  resetAppliedAt: Date,
  lastEventType: string | null | undefined,
  lastEventAt: Date | null | undefined,
): boolean {
  if (lastEventType !== "INITIAL_PURCHASE" || !lastEventAt) return false;
  return lastEventAt.getTime() > resetAppliedAt.getTime();
}

export async function applyCertificationPremiumReset(opts?: {
  userId?: string | null;
  email?: string | null;
}): Promise<{ applied: boolean; userIds: string[] }> {
  const existing = await findCertificationResetAppliedAt();
  const now = new Date();

  if (existing) {
    if (!opts?.userId || !isCertificationForceFreeEmail(opts.email)) {
      return { applied: false, userIds: [] };
    }
    const [sub] = await db
      .select({
        provider: subscriptionsTable.provider,
        lastEventType: subscriptionsTable.lastEventType,
        lastEventAt: subscriptionsTable.lastEventAt,
      })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, opts.userId))
      .limit(1);
    if (
      !sub ||
      sub.provider === "none" ||
      shouldKeepPostResetPurchase(existing, sub.lastEventType, sub.lastEventAt)
    ) {
      return { applied: false, userIds: [] };
    }
    const resetIds = await resetUserIds([opts.userId], now);
    return { applied: resetIds.length > 0, userIds: resetIds };
  }

  const details: string[] = [];
  const userIds = new Set<string>();

  if (opts?.userId && isCertificationForceFreeEmail(opts.email)) {
    userIds.add(opts.userId);
  }

  for (const email of CERTIFICATION_FORCE_FREE_EMAILS) {
    const deleted = await db
      .delete(adminPremiumGrantsTable)
      .where(eq(adminPremiumGrantsTable.email, email))
      .returning({ id: adminPremiumGrantsTable.id });
    details.push(`${email}: grants_deleted=${deleted.length}`);
    for (const id of await userIdsForEmail(email)) {
      userIds.add(id);
    }
  }

  const resetIds = await resetUserIds(userIds, now);
  details.push(...resetIds.map((id) => `subscription_reset:${id}`));

  await db.insert(billingAuditEventsTable).values({
    userId: opts?.userId ?? resetIds[0] ?? null,
    provider: "none",
    source: "ops",
    eventName: CERTIFICATION_RESET_EVENT,
    status: "ok",
    providerEventId: CERTIFICATION_RESET_JOB_ID,
    fromState: null,
    toState: "FREE",
    reason: "play_certification_tester_force_free",
    metadata: { emails: [...CERTIFICATION_FORCE_FREE_EMAILS], userIds: resetIds, details },
  });

  return { applied: true, userIds: resetIds };
}
