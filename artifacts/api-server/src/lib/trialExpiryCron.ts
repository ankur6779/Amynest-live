import cron from "node-cron";
import { sweepExpiredInternalTrials } from "../services/subscriptionService.js";
import { logger } from "./logger.js";

let started = false;

/** Downgrade expired internal (provider=none) trials so DB matches entitlements. */
export function startTrialExpiryCron(): void {
  if (started) return;
  if (process.env["DISABLE_TRIAL_EXPIRY_CRON"] === "1") {
    logger.info("Trial expiry cron disabled via DISABLE_TRIAL_EXPIRY_CRON");
    return;
  }

  const expr = process.env["TRIAL_EXPIRY_CRON"] ?? "5 * * * *";
  const tz = process.env["TRIAL_EXPIRY_TZ"] ?? "Asia/Kolkata";

  try {
    cron.schedule(
      expr,
      () => {
        void (async () => {
          try {
            const { withCronAdvisoryLock } = await import("./cron-advisory-lock.js");
            await withCronAdvisoryLock("trial_expiry_sweep", async () => {
              const result = await sweepExpiredInternalTrials();
              if (result.healed > 0) {
                logger.info({ ...result, job: "trial_expiry_sweep" }, "Expired internal trials healed");
              }
            });
          } catch (err) {
            logger.error({ err, job: "trial_expiry_sweep" }, "Trial expiry cron failed");
          }
        })();
      },
      { timezone: tz },
    );
    started = true;
    logger.info({ expr, tz }, "Trial expiry cron scheduled");
  } catch (err) {
    logger.error({ err, expr, tz }, "Could not schedule trial expiry cron");
  }
}
