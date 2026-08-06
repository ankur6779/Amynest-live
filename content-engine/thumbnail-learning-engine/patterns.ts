/**
 * Pattern detection from REAL stored CTR outcomes only — no guesses.
 */

import { isTrustedSample } from "./ingest.js";
import type {
  PatternWinner,
  ThumbnailLearningPatterns,
  ThumbnailLearningRecord,
} from "./types.js";

export function detectThumbnailPatterns(
  records: ThumbnailLearningRecord[],
  minImpressions = 100,
  minSample = 2,
): ThumbnailLearningPatterns {
  const trusted = records.filter((r) => isTrustedSample(r, minImpressions));

  return {
    headlineLength: rankDimension(
      trusted,
      "headlineLength",
      (r) => String(r.features.headlineLength),
      minSample,
    ),
    emotions: rankDimension(
      trusted,
      "emotion",
      (r) => r.features.emotion,
      minSample,
    ),
    characters: rankDimension(
      trusted,
      "characters",
      (r) => r.features.characters,
      minSample,
    ),
    backgrounds: rankDimension(
      trusted,
      "background",
      (r) => r.features.backgroundType,
      minSample,
    ),
    colors: rankDimension(
      trusted,
      "color",
      (r) => r.features.colorPalette,
      minSample,
    ),
    headlineStyles: rankDimension(
      trusted,
      "headlineStyle",
      (r) => r.features.headlineStyle,
      minSample,
    ),
    ctaStyles: rankDimension(
      trusted,
      "ctaStyle",
      (r) => r.features.ctaStyle,
      minSample,
    ),
    layouts: rankDimension(
      trusted,
      "layout",
      (r) => r.features.framing || r.features.variant,
      minSample,
    ),
    framings: rankDimension(
      trusted,
      "framing",
      (r) => r.features.framing || "standard",
      minSample,
    ),
    updatedAt: new Date().toISOString(),
  };
}

function rankDimension(
  records: ThumbnailLearningRecord[],
  dimension: string,
  keyFn: (r: ThumbnailLearningRecord) => string,
  minSample: number,
): PatternWinner[] {
  const buckets = new Map<
    string,
    { ctr: number[]; retention: number[]; n: number }
  >();

  for (const record of records) {
    const key = keyFn(record) || "unknown";
    const bucket = buckets.get(key) ?? { ctr: [], retention: [], n: 0 };
    bucket.ctr.push(record.outcomes.ctr);
    bucket.retention.push(record.outcomes.retention);
    bucket.n += 1;
    buckets.set(key, bucket);
  }

  const winners: PatternWinner[] = [];
  for (const [value, bucket] of buckets) {
    if (bucket.n < minSample) continue;
    winners.push({
      dimension,
      value,
      sampleSize: bucket.n,
      averageCtr: average(bucket.ctr),
      averageRetention: average(bucket.retention),
    });
  }

  return winners.sort((a, b) => b.averageCtr - a.averageCtr);
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

/** Attach reason tags to top/worst records from patterns. */
export function annotateReasons(
  records: ThumbnailLearningRecord[],
  patterns: ThumbnailLearningPatterns,
): ThumbnailLearningRecord[] {
  const winEmotion = patterns.emotions[0]?.value;
  const winChars = patterns.characters[0]?.value;
  const winColor = patterns.colors[0]?.value;
  const winHeadlineLen = patterns.headlineLength[0]?.value;
  const loseEmotion = patterns.emotions[patterns.emotions.length - 1]?.value;

  return records.map((record) => {
    const reasons: string[] = [];
    if (winEmotion && record.features.emotion === winEmotion) {
      reasons.push(`winning-emotion:${winEmotion}`);
    }
    if (loseEmotion && record.features.emotion === loseEmotion) {
      reasons.push(`weak-emotion:${loseEmotion}`);
    }
    if (winChars && record.features.characters === winChars) {
      reasons.push(`winning-cast:${winChars}`);
    }
    if (winColor && record.features.colorPalette === winColor) {
      reasons.push(`winning-palette:${winColor}`);
    }
    if (
      winHeadlineLen &&
      String(record.features.headlineLength) === winHeadlineLen
    ) {
      reasons.push(`winning-headline-length:${winHeadlineLen}`);
    }
    if (record.outcomes.ctr >= 0.1) reasons.push("hit-ctr-10");
    if (record.outcomes.ctr >= 0.15) reasons.push("hit-ctr-15");
    if (record.outcomes.ctr < 0.05) reasons.push("low-ctr");
    return { ...record, reasons };
  });
}
