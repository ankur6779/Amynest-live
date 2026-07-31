/**
 * Production learning telemetry host — silent collectors, no user-facing UI.
 * DEV dashboard reads getLearningTelemetrySnapshot().
 */

import {
  formatTelemetryReport,
  getDefaultLearningTelemetry,
  type TelemetrySnapshot,
} from "@workspace/learning-telemetry";
import { setLearningBusTelemetrySink } from "@/lib/learning-events-bridge";
import { setKnowledgeGraphTelemetrySink } from "@/lib/knowledge-graph-client";
import {
  getLearningRuntime,
  installLearningRuntimeBridge,
} from "@/lib/learning-runtime-bridge";
import { installLearningEventBus } from "@/lib/learning-events-bridge";

let installed = false;
let fpsRaf = 0;
let perfTimer: ReturnType<typeof setInterval> | null = null;
let unsubKnowledge: (() => void) | null = null;
let unsubAttention: (() => void) | null = null;

function wireBus(): void {
  const collector = getDefaultLearningTelemetry();
  setLearningBusTelemetrySink((event) => {
    if (event.kind === "publish") {
      collector.recordBus({
        kind: "publish",
        latencyMs: event.latencyMs,
        queued: event.queued,
        queueDepth: event.queueDepth,
      });
    } else if (event.kind === "duplicate") {
      collector.recordBus({ kind: "duplicate" });
    } else if (event.kind === "replay") {
      collector.recordBus({ kind: "replay", count: event.count });
    } else if (event.kind === "flush") {
      collector.recordBus({
        kind: "flush",
        durationMs: event.durationMs,
        delivered: event.delivered,
        queueDepth: event.queueDepth,
      });
    } else if (event.kind === "online") {
      collector.recordBus({
        kind: "online",
        online: event.online,
        queueDepth: event.queueDepth,
      });
    }
  });
}

function wireKg(): void {
  const collector = getDefaultLearningTelemetry();
  setKnowledgeGraphTelemetrySink((event) => {
    if (event.kind === "snapshot") {
      collector.recordKg({
        kind: "snapshot",
        nodeCount: event.nodeCount,
        edgeCount: event.edgeCount,
        bytes: event.bytes,
        label: event.childId,
      });
    } else if (event.kind === "repair") {
      collector.recordKg({
        kind: "repair",
        reason: event.reason,
        durationMs: event.durationMs,
        dataLossRisk: event.dataLossRisk,
      });
    } else if (event.kind === "migration") {
      collector.recordKg({
        kind: "migration",
        durationMs: event.durationMs,
      });
    }
  });
}

function wireRuntime(): void {
  installLearningRuntimeBridge();
  const collector = getDefaultLearningTelemetry();
  const detailed =
    typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);
  getLearningRuntime().setMetricsObserver(
    (sample) => {
      collector.recordRuntime(sample);
    },
    { detailed },
  );
}

function wireDomainEvents(): void {
  const bus = installLearningEventBus();
  const collector = getDefaultLearningTelemetry();
  unsubKnowledge?.();
  unsubAttention?.();
  unsubKnowledge = bus.subscribe(
    () => {
      collector.recordKnowledgeUpdate();
    },
    { types: ["knowledge.updated"], priority: 1 },
  );
  unsubAttention = bus.subscribe(
    (event) => {
      const classification =
        typeof event.payload.metadata?.classification === "string"
          ? event.payload.metadata.classification
          : null;
      collector.recordAttentionTransition(null, classification);
    },
    { types: ["attention.state_changed"], priority: 1 },
  );
}

