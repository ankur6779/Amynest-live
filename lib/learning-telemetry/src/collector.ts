import {
  DEFAULT_ALERT_THRESHOLDS,
  type AlertThresholds,
  type BusCounters,
  type KgCounters,
  type LatencyStats,
  type PerfCounters,
  type RuntimeCounters,
  type TelemetryAlert,
  type TelemetrySnapshot,
} from "./types.js";
import { evaluateAlerts } from "./alerts.js";
import { computeHealthScore } from "./health.js";

const TREND_CAP = 60;
const LATENCY_SAMPLE_CAP = 200;

function emptyRuntime(): RuntimeCounters {
  return {
    decisions: 0,
    ruleEvaluations: 0,
    ruleMatches: 0,
    ruleFailures: 0,
    cooldownHits: 0,
    recommendationOffered: 0,
    recommendationAccepted: 0,
    recommendationIgnored: 0,
    reviewQueueMax: 0,
    reviewQueueLast: 0,
    knowledgeUpdates: 0,
    attentionTransitions: 0,
    slowRules: {},
  };
}

function emptyBus(): BusCounters {
  return {
    publishes: 0,
    publishLatencySumMs: 0,
    publishLatencyMaxMs: 0,
    duplicatesPrevented: 0,
    replays: 0,
    flushes: 0,
    flushDurationSumMs: 0,
    flushDurationMaxMs: 0,
    queueDepthLast: 0,
    queueDepthMax: 0,
    offlineStartedAt: null,
    offlineDurationTotalMs: 0,
    offlineDurationLastMs: 0,
  };
}

function emptyKg(): KgCounters {
  return {
    nodeCount: 0,
    edgeCount: 0,
    snapshotBytes: 0,
    snapshotBytesMax: 0,
    repairCount: 0,
    migrationCount: 0,
    migrationDurationSumMs: 0,
    migrationDurationMaxMs: 0,
    storageGrowthBytes: 0,
    lastRepairReason: null,
  };
}

function emptyPerf(): PerfCounters {
  return {
    heapUsedMb: null,
    heapTotalMb: null,
    deviceMemoryGb: null,
    fps: null,
    fpsMin: null,
    audioLatencyMs: null,
    bundleLoadMs: null,
    longTasks: 0,
  };
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx]!;
}

export type RuntimeMetricSample = {
  latencyMs: number;
  ruleId: string;
  matchedRuleCount: number;
  ruleEvaluations?: number;
  cooldownHits?: number;
  ruleFailures?: number;
  reviewQueueSize: number;
  recommendationNodeId?: string | null;
  nextActivityNodeId?: string | null;
  eventType: string;
  childId: string;
  attentionClassification?: string | null;
};

export type BusMetricSample =
  | { kind: "publish"; latencyMs: number; queued: boolean; queueDepth: number }
  | { kind: "duplicate" }
  | { kind: "replay"; count: number }
  | { kind: "flush"; durationMs: number; delivered: number; queueDepth: number }
  | { kind: "online"; online: boolean; queueDepth: number };

export type KgMetricSample =
  | {
      kind: "snapshot";
      nodeCount: number;
      edgeCount: number;
      bytes: number;
      label?: string;
    }
  | {
      kind: "repair";
      reason: string;
      durationMs: number;
      dataLossRisk?: string;
    }
  | { kind: "migration"; durationMs: number };

export type LearningTelemetryCollector = {
  recordRuntime(sample: RuntimeMetricSample): void;
  recordBus(sample: BusMetricSample): void;
  recordKg(sample: KgMetricSample): void;
  recordPerf(partial: Partial<PerfCounters>): void;
  recordKnowledgeUpdate(): void;
  recordAttentionTransition(from: string | null, to: string | null): void;
  setThresholds(partial: Partial<AlertThresholds>): void;
  getThresholds(): AlertThresholds;
  snapshot(): TelemetrySnapshot;
  reset(): void;
  /** Active alerts since last reset (deduped by id+minute). */
  drainAlerts(): TelemetryAlert[];
};

/**
 * In-process learning telemetry collector.
 * Safe for production: no DOM, no network, O(1) amortized writes.
 */
