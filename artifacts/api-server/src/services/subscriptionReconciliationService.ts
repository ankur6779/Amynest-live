import { db, subscriptionsTable } from "@workspace/db";
import { eq, isNotNull, or, sql, desc } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { syncRevenueCatSubscription } from "./rcCustomerService.js";
import { recordBillingAuditEvent } from "./subscriptionStateService.js";

export type ReconciliationSummary = {
  checked: number;
  repaired: number;
  failed: number;
  results: Array<{
    appUserId: string;
    appliedUserId: string;
    repaired: boolean;
    failed: boolean;
    reason?: string;
    isPremium: boolean;
    plan?: string | null;
  }>;
};

async function reconcileOneRevenueCatAppUserId(
  appUserId: string,
  source: "reconciliation" | "manual_recovery",
): Promise<ReconciliationSummary["results"][number]> {
  const result = await syncRevenueCatSubscription(appUserId, { source });
  const appliedUserId = result.appliedUserId ?? appUserId;
  if (result.synced && result.dbUpdated) {
    await recordBillingAuditEvent({
      userId: appliedUserId,
      source,
      eventName: "subscription_reconciled",
      reason: result.reason ?? "synced",
      metadata: {
        requestedAppUserId: appUserId,
        isPremium: result.apiPremium ?? result.isPremium,
        verifiedCustomer: result.verifiedCustomer ?? false,
        activeEntitlement: result.activeEntitlement ?? false,
        plan: result.plan ?? null,
      },
    });
    const repaired = result.reason === "no_active_entitlement" || result.isPremium;
    return {
      appUserId,
      appliedUserId,
      repaired,
      failed: false,
      reason: result.reason,
      isPremium: result.apiPremium ?? result.isPremium,
      plan: result.plan ?? null,
    };
  }

  await recordBillingAuditEvent({
    userId: appUserId,
    source,
    eventName: "subscription_reconciliation_failed",
    status: "error",
    reason: result.reason ?? "sync_failed",
    metadata: {
      verifiedCustomer: result.verifiedCustomer ?? false,
      activeEntitlement: result.activeEntitlement ?? false,
    },
  });
  return {
    appUserId,
    appliedUserId,
    repaired: false,
    failed: true,
    reason: result.reason ?? "sync_failed",
    isPremium: false,
    plan: result.plan ?? null,
  };
}

export async function reconcileRevenueCatAppUserIds(
  appUserIds: string[],
  source: "reconciliation" | "manual_recovery" = "manual_recovery",
): Promise<ReconciliationSummary> {
  const uniqueIds = Array.from(
    new Set(appUserIds.map((id) => id.trim()).filter((id) => id.length > 0)),
  );
  const summary: ReconciliationSummary = { checked: 0, repaired: 0, failed: 0, results: [] };

  for (const appUserId of uniqueIds) {
    summary.checked += 1;
    try {
      const result = await reconcileOneRevenueCatAppUserId(appUserId, source);
      if (result.repaired) summary.repaired += 1;
      if (result.failed) summary.failed += 1;
      summary.results.push(result);
    } catch (err) {
      summary.failed += 1;
      summary.results.push({
        appUserId,
        appliedUserId: appUserId,
        repaired: false,
        failed: true,
        reason: err instanceof Error ? err.message : String(err),
        isPremium: false,
        plan: null,
      });
      logger.error({ err, appUserId }, "[billing-reconcile] targeted user reconciliation failed");
      await recordBillingAuditEvent({
        userId: appUserId,
        source,
        eventName: "subscription_reconciliation_failed",
        status: "error",
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info(
    { evt: "billing_reconciliation.targeted_completed", ...summary },
    "Targeted Billing reconciliation completed",
  );
  return summary;
}

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
    .orderBy(
      sql`CASE WHEN ${subscriptionsTable.syncError} IS NOT NULL THEN 0 ELSE 1 END`,
      desc(subscriptionsTable.updatedAt),
    )
    .limit(Math.max(1, Math.min(limit, 500)));

  const summary: ReconciliationSummary = { checked: 0, repaired: 0, failed: 0, results: [] };
  for (const row of rows) {
    summary.checked += 1;
    try {
      const result = await reconcileOneRevenueCatAppUserId(row.userId, "reconciliation");
      if (result.repaired) summary.repaired += 1;
      if (result.failed) summary.failed += 1;
      summary.results.push(result);
    } catch (err) {
      summary.failed += 1;
      summary.results.push({
        appUserId: row.userId,
        appliedUserId: row.userId,
        repaired: false,
        failed: true,
        reason: err instanceof Error ? err.message : String(err),
        isPremium: false,
        plan: null,
      });
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
