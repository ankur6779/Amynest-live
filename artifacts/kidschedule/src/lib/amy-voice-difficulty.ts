/**
 * Amy voice difficulty awareness — replays, fallbacks, hesitation → adaptive delivery.
 */

import type { AmyEmotion } from "@/lib/amy-voice-emotion";
import type { AmyProsodyProfile } from "@/lib/amy-speech-mode";
import { getPhraseMissCount } from "@/lib/amy-voice-learning";
import type { StaticAudioMode } from "@workspace/static-audio/browser";

export type AmyDifficultyLevel = "confident" | "neutral" | "struggling";

let sessionFallbackCount = 0;
let sessionSuccessStreak = 0;
let previousDifficultyLevel: AmyDifficultyLevel = "neutral";
let smoothedDifficultyTarget = 0.5;
const recentReplayMs: number[] = [];
const HESITATION_WINDOW_MS = 25_000;
const DIFFICULTY_SMOOTHING = 0.32;

function rawLevelToTarget(level: AmyDifficultyLevel): number {
  switch (level) {
    case "confident":
      return 0.18;
    case "struggling":
      return 0.82;
    default:
      return 0.5;
  }
}

function targetToLevel(target: number): AmyDifficultyLevel {
  if (target < 0.34) return "confident";
  if (target > 0.66) return "struggling";
  return "neutral";
}

/** Gradually move session difficulty toward the latest assessment. */
export function smoothDifficultyLevel(raw: AmyDifficultyLevel): AmyDifficultyLevel {
  smoothedDifficultyTarget =
    smoothedDifficultyTarget * (1 - DIFFICULTY_SMOOTHING) +
    rawLevelToTarget(raw) * DIFFICULTY_SMOOTHING;
  return targetToLevel(smoothedDifficultyTarget);
}

export function recordAmyVoiceDeliveryFallback(): void {
  sessionFallbackCount += 1;
  sessionSuccessStreak = 0;
}

export function recordAmyVoiceDeliverySuccess(): void {
  sessionSuccessStreak += 1;
  if (sessionSuccessStreak >= 3) {
    sessionFallbackCount = Math.max(0, sessionFallbackCount - 1);
  }
}

export function recordAmyVoiceHesitation(): void {
  recentReplayMs.push(Date.now());
  if (recentReplayMs.length > 12) recentReplayMs.shift();
}

function countRecentHesitation(): number {
  const cutoff = Date.now() - HESITATION_WINDOW_MS;
  return recentReplayMs.filter((t) => t >= cutoff).length;
}

/** Assess learner difficulty from replays, misses, fallbacks, and hesitation. */
export function assessAmyDifficulty(
  text: string,
  pipelineMode: StaticAudioMode,
  replayCount: number,
): { level: AmyDifficultyLevel; score: number } {
  const misses = getPhraseMissCount(text, pipelineMode);
  const hesitation = countRecentHesitation();

  let score = 0;
  if (replayCount >= 4) score += 3;
  else if (replayCount >= 3) score += 2;
  else if (replayCount >= 2) score += 1;

  score += Math.min(misses, 3);
  score += Math.min(sessionFallbackCount, 3);
  if (hesitation >= 3) score += 2;
  else if (hesitation >= 2) score += 1;

  if (score >= 5) {
    return { level: smoothDifficultyLevel("struggling"), score };
  }

  if (
    score === 0 &&
    replayCount <= 1 &&
    sessionFallbackCount === 0 &&
    sessionSuccessStreak >= 3
  ) {
    return { level: smoothDifficultyLevel("confident"), score: 0 };
  }
  return { level: smoothDifficultyLevel("neutral"), score };
}

export function getSessionSuccessStreak(): number {
  return sessionSuccessStreak;
}

const DIFFICULTY_PROSODY: Record<
  AmyDifficultyLevel,
  { rateDelta: number; gapDelta: number; forceEncouraging: boolean }
> = {
  struggling: { rateDelta: -0.07, gapDelta: 90, forceEncouraging: true },
  neutral: { rateDelta: 0, gapDelta: 0, forceEncouraging: false },
  confident: { rateDelta: 0.04, gapDelta: -45, forceEncouraging: false },
};

/** Adapt prosody for struggling vs confident learners. */
export function applyDifficultyProsody(
  base: AmyProsodyProfile,
  level: AmyDifficultyLevel,
): { prosody: AmyProsodyProfile; preferEncouraging: boolean } {
  const mod = DIFFICULTY_PROSODY[level];
  return {
    preferEncouraging: mod.forceEncouraging,
    prosody: {
      playbackRate: Math.min(1.08, Math.max(0.72, base.playbackRate + mod.rateDelta)),
      synthesisRate: Math.min(1.05, Math.max(0.7, base.synthesisRate + mod.rateDelta)),
      phonicsGapMs: Math.round(
        Math.max(100, Math.min(170, base.phonicsGapMs + mod.gapDelta / 5)),
      ),
      phraseGapMs: Math.round(Math.max(240, Math.min(760, base.phraseGapMs + mod.gapDelta))),
      pauseMarker:
        level === "struggling"
          ? base.pauseMarker.includes("...")
            ? `${base.pauseMarker} ... `
            : " ... ... "
          : level === "confident"
            ? base.pauseMarker.replace(/\s\.\.\.\s\.\.\./g, " ... ")
            : base.pauseMarker,
    },
  };
}

export function getAmyDifficultySnapshot(): {
  sessionFallbackCount: number;
  sessionSuccessStreak: number;
  recentHesitation: number;
} {
  return {
    sessionFallbackCount,
    sessionSuccessStreak,
    recentHesitation: countRecentHesitation(),
  };
}

export function resetAmyDifficultySession(): void {
  sessionFallbackCount = 0;
  sessionSuccessStreak = 0;
  previousDifficultyLevel = "neutral";
  smoothedDifficultyTarget = 0.5;
  recentReplayMs.length = 0;
}

/** Record difficulty transition; returns the previous level for effort detection. */
export function commitDifficultyLevel(level: AmyDifficultyLevel): AmyDifficultyLevel {
  const prev = previousDifficultyLevel;
  previousDifficultyLevel = level;
  return prev;
}

export function getPreviousDifficultyLevel(): AmyDifficultyLevel {
  return previousDifficultyLevel;
}

/** Merge difficulty hint into resolved emotion when struggling. */
export function mergeDifficultyEmotion(
  emotion: AmyEmotion,
  level: AmyDifficultyLevel,
  preferEncouraging: boolean,
): AmyEmotion {
  if (level === "struggling" || preferEncouraging) return "encouraging";
  if (level === "confident" && emotion === "encouraging") return "happy";
  return emotion;
}
