/**
 * Production telemetry + analytics for Amy Astro Intelligence model routing.
 * In-memory ring buffer (dashboard-friendly) + structured log events.
 * No DB schema changes.
 */

import { logger } from "../../lib/logger.js";
import type { BirthSkyModelTier, BirthSkyRouteScores } from "./ai-model-router.js";

export type BirthSkyAiTelemetryEvent = {
  ts: number;
  conversationId: string;
  selectedModel: string;
  tier: BirthSkyModelTier;
  routingReason: string;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
  conversationLength: number;
  escalated: boolean;
  downgraded: boolean;
  confidence: number;
  scores?: BirthSkyRouteScores;
  status: "ok" | "error" | "moderated" | "cancelled" | "timeout";
};

const MAX_EVENTS = 10_000;
const events: BirthSkyAiTelemetryEvent[] = [];

/** Approximate USD per 1M tokens — overridable via env for reporting accuracy. */
export function resolveBirthSkyTokenPrices(): {
  fast: { in: number; out: number };
  reasoning: { in: number; out: number };
} {
  return {
    fast: {
      in: Number(process.env.OPENAI_PRICE_FAST_IN_PER_1M) || 0.25,
      out: Number(process.env.OPENAI_PRICE_FAST_OUT_PER_1M) || 2.0,
    },
    reasoning: {
      in: Number(process.env.OPENAI_PRICE_REASONING_IN_PER_1M) || 1.25,
      out: Number(process.env.OPENAI_PRICE_REASONING_OUT_PER_1M) || 10.0,
    },
  };
}

export function estimateBirthSkyCostUsd(params: {
  tier: BirthSkyModelTier;
  inputTokens: number;
  outputTokens: number;
}): number {
  const prices = resolveBirthSkyTokenPrices()[params.tier];
  return (
    (params.inputTokens / 1e6) * prices.in + (params.outputTokens / 1e6) * prices.out
  );
}

