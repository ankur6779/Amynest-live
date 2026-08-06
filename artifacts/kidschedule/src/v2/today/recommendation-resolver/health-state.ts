/**
 * Process-local resolver health — developer only.
 * Not production persistence. Never for UI.
 */

import type { TodayRenderableRecommendation } from "./types";

let resolvedCards = 0;
let missingCards = 0;
let legacyFallbacks = 0;
let lastRenderable: TodayRenderableRecommendation | null = null;

export function recordResolverHealth(
  renderable: TodayRenderableRecommendation,
): void {
  lastRenderable = renderable;
  if (renderable.legacyFallback) {
    legacyFallbacks += 1;
    return;
  }
  const resolved =
    (renderable.heroCardId ? 1 : 0) +
    renderable.secondaryCardIds.length +
    renderable.passiveCardIds.length;
  resolvedCards += resolved;
  missingCards += renderable.missingCards.length;
}

export function getRenderableRecommendation(): TodayRenderableRecommendation | null {
  return lastRenderable;
}

export function getResolverHealthCounters(): {
  resolvedCards: number;
  missingCards: number;
  legacyFallbacks: number;
} {
  return { resolvedCards, missingCards, legacyFallbacks };
}

export function clearTodayRecommendationResolverStateForTests(): void {
  resolvedCards = 0;
  missingCards = 0;
  legacyFallbacks = 0;
  lastRenderable = null;
}
