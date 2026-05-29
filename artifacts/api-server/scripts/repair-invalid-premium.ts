/**
 * One-time repair: downgrade subscriptions that are "active" in DB but should
 * not have premium (missing or expired current_period_end).
 *
 *   cd artifacts/api-server && npx tsx scripts/repair-invalid-premium.ts
 *
 * Dry-run by default; pass --apply to write.
 */
import { db, subscriptionsTable } from "@workspace/db";
import { eq, inArray, or, isNull, lt } from "drizzle-orm";
import { isPremiumNow, healStaleSubscriptionRecord } from "../src/services/subscriptionService.js";

const apply = process.argv.includes("--apply");

async function main(): Promise<void> {
  const rows = await db.select().from(subscriptionsTable).where(
    or(
      eq(subscriptionsTable.status, "active"),
      eq(subscriptionsTable.status, "trialing"),
      inArray(subscriptionsTable.status, ["canceled", "past_due"]),
    ),
  );

  let wouldHeal = 0;
  for (const row of rows) {
    if (isPremiumNow(row)) continue;
    if (row.status === "free") continue;
    wouldHeal += 1;
    console.log(
      `[repair] user=${row.userId} status=${row.status} provider=${row.provider} periodEnd=${row.currentPeriodEnd?.toISOString() ?? "null"}`,
    );
    if (apply) {
      await healStaleSubscriptionRecord(row);
    }
  }

  console.log(
    apply
      ? `Applied heal to ${wouldHeal} subscription row(s).`
      : `Dry-run: ${wouldHeal} row(s) would be healed. Re-run with --apply to fix.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
