/**
 * Smart duration-based reactions layered on weighted mode pools.
 */

import { pickWeightedTalkingAmyReaction, type WeightedReaction } from "@/lib/talking-amy-reaction-pools";
import { pickDailyFeaturedReaction } from "@/lib/talking-amy-daily-special";
import type { TalkingAmyMode } from "@/lib/talking-amy-modes";

export type TalkingAmyDurationBucket = "tiny" | "short" | "medium" | "long";

const DURATION_REACTIONS: Record<TalkingAmyDurationBucket, readonly WeightedReaction[]> = {
  tiny: [
    { text: "That was quick!", weight: 2 },
    { text: "Tiny message!", weight: 1.5 },
    { text: "Short and sweet!", weight: 1 },
  ],
  short: [
    { text: "Nice one!", weight: 2 },
    { text: "That sounded fun!", weight: 1.5 },
    { text: "Quick giggle!", weight: 1 },
  ],
  medium: [
    { text: "Wow!", weight: 2 },
    { text: "I heard that!", weight: 1.5 },
    { text: "Great echo!", weight: 1 },
  ],
  long: [
    { text: "That was a long one!", weight: 2 },
    { text: "You had lots to say!", weight: 1.5 },
    { text: "Big message!", weight: 1 },
  ],
};

export function bucketRecordingDurationMs(ms: number): TalkingAmyDurationBucket {
  if (ms < 1000) return "tiny";
  if (ms < 3000) return "short";
  if (ms < 6000) return "medium";
  return "long";
}

function pickDurationReaction(bucket: TalkingAmyDurationBucket): string {
  const pool = DURATION_REACTIONS[bucket];
  const total = pool.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const item of pool) {
    roll -= item.weight;
    if (roll <= 0) return item.text;
  }
  return pool[0]?.text ?? "Yay!";
}

/**
 * Featured daily mode may use exclusive pool; otherwise 40% duration + 60% weighted mode line.
 */
export function pickSmartTalkingAmyReaction(mode: TalkingAmyMode, durationMs: number): string {
  const featured = pickDailyFeaturedReaction(mode.id);
  if (featured && Math.random() < 0.35) return featured;

  if (Math.random() < 0.4) {
    return pickDurationReaction(bucketRecordingDurationMs(durationMs));
  }
  return pickWeightedTalkingAmyReaction(mode.id, { avoidRepeat: true });
}
