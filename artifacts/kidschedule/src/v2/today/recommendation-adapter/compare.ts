/**
 * compareLegacyRecommendation — observe Legacy vs normalized recommendation.
 * Developer / QA only. Never drives UI.
 */

import { freezeDeep } from "./freeze";
import {
  AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION,
  type LegacyRecommendationCompareEntry,
  type LegacyRecommendationCompareResult,
  type LegacyRecommendationCompareStatus,
  type LegacyRecommendationSurface,
  type TodayRecommendation,
} from "./types";

function experienceStatus(
  legacyId: string | null,
  brainId: string | null,
): LegacyRecommendationCompareStatus {
  if (legacyId == null && brainId == null) return "MATCH";
  if (legacyId == null || brainId == null) return "UNKNOWN";
  return legacyId === brainId ? "MATCH" : "MISMATCH";
}

function aggregate(
  entries: ReadonlyArray<LegacyRecommendationCompareEntry>,
): LegacyRecommendationCompareStatus {
  if (entries.some((e) => e.status === "LEGACY_ONLY")) return "LEGACY_ONLY";
  if (entries.some((e) => e.status === "MISMATCH")) return "MISMATCH";
  if (entries.some((e) => e.status === "PARTIAL_MATCH")) return "PARTIAL_MATCH";
  if (entries.some((e) => e.status === "UNKNOWN")) {
    return entries.some((e) => e.status === "MATCH")
      ? "PARTIAL_MATCH"
      : "UNKNOWN";
  }
  return "MATCH";
}

export function compareLegacyRecommendation(
  legacy: LegacyRecommendationSurface,
  recommendation: TodayRecommendation,
): LegacyRecommendationCompareResult {
  const entries: LegacyRecommendationCompareEntry[] = [];

  const push = (
    dimension: LegacyRecommendationCompareEntry["dimension"],
    status: LegacyRecommendationCompareStatus,
    legacyValue: unknown,
    recommendationValue: unknown,
    note: string | null,
  ) => {
    entries.push(
      freezeDeep({
        dimension,
        status,
        legacyValue,
        recommendationValue,
        note,
      }),
    );
  };

  if (
    recommendation.source === "LEGACY_ONLY" ||
    recommendation.source === "BRAIN_UNAVAILABLE"
  ) {
    push(
      "source",
      "LEGACY_ONLY",
      "legacy",
      recommendation.source,
      "Today remains on Legacy — Brain recommendation not consumed",
    );
    return freezeDeep({
      status: "LEGACY_ONLY",
      entries: Object.freeze(entries),
      adapterVersion: AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION,
    });
  }

  push(
    "source",
    "MATCH",
    "brain",
    recommendation.source,
    null,
  );

  push(
    "hero",
    experienceStatus(
      legacy.primaryExperienceId,
      recommendation.heroRecommendation?.experienceId ?? null,
    ),
    legacy.primaryExperienceId,
    recommendation.heroRecommendation?.experienceId ?? null,
    null,
  );

  push(
    "secondary",
    experienceStatus(
      legacy.secondaryExperienceId,
      recommendation.secondaryRecommendation?.experienceId ?? null,
    ),
    legacy.secondaryExperienceId,
    recommendation.secondaryRecommendation?.experienceId ?? null,
    null,
  );

  push(
    "passive",
    experienceStatus(
      legacy.passiveExperienceId,
      recommendation.passiveRecommendation?.experienceId ?? null,
    ),
    legacy.passiveExperienceId,
    recommendation.passiveRecommendation?.experienceId ?? null,
    null,
  );

  return freezeDeep({
    status: aggregate(entries),
    entries: Object.freeze(entries),
    adapterVersion: AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION,
  });
}
