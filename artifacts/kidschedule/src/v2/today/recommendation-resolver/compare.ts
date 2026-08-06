/**
 * compareRenderableRecommendation — developer diff only.
 */

import { freezeDeep } from "./freeze";
import type {
  RenderableRecommendationCompareEntry,
  RenderableRecommendationCompareStatus,
  TodayRenderableRecommendation,
} from "./types";

function entryStatus(
  before: unknown,
  after: unknown,
): RenderableRecommendationCompareStatus {
  if (Object.is(before, after)) return "MATCH";
  if (Array.isArray(before) && Array.isArray(after)) {
    if (
      before.length === after.length &&
      before.every((v, i) => Object.is(v, after[i]))
    ) {
      return "MATCH";
    }
    const overlap = before.filter((v) => after.includes(v));
    if (overlap.length > 0) return "PARTIAL_MATCH";
    return "MISMATCH";
  }
  if (before == null || after == null) return "UNKNOWN";
  return "MISMATCH";
}

export function compareRenderableRecommendation(
  before: TodayRenderableRecommendation,
  after: TodayRenderableRecommendation,
): ReadonlyArray<RenderableRecommendationCompareEntry> {
  const paths: Array<keyof TodayRenderableRecommendation> = [
    "heroCardId",
    "secondaryCardIds",
    "passiveCardIds",
    "ctaIds",
    "priority",
    "legacyFallback",
    "missingCards",
    "renderVersion",
    "resolverVersion",
  ];

  const out: RenderableRecommendationCompareEntry[] = [];
  for (const path of paths) {
    const b = before[path];
    const a = after[path];
    const status = entryStatus(b, a);
    if (status === "MATCH") continue;
    out.push(
      freezeDeep({
        path,
        status,
        before: b,
        after: a,
      }),
    );
  }
  return Object.freeze(out);
}
