import { logger } from "../lib/logger.js";

export const COACH_OBSERVABILITY_EVENTS = [
  "coach_duplicate_prevented",
  "coach_fallback_used",
  "coach_ai_timeout",
  "coach_strategy_switch",
  "coach_feedback_yes",
  "coach_feedback_somewhat",
  "coach_feedback_no",
  "coach_progress_advanced",
  "coach_progress_stalled",
  "coach_semantic_duplicate_detected",
  "coach_cache_hit",
  "coach_cache_bypass",
  "coach_cache_miss",
  "coach_next_win_generated",
  "coach_generate_async_enqueued",
  "coach_generate_completed",
  "coach_generate_gateway_failure",
  "coach_json_parse_failed",
  "coach_content_type_mismatch",
  "coach_emergency_fallback",
] as const;

export type CoachObservabilityEvent = (typeof COACH_OBSERVABILITY_EVENTS)[number];

export const COACH_ALERT_THRESHOLDS = {
  aiTimeoutRate: 0.02,
  fallbackRate: 0.1,
  duplicateDetectionRate: 0.05,
  gatewayFailureRate: 0.02,
} as const;

type CounterMap = Record<string, number>;

const counters: CounterMap = Object.fromEntries(
  COACH_OBSERVABILITY_EVENTS.map((e) => [e, 0]),
) as CounterMap;

let totalGenerateAttempts = 0;
let totalNextWinAttempts = 0;

export function resetCoachObservabilityForTests(): void {
  for (const key of COACH_OBSERVABILITY_EVENTS) counters[key] = 0;
  totalGenerateAttempts = 0;
  totalNextWinAttempts = 0;
}

export function recordCoachObservabilityEvent(
  event: CoachObservabilityEvent,
  meta?: Record<string, unknown>,
): void {
  counters[event] = (counters[event] ?? 0) + 1;
  logger.info({ evt: event, coachObs: true, ...meta }, "coach observability");
}

export function recordCoachGenerateTelemetry(meta: {
  durationMs: number;
  queueMs?: number;
  aiMs?: number;
  source: "ai" | "fallback" | "cache" | "emergency";
  asyncJob?: boolean;
}): void {
  logger.info(
    {
      evt: "coach_generate.telemetry",
      coachObs: true,
      ...meta,
    },
    "coach generate telemetry",
  );
  if (meta.source === "ai") {
    recordCoachObservabilityEvent("coach_generate_completed", meta);
  }
}

export function recordCoachGenerateAttempt(outcome: "ai" | "fallback" | "cache" | "timeout" | "emergency"): void {
  totalGenerateAttempts += 1;
  if (outcome === "fallback" || outcome === "emergency") {
    recordCoachObservabilityEvent(
      outcome === "emergency" ? "coach_emergency_fallback" : "coach_fallback_used",
    );
  }
  if (outcome === "timeout") recordCoachObservabilityEvent("coach_ai_timeout");
  if (outcome === "cache") recordCoachObservabilityEvent("coach_cache_hit");
  if (outcome === "ai") recordCoachObservabilityEvent("coach_cache_miss");
}

export function recordCoachNextWinAttempt(outcome: "ai" | "fallback" | "timeout"): void {
  totalNextWinAttempts += 1;
  recordCoachObservabilityEvent("coach_next_win_generated", { outcome });
  if (outcome === "fallback") recordCoachObservabilityEvent("coach_fallback_used");
  if (outcome === "timeout") recordCoachObservabilityEvent("coach_ai_timeout");
}

export function recordCoachFeedbackEvent(feedback: "yes" | "somewhat" | "no", meta?: Record<string, unknown>): void {
  if (feedback === "yes") recordCoachObservabilityEvent("coach_feedback_yes", meta);
  else if (feedback === "somewhat") recordCoachObservabilityEvent("coach_feedback_somewhat", meta);
  else recordCoachObservabilityEvent("coach_feedback_no", meta);
}

