import cron from "node-cron";
import { logger } from "./logger.js";
import { runWeeklyLearningContentSeedSafe } from "../services/learningContentSeedService.js";

let started = false;

const TZ =
  process.env["LEARNING_SEED_TZ"] ??
  process.env["NOTIFICATION_TZ"] ??
  "Asia/Kolkata";

/** Weekly pre-seed of learning load-more pools + TTS warm (Option B). */
export function startLearningContentSeedCron(): void {
  if (started) return;
  if (process.env["LEARNING_SEED_WEEKLY_CRON"]?.trim().toLowerCase() === "false") {
    logger.info(
      { evt: "learning.seed.cron_skip" },
      "learning weekly seed cron disabled",
    );
    return;
  }

  started = true;

  // Sunday 03:30 — before phonics drip (04:00) so fresh content is ready for the week.
  cron.schedule(
    "30 3 * * 0",
    () => {
      void (async () => {
        try {
          const stats = await runWeeklyLearningContentSeedSafe();
          logger.info(
            { evt: "learning.seed.cron_done", stats },
            "learning weekly seed cron finished",
          );
        } catch (err) {
          logger.error(
            { evt: "learning.seed.cron_error", err },
            "learning weekly seed cron failed",
          );
        }
      })();
    },
    { timezone: TZ },
  );

  logger.info(
    { evt: "learning.seed.cron_start", tz: TZ },
    "learning weekly seed cron scheduled (Sun 03:30)",
  );
}