export function createLearningTelemetryCollector(
  options?: { thresholds?: Partial<AlertThresholds>; startedAt?: number },
): LearningTelemetryCollector {
  const startedAt = options?.startedAt ?? Date.now();
  let thresholds: AlertThresholds = {
    ...DEFAULT_ALERT_THRESHOLDS,
    ...(options?.thresholds ?? {}),
  };

  let runtime = emptyRuntime();
  let bus = emptyBus();
  let kg = emptyKg();
  let perf = emptyPerf();
  const latencySamples: number[] = [];
  const trendLatency: number[] = [];
  const trendQueue: number[] = [];
  const trendSnap: number[] = [];
  const trendHealth: number[] = [];
  const recentAlerts: TelemetryAlert[] = [];
  const repairTimestamps: number[] = [];
  const lastRecByChild = new Map<string, { nodeId: string; streak: number }>();
  let prevSnapshotBytes = 0;
  let lastAttentionByChild = new Map<string, string | null>();

  const pushTrend = (arr: number[], value: number) => {
    arr.push(value);
    if (arr.length > TREND_CAP) arr.shift();
  };

  const noteAlert = (alert: TelemetryAlert) => {
    recentAlerts.push(alert);
    if (recentAlerts.length > 100) recentAlerts.shift();
  };

  const latencyStats = (): LatencyStats => {
    const sorted = [...latencySamples].sort((a, b) => a - b);
    return {
      count: latencySamples.length,
      sumMs: latencySamples.reduce((s, v) => s + v, 0),
      maxMs: sorted.length ? sorted[sorted.length - 1]! : 0,
      p95Ms: percentile(sorted, 95),
      lastMs: latencySamples.length
        ? latencySamples[latencySamples.length - 1]!
        : 0,
    };
  };

  return {
    recordRuntime(sample) {
      runtime.decisions += 1;
      runtime.ruleEvaluations += sample.ruleEvaluations ?? sample.matchedRuleCount;
      runtime.ruleMatches += sample.matchedRuleCount;
      runtime.cooldownHits += sample.cooldownHits ?? 0;
      runtime.ruleFailures += sample.ruleFailures ?? 0;
      runtime.reviewQueueLast = sample.reviewQueueSize;
      if (sample.reviewQueueSize > runtime.reviewQueueMax) {
        runtime.reviewQueueMax = sample.reviewQueueSize;
      }

      latencySamples.push(sample.latencyMs);
      if (latencySamples.length > LATENCY_SAMPLE_CAP) latencySamples.shift();
      pushTrend(trendLatency, sample.latencyMs);

      const rule = runtime.slowRules[sample.ruleId] ?? {
        count: 0,
        sumMs: 0,
        maxMs: 0,
      };
      rule.count += 1;
      rule.sumMs += sample.latencyMs;
      if (sample.latencyMs > rule.maxMs) rule.maxMs = sample.latencyMs;
      runtime.slowRules[sample.ruleId] = rule;

      const recId = sample.recommendationNodeId ?? null;
      const nextId = sample.nextActivityNodeId ?? null;
      if (recId) {
        runtime.recommendationOffered += 1;
        if (nextId && (nextId === recId || nextId.endsWith(recId) || recId.endsWith(nextId))) {
          runtime.recommendationAccepted += 1;
          lastRecByChild.delete(sample.childId);
        } else {
          runtime.recommendationIgnored += 1;
          const prev = lastRecByChild.get(sample.childId);
          if (prev && prev.nodeId === recId) {
            prev.streak += 1;
          } else {
            lastRecByChild.set(sample.childId, { nodeId: recId, streak: 1 });
          }
        }
      }

      if (sample.eventType === "knowledge.updated") {
        runtime.knowledgeUpdates += 1;
      }
      if (sample.eventType === "attention.state_changed") {
        const prev = lastAttentionByChild.get(sample.childId) ?? null;
        const next = sample.attentionClassification ?? null;
        if (prev !== next) {
          runtime.attentionTransitions += 1;
          lastAttentionByChild.set(sample.childId, next);
        }
      }

      for (const a of evaluateAlerts(
        { runtime, bus, kg, perf, latency: latencyStats(), repairTimestamps, lastRecByChild },
        thresholds,
      )) {
        noteAlert(a);
      }
    },

    recordBus(sample) {
      if (sample.kind === "publish") {
        bus.publishes += 1;
        bus.publishLatencySumMs += sample.latencyMs;
        if (sample.latencyMs > bus.publishLatencyMaxMs) {
          bus.publishLatencyMaxMs = sample.latencyMs;
        }
        bus.queueDepthLast = sample.queueDepth;
        if (sample.queueDepth > bus.queueDepthMax) {
          bus.queueDepthMax = sample.queueDepth;
        }
        pushTrend(trendQueue, sample.queueDepth);
      } else if (sample.kind === "duplicate") {
        bus.duplicatesPrevented += 1;
      } else if (sample.kind === "replay") {
        bus.replays += sample.count;
      } else if (sample.kind === "flush") {
        bus.flushes += 1;
        bus.flushDurationSumMs += sample.durationMs;
        if (sample.durationMs > bus.flushDurationMaxMs) {
          bus.flushDurationMaxMs = sample.durationMs;
        }
        bus.queueDepthLast = sample.queueDepth;
        pushTrend(trendQueue, sample.queueDepth);
      } else if (sample.kind === "online") {
        if (!sample.online) {
          if (bus.offlineStartedAt == null) bus.offlineStartedAt = Date.now();
        } else if (bus.offlineStartedAt != null) {
          const dur = Date.now() - bus.offlineStartedAt;
          bus.offlineDurationLastMs = dur;
          bus.offlineDurationTotalMs += dur;
          bus.offlineStartedAt = null;
        }
        bus.queueDepthLast = sample.queueDepth;
      }

      for (const a of evaluateAlerts(
        {
          runtime,
          bus,
          kg,
          perf,
          latency: latencyStats(),
          repairTimestamps,
          lastRecByChild,
        },
        thresholds,
      )) {
        noteAlert(a);
      }
    },

    recordKg(sample) {
      if (sample.kind === "snapshot") {
        kg.nodeCount = sample.nodeCount;
        kg.edgeCount = sample.edgeCount;
        kg.snapshotBytes = sample.bytes;
        if (sample.bytes > kg.snapshotBytesMax) kg.snapshotBytesMax = sample.bytes;
        if (prevSnapshotBytes > 0 && sample.bytes > prevSnapshotBytes) {
          kg.storageGrowthBytes += sample.bytes - prevSnapshotBytes;
        }
        prevSnapshotBytes = sample.bytes;
        pushTrend(trendSnap, sample.bytes);
      } else if (sample.kind === "repair") {
        kg.repairCount += 1;
        kg.lastRepairReason = sample.reason;
        repairTimestamps.push(Date.now());
        if (repairTimestamps.length > 50) repairTimestamps.shift();
      } else if (sample.kind === "migration") {
        kg.migrationCount += 1;
        kg.migrationDurationSumMs += sample.durationMs;
        if (sample.durationMs > kg.migrationDurationMaxMs) {
          kg.migrationDurationMaxMs = sample.durationMs;
        }
      }

      for (const a of evaluateAlerts(
        {
          runtime,
          bus,
          kg,
          perf,
          latency: latencyStats(),
          repairTimestamps,
          lastRecByChild,
        },
        thresholds,
      )) {
        noteAlert(a);
      }
    },

    recordPerf(partial) {
      perf = { ...perf, ...partial };
      if (partial.fps != null) {
        if (perf.fpsMin == null || partial.fps < perf.fpsMin) {
          perf.fpsMin = partial.fps;
        }
      }
    },

    recordKnowledgeUpdate() {
      runtime.knowledgeUpdates += 1;
    },

    recordAttentionTransition(from, to) {
      if (from !== to) runtime.attentionTransitions += 1;
    },

    setThresholds(partial) {
      thresholds = { ...thresholds, ...partial };
    },

    getThresholds() {
      return { ...thresholds };
    },

    snapshot() {
      const latency = latencyStats();
      const alerts = evaluateAlerts(
        {
          runtime,
          bus,
          kg,
          perf,
          latency,
          repairTimestamps,
          lastRecByChild,
        },
        thresholds,
      );
      const healthScore = computeHealthScore({
        latency,
        bus,
        kg,
        runtime,
        thresholds,
        activeAlerts: alerts,
      });
      pushTrend(trendHealth, healthScore);

      const topSlowRules = Object.entries(runtime.slowRules)
        .map(([ruleId, s]) => ({
          ruleId,
          avgMs: s.count ? s.sumMs / s.count : 0,
          maxMs: s.maxMs,
          count: s.count,
        }))
        .sort((a, b) => b.avgMs - a.avgMs)
        .slice(0, 8);

      const warnings = alerts
        .filter((a) => a.severity !== "info")
        .map((a) => a.message);

      return {
        schemaVersion: 1,
        at: new Date().toISOString(),
        uptimeMs: Date.now() - startedAt,
        healthScore,
        runtime: { ...runtime, slowRules: { ...runtime.slowRules } },
        bus: { ...bus },
        kg: { ...kg },
        perf: { ...perf },
        decisionLatency: latency,
        alerts,
        trends: {
          decisionLatencyMs: [...trendLatency],
          queueDepth: [...trendQueue],
          snapshotBytes: [...trendSnap],
          healthScore: [...trendHealth],
        },
        topSlowRules,
        largestSnapshots: [
          {
            label: "knowledge-graph",
            bytes: kg.snapshotBytesMax || kg.snapshotBytes,
          },
        ],
        warnings,
      };
    },

    reset() {
      runtime = emptyRuntime();
      bus = emptyBus();
      kg = emptyKg();
      perf = emptyPerf();
      latencySamples.length = 0;
      trendLatency.length = 0;
      trendQueue.length = 0;
      trendSnap.length = 0;
      trendHealth.length = 0;
      recentAlerts.length = 0;
      repairTimestamps.length = 0;
      lastRecByChild.clear();
      lastAttentionByChild.clear();
      prevSnapshotBytes = 0;
    },

    drainAlerts() {
      const out = [...recentAlerts];
      recentAlerts.length = 0;
      return out;
    },
  };
}

/** Process-wide singleton used by host bridges. */
let defaultCollector: LearningTelemetryCollector | null = null;

export function getDefaultLearningTelemetry(): LearningTelemetryCollector {
  if (!defaultCollector) {
    defaultCollector = createLearningTelemetryCollector();
  }
  return defaultCollector;
}

export function setDefaultLearningTelemetry(
  collector: LearningTelemetryCollector | null,
): void {
  defaultCollector = collector;
}

export function resetDefaultLearningTelemetry(): void {
  defaultCollector = null;
}