export function recordBirthSkyAiTelemetry(
  event: Omit<BirthSkyAiTelemetryEvent, "ts"> & { ts?: number },
): BirthSkyAiTelemetryEvent {
  const row: BirthSkyAiTelemetryEvent = {
    ...event,
    ts: event.ts ?? Date.now(),
  };
  events.push(row);
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }

  logger.info(
    {
      evt: "birth-sky.ai.telemetry",
      conversationId: row.conversationId,
      selectedModel: row.selectedModel,
      tier: row.tier,
      routingReason: row.routingReason,
      latencyMs: row.latencyMs,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      estimatedCostUsd: row.estimatedCostUsd,
      conversationLength: row.conversationLength,
      escalated: row.escalated,
      downgraded: row.downgraded,
      confidence: row.confidence,
      status: row.status,
      scores: row.scores,
    },
    "birth-sky.ai.telemetry",
  );

  return row;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function topReasons(rows: BirthSkyAiTelemetryEvent[], limit = 8): Array<{ reason: string; count: number }> {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.routingReason, (map.get(r.routingReason) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export type BirthSkyRouterAnalyticsReport = {
  sampleSize: number;
  modelUsagePct: { fast: number; reasoning: number };
  modelUsageCount: { fast: number; reasoning: number };
  averageLatencyMs: number | null;
  averageCostUsd: number | null;
  averageInputTokens: number | null;
  averageOutputTokens: number | null;
  escalationFrequency: number;
  escalationCount: number;
  mostCommonEscalationReasons: Array<{ reason: string; count: number }>;
  mostExpensiveConversations: Array<{
    conversationId: string;
    estimatedCostUsd: number;
    turns: number;
  }>;
  longestConversations: Array<{
    conversationId: string;
    conversationLength: number;
    turns: number;
  }>;
  recommendations: string[];
};

/**
 * Aggregate in-process telemetry into dashboard metrics + self-tuning suggestions.
 */
export function buildBirthSkyRouterAnalytics(
  source: BirthSkyAiTelemetryEvent[] = events,
): BirthSkyRouterAnalyticsReport {
  const sampleSize = source.length;
  const fastN = source.filter((e) => e.tier === "fast").length;
  const reasoningN = source.filter((e) => e.tier === "reasoning").length;
  const escalations = source.filter((e) => e.escalated);
  const latencies = source
    .map((e) => e.latencyMs)
    .filter((n): n is number => typeof n === "number" && n >= 0);
  const costs = source
    .map((e) => e.estimatedCostUsd)
    .filter((n): n is number => typeof n === "number" && n >= 0);
  const inTok = source
    .map((e) => e.inputTokens)
    .filter((n): n is number => typeof n === "number" && n >= 0);
  const outTok = source
    .map((e) => e.outputTokens)
    .filter((n): n is number => typeof n === "number" && n >= 0);

  const byConv = new Map<
    string,
    { cost: number; maxLen: number; turns: number }
  >();
  for (const e of source) {
    const cur = byConv.get(e.conversationId) ?? { cost: 0, maxLen: 0, turns: 0 };
    cur.cost += e.estimatedCostUsd ?? 0;
    cur.maxLen = Math.max(cur.maxLen, e.conversationLength);
    cur.turns += 1;
    byConv.set(e.conversationId, cur);
  }
  const convRows = [...byConv.entries()].map(([conversationId, v]) => ({
    conversationId,
    estimatedCostUsd: Number(v.cost.toFixed(6)),
    conversationLength: v.maxLen,
    turns: v.turns,
  }));

  const mostExpensiveConversations = [...convRows]
    .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd)
    .slice(0, 10)
    .map(({ conversationId, estimatedCostUsd, turns }) => ({
      conversationId,
      estimatedCostUsd,
      turns,
    }));

  const longestConversations = [...convRows]
    .sort((a, b) => b.conversationLength - a.conversationLength || b.turns - a.turns)
    .slice(0, 10)
    .map(({ conversationId, conversationLength, turns }) => ({
      conversationId,
      conversationLength,
      turns,
    }));

  const fastPct = sampleSize > 0 ? fastN / sampleSize : 0;
  const reasoningPct = sampleSize > 0 ? reasoningN / sampleSize : 0;
  const recommendations = buildSelfTuningRecommendations({
    sampleSize,
    fastPct,
    reasoningPct,
    escalations,
    source,
  });

  return {
    sampleSize,
    modelUsagePct: {
      fast: Number(fastPct.toFixed(4)),
      reasoning: Number(reasoningPct.toFixed(4)),
    },
    modelUsageCount: { fast: fastN, reasoning: reasoningN },
    averageLatencyMs: avg(latencies) != null ? Math.round(avg(latencies)!) : null,
    averageCostUsd: avg(costs) != null ? Number(avg(costs)!.toFixed(6)) : null,
    averageInputTokens: avg(inTok) != null ? Math.round(avg(inTok)!) : null,
    averageOutputTokens: avg(outTok) != null ? Math.round(avg(outTok)!) : null,
    escalationFrequency: sampleSize > 0 ? Number((escalations.length / sampleSize).toFixed(4)) : 0,
    escalationCount: escalations.length,
    mostCommonEscalationReasons: topReasons(escalations),
    mostExpensiveConversations,
    longestConversations,
    recommendations,
  };
}

function buildSelfTuningRecommendations(params: {
  sampleSize: number;
  fastPct: number;
  reasoningPct: number;
  escalations: BirthSkyAiTelemetryEvent[];
  source: BirthSkyAiTelemetryEvent[];
}): string[] {
  const tips: string[] = [];
  const { sampleSize, fastPct, reasoningPct, escalations, source } = params;
  if (sampleSize === 0) {
    return ["No telemetry yet — route traffic to populate birth-sky.ai.telemetry."];
  }

  tips.push(
    `${Math.round(fastPct * 100)}% of requests stayed on GPT-5 Mini (fast tier).`,
  );
  tips.push(
    `${Math.round(reasoningPct * 100)}% required GPT-5 (reasoning tier).`,
  );

  if (reasoningPct > 0.4) {
    tips.push(
      "Reasoning share is above the 40% target — review score:parenting / score:reasoning soft hits and raise OPENAI_CHAT_ROUTE_THRESHOLD if quality holds.",
    );
  } else if (reasoningPct < 0.25) {
    tips.push(
      "Reasoning share is below 25% — watch grounding/practical metrics for under-escalation on emotional parenting threads.",
    );
  } else {
    tips.push("Model mix is inside the 60–75% Mini / 25–40% GPT-5 target band.");
  }

  const softEscalations = escalations.filter((e) =>
    /score:parenting|score:reasoning|default/.test(e.routingReason),
  );
  if (softEscalations.length > escalations.length * 0.5 && escalations.length >= 8) {
    tips.push(
      `${softEscalations.length} soft-score escalations may be candidates for Mini if practical usefulness remains ≥90%.`,
    );
  }

  const sticky = source.filter((e) => e.routingReason === "stickiness_deep_thread");
  if (sticky.length > 0) {
    tips.push(
      `${sticky.length} turns held on GPT-5 via deep-thread stickiness (no quality downgrade mid-conversation).`,
    );
  }

  const quick = source.filter((e) => e.routingReason === "quick_followup");
  if (quick.length > 0) {
    tips.push(
      `${Math.round((quick.length / sampleSize) * 100)}% were short follow-ups kept on Mini — good cost hygiene.`,
    );
  }

  return tips;
}

export function getBirthSkyRouterDashboard(): Record<string, unknown> {
  const report = buildBirthSkyRouterAnalytics();
  return {
    birth_sky_ai_samples: report.sampleSize,
    birth_sky_ai_fast_pct: report.modelUsagePct.fast,
    birth_sky_ai_reasoning_pct: report.modelUsagePct.reasoning,
    birth_sky_ai_avg_latency_ms: report.averageLatencyMs,
    birth_sky_ai_avg_cost_usd: report.averageCostUsd,
    birth_sky_ai_avg_input_tokens: report.averageInputTokens,
    birth_sky_ai_avg_output_tokens: report.averageOutputTokens,
    birth_sky_ai_escalation_frequency: report.escalationFrequency,
    birth_sky_ai_top_escalation_reasons: report.mostCommonEscalationReasons,
    birth_sky_ai_most_expensive_conversations: report.mostExpensiveConversations,
    birth_sky_ai_longest_conversations: report.longestConversations,
    birth_sky_ai_recommendations: report.recommendations,
  };
}

export function resetBirthSkyRouterTelemetryForTests(): void {
  events.length = 0;
}

export function listBirthSkyAiTelemetryForTests(): BirthSkyAiTelemetryEvent[] {
  return [...events];
}
