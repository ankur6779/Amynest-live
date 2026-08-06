/**
 * resolveTodayRecommendation — map recommendations to existing Today card ids.
 * Never renders. Never imports React. Never executes CTAs.
 */

import type {
  TodayRecommendation,
  TodaySlotRecommendation,
} from "@/v2/today/recommendation-adapter/types";
import { EXPERIENCE_TO_TODAY_CARD } from "./cards";
import { isAmyTodayRecommendationResolverEnabled } from "./flags";
import { freezeDeep } from "./freeze";
import { recordResolverHealth } from "./health-state";
import {
  AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION,
  AMY_TODAY_RENDER_VERSION,
  type ResolveTodayRecommendationOptions,
  type TodayRenderableRecommendation,
} from "./types";

function emptyRenderable(
  generatedAt: string,
  legacyFallback: boolean,
): TodayRenderableRecommendation {
  return freezeDeep({
    heroCardId: null,
    secondaryCardIds: Object.freeze([] as string[]),
    passiveCardIds: Object.freeze([] as string[]),
    ctaIds: Object.freeze([] as string[]),
    priority: Object.freeze([] as string[]),
    renderVersion: AMY_TODAY_RENDER_VERSION,
    resolverVersion: AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION,
    generatedAt,
    legacyFallback,
    missingCards: Object.freeze([] as string[]),
  });
}

function mapSlot(
  slot: TodaySlotRecommendation | null,
  missing: string[],
  ctas: string[],
): string | null {
  if (!slot) return null;
  const mapping = EXPERIENCE_TO_TODAY_CARD[slot.experienceId];
  if (!mapping) {
    missing.push(slot.experienceId);
    return null;
  }
  ctas.push(mapping.ctaId);
  return mapping.cardId;
}

/**
 * Resolve TodayRecommendation → card identities for existing Today components.
 * Flag OFF / LEGACY_ONLY / BRAIN_UNAVAILABLE → empty legacy fallback.
 * Never throws.
 */
export function resolveTodayRecommendation(
  recommendation: TodayRecommendation | null | undefined,
  options: ResolveTodayRecommendationOptions = {},
): TodayRenderableRecommendation {
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();
  const enabled =
    options.enabled ?? isAmyTodayRecommendationResolverEnabled();
  const record = options.recordHealth ?? true;

  if (!enabled || !recommendation) {
    const out = emptyRenderable(generatedAt, true);
    if (record) recordResolverHealth(out);
    return out;
  }

  if (
    recommendation.source === "LEGACY_ONLY" ||
    recommendation.source === "BRAIN_UNAVAILABLE"
  ) {
    const out = emptyRenderable(generatedAt, true);
    if (record) recordResolverHealth(out);
    return out;
  }

  const missing: string[] = [];
  const ctas: string[] = [];

  const heroCardId = mapSlot(
    recommendation.heroRecommendation,
    missing,
    ctas,
  );

  const secondaryCardIds: string[] = [];
  const secondaryId = mapSlot(
    recommendation.secondaryRecommendation,
    missing,
    ctas,
  );
  if (secondaryId) secondaryCardIds.push(secondaryId);

  const passiveCardIds: string[] = [];
  const passiveId = mapSlot(
    recommendation.passiveRecommendation,
    missing,
    ctas,
  );
  if (passiveId) passiveCardIds.push(passiveId);

  const priority: string[] = [];
  if (heroCardId) priority.push(heroCardId);
  for (const id of secondaryCardIds) priority.push(id);
  for (const id of passiveCardIds) priority.push(id);

  const out = freezeDeep({
    heroCardId,
    secondaryCardIds: Object.freeze(secondaryCardIds),
    passiveCardIds: Object.freeze(passiveCardIds),
    ctaIds: Object.freeze([...new Set(ctas)]),
    priority: Object.freeze(priority),
    renderVersion: AMY_TODAY_RENDER_VERSION,
    resolverVersion: AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION,
    generatedAt,
    legacyFallback: false,
    missingCards: Object.freeze([...new Set(missing)]),
  }) satisfies TodayRenderableRecommendation;

  if (record) recordResolverHealth(out);
  return out;
}
