import cron from "node-cron";
import { logger } from "./logger.js";
import { reconcileRevenueCatSubscriptions } from "../services/subscriptionReconciliationService.js";

let started = false;

export function startBillingReconciliationCron(): void {
  if (started) return;
  if (process.env.DISABLE_BILLING_RECONCILIATION_CRON === "1") {
    logger.info("Billing reconciliation cron disabled via DISABLE_BILLING_RECONCILIATION_CRON");
    return;
  }

  const expr = process.env.BILLING_RECONCILIATION_CRON ?? "17 */6 * * *";
  const tz = process.env.BILLING_RECONCILIATION_TZ ?? "Asia/Kolkata";
  const limit = Number(process.env.BILLING_RECONCILIATION_LIMIT ?? "100");

  try {
    cron.schedule(
      expr,
      () => {
        logger.info({ evt: "billing_reconciliation.started", expr, tz, limit }, "Billing reconciliation cron firing");
        reconcileRevenueCatSubscriptions(limit).catch((err) =>
          logger.error({ err }, "Billing reconciliation cron failed"),
        );
      },
      { timezone: tz },
    );
    started = true;
    logger.info({ expr, tz, limit }, "Billing reconciliation cron scheduled");
  } catch (err) {
    logger.error({ err, expr, tz }, "Could not schedule billing reconciliation cron");
  }
}