export function recordCoachProgressDelta(beforePct: number, afterPct: number, meta?: Record<string, unknown>): void {
  if (afterPct > beforePct) {
    recordCoachObservabilityEvent("coach_progress_advanced", { beforePct, afterPct, ...meta });
  } else if (afterPct === beforePct && afterPct < 100) {
    recordCoachObservabilityEvent("coach_progress_stalled", { beforePct, afterPct, ...meta });
  }
}

export function getCoachObservabilityDashboard(): {
  counters: Record<CoachObservabilityEvent, number>;
  rates: {
    aiTimeoutRate: number;
    fallbackRate: number;
    duplicateDetectionRate: number;
    cacheHitRate: number;
    feedbackDistribution: { yes: number; somewhat: number; no: number };
    progressAdvanceRate: number;
  };
  alerts: { metric: string; threshold: number; actual: number; triggered: boolean }[];
  totals: { generateAttempts: number; nextWinAttempts: number };
} {
  const aiTimeouts = counters.coach_ai_timeout ?? 0;
  const fallbacks = counters.coach_fallback_used ?? 0;
  const duplicates =
    (counters.coach_duplicate_prevented ?? 0) + (counters.coach_semantic_duplicate_detected ?? 0);
  const cacheHits = counters.coach_cache_hit ?? 0;
  const gatewayFailures = counters.coach_generate_gateway_failure ?? 0;
  const attempts = Math.max(1, totalGenerateAttempts + totalNextWinAttempts);

  const yes = counters.coach_feedback_yes ?? 0;
  const somewhat = counters.coach_feedback_somewhat ?? 0;
  const no = counters.coach_feedback_no ?? 0;
  const feedbackTotal = Math.max(1, yes + somewhat + no);

  const aiTimeoutRate = aiTimeouts / attempts;
  const fallbackRate = (fallbacks + (counters.coach_emergency_fallback ?? 0)) / attempts;
  const gatewayFailureRate = gatewayFailures / attempts;
  const duplicateDetectionRate = duplicates / attempts;
  const cacheHitRate = cacheHits / Math.max(1, totalGenerateAttempts);
  const progressAdvanceRate = (counters.coach_progress_advanced ?? 0) / feedbackTotal;

  const alerts = [
    {
      metric: "aiTimeoutRate",
      threshold: COACH_ALERT_THRESHOLDS.aiTimeoutRate,
      actual: aiTimeoutRate,
      triggered: aiTimeoutRate > COACH_ALERT_THRESHOLDS.aiTimeoutRate,
    },
    {
      metric: "fallbackRate",
      threshold: COACH_ALERT_THRESHOLDS.fallbackRate,
      actual: fallbackRate,
      triggered: fallbackRate > COACH_ALERT_THRESHOLDS.fallbackRate,
    },
    {
      metric: "duplicateDetectionRate",
      threshold: COACH_ALERT_THRESHOLDS.duplicateDetectionRate,
      actual: duplicateDetectionRate,
      triggered: duplicateDetectionRate > COACH_ALERT_THRESHOLDS.duplicateDetectionRate,
    },
    {
      metric: "gatewayFailureRate",
      threshold: COACH_ALERT_THRESHOLDS.gatewayFailureRate,
      actual: gatewayFailureRate,
      triggered: gatewayFailureRate > COACH_ALERT_THRESHOLDS.gatewayFailureRate,
    },
  ];

  return {
    counters: { ...counters } as Record<CoachObservabilityEvent, number>,
    rates: {
      aiTimeoutRate,
      fallbackRate,
      duplicateDetectionRate,
      cacheHitRate,
      feedbackDistribution: { yes, somewhat, no },
      progressAdvanceRate,
    },
    alerts,
    totals: { generateAttempts: totalGenerateAttempts, nextWinAttempts: totalNextWinAttempts },
  };
}
