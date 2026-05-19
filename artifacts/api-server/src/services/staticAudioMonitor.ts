import { getGcsBucketId } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import { getStaticAudioBuffer, prewarmStaticAudioBuffers } from "./staticAudioLoader.js";
import { legacyGcsConfigured } from "./ttsAudioStore.js";
import { getStaticAudioMetrics } from "./staticAudioMetrics.js";
import { sendStaticAudioAlert } from "./staticAudioAlerts.js";

/** Known-good catalog object (good job!). Override via STATIC_AUDIO_PROBE_HASH. */
const DEFAULT_PROBE_HASH = "20ccf010450267bfff3fb54c9f09820c";

const HEALTH_INTERVAL_MS = Number(process.env.STATIC_AUDIO_HEALTH_INTERVAL_MS ?? "60_000");
const METRICS_INTERVAL_MS = Number(process.env.STATIC_AUDIO_METRICS_INTERVAL_MS ?? "120_000");

let monitorStarted = false;
let lastGcsProbeOk = true;

function probeHash(): string {
  return (process.env.STATIC_AUDIO_PROBE_HASH ?? DEFAULT_PROBE_HASH).trim().toLowerCase();
}

export async function runStaticAudioColdStartPrecheck(): Promise<void> {
  const bucket = getGcsBucketId();
  const gcs = legacyGcsConfigured();

  logger.info(
    { evt: "static_audio.cold_start", gcs, bucket: bucket ?? null },
    "static audio cold-start precheck",
  );
  console.log("[STATIC AUDIO COLD START]", { gcs, bucket: bucket ?? "(unset)" });

  if (!gcs || !bucket) {
    console.error("CRITICAL: GCS_ACCESS_FAILURE — static audio storage not configured");
    await sendStaticAudioAlert("gcs_not_configured", { gcs, bucket });
    return;
  }

  try {
    const buffer = await getStaticAudioBuffer(probeHash());
    if (!buffer) {
      console.error("CRITICAL: GCS_ACCESS_FAILURE — probe object missing", { hash: probeHash() });
      lastGcsProbeOk = false;
      await sendStaticAudioAlert("gcs_probe_missing", { hash: probeHash(), bucket });
      return;
    }
    lastGcsProbeOk = true;
    console.log("[STATIC AUDIO COLD START] GCS probe OK", {
      hash: probeHash(),
      bytes: buffer.byteLength,
    });
    await prewarmStaticAudioBuffers();
  } catch (err) {
    lastGcsProbeOk = false;
    const message = err instanceof Error ? err.message : String(err);
    console.error("CRITICAL: GCS_ACCESS_FAILURE", { hash: probeHash(), error: message });
    logger.error({ evt: "static_audio.cold_start_failed", message }, "static audio GCS probe failed");
    await sendStaticAudioAlert("gcs_cold_start_failed", { hash: probeHash(), error: message });
  }
}

async function runPeriodicGcsProbe(): Promise<void> {
  if (!legacyGcsConfigured()) return;
  try {
    const buffer = await getStaticAudioBuffer(probeHash());
    if (!buffer) {
      if (lastGcsProbeOk) {
        console.error("CRITICAL: GCS_ACCESS_FAILURE — periodic probe missing object");
        await sendStaticAudioAlert("gcs_probe_missing", { hash: probeHash() });
      }
      lastGcsProbeOk = false;
      return;
    }
    lastGcsProbeOk = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("CRITICAL: GCS_ACCESS_FAILURE", { error: message });
    logger.error({ evt: "static_audio.gcs_probe_failed", message }, "periodic GCS probe failed");
    lastGcsProbeOk = false;
    if (message === "gcs_timeout") {
      await sendStaticAudioAlert("gcs_timeout", { hash: probeHash() });
    } else {
      await sendStaticAudioAlert("gcs_probe_failed", { error: message });
    }
  }
}

function logMetricsSnapshot(): void {
  const metrics = getStaticAudioMetrics();
  console.log("[STATIC AUDIO METRICS SNAPSHOT]", metrics);
  logger.info({ evt: "static_audio.metrics_snapshot", ...metrics }, "static audio metrics snapshot");
}

/** Background monitor: GCS probe every 60s, metrics log every 2 min. */
export function startStaticAudioMonitor(): void {
  if (monitorStarted) return;
  monitorStarted = true;

  void runStaticAudioColdStartPrecheck();

  setInterval(() => {
    void runPeriodicGcsProbe();
  }, HEALTH_INTERVAL_MS);

  setInterval(() => {
    logMetricsSnapshot();
  }, METRICS_INTERVAL_MS);

  logger.info(
    {
      evt: "static_audio.monitor_started",
      healthIntervalMs: HEALTH_INTERVAL_MS,
      metricsIntervalMs: METRICS_INTERVAL_MS,
    },
    "static audio monitor started",
  );
}

export function isLastGcsProbeOk(): boolean {
  return lastGcsProbeOk;
}
