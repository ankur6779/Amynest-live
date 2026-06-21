import { db, subscriptionsTable } from "@workspace/db";
import { eq, isNotNull, or } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { syncRevenueCatSubscription } from "./rcCustomerService.js";
import { recordBillingAuditEvent } from "./subscriptionStateService.js";

export type ReconciliationSummary = {
  checked: number;
  repaired: number;
  failed: number;
};

export async function reconcileRevenueCatSubscriptions(limit = 100): Promise<ReconciliationSummary> {
  const rows = await db
    .select({
      userId: subscriptionsTable.userId,
      subscriptionState: subscriptionsTable.subscriptionState,
      currentPeriodEnd: subscriptionsTable.currentPeriodEnd,
      syncError: subscriptionsTable.syncError,
    })
    .from(subscriptionsTable)
    .where(
      or(
        eq(subscriptionsTable.provider, "revenuecat"),
        isNotNull(subscriptionsTable.revenuecatAppUserId),
        isNotNull(subscriptionsTable.originalTransactionId),
      ),
    )
    .limit(Math.max(1, Math.min(limit, 500)));

  const summary: ReconciliationSummary = { checked: 0, repaired: 0, failed: 0 };
  for (const row of rows) {
    summary.checked += 1;
    try {
      const result = await syncRevenueCatSubscription(row.userId, { source: "reconciliation" });
      if (result.synced && result.dbUpdated) {
        summary.repaired += result.reason === "no_active_entitlement" || result.isPremium ? 1 : 0;
        await recordBillingAuditEvent({
          userId: row.userId,
          source: "reconciliation",
          eventName: "subscription_reconciled",
          reason: result.reason ?? "synced",
          metadata: {
            isPremium: result.apiPremium ?? result.isPremium,
            previousState: row.subscriptionState,
            previousPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
          },
        });
      } else if (!result.synced) {
        summary.failed += 1;
        await recordBillingAuditEvent({
          userId: row.userId,
          source: "reconciliation",
          eventName: "subscription_reconciliation_failed",
          status: "error",
          reason: result.reason ?? "sync_failed",
          metadata: { previousSyncError: row.syncError ?? null },
        });
      }
    } catch (err) {
      summary.failed += 1;
      logger.error({ err, userId: row.userId }, "[billing-reconcile] user reconciliation failed");
      await recordBillingAuditEvent({
        userId: row.userId,
        source: "reconciliation",
        eventName: "subscription_reconciliation_failed",
        status: "error",
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }
  logger.info({ evt: "billing_reconciliation.completed", ...summary }, "Billing reconciliation completed");
  return summary;
}
