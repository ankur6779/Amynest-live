import cron from "node-cron";
import { logger } from "./logger.js";
import { runDailyPlanCronForAllChildren } from "./phonicsCurriculumService.js";

let started = false;

const TZ = process.env["PHONICS_CURRICULUM_TZ"] ?? process.env["NOTIFICATION_TZ"] ?? "Asia/Kolkata";

export function startPhonicsCurriculumCron(): void {
  if (started) return;
  if (process.env["PHONICS_CURRICULUM_CRON"]?.trim().toLowerCase() === "false") {
    logger.info({ evt: "phonics.curriculum.cron_skip" }, "phonics curriculum cron disabled");
    return;
  }

  started = true;

  // 05:00 local — build today's plans before the school-day push at 16:00.
  cron.schedule(
    "0 5 * * *",
    () => {
      void (async () => {
        try {
          const stats = await runDailyPlanCronForAllChildren();
          logger.info(
            { evt: "phonics.curriculum.cron_done", ...stats },
            "phonics daily plans generated",
          );
        } catch (err) {
          logger.error(
            { evt: "phonics.curriculum.cron_error", err },
            "phonics curriculum cron failed",
          );
        }
      })();
    },
    { timezone: TZ },
  );

  logger.info(
    { evt: "phonics.curriculum.cron_start", tz: TZ },
    "phonics curriculum cron scheduled (05:00 daily)",
  );
}
