import { logger } from "../lib/logger.js";

const WARN_HEAP_RATIO = Number(process.env.AI_MEMORY_WARN_RATIO ?? "0.7");
const INTERVAL_MS = Number(process.env.AI_MEMORY_LOG_INTERVAL_MS ?? "10_000");

let timer: ReturnType<typeof setInterval> | undefined;

export function getMemorySnapshot(): {
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  externalMb: number;
  heapUsedRatio: number;
  warn: boolean;
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
  };
}

export function startMemoryMonitor(): void {
  if (timer) return;
  timer = setInterval(() => {
    const snap = getMemorySnapshot();
    const payload = { evt: "memory.usage", ...snap };
    if (snap.warn) {
      logger.warn(payload, "High memory usage");
    } else {
      logger.debug(payload, "Memory usage");
    }
  }, INTERVAL_MS);
  timer.unref?.();
}

export function stopMemoryMonitor(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
}
