import cron from "node-cron";
import { logger } from "./logger.js";
import { runPhonicsContentDripSafe } from "./phonicsContentDrip.js";

let started = false;

const TZ =
  process.env["PHONICS_CONTENT_DRIP_TZ"] ??
  process.env["PHONICS_CURRICULUM_TZ"] ??
  process.env["NOTIFICATION_TZ"] ??
  "Asia/Kolkata";

/** Weekly AI word drip into phonics_content (Phase 3). */
export function startPhonicsContentDripCron(): void {
  if (started) return;
  if (process.env["PHONICS_CONTENT_DRIP_CRON"]?.trim().toLowerCase() === "false") {
    logger.info({ evt: "phonics.content_drip.cron_skip" }, "phonics content drip cron disabled");
    return;
  }

  started = true;

  // Sunday 04:00 — append fresh CVC words before the new week.
  cron.schedule(
    "0 4 * * 0",
    () => {
      void (async () => {
        try {
          const stats = await runPhonicsContentDripSafe();
          logger.info(
            { evt: "phonics.content_drip.cron_done", stats },
            "phonics weekly content drip finished",
          );
        } catch (err) {
          logger.error(
            { evt: "phonics.content_drip.cron_error", err },
            "phonics content drip cron failed",
          );
        }
      })();
    },
    { timezone: TZ },
  );

  logger.info(
    { evt: "phonics.content_drip.cron_start", tz: TZ },
    "phonics content drip cron scheduled (Sun 04:00 weekly)",
  );
}
