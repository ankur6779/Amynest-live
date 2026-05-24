import cron from "node-cron";
import { logger } from "./logger.js";
import { isStoryGcsMirrorEnabled, syncStoriesToGcs } from "../services/storyGcsMirror.js";

let started = false;

const TZ = process.env["STORY_GCS_CRON_TZ"] ?? process.env["NOTIFICATION_TZ"] ?? "Asia/Kolkata";
const BATCH_LIMIT = Number(process.env["STORY_GCS_CRON_BATCH"] ?? "5");
const BOOT_BATCH_LIMIT = Number(process.env["STORY_GCS_BOOT_BATCH"] ?? "5");
const BOOT_MAX_BATCHES = Number(process.env["STORY_GCS_BOOT_MAX_BATCHES"] ?? "30");

function resolveBatchLimit(raw: number, fallback: number): number {
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 20) : fallback;
}

/** Mirror pending stories in the background until caught up (server boot). */
function runBootCatchUpMirror(): void {
  void (async () => {
    const batch = resolveBatchLimit(BOOT_BATCH_LIMIT, 5);
    const maxBatches = Number.isFinite(BOOT_MAX_BATCHES) && BOOT_MAX_BATCHES > 0 ? BOOT_MAX_BATCHES : 30;

    try {
      for (let i = 0; i < maxBatches; i += 1) {
        const result = await syncStoriesToGcs({ limit: batch });
        logger.info(
          { evt: "story.gcs_boot_batch", batch: i + 1, ...result },
          "Story GCS boot mirror batch",
        );
        if (result.pending === 0) break;
        if (result.synced === 0 && result.failed > 0) break;
        await new Promise((resolve) => setTimeout(resolve, 8_000));
      }
    } catch (err) {
      logger.error({ evt: "story.gcs_boot_error", err }, "Story GCS boot mirror failed");
    }
  })();
}

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

  runBootCatchUpMirror();

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
