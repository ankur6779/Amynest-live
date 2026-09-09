/**
 * Remove a manual backend premium grant so the account can go through a real
 * store purchase. Deletes `admin_premium_grants` and resets `provider=manual`
 * subscription rows. Does not cancel Google Play / App Store subscriptions.
 *
 * Usage: DATABASE_URL=<prod-url> pnpm --filter @workspace/api-server exec tsx scripts/revokePremium.ts
 *
 * Optional: pass emails as args.
 *   pnpm --filter @workspace/api-server exec tsx scripts/revokePremium.ts champion6779@gmail.com
 */
import { db, adminPremiumGrantsTable, subscriptionsTable, userIdentityAliasesTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";

const DEFAULT_EMAILS_TO_REVOKE: string[] = ["champion6779@gmail.com"];

function emailsFromArgs(): string[] {
  const fromArgs = process.argv.slice(2).map((s) => s.toLowerCase().trim()).filter(Boolean);
  return fromArgs.length > 0 ? fromArgs : DEFAULT_EMAILS_TO_REVOKE;
}

async function resetManualSubscription(userId: string): Promise<string> {
  const [sub] = await db
    .select({
      userId: subscriptionsTable.userId,
      provider: subscriptionsTable.provider,
      status: subscriptionsTable.status,
      plan: subscriptionsTable.plan,
      subscriptionState: subscriptionsTable.subscriptionState,
    })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .limit(1);

  if (!sub) return "no_subscription_row";
  if (sub.provider === "revenuecat" || sub.provider === "razorpay") {
    return `left_${sub.provider}_${sub.status}_${sub.plan} (store-managed — cancel in Play/App Store, do not wipe)`;
  }
  if (sub.provider !== "manual") {
    return `left_${sub.provider}_${sub.status}_${sub.plan}`;
  }

  const now = new Date();
  await db
    .update(subscriptionsTable)
    .set({
      plan: "free",
      status: "free",
      provider: "none",
      subscriptionState: "FREE",
      providerCustomerId: null,
      providerSubscriptionId: null,
      productId: null,
      entitlementId: null,
      currentPeriodEnd: null,
      expiresAt: null,
      trialEndsAt: null,
      gracePeriodExpiresAt: null,
      cancelledAt: null,
      expiredAt: null,
      cancelAtPeriodEnd: 0,
      autoRenewStatus: null,
      bonusExpiresAt: null,
      syncError: null,
      lastEventType: "admin_grant_revoked",
      lastEventAt: now,
      updatedAt: now,
    })
    .where(eq(subscriptionsTable.userId, userId));
  return "reset_manual_to_free";
}

async function revokePremium() {
  const emails = emailsFromArgs();
  console.log("=== Revoke Premium Script ===\n");
  console.log("Emails:", emails.join(", "));

  for (const email of emails) {
    console.log(`\nProcessing: ${email}`);

    const deleted = await db
      .delete(adminPremiumGrantsTable)
      .where(eq(adminPremiumGrantsTable.email, email))
      .returning({ id: adminPremiumGrantsTable.id, email: adminPremiumGrantsTable.email });

    console.log(
      deleted.length === 0
        ? "  admin_premium_grants: no row"
        : `  admin_premium_grants: deleted id=${deleted.map((r) => r.id).join(",")}`,
    );

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

    if (aliases.length === 0) {
      console.log("  identity: no alias row — grant table is the source of truth on next login");
      continue;
    }

    const userIds = [...new Set(aliases.flatMap((a) => [a.internalUserId, a.firebaseUid].filter(Boolean)))];
    for (const userId of userIds) {
      const result = await resetManualSubscription(userId);
      console.log(`  subscription ${userId}: ${result}`);
    }
  }

  console.log("\nDone. If Google Play still says already subscribed, cancel in Play Store first.");
  console.log("A backend grant does not create the Play 'already subscribed' dialog.\n");
  process.exit(0);
}

revokePremium().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
