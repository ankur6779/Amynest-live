/**
 * Central crash / error ring buffer for production diagnostics and stress runs.
 * Wired from global-error-handlers and optional dev stress harness.
 */

import { isBenignRuntimeError } from "@/lib/runtime-crash-policy";

export type CrashLogEntry = {
  ts: number;
  context: string;
  message: string;
  stack?: string;
};

const MAX_ENTRIES = 100;
const entries: CrashLogEntry[] = [];

/** Set from installGlobalErrorHandlers before console.error is wrapped (avoids feedback loops). */
let nativeConsoleError: typeof console.error | null = null;

export function setNativeConsoleError(fn: typeof console.error): void {
  nativeConsoleError = fn;
}

function emitConsoleError(...args: unknown[]): void {
  const log = nativeConsoleError ?? console.error.bind(console);
  log(...args);
}

function formatError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error ?? "unknown") };
}

export function logError(error: unknown, context = ""): void {
  if (isBenignRuntimeError(error)) return;
  const { message, stack } = formatError(error);
  const entry: CrashLogEntry = {
    ts: Date.now(),
    context: context || "unknown",
    message,
    stack,
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();
  emitConsoleError("CRASH:", context, error);
  try {
    void import("@/lib/client-logs").then(({ reportCrashToBackend }) => {
      const msg = error instanceof Error ? error.message : String(error ?? "unknown");
      reportCrashToBackend(msg, context);
    });
  } catch {
    /* telemetry optional */
  }
  try {
    const w = window as Window & { __amynestCrashLog?: CrashLogEntry[] };
    w.__amynestCrashLog = [...entries];
  } catch {
    /* SSR / restricted env */
  }
}

export function getCrashLog(): readonly CrashLogEntry[] {
  return [...entries];
}

export function clearCrashLog(): void {
  entries.length = 0;
}

export function getCrashCount(): number {
  return entries.length;
}

let handlersInstalled = false;

/** Browser-global crash hooks (idempotent). */
export function installCrashLoggerHandlers(): void {
  if (typeof window === "undefined" || handlersInstalled) return;
  handlersInstalled = true;

  const prevOnError = window.onerror;
  window.onerror = (msg, url, line, col, err) => {
    if (isBenignRuntimeError(err ?? msg)) return true;
    logError(err ?? msg, `window.onerror:${url ?? ""}:${line ?? ""}:${col ?? ""}`);
    if (typeof prevOnError === "function") {
      return prevOnError.call(window, msg, url, line, col, err);
    }
    return true;
  };

  const prevRejection = window.onunhandledrejection;
  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    if (isBenignRuntimeError(event.reason)) {
      event.preventDefault();
      return;
    }
    logError(event.reason, "unhandled promise");
    if (typeof prevRejection === "function") {
      prevRejection.call(window, event);
    } else {
      event.preventDefault();
    }
  };

  window.addEventListener("error", (event) => {
    const err = event.error ?? event.message;
    if (isBenignRuntimeError(err)) return;
    logError(err, "window.error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (isBenignRuntimeError(event.reason)) return;
    logError(event.reason, "unhandledrejection");
  });
}

type MemorySnapshot = {
  ts: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
};

const memorySamples: MemorySnapshot[] = [];
let memoryInterval: ReturnType<typeof setInterval> | null = null;

export function startMemoryMonitor(intervalMs = 5000): () => void {
  if (typeof window === "undefined" || memoryInterval) {
    return () => {};
  }
  memoryInterval = setInterval(() => {
    const perf = performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
    if (!perf.memory) return;
    const snap: MemorySnapshot = {
      ts: Date.now(),
      usedJSHeapSize: perf.memory.usedJSHeapSize,
      totalJSHeapSize: perf.memory.totalJSHeapSize,
      jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
    };
    memorySamples.push(snap);
    if (memorySamples.length > 60) memorySamples.shift();
    console.info(
      "[amynest:memory]",
      Math.round(snap.usedJSHeapSize / 1024 / 1024),
      "MB used",
    );
    if (memorySamples.length >= 10) {
      const first = memorySamples[0]!.usedJSHeapSize;
      const last = snap.usedJSHeapSize;
      if (last > first * 1.8) {
        console.warn(
          "[amynest:memory] Possible leak — heap grew",
          Math.round((last - first) / 1024 / 1024),
          "MB over",
          memorySamples.length,
          "samples",
        );
      }
    }
  }, intervalMs);
  return () => {
    if (memoryInterval) clearInterval(memoryInterval);
    memoryInterval = null;
  };
}

export function getMemorySamples(): readonly MemorySnapshot[] {
  return memorySamples;
}
