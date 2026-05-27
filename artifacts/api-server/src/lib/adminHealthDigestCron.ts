import cron from "node-cron";
import {
  dispatchAdminHealthDigest,
  isAdminHealthDigestEnabled,
} from "../services/adminHealthDigestService.js";
import { logger } from "./logger.js";

let started = false;

export function startAdminHealthDigestCron(): void {
  if (started) return;

  if (process.env["DISABLE_ADMIN_HEALTH_DIGEST_CRON"] === "1") {
    logger.info("Admin health digest cron disabled via DISABLE_ADMIN_HEALTH_DIGEST_CRON");
    return;
  }

  if (!isAdminHealthDigestEnabled()) {
    logger.info("Admin health digest cron skipped — ADMIN_HEALTH_DIGEST_ENABLED not set");
    return;
  }

  const expr = process.env["ADMIN_HEALTH_DIGEST_CRON"] ?? "0 */4 * * *";
  const tz = process.env["ADMIN_HEALTH_DIGEST_TZ"] ?? "Asia/Kolkata";

  try {
    cron.schedule(
      expr,
      () => {
        logger.info({ expr, tz }, "Admin health digest cron firing");
        dispatchAdminHealthDigest().catch((err) =>
          logger.error({ err }, "dispatchAdminHealthDigest threw"),
        );
      },
      { timezone: tz },
    );
    started = true;
    logger.info({ expr, tz }, "Admin health digest cron scheduled");
  } catch (err) {
    logger.error({ err, expr, tz }, "Could not schedule admin health digest cron");
  }
}
