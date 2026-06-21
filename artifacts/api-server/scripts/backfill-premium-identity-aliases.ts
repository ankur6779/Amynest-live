import {
  db,
  subscriptionsTable,
  userIdentityAliasesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { adminAuth } from "../src/lib/firebase-admin";
import { isPremiumNow } from "../src/services/subscription-premium-gate.js";
import { normalizeIdentityEmail } from "../src/services/userIdentityService.js";

type Report = {
  dryRun: boolean;
  scannedSubscriptions: number;
  premiumSubscriptions: number;
  aliasesCreated: number;
  aliasesSkipped: number;
  failures: Array<{ userId: string; reason: string }>;
};

function parseArgs(): { dryRun: boolean } {
  const write = process.argv.includes("--write");
  const dryRun = process.argv.includes("--dry-run") || !write;
  return { dryRun };
}

async function main(): Promise<void> {
  const { dryRun } = parseArgs();
  const report: Report = {
    dryRun,
    scannedSubscriptions: 0,
    premiumSubscriptions: 0,
    aliasesCreated: 0,
    aliasesSkipped: 0,
    failures: [],
  };

  const subscriptions = await db.select().from(subscriptionsTable);
  report.scannedSubscriptions = subscriptions.length;

  for (const sub of subscriptions) {
    if (!isPremiumNow(sub)) continue;
    report.premiumSubscriptions += 1;

    try {
      const existing = await db
        .select({ id: userIdentityAliasesTable.id })
        .from(userIdentityAliasesTable)
        .where(eq(userIdentityAliasesTable.firebaseUid, sub.userId))
        .limit(1);
      if (existing[0]) {
        report.aliasesSkipped += 1;
        continue;
      }

      const user = await adminAuth().getUser(sub.userId);
      const normalizedEmail = normalizeIdentityEmail(user.email);
      if (!normalizedEmail || user.emailVerified !== true) {
        report.aliasesSkipped += 1;
        report.failures.push({
          userId: sub.userId,
          reason: normalizedEmail ? "email_not_verified" : "missing_email",
        });
        continue;
      }

      if (!dryRun) {
        const now = new Date();
        await db
          .insert(userIdentityAliasesTable)
          .values({
            internalUserId: sub.userId,
            firebaseUid: sub.userId,
            email: normalizedEmail,
            normalizedEmail,
            provider: "legacy_premium_backfill",
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
            lastSeenAt: now,
          })
          .onConflictDoNothing({
            target: userIdentityAliasesTable.firebaseUid,
          });
      }

      report.aliasesCreated += 1;
    } catch (err) {
      report.failures.push({
        userId: sub.userId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error("[backfill-premium-identity-aliases] failed", err);
  process.exit(1);
});
