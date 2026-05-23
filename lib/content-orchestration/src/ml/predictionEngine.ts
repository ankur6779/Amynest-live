import type { DifficultyLevel } from "../types.js";
import type { LearningProfile, SkillKey } from "../types-v2.js";
import { computeTargetDifficulty } from "../adaptiveEngine.js";
import type { PersonalityProfile } from "./types-personality.js";
import type { LearningPath } from "./types-personality.js";
import { getLastSessionSummaries } from "./sessionHistoryStore.js";
import type {
  PredictionOutput,
  SessionHistoryEntry,
  SkillForecast,
  SkillProgressionStatus,
} from "./types-prediction.js";
import { resolveSessionPersonalization } from "../sessionPersonalization.js";

const SKILL_KEYS: SkillKey[] = ["phonics", "motor_skills", "cognitive", "social"];

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export type PredictionInput = {
  childId: string;
  profile: LearningProfile;
  personality?: PersonalityProfile;
  learningPath?: LearningPath;
  sessionHistory?: SessionHistoryEntry[];
  primaryModule?: import("../types.js").ModuleId;
};

function engagementTrendFromHistory(sessions: SessionHistoryEntry[]): number {
  if (sessions.length < 2) return 0.5;
  const recent = sessions.slice(-5);
  const scores = recent.map((s) => s.engagementScore / 100);
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  const n = scores.length;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += scores[i]!;
    sumXY += i * scores[i]!;
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0.5;
  const slope = (n * sumXY - sumX * sumY) / denom;
  return clamp01(0.5 + slope * 0.25);
}

function explorationSuccessRate(sessions: SessionHistoryEntry[]): number {
  if (sessions.length === 0) return 0.5;
  const total = sessions.reduce((a, s) => a + s.explorationSuccesses, 0);
  return clamp01(total / sessions.length);
}

function progressionRateForSkill(
  skill: SkillKey,
  sessions: SessionHistoryEntry[],
): number {
  if (sessions.length < 2) return 0.08;
  const deltas: number[] = [];
  for (let i = 1; i < sessions.length; i++) {
    const prev = sessions[i - 1]!.skillLevels[skill] ?? 1;
    const cur = sessions[i]!.skillLevels[skill] ?? prev;
    deltas.push(cur - prev);
  }
  const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  return Math.max(-0.05, Math.min(0.25, avg * 0.5 + 0.06));
}

function classifyProgression(rate: number, engagementFactor: number): SkillProgressionStatus {
  const adj = rate * engagementFactor;
  if (adj < 0.02) return "plateau";
  if (adj > 0.12) return "fast_growth";
  return "steady";
}

export function forecastSkillLevels(input: PredictionInput): SkillForecast[] {
  const sessions = input.sessionHistory ?? getLastSessionSummaries(input.childId);
  const engagementFactor = clamp01(input.profile.behavior.engagementScore / 100);
  const forecasts: SkillForecast[] = [];

  for (const skill of SKILL_KEYS) {
    const current = input.profile.skills[skill].level;
    const rate = progressionRateForSkill(skill, sessions);
    const status = classifyProgression(rate, engagementFactor);
    let next = current + rate * engagementFactor;
    if (status === "plateau") next = current + 0.02;
    if (status === "fast_growth") next = current + Math.min(0.5, rate * 2);
    next = Math.max(1, Math.min(5, Math.round(next * 10) / 10));

    forecasts.push({
      skill,
      currentLevel: current,
      nextSkillLevel: next,
      progressionRate: rate,
      status,
    });
  }

  return forecasts;
}

/**
 * Drop-off risk 0–1 from skips, session time, boredom, engagement decline.
 */
export function computeDropOffRisk(
  profile: LearningProfile,
  sessions: SessionHistoryEntry[],
  personality?: PersonalityProfile,
): number {
  const recent = sessions.slice(-5);
  let risk = 0.2;

  if (recent.length > 0) {
    const avgSkips =
      recent.reduce((a, s) => a + s.skips, 0) / recent.length;
    const avgDuration =
      recent.reduce((a, s) => a + s.durationMinutes, 0) / recent.length;
    const avgBoredom =
      recent.reduce((a, s) => a + s.boredomSignals, 0) / recent.length;
    const engagementDecline = 1 - engagementTrendFromHistory(sessions);

    risk += clamp01(avgSkips / 4) * 0.3;
    risk += avgDuration < 3 ? 0.2 : 0;
    risk += clamp01(avgBoredom / 2) * 0.2;
    risk += engagementDecline * 0.25;
  } else {
    risk += profile.behavior.dropOffPoints.length * 0.05;
    risk += profile.behavior.engagementScore < 40 ? 0.15 : 0;
  }

  if (personality) {
    risk += personality.traits.distractibility * 0.12;
    risk -= personality.traits.persistence * 0.08;
  }

  return clamp01(risk);
}

