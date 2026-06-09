import cron from "node-cron";
import { logger } from "../lib/logger.js";
import { runTtsOrphanCleanup } from "../services/ttsOrphanCleanup.js";

const TZ = process.env.TTS_ORPHAN_CLEANUP_TZ ?? "UTC";
const EXPR = process.env.TTS_ORPHAN_CLEANUP_CRON ?? "0 4 * * 0";

export function startTtsOrphanCleanupCron(): void {
  if (process.env.DISABLE_TTS_ORPHAN_CLEANUP_CRON === "1") {
    logger.info({ evt: "tts.orphan_cron_skip" }, "TTS orphan cleanup cron disabled");
    return;
  }

  cron.schedule(
    EXPR,
    () => {
      void runTtsOrphanCleanup()
        .then((result) => {
          logger.info({ evt: "tts.orphan_cron_done", ...result }, "TTS orphan cleanup cron finished");
        })
        .catch((err) => {
          logger.error(
            { evt: "tts.orphan_cron_error", err },
            "TTS orphan cleanup cron failed",
          );
        });
    },
    { timezone: TZ },
  );

  logger.info({ evt: "tts.orphan_cron_start", expr: EXPR, tz: TZ }, "TTS orphan cleanup cron scheduled");
}
