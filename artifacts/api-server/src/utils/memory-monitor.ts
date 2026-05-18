import { logger } from "../lib/logger.js";
import { cleanupProductionGuardMaps, setMemoryPressureMode } from "../lib/production-route-guard.js";
import { trimClientLogBuffer } from "../routes/client-logs.js";

const WARN_HEAP_RATIO = Number(process.env.AI_MEMORY_WARN_RATIO ?? "0.7");
const PRESSURE_HEAP_RATIO = Number(process.env.API_MEMORY_PRESSURE_RATIO ?? "0.85");
const PRESSURE_CLEAR_RATIO = Number(process.env.API_MEMORY_PRESSURE_CLEAR_RATIO ?? "0.75");
const LOG_INTERVAL_MS = Number(process.env.AI_MEMORY_LOG_INTERVAL_MS ?? "30_000");
const CLEANUP_INTERVAL_MS = Number(process.env.API_MEMORY_CLEANUP_INTERVAL_MS ?? "60_000");

const isProduction = process.env.NODE_ENV === "production";

let logTimer: ReturnType<typeof setInterval> | undefined;
let cleanupTimer: ReturnType<typeof setInterval> | undefined;

export function getMemorySnapshot(): {
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  externalMb: number;
  heapUsedRatio: number;
  warn: boolean;
  pressure: boolean;
} {
  const m = process.memoryUsage();
  const heapUsedMb = Math.round(m.heapUsed / 1024 / 1024);
  const heapTotalMb = Math.round(m.heapTotal / 1024 / 1024);
  const rssMb = Math.round(m.rss / 1024 / 1024);
  const externalMb = Math.round(m.external / 1024 / 1024);
  const heapUsedRatio = m.heapTotal > 0 ? m.heapUsed / m.heapTotal : 0;
  return {
    heapUsedMb,
    heapTotalMb,
    rssMb,
    externalMb,
    heapUsedRatio: Math.round(heapUsedRatio * 1000) / 1000,
    warn: heapUsedRatio >= WARN_HEAP_RATIO,
    pressure: heapUsedRatio >= PRESSURE_HEAP_RATIO,
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

  if (snap.heapUsedRatio >= PRESSURE_HEAP_RATIO) {
    setMemoryPressureMode(true);
    tryGcHint();
    logger.warn(
      { evt: "memory.pressure", ...snap },
      "Heap above pressure threshold — heavy routes degraded",
    );
  } else if (snap.heapUsedRatio < PRESSURE_CLEAR_RATIO) {
    setMemoryPressureMode(false);
  }

  if (snap.warn) {
    logger.warn({ evt: "memory.usage", ...snap }, "High memory usage");
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
