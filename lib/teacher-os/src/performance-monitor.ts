import type { PerformanceSnapshot } from "./pilot-types.js";
import { getProductEvents } from "./product-analytics.js";
import { trackProductEvent } from "./product-analytics.js";

const PERF_KEY = "teacher-os-perf-v81";

function loadSnapshot(): PerformanceSnapshot {
  try {
    if (typeof localStorage === "undefined") return emptyPerf();
    const raw = localStorage.getItem(PERF_KEY);
    return raw ? (JSON.parse(raw) as PerformanceSnapshot) : emptyPerf();
  } catch {
    return emptyPerf();
  }
}

function emptyPerf(): PerformanceSnapshot {
  return {
    aiLatencyMs: [],
    editorLoadMs: [],
    timeToFirstInteractionMs: [],
    timeToExportMs: [],
    updatedAt: new Date().toISOString(),
  };
}

function saveSnapshot(s: PerformanceSnapshot): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(PERF_KEY, JSON.stringify({ ...s, updatedAt: new Date().toISOString() }));
    }
  } catch { /* */ }
}

function push(arr: number[], value: number, max = 50): number[] {
  return [...arr, value].slice(-max);
}

export function recordPerfMetric(
  metric: "ai_latency" | "editor_load" | "first_interaction" | "export",
  ms: number,
): void {
  const s = loadSnapshot();
  if (metric === "ai_latency") s.aiLatencyMs = push(s.aiLatencyMs, ms);
  if (metric === "editor_load") s.editorLoadMs = push(s.editorLoadMs, ms);
  if (metric === "first_interaction") s.timeToFirstInteractionMs = push(s.timeToFirstInteractionMs, ms);
  if (metric === "export") s.timeToExportMs = push(s.timeToExportMs, ms);
  saveSnapshot(s);
  trackProductEvent("perf_mark", { metric, ms });
}

export function getPerformanceSnapshot(): PerformanceSnapshot {
  const events = getProductEvents();
  const s = loadSnapshot();
  for (const e of events) {
    if (e.type === "worksheet_generate_done" && e.durationMs) {
      s.aiLatencyMs = push(s.aiLatencyMs, e.durationMs);
    }
    if (e.type === "export_pdf" && e.durationMs) {
      s.timeToExportMs = push(s.timeToExportMs, e.durationMs);
    }
  }
  return s;
}

export function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}
