/**
 * Amy Learning Platform — production telemetry types.
 * Collectors are silent; only the DEV dashboard renders them.
 */

export const LEARNING_TELEMETRY_SCHEMA_VERSION = 1 as const;

export type AlertSeverity = "info" | "warn" | "critical";

export type AlertId =
  | "runtime_latency_high"
  | "queue_depth_high"
  | "repair_spike"
  | "storage_limit"
  | "recommendations_repetitive"
  | "offline_duration_high"
  | "flush_slow"
  | "snapshot_large";

export type TelemetryAlert = {
  id: AlertId;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  at: string;
};

export type LatencyStats = {
  count: number;
  sumMs: number;
  maxMs: number;
  p95Ms: number;
  lastMs: number;
};

export type RuntimeCounters = {
  decisions: number;
  ruleEvaluations: number;
  ruleMatches: number;
  ruleFailures: number;
  cooldownHits: number;
  recommendationOffered: number;
  recommendationAccepted: number;
  recommendationIgnored: number;
  reviewQueueMax: number;
  reviewQueueLast: number;
  knowledgeUpdates: number;
  attentionTransitions: number;
  slowRules: Record<string, { count: number; sumMs: number; maxMs: number }>;
};

export type BusCounters = {
  publishes: number;
  publishLatencySumMs: number;
  publishLatencyMaxMs: number;
  duplicatesPrevented: number;
  replays: number;
  flushes: number;
  flushDurationSumMs: number;
  flushDurationMaxMs: number;
  queueDepthLast: number;
  queueDepthMax: number;
  offlineStartedAt: number | null;
  offlineDurationTotalMs: number;
  offlineDurationLastMs: number;
};

export type KgCounters = {
  nodeCount: number;
  edgeCount: number;
  snapshotBytes: number;
  snapshotBytesMax: number;
  repairCount: number;
  migrationCount: number;
  migrationDurationSumMs: number;
  migrationDurationMaxMs: number;
  storageGrowthBytes: number;
  lastRepairReason: string | null;
};

export type PerfCounters = {
  heapUsedMb: number | null;
  heapTotalMb: number | null;
  deviceMemoryGb: number | null;
  fps: number | null;
  fpsMin: number | null;
  audioLatencyMs: number | null;
  bundleLoadMs: number | null;
  longTasks: number;
};

export type TelemetrySnapshot = {
  schemaVersion: typeof LEARNING_TELEMETRY_SCHEMA_VERSION;
  at: string;
  uptimeMs: number;
  healthScore: number;
  runtime: RuntimeCounters;
  bus: BusCounters;
  kg: KgCounters;
  perf: PerfCounters;
  decisionLatency: LatencyStats;
  alerts: TelemetryAlert[];
  trends: {
    decisionLatencyMs: number[];
    queueDepth: number[];
    snapshotBytes: number[];
    healthScore: number[];
  };
  topSlowRules: Array<{ ruleId: string; avgMs: number; maxMs: number; count: number }>;
  largestSnapshots: Array<{ label: string; bytes: number }>;
  warnings: string[];
};

export type AlertThresholds = {
  runtimeLatencyMs: number;
  queueDepth: number;
  repairWindowCount: number;
  repairWindowMs: number;
  storageBytes: number;
  recommendationRepeat: number;
  offlineDurationMs: number;
  flushDurationMs: number;
  snapshotBytes: number;
};

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  runtimeLatencyMs: 16,
  queueDepth: 40,
  repairWindowCount: 3,
  repairWindowMs: 60_000,
  storageBytes: 2_500_000,
  recommendationRepeat: 5,
  offlineDurationMs: 30 * 60_000,
  flushDurationMs: 250,
  snapshotBytes: 1_500_000,
};
