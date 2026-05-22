/**
 * Grant permanent premium access to specific emails and/or E.164 phone numbers.
 * Inserts into the `admin_premium_grants` table — the subscription service
 * auto-upgrades users with matching credentials on their next entitlement check.
 *
 * Usage (production): DATABASE_URL=<prod-url> pnpm --filter @workspace/api-server exec tsx scripts/grantPremium.ts
 *
 * To add more accounts, edit EMAILS_TO_GRANT / PHONES_TO_GRANT below and re-run.
 */
import { db, adminPremiumGrantsTable } from "@workspace/db";

const EMAILS_TO_GRANT: string[] = [
  "tajkolli07@gmail.com",
  "champion6779@gmail.com",
  "akinom098@gmail.com",
];

/** E.164 format, e.g. +918309772378 */
const PHONES_TO_GRANT: string[] = ["+918309772378"];

const PLAN = "yearly";
const NOTE = "manual grant";

function placeholderEmailForPhone(phone: string): string {
  return `phone-${phone.replace(/\+/g, "")}@grant.amynest.internal`;
}

async function grantPremium() {
  console.log("=== Grant Premium Script ===\n");

  for (const rawEmail of EMAILS_TO_GRANT) {
    const email = rawEmail.toLowerCase().trim();
    console.log(`Processing email: ${email}`);

    await db
      .insert(adminPremiumGrantsTable)
      .values({ email, plan: PLAN, note: NOTE })
      .onConflictDoUpdate({
        target: adminPremiumGrantsTable.email,
        set: { plan: PLAN, note: NOTE },
      });

    console.log(`  ✓ Grant recorded → active/${PLAN}`);
  }

  for (const rawPhone of PHONES_TO_GRANT) {
    const phoneNumber = rawPhone.trim();
    const email = placeholderEmailForPhone(phoneNumber);
    console.log(`Processing phone: ${phoneNumber}`);

    await db
      .insert(adminPremiumGrantsTable)
      .values({ email, phoneNumber, plan: PLAN, note: NOTE })
      .onConflictDoUpdate({
        target: adminPremiumGrantsTable.phoneNumber,
        set: { email, plan: PLAN, note: NOTE },
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
