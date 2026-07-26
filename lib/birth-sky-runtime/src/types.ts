/**
 * Birth Sky production runtime — observability, flags, failover, experiments.
 * Does not modify intelligence engine internals.
 */

export const BIRTH_SKY_RUNTIME_VERSION = "birth-sky-runtime/1.0.0" as const;

/** Deterministic pipeline SLO (ms). */
export const PIPELINE_SLO_MS = 500;

export type PipelineStageId =
  | "meaning"
  | "development"
  | "adaptive"
  | "conversation"
  | "evidence"
  | "evaluation";

export type StageTiming = {
  stage: PipelineStageId;
  durationMs: number;
  status: "ok" | "skipped" | "failed" | "disabled";
  errorCode?: string;
};

export type PipelineFeatureFlags = {
  meaning: boolean;
  development: boolean;
  adaptive: boolean;
  conversation: boolean;
  evidence: boolean;
  evaluation: boolean;
};

export type ExperimentArm = {
  id: string;
  /** Presentation-only overrides — never change engine math. */
  conversationDepthBias?: "brief" | "medium" | "deep" | null;
  exampleRichness?: "low" | "medium" | "high" | null;
  responseLengthBias?: "short" | "standard" | "long" | null;
  explanationOrder?: "default" | "actions_first" | "sky_first" | null;
};

export type ExperimentAssignment = {
  experimentId: string;
  armId: string;
  arm: ExperimentArm;
};

export type PipelineObservabilityEvent = {
  ts: number;
  requestId: string;
  /** Opaque hashed conversation key — never raw ids in dashboards if sensitive. */
  conversationKey?: string | null;
  stageTimings: StageTiming[];
  totalPipelineMs: number;
  llmLatencyMs?: number | null;
  cacheHit?: boolean | null;
  cacheMiss?: boolean | null;
  evaluationScore?: number | null;
  safetyScore?: number | null;
  snapshotVersions: {
    meaning?: string | null;
    development?: string | null;
    adaptive?: string | null;
    conversation?: string | null;
    evidence?: string | null;
  };
  flags: PipelineFeatureFlags;
  experiment?: { experimentId: string; armId: string } | null;
  failoverStages: PipelineStageId[];
  status: "ok" | "degraded" | "error";
  /** Cost fields (no PII). */
  promptTokens?: number | null;
  completionTokens?: number | null;
  estimatedCostUsd?: number | null;
};

export type ProductAnalyticsEventName =
  | "conversation_start"
  | "conversation_complete"
  | "conversation_dropoff"
  | "subscription_entry"
  | "subscription_purchase"
  | "conversation_satisfaction"
  | "pipeline_failover"
  | "pipeline_cache_hit"
  | "pipeline_cache_miss";

export type ProductAnalyticsEvent = {
  ts: number;
  name: ProductAnalyticsEventName;
  /** Anonymous bucket only (e.g. dayPart, entryPoint, armId). */
  props?: Record<string, string | number | boolean>;
};

export type CostRollup = {
  sampleSize: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalEstimatedCostUsd: number;
  averageCostPerConversationUsd: number | null;
  dailyCostUsd: number;
  monthlyCostUsd: number;
  dayKey: string;
  monthKey: string;
};

export type QualityDashboardMetrics = {
  averageResponseTimeMs: number | null;
  averageEvaluationScore: number | null;
  averageSafetyScore: number | null;
  failureRate: number;
  fallbackRate: number;
  cacheHitRatio: number | null;
  conversationCompletionRate: number | null;
  sampleSize: number;
};

export type AdminDashboardPayload = {
  runtimeVersion: string;
  pipelineVersions: {
    meaning: string;
    development: string;
    adaptive: string;
    conversation: string;
    evidence: string;
    evaluation: string;
    runtime: string;
  };
  featureFlags: PipelineFeatureFlags;
  latency: {
    averagePipelineMs: number | null;
    p95PipelineMs: number | null;
    sloMs: number;
    sloPassRate: number | null;
  };
  quality: QualityDashboardMetrics;
  cost: CostRollup;
  errors: { code: string; count: number }[];
  experiments: Array<{ experimentId: string; armCounts: Record<string, number> }>;
  recentRequestCount: number;
};
