/**
 * Amy voice learning cohorts — segment by replay, difficulty, and session pace.
 */

import type { AmyDifficultyLevel } from "@/lib/amy-voice-difficulty";

export type ReplayPressure = "low" | "medium" | "high";
export type SessionPace = "fast" | "normal" | "slow";

export type AmyVoiceCohortAdjustments = {
  cohortId: string;
  replayPressure: ReplayPressure;
  sessionPace: SessionPace;
  difficulty: AmyDifficultyLevel;
  encouragementMultiplier: number;
  microHumanizeMultiplier: number;
  pacingRateDelta: number;
  pacingGapDelta: number;
  supportLevel: "low" | "standard" | "high";
  guidanceTier: "minimal" | "light" | "full" | null;
};

export type AmyVoiceCohortSignals = {
  replayCount: number;
  difficulty: AmyDifficultyLevel;
  durationMs: number;
};

let sessionSpeakCount = 0;
let sessionReplaySum = 0;
let sessionDurationSum = 0;
let lastDifficulty: AmyDifficultyLevel = "neutral";

function classifyReplayPressure(avgReplay: number, current: number): ReplayPressure {
  if (current >= 3 || avgReplay >= 2) return "high";
  if (current >= 2 || avgReplay >= 1.4) return "medium";
  return "low";
}

function classifySessionPace(avgDurationMs: number): SessionPace {
  if (avgDurationMs <= 0) return "normal";
  if (avgDurationMs < 2200) return "fast";
  if (avgDurationMs > 6500) return "slow";
  return "normal";
}

function buildCohortId(
  replay: ReplayPressure,
  difficulty: AmyDifficultyLevel,
  pace: SessionPace,
): string {
  return `${replay}_${difficulty}_${pace}`;
}

function cohortAdjustments(
  replay: ReplayPressure,
  difficulty: AmyDifficultyLevel,
  pace: SessionPace,
): AmyVoiceCohortAdjustments {
  let encouragementMultiplier = 1;
  let microHumanizeMultiplier = 1;
  let pacingRateDelta = 0;
  let pacingGapDelta = 0;
  let supportLevel: AmyVoiceCohortAdjustments["supportLevel"] = "standard";
  let guidanceTier: AmyVoiceCohortAdjustments["guidanceTier"] = null;

  if (difficulty === "struggling" || replay === "high") {
    supportLevel = "high";
    encouragementMultiplier = 1.25;
    microHumanizeMultiplier = 1.15;
    pacingRateDelta = -0.04;
    pacingGapDelta = 60;
    guidanceTier = "full";
  } else if (difficulty === "confident" && replay === "low" && pace === "fast") {
    supportLevel = "low";
    encouragementMultiplier = 0.75;
    microHumanizeMultiplier = 0.85;
    pacingRateDelta = 0.03;
    pacingGapDelta = -40;
    guidanceTier = "minimal";
  } else if (replay === "medium" || pace === "slow") {
    supportLevel = "standard";
    encouragementMultiplier = 1.05;
    pacingRateDelta = pace === "slow" ? -0.02 : 0;
    pacingGapDelta = pace === "slow" ? 30 : 0;
    guidanceTier = "light";
  }

  if (pace === "slow" && supportLevel !== "high") {
    pacingRateDelta -= 0.02;
    pacingGapDelta += 20;
  }

  return {
    cohortId: buildCohortId(replay, difficulty, pace),
    replayPressure: replay,
    sessionPace: pace,
    difficulty,
    encouragementMultiplier,
    microHumanizeMultiplier,
    pacingRateDelta,
    pacingGapDelta,
    supportLevel,
    guidanceTier,
  };
}

export function recordAmyVoiceCohortSpeak(signals: AmyVoiceCohortSignals): void {
  sessionSpeakCount += 1;
  sessionReplaySum += Math.max(0, signals.replayCount);
  sessionDurationSum += Math.max(0, signals.durationMs);
  lastDifficulty = signals.difficulty;
}

export function getAmyVoiceCohortAdjustments(
  signals: AmyVoiceCohortSignals,
): AmyVoiceCohortAdjustments {
  const avgReplay =
    sessionSpeakCount > 0 ? sessionReplaySum / sessionSpeakCount : signals.replayCount;
  const avgDuration =
    sessionSpeakCount > 0 ? sessionDurationSum / sessionSpeakCount : signals.durationMs;

  const replayPressure = classifyReplayPressure(avgReplay, signals.replayCount);
  const sessionPace = classifySessionPace(avgDuration);
  return cohortAdjustments(replayPressure, signals.difficulty, sessionPace);
}

export function getAmyVoiceCohortSnapshot(): {
  sessionSpeakCount: number;
  avgReplayCount: number;
  avgDurationMs: number;
  lastDifficulty: AmyDifficultyLevel;
  current: AmyVoiceCohortAdjustments | null;
} {
  const avgReplay = sessionSpeakCount > 0 ? sessionReplaySum / sessionSpeakCount : 0;
  const avgDuration = sessionSpeakCount > 0 ? sessionDurationSum / sessionSpeakCount : 0;
  const current =
    sessionSpeakCount > 0
      ? cohortAdjustments(
          classifyReplayPressure(avgReplay, Math.round(avgReplay)),
          lastDifficulty,
          classifySessionPace(avgDuration),
        )
      : null;

  return {
    sessionSpeakCount,
    avgReplayCount: avgReplay,
    avgDurationMs: avgDuration,
    lastDifficulty,
    current,
  };
}

export function resetAmyVoiceCohortSession(): void {
  sessionSpeakCount = 0;
  sessionReplaySum = 0;
  sessionDurationSum = 0;
  lastDifficulty = "neutral";
}