function samplePerfOnce(): void {
  const collector = getDefaultLearningTelemetry();
  const partial: Parameters<typeof collector.recordPerf>[0] = {};

  try {
    const mem = (
      performance as Performance & {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
      }
    ).memory;
    if (mem) {
      partial.heapUsedMb = Math.round((mem.usedJSHeapSize / 1_048_576) * 10) / 10;
      partial.heapTotalMb =
        Math.round((mem.totalJSHeapSize / 1_048_576) * 10) / 10;
    }
  } catch {
    /* ignore */
  }

  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    if (typeof nav.deviceMemory === "number") {
      partial.deviceMemoryGb = nav.deviceMemory;
    }
  } catch {
    /* ignore */
  }

  try {
    const navEntry = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;
    if (navEntry?.loadEventEnd) {
      partial.bundleLoadMs = Math.max(
        0,
        navEntry.loadEventEnd - navEntry.startTime,
      );
    }
  } catch {
    /* ignore */
  }

  // Best-effort audio play latency from existing reliability buckets.
  void import("@/lib/audio-latency-metrics")
    .then((m) => {
      try {
        const modules = ["speech_coach", "phonics", "reading", "other"] as const;
        let best = 0;
        for (const mod of modules) {
          const avg = m.getModuleLatencyAverages(mod);
          if (avg.play > best) best = avg.play;
        }
        if (best > 0) {
          getDefaultLearningTelemetry().recordPerf({ audioLatencyMs: best });
        }
      } catch {
        /* optional */
      }
    })
    .catch(() => {
      /* optional */
    });

  collector.recordPerf(partial);
}

function startFpsSampler(): void {
  if (typeof requestAnimationFrame === "undefined") return;
  let frames = 0;
  let last = performance.now();
  const tick = (t: number) => {
    frames += 1;
    if (t - last >= 1000) {
      getDefaultLearningTelemetry().recordPerf({ fps: frames });
      frames = 0;
      last = t;
    }
    fpsRaf = requestAnimationFrame(tick);
  };
  fpsRaf = requestAnimationFrame(tick);
}

function stopSamplers(): void {
  if (fpsRaf) cancelAnimationFrame(fpsRaf);
  fpsRaf = 0;
  if (perfTimer) clearInterval(perfTimer);
  perfTimer = null;
}

/**
 * Install production telemetry collectors. Idempotent. No UI.
 */
export function installLearningTelemetry(): boolean {
  if (installed) return true;
  installed = true;

  installLearningEventBus();
  wireBus();
  wireKg();
  wireRuntime();
  wireDomainEvents();
  samplePerfOnce();

  // Light perf sampling — silent; does not change UX.
  if (typeof window !== "undefined") {
    perfTimer = setInterval(samplePerfOnce, 15_000);
    // FPS only when explicitly enabled (DEV dashboard / flag) to avoid always-on rAF.
    try {
      const params = new URLSearchParams(window.location.search);
      const wantFps =
        params.get("learningTelemetry") === "1" ||
        localStorage.getItem("__amynest_learning_telemetry") === "1" ||
        (typeof import.meta !== "undefined" &&
          Boolean(import.meta.env?.DEV) &&
          params.get("debug") === "1");
      if (wantFps) startFpsSampler();
    } catch {
      /* ignore */
    }

    (
      window as Window & {
        __amynestLearningTelemetry?: () => TelemetrySnapshot;
        __amynestLearningTelemetryReport?: () => string;
      }
    ).__amynestLearningTelemetry = getLearningTelemetrySnapshot;
    (
      window as Window & {
        __amynestLearningTelemetryReport?: () => string;
      }
    ).__amynestLearningTelemetryReport = () =>
      formatTelemetryReport(getLearningTelemetrySnapshot());
  }

  return true;
}

export function getLearningTelemetrySnapshot(): TelemetrySnapshot {
  return getDefaultLearningTelemetry().snapshot();
}

export function isLearningTelemetryInstalled(): boolean {
  return installed;
}

/** Test helper */
export function resetLearningTelemetryHostForTests(): void {
  stopSamplers();
  unsubKnowledge?.();
  unsubAttention?.();
  unsubKnowledge = null;
  unsubAttention = null;
  setLearningBusTelemetrySink(null);
  setKnowledgeGraphTelemetrySink(null);
  try {
    getLearningRuntime().setMetricsObserver(null);
  } catch {
    /* ignore */
  }
  installed = false;
}
