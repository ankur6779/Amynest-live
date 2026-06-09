/**
 * Sliding-window counter for audio job failures — triggers admin alert on spike.
 */
import { logger } from "../lib/logger.js";
import { emitAdminAlert } from "./admin-alert-system.js";

const WINDOW_MS = 5 * 60 * 1000;
const ALERT_THRESHOLD = Number(process.env.AUDIO_JOB_FAILURE_ALERT_THRESHOLD ?? "5");

type FailureEntry = { at: number; type: string; jobId: string };

const recentFailures: FailureEntry[] = [];
let lastAlertAt = 0;
const ALERT_COOLDOWN_MS = 10 * 60 * 1000;

export function recordAudioJobFailure(
  type: string,
  jobId: string,
  message: string,
): void {
  const now = Date.now();
  recentFailures.push({ at: now, type, jobId });
  while (recentFailures.length > 0 && recentFailures[0]!.at < now - WINDOW_MS) {
    recentFailures.shift();
  }

  if (recentFailures.length < ALERT_THRESHOLD) return;
  if (now - lastAlertAt < ALERT_COOLDOWN_MS) return;
  lastAlertAt = now;

  void emitAdminAlert({
    severity: "warning",
    module: "api",
    issue: "Audio job failure spike",
    metric: "audioJobFailures",
    value: recentFailures.length,
    actionTaken: "Inspect BullMQ failed queue; replay via POST /api/admin/audio-jobs/replay",
  }).catch((err) => {
    logger.warn(
      {
        evt: "audio_job.alert_emit_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      "failed to emit audio job failure alert",
    );
  });

  logger.error(
    {
      evt: "audio_job.failure_spike",
      count: recentFailures.length,
      windowMs: WINDOW_MS,
      latestType: type,
      latestJobId: jobId,
      message: message.slice(0, 200),
    },
    "audio job failure spike detected",
  );
}

/** Test-only reset. */
export function resetAudioJobAlertStoreForTests(): void {
  recentFailures.length = 0;
  lastAlertAt = 0;
}
