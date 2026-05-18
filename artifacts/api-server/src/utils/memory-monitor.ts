import { logger } from "../lib/logger.js";
import { cleanupProductionGuardMaps, setMemoryPressureMode } from "../lib/production-route-guard.js";
import { trimClientLogBuffer } from "../routes/client-logs.js";

/**
 * Memory monitor — measures REAL container memory, not V8's internal heap ratio.
 *
 * Previous version used `heapUsed / heapTotal`. That ratio approaches 1.0 every
 * time V8 is about to grow its heap, which is normal behavior, not pressure.
 * Render starter has 512 MB RSS budget; we track RSS vs that budget.
 *
 * If MEMORY_LIMIT_MB is not set, we DEFAULT to a generous fallback so we never
 * accidentally degrade requests on a normal-load instance.
 */

const MEMORY_LIMIT_MB = Number(
  process.env.MEMORY_LIMIT_MB ??
    process.env.RENDER_MEMORY_LIMIT_MB ??
    "512",
);

// Pressure: RSS exceeds this fraction of the container budget.
const PRESSURE_RSS_RATIO = Number(process.env.API_MEMORY_PRESSURE_RATIO ?? "0.92");
const PRESSURE_CLEAR_RATIO = Number(process.env.API_MEMORY_PRESSURE_CLEAR_RATIO ?? "0.80");
const WARN_RSS_RATIO = Number(process.env.API_MEMORY_WARN_RATIO ?? "0.75");

const LOG_INTERVAL_MS = Number(process.env.AI_MEMORY_LOG_INTERVAL_MS ?? "60000");
const CLEANUP_INTERVAL_MS = Number(process.env.API_MEMORY_CLEANUP_INTERVAL_MS ?? "60000");

const isProduction = process.env.NODE_ENV === "production";

let logTimer: ReturnType<typeof setInterval> | undefined;
let cleanupTimer: ReturnType<typeof setInterval> | undefined;

export function getMemorySnapshot(): {
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  externalMb: number;
  rssRatio: number;
  limitMb: number;
  warn: boolean;
  pressure: boolean;
} {
  const m = process.memoryUsage();
  const heapUsedMb = Math.round(m.heapUsed / 1024 / 1024);
  const heapTotalMb = Math.round(m.heapTotal / 1024 / 1024);
  const rssMb = Math.round(m.rss / 1024 / 1024);
  const externalMb = Math.round(m.external / 1024 / 1024);
  const rssRatio = MEMORY_LIMIT_MB > 0 ? rssMb / MEMORY_LIMIT_MB : 0;

  return {
    heapUsedMb,
    heapTotalMb,
    rssMb,
    externalMb,
    rssRatio: Math.round(rssRatio * 1000) / 1000,
    limitMb: MEMORY_LIMIT_MB,
    warn: rssRatio >= WARN_RSS_RATIO,
    pressure: rssRatio >= PRESSURE_RSS_RATIO,
  };
}

function tryGcHint(): void {
  const gc = (globalThis as { gc?: () => void }).gc;
  if (typeof gc !== "function") return;
  try {
    gc();
  } catch {
    /* optional --expose-gc */
  }
}

function runMemoryTick(): void {
  const snap = getMemorySnapshot();

  if (snap.rssRatio >= PRESSURE_RSS_RATIO) {
    setMemoryPressureMode(true);
    tryGcHint();
    logger.warn(
      { evt: "memory.pressure", ...snap },
      "RSS above pressure threshold",
    );
  } else if (snap.rssRatio < PRESSURE_CLEAR_RATIO) {
    setMemoryPressureMode(false);
  }

  if (snap.warn) {
    logger.warn({ evt: "memory.usage", ...snap }, "Elevated RSS usage");
  } else if (!isProduction) {
    logger.debug({ evt: "memory.usage", ...snap }, "Memory usage");
  }
}

function runCleanupTick(): void {
  cleanupProductionGuardMaps();
  trimClientLogBuffer();
}

export function startMemoryMonitor(): void {
  if (logTimer) return;

  runMemoryTick();
  logTimer = setInterval(runMemoryTick, LOG_INTERVAL_MS);
  logTimer.unref?.();

  cleanupTimer = setInterval(runCleanupTick, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref?.();
}

export function stopMemoryMonitor(): void {
  if (logTimer) clearInterval(logTimer);
  if (cleanupTimer) clearInterval(cleanupTimer);
  logTimer = undefined;
  cleanupTimer = undefined;
}
