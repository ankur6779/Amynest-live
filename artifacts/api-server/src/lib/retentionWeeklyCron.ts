import cron from "node-cron";
import { dispatchRetentionWeeklySummaries } from "../services/retentionWeeklySummaryService";
import { logger } from "./logger";

let started = false;

export function startRetentionWeeklySummaryCron(): void {
  if (started) return;
  if (process.env["DISABLE_RETENTION_WEEKLY_CRON"] === "1") {
    logger.info("Retention weekly summary cron disabled via DISABLE_RETENTION_WEEKLY_CRON");
    return;
  }

  // Sundays at 08:00 local (before weekly recap email at 09:00).
  const expr = process.env["RETENTION_WEEKLY_CRON"] ?? "0 8 * * 0";
  const tz = process.env["RETENTION_WEEKLY_TZ"] ?? process.env["WEEKLY_RECAP_TZ"] ?? "Asia/Kolkata";

  try {
    cron.schedule(
      expr,
      () => {
        logger.info({ expr, tz }, "Retention weekly summary cron firing");
        dispatchRetentionWeeklySummaries().catch((err) =>
          logger.error({ err }, "dispatchRetentionWeeklySummaries threw"),
        );
      },
      { timezone: tz },
    );
    started = true;
    logger.info({ expr, tz }, "Retention weekly summary cron scheduled");
  } catch (err) {
    logger.error({ err, expr, tz }, "Could not schedule retention weekly summary cron");
  }
}
