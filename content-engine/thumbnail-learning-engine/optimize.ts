/**
 * Auto-optimization recommendations from detected patterns.
 * Written to disk for future use — does NOT modify Thumbnail Engine.
 */

import { isTrustedSample } from "./ingest.js";
import type {
  ThumbnailLearningPatterns,
  ThumbnailLearningRecommendations,
  ThumbnailLearningRecord,
} from "./types.js";
import { THUMBNAIL_LEARNING_ENGINE_VERSION } from "./types.js";

export const CTR_TARGET = 0.1;
export const CTR_LONG_TERM_TARGET = 0.15;

export function buildLearningRecommendations(
  records: ThumbnailLearningRecord[],
  patterns: ThumbnailLearningPatterns,
): ThumbnailLearningRecommendations {
  const trusted = records.filter((r) => isTrustedSample(r));
  const top = (list: typeof patterns.emotions, n = 3) =>
    list.slice(0, n).map((w) => w.value);

  const preferredLen = patterns.headlineLength[0]
    ? Number(patterns.headlineLength[0].value)
    : null;

  const notes: string[] = [
    "Recommendations are derived only from stored YouTube Analytics CTR outcomes.",
    "Thumbnail Engine is not modified — load these recommendations at generation time when ready.",
  ];
  if (trusted.length < 5) {
    notes.push(
      `Sample size ${trusted.length} is small — keep publishing; patterns stabilize with more real data.`,
    );
  }

  return {
    version: THUMBNAIL_LEARNING_ENGINE_VERSION,
    updatedAt: new Date().toISOString(),
    targetCtr: CTR_TARGET,
    longTermTargetCtr: CTR_LONG_TERM_TARGET,
    highestCtrLayouts: top(patterns.layouts),
    highestCtrColors: top(patterns.colors),
    highestCtrCharacterPlacement: top(patterns.characters),
    highestCtrHeadlineStyle: top(patterns.headlineStyles),
    highestCtrFraming: top(patterns.framings),
    highestCtrEmotions: top(patterns.emotions),
    preferredHeadlineLength:
      preferredLen && Number.isFinite(preferredLen) ? preferredLen : null,
    preferredCtaStyle: patterns.ctaStyles[0]?.value ?? null,
    notes,
    basedOnSampleSize: trusted.length,
  };
}
