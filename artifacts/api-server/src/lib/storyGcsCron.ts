import cron from "node-cron";
import { logger } from "./logger.js";
import { isStoryGcsMirrorEnabled, syncStoriesToGcs } from "../services/storyGcsMirror.js";

let started = false;

const TZ = process.env["STORY_GCS_CRON_TZ"] ?? process.env["NOTIFICATION_TZ"] ?? "Asia/Kolkata";
const BATCH_LIMIT = Number(process.env["STORY_GCS_CRON_BATCH"] ?? "5");

export function startStoryGcsMirrorCron(): void {
  if (started) return;
  if (process.env["STORY_GCS_CRON"]?.trim().toLowerCase() === "false") {
    logger.info({ evt: "story.gcs_cron_skip" }, "Story GCS mirror cron disabled");
    return;
  }
  if (!isStoryGcsMirrorEnabled()) {
    logger.info({ evt: "story.gcs_cron_skip" }, "Story GCS mirror cron skipped — GCS not configured");
    return;
  }

  started = true;

  // 03:30 IST — mirror pending story videos off-peak.
  cron.schedule(
    "30 3 * * *",
    () => {
      void (async () => {
        try {
          const result = await syncStoriesToGcs({
            limit: Number.isFinite(BATCH_LIMIT) && BATCH_LIMIT > 0 ? BATCH_LIMIT : 5,
          });
          logger.info({ evt: "story.gcs_cron_done", ...result }, "Story GCS mirror cron finished");
        } catch (err) {
          logger.error({ evt: "story.gcs_cron_error", err }, "Story GCS mirror cron failed");
        }
      })();
    },
    { timezone: TZ },
  );

  logger.info(
    { evt: "story.gcs_cron_start", tz: TZ, batch: BATCH_LIMIT },
    "Story GCS mirror cron scheduled (03:30 daily)",
  );
}

/** Manual/cron HTTP trigger — processes one batch. */
export async function runStoryGcsMirrorPing(options?: {
  limit?: number;
  force?: boolean;
}): Promise<Awaited<ReturnType<typeof syncStoriesToGcs>>> {
  return syncStoriesToGcs(options);
}
