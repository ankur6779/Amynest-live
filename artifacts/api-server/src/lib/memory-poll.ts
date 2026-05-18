import { logger } from "./logger";
import { getMemorySnapshot } from "../utils/memory-monitor.js";

/**
 * Fast (5s) opt-in memory poller for crash analysis.
 *
 * The default `startMemoryMonitor` ticks every 60s and only logs above warn
 * threshold — too coarse to catch a 30-second OOM spiral. When `DIAG_MEMORY_POLL=1`
 * we sample every 5s, log deltas, and flag the first RSS spike that doubles
 * within a single interval.
 *
 * Output is intentionally compact so 24h of logs are usable; we log each tick
 * but coalesce identical readings.
 */

const POLL_INTERVAL_MS = Number(process.env["DIAG_MEMORY_POLL_INTERVAL_MS"] ?? "5000");
const SPIKE_RSS_DELTA_MB = Number(process.env["DIAG_MEMORY_SPIKE_MB"] ?? "50");

let pollTimer: ReturnType<typeof setInterval> | undefined;
let lastRssMb = 0;
let consecutiveStable = 0;

function pollTick(): void {
  const snap = getMemorySnapshot();
  const usage = process.memoryUsage();
  const deltaMb = snap.rssMb - lastRssMb;
  const spike = lastRssMb > 0 && deltaMb >= SPIKE_RSS_DELTA_MB;

  if (Math.abs(deltaMb) < 1 && !snap.warn) {
    consecutiveStable++;
    // log every 6th tick (~30s) when stable so the timeline is still readable
    if (consecutiveStable % 6 !== 0) {
      lastRssMb = snap.rssMb;
      return;
    }
  } else {
    consecutiveStable = 0;
  }

  logger.info(
    {
      evt: spike ? "memory.poll.spike" : "memory.poll",
      rssMb: snap.rssMb,
      heapUsedMb: snap.heapUsedMb,
      heapTotalMb: snap.heapTotalMb,
      externalMb: snap.externalMb,
      arrayBuffersMb: Math.round(usage.arrayBuffers / 1024 / 1024),
      rssDeltaMb: deltaMb,
      rssRatio: snap.rssRatio,
      uptimeSec: Math.round(process.uptime()),
    },
    spike
      ? `memory: RSS spike +${deltaMb} MB (now ${snap.rssMb} MB)`
      : "memory poll",
  );

  if (spike) {
    logger.warn(
      {
        evt: "memory.spike_detected",
        rssMb: snap.rssMb,
        rssDeltaMb: deltaMb,
        thresholdMb: SPIKE_RSS_DELTA_MB,
      },
      `RSS spiked ${deltaMb}MB in ${POLL_INTERVAL_MS}ms — investigate handler activity in this window`,
    );
  }

  lastRssMb = snap.rssMb;
}

export function startFastMemoryPoll(): void {
  if (pollTimer) return;
  pollTick();
  pollTimer = setInterval(pollTick, POLL_INTERVAL_MS);
  pollTimer.unref?.();
  logger.info(
    { evt: "memory.poll.start", intervalMs: POLL_INTERVAL_MS, spikeMb: SPIKE_RSS_DELTA_MB },
    "Started fast memory poll for crash diagnostics",
  );
}

export function stopFastMemoryPoll(): void {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = undefined;
}