export function predictRecommendedDifficulty(
  profile: LearningProfile,
  dropOffRisk: number,
  engagementTrend: number,
  primaryModule: import("../types.js").ModuleId,
  explorationSeed: number,
): DifficultyLevel {
  const base = computeTargetDifficulty(profile, primaryModule, explorationSeed);
  let level = base.targetLevel;

  if (dropOffRisk > 0.55) level -= 0.4;
  else if (dropOffRisk > 0.4) level -= 0.2;

  if (engagementTrend > 0.65 && dropOffRisk < 0.35) {
    level += base.injectHarder ? 0.35 : 0.2;
  }

  if (level <= 1.3) return "easy";
  if (level >= 2.6) return "hard";
  return "medium";
}

export function predictSessionLength(
  personality?: PersonalityProfile,
  dropOffRisk?: number,
): number {
  const limits = resolveSessionPersonalization(personality);
  let minutes = Math.round(limits.maxItems * 2.5);
  if (dropOffRisk !== undefined && dropOffRisk > 0.5) {
    minutes = Math.max(6, Math.round(minutes * 0.75));
  }
  return Math.max(5, Math.min(35, minutes));
}

export function computePredictionConfidence(
  sessions: SessionHistoryEntry[],
  profile: LearningProfile,
): number {
  const dataScore = clamp01(sessions.length / 10);
  const profileScore = clamp01(profile.version / 5);
  return clamp01(0.35 + dataScore * 0.45 + profileScore * 0.2);
}

export function runPrediction(
  input: PredictionInput,
  explorationSeed = 0,
): PredictionOutput {
  const sessions = input.sessionHistory ?? getLastSessionSummaries(input.childId);
  const skillForecasts = forecastSkillLevels({ ...input, sessionHistory: sessions });
  const nextSkillLevels: Partial<Record<SkillKey, number>> = {};
  for (const f of skillForecasts) {
    nextSkillLevels[f.skill] = f.nextSkillLevel;
  }

  const engagementTrend = engagementTrendFromHistory(sessions);
  const exploreRate = explorationSuccessRate(sessions);
  const predictedEngagement = clamp01(
    input.profile.behavior.engagementScore / 100 * 0.6 +
      engagementTrend * 0.25 +
      exploreRate * 0.15,
  );
  const predictedDropOffRisk = computeDropOffRisk(
    input.profile,
    sessions,
    input.personality,
  );
  const primaryModule =
    input.primaryModule ?? input.learningPath?.currentTrack ?? "phonics";
  const recommendedDifficulty = predictRecommendedDifficulty(
    input.profile,
    predictedDropOffRisk,
    engagementTrend,
    primaryModule,
    explorationSeed,
  );
  const recommendedSessionLength = predictSessionLength(
    input.personality,
    predictedDropOffRisk,
  );
  const confidence = computePredictionConfidence(sessions, input.profile);

  return {
    childId: input.childId,
    nextSkillLevels,
    skillForecasts,
    predictedEngagement,
    predictedDropOffRisk,
    recommendedDifficulty,
    recommendedSessionLength,
    confidence,
    explorationSuccessRate: exploreRate,
    engagementTrend,
  };
}

export function toPredictionApiSnapshot(
  output: PredictionOutput,
  nextMilestones: string[] = [],
): import("./types-prediction.js").PredictionApiSnapshot {
  return {
    dropOffRisk: Math.round(output.predictedDropOffRisk * 1000) / 10,
    recommendedDifficulty: output.recommendedDifficulty,
    sessionLength: output.recommendedSessionLength,
    nextMilestones,
    predictedEngagement: Math.round(output.predictedEngagement * 1000) / 10,
    confidence: Math.round(output.confidence * 1000) / 10,
  };
}
