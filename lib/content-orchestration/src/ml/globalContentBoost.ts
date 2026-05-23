import type { PoolContentItem } from "../types.js";
import { sanitizeContentKey } from "./anonymousAggregation.js";
import { capGlobalBoost, dampWeakPatternBoost } from "./globalBiasControl.js";
import { getCohortContentSuccess } from "./cohortIntelligence.js";
import type { GlobalGraph, GlobalPlanContext } from "./types-global.js";

export const DEFAULT_GLOBAL_SUCCESS_WEIGHT = 0.08;

export function globalSuccessRateForContent(
  item: PoolContentItem,
  graph: GlobalGraph,
  ctx?: GlobalPlanContext,
): number {
  const key = sanitizeContentKey(item.contentId);
  const direct = graph.successRates[key];
  if (direct !== undefined) return dampWeakPatternBoost(direct);

  const moduleRate = graph.engagementStats[item.contentId.split("_")[0] ?? ""];
  if (moduleRate !== undefined) return dampWeakPatternBoost(moduleRate);

  if (ctx) {
    const cohort = getCohortContentSuccess(ctx.cohortKey, key);
    if (cohort !== undefined) return dampWeakPatternBoost(cohort);
  }

  return 0.5;
}

export function computeGlobalContentBoost(
  item: PoolContentItem,
  graph: GlobalGraph,
  ctx?: GlobalPlanContext,
  weight = DEFAULT_GLOBAL_SUCCESS_WEIGHT,
): number {
  const rate = globalSuccessRateForContent(item, graph, ctx);
  return capGlobalBoost(weight * rate);
}

export function explorationScoreForItem(
  item: PoolContentItem,
  graph: GlobalGraph,
  ctx: GlobalPlanContext,
): number {
  const rate = globalSuccessRateForContent(item, graph, ctx);
  const cohort = getCohortContentSuccess(ctx.cohortKey, sanitizeContentKey(item.contentId));
  const cohortPart = cohort !== undefined ? cohort * 0.4 : 0;
  return rate * 0.6 + cohortPart;
}

export function pickExplorationRandomFromGlobal(
  items: PoolContentItem[],
  graph: GlobalGraph,
  ctx: GlobalPlanContext,
  fallbackRandom: number,
): number {
  if (items.length === 0) return fallbackRandom;
  const scored = items.map((item) => ({
    item,
    score: explorationScoreForItem(item, graph, ctx),
  }));
  scored.sort((a, b) => b.score - a.score);
  const topThird = scored.slice(0, Math.max(1, Math.ceil(scored.length / 3)));
  const avg =
    topThird.reduce((a, s) => a + s.score, 0) / topThird.length;
  return Math.min(0.98, Math.max(fallbackRandom, avg));
}
