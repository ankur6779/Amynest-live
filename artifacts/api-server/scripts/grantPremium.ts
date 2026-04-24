/**
 * Grant permanent premium access to specific email addresses.
 * Inserts into the `admin_premium_grants` table — the subscription service
 * auto-upgrades users with matching emails on their next entitlement check.
 *
 * Usage: pnpm --filter @workspace/api-server exec tsx scripts/grantPremium.ts
 *
 * To add more emails, add them to EMAILS_TO_GRANT below and re-run.
 */
import { db, adminPremiumGrantsTable } from "@workspace/db";

const EMAILS_TO_GRANT: string[] = [
  "champion6779@gmail.com",
  "akinom098@gmail.com",
];

const PLAN = "yearly";
const NOTE = "manual grant";

async function grantPremium() {
  console.log("=== Grant Premium Script ===\n");

  for (const rawEmail of EMAILS_TO_GRANT) {
    const email = rawEmail.toLowerCase().trim();
    console.log(`Processing: ${email}`);

    await db
      .insert(adminPremiumGrantsTable)
      .values({ email, plan: PLAN, note: NOTE })
      .onConflictDoUpdate({
        target: adminPremiumGrantsTable.email,
        set: { plan: PLAN, note: NOTE },
      });

    console.log(`  ✓ Grant recorded → active/${PLAN}`);
  }

  console.log("\n✅ Done — these users will receive premium on next login.\n");

  const all = await db.select().from(adminPremiumGrantsTable);
  console.log("Current admin_premium_grants table:");
  all.forEach((r) =>
    console.log(`  ${r.id}. ${r.email} (${r.plan}) — granted ${r.grantedAt.toISOString()}`),
  );

  process.exit(0);
}

grantPremium().catch((e) => {
  console.error("❌ Script failed:", e);
  process.exit(1);
});
