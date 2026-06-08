/**
 * Smart duration-based reactions layered on mode personality.
 */

import { pickTalkingAmyReaction, type TalkingAmyMode } from "@/lib/talking-amy-modes";

export type TalkingAmyDurationBucket = "tiny" | "short" | "medium" | "long";

const DURATION_REACTIONS: Record<TalkingAmyDurationBucket, readonly string[]> = {
  tiny: ["That was quick!", "Tiny message!"],
  short: ["Nice one!", "That sounded fun!"],
  medium: ["Wow!", "I heard that!"],
  long: ["That was a long one!", "You had lots to say!"],
};

export function bucketRecordingDurationMs(ms: number): TalkingAmyDurationBucket {
  if (ms < 1000) return "tiny";
  if (ms < 3000) return "short";
  if (ms < 6000) return "medium";
  return "long";
}

/**
 * 50% duration-smart line, 50% mode personality — keeps both intact.
 */
export function pickSmartTalkingAmyReaction(mode: TalkingAmyMode, durationMs: number): string {
  const bucket = bucketRecordingDurationMs(durationMs);
  const durationLine =
    DURATION_REACTIONS[bucket][Math.floor(Math.random() * DURATION_REACTIONS[bucket].length)] ??
    "Yay!";
  if (Math.random() < 0.5) return durationLine;
  return pickTalkingAmyReaction(mode);
}
