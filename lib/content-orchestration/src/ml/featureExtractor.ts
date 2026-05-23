import type { AgeBand, CountryCode, DevelopmentStage, DifficultyLevel, ModuleId } from "../types.js";
import type { LearningProfile, SkillKey } from "../types-v2.js";
import { moduleToSkill } from "../learningProfileEngine.js";
import type {
  AttentionState,
  RealtimeEvent,
  RealtimeSessionState,
} from "../realtime/types.js";
import type {
  ActionStabilityFeatures,
  LastFiveEventFeatures,
  NbaAction,
  NbaFeatureVector,
  NormalizedFeatureVector,
  TrendFeatures,
} from "./types.js";
import { buildSegmentKey } from "./segmentModels.js";
import { countDirectionChanges } from "./oscillationGuard.js";
import {
  DEFAULT_TRAIT_VALUES,
  type PersonalityProfile,
} from "./types-personality.js";

const AGE_BAND_INDEX: Record<AgeBand, number> = {
  "0_24": 0,
  "24_36": 1,
  "36_48": 2,
  "48_72": 3,
};

const STAGE_INDEX: Record<DevelopmentStage, number> = {
  infant: 0,
  toddler: 1,
  preschooler: 2,
};

const DIFFICULTY_INDEX: Record<DifficultyLevel, number> = {
  easy: 0,
  medium: 0.5,
  hard: 1,
};

const MODULE_INDEX: Record<ModuleId, number> = {
  phonics: 0,
  motor_skills: 0.12,
  social_emotional: 0.24,
  language: 0.36,
  cognitive: 0.48,
  creativity: 0.6,
  stories: 0.72,
  puzzles: 0.84,
};

export const FEATURE_NAMES = [
  "age_band",
  "development_stage",
  "module_idx",
  "difficulty",
  "skips_norm",
  "completions_norm",
  "avg_response_norm",
  "accuracy",
  "focus",
  "fatigue",
  "boredom",
  "session_progress",
  "skill_phonics",
  "skill_motor",
  "skill_cognitive",
  "skill_social",
  "engagement",
  "exploration_rate",
  "skip_trend",
  "response_time_trend",
  "engagement_trend",
  "action_change_frequency",
  "trait_curiosity",
  "trait_persistence",
  "trait_distractibility",
  "trait_challenge_seeking",
  "trait_reward_sensitivity",
] as const;

export const FEATURE_DIM = FEATURE_NAMES.length;

const REWARD_MIN = -1;
const REWARD_MAX = 1.5;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Linear slope normalized to 0–1 (positive trend → higher). */
export function slope(values: number[]): number {
  if (values.length < 2) return 0.5;
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i]!;
    sumXY += i * values[i]!;
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0.5;
  const m = (n * sumXY - sumX * sumY) / denom;
  return clamp01(0.5 + m * 0.5);
}

function normalizeAgeBand(band: AgeBand): number {
  return (AGE_BAND_INDEX[band] ?? 0) / 3;
}

function normalizeStage(stage: DevelopmentStage): number {
  return (STAGE_INDEX[stage] ?? 0) / 2;
}

export function summarizeLastFiveEvents(events: RealtimeEvent[]): LastFiveEventFeatures {
  const last5 = events.slice(-5);
  const skips = last5.filter((e) => e.type === "CONTENT_SKIPPED").length;
  const completions = last5.filter((e) => e.type === "CONTENT_COMPLETED");
  const responseTimes = completions
    .map((e) => e.metadata?.responseTime)
    .filter((t): t is number => t !== undefined);
  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 5000;
  const correct = completions.filter((e) => e.metadata?.correct !== false).length;
  const accuracy = completions.length > 0 ? correct / completions.length : 0.5;

  return {
    skips,
    completions: completions.length,
    avgResponseTime,
    accuracy,
  };
}

export function computeTrendFeatures(
  events: RealtimeEvent[],
  engagementScore: number,
): TrendFeatures {
  const windows = events.slice(-5);
  const skipSeries = windows.map((e) => (e.type === "CONTENT_SKIPPED" ? 1 : 0));
  const responseSeries = windows.map((e) =>
    e.type === "CONTENT_COMPLETED" ? (e.metadata?.responseTime ?? 5000) / 10_000 : 0.5,
  );
  const engagementSeries = windows.map((_, i) =>
    i === windows.length - 1 ? engagementScore : engagementScore * 0.95,
  );

  return {
    skipTrend: slope(skipSeries),
    responseTimeTrend: slope(responseSeries),
    engagementTrend: slope(engagementSeries),
  };
}

export function computeActionStability(
  actionHistory: NbaAction[],
): ActionStabilityFeatures {
  const last3 = actionHistory.slice(-3);
  const actionChangeFrequency = countDirectionChanges(last3);
  const stabilityPenalty = actionChangeFrequency * 0.2;
  return {
    actionHistory: last3,
    actionChangeFrequency,
    stabilityPenalty,
  };
}

export function skillLevelsFromProfile(profile: LearningProfile): Record<SkillKey, number> {
  return {
    phonics: profile.skills.phonics.level / 5,
    motor_skills: profile.skills.motor_skills.level / 5,
    cognitive: profile.skills.cognitive.level / 5,
    social: profile.skills.social.level / 5,
  };
}

export type ExtractFeaturesContext = {
  ageBand: AgeBand;
  developmentStage: DevelopmentStage;
  countryCode?: CountryCode;
  personality?: PersonalityProfile;
  behavioralPrediction?: import("./types-prediction.js").PredictionOutput;
};

export function difficultyToLevel(diff: DifficultyLevel): number {
  if (diff === "easy") return 1;
  if (diff === "hard") return 3;
  return 2;
}

export function extractNbaFeatures(
  state: RealtimeSessionState,
  latestEvent: RealtimeEvent,
  attention: AttentionState,
  ctx: ExtractFeaturesContext,
): NbaFeatureVector {
  const events = [...state.recentEvents, latestEvent].slice(-12);
  const current = state.sessionPlan[state.currentIndex];
  const progress =
    state.sessionPlan.length > 0
      ? state.currentIndex / Math.max(1, state.sessionPlan.length - 1)
      : 0;
  const engagementScore = clamp01(state.profile.behavior.engagementScore / 100);
  const actionHistory = state.recentNbaActions ?? [];

  const segmentKey = buildSegmentKey(ctx);
  const personalityTraits = ctx.personality?.traits ?? DEFAULT_TRAIT_VALUES;

  return {
    ageBand: ctx.ageBand,
    developmentStage: ctx.developmentStage,
    currentModule: latestEvent.moduleId ?? current?.moduleId ?? "phonics",
    currentDifficulty: current?.difficulty ?? state.liveDifficulty.liveDifficulty,
    last5Events: summarizeLastFiveEvents(events),
    attentionState: {
      focusLevel: attention.focusLevel,
      fatigueLevel: attention.fatigueLevel,
      boredomLevel: attention.boredomLevel,
    },
    sessionProgress: clamp01(progress),
    skillLevels: skillLevelsFromProfile(state.profile),
    engagementScore,
    explorationRate: clamp01(state.explorationRate),
    trends: computeTrendFeatures(events, engagementScore),
    actionStability: computeActionStability(actionHistory),
    segmentKey,
    personalityTraits,
  };
}

export function normalizeFeatures(f: NbaFeatureVector): NormalizedFeatureVector {
  const values = new Float32Array(FEATURE_DIM);
  values[0] = normalizeAgeBand(f.ageBand);
  values[1] = normalizeStage(f.developmentStage);
  values[2] = MODULE_INDEX[f.currentModule] ?? 0;
  values[3] = DIFFICULTY_INDEX[f.currentDifficulty] ?? 0.5;
  values[4] = clamp01(f.last5Events.skips / 5);
  values[5] = clamp01(f.last5Events.completions / 5);
  values[6] = clamp01(1 - f.last5Events.avgResponseTime / 10_000);
  values[7] = clamp01(f.last5Events.accuracy);
  values[8] = clamp01(f.attentionState.focusLevel);
  values[9] = clamp01(f.attentionState.fatigueLevel);
  values[10] = clamp01(f.attentionState.boredomLevel);
  values[11] = clamp01(f.sessionProgress);
  values[12] = clamp01(f.skillLevels.phonics);
  values[13] = clamp01(f.skillLevels.motor_skills);
  values[14] = clamp01(f.skillLevels.cognitive);
  values[15] = clamp01(f.skillLevels.social);
  values[16] = clamp01(f.engagementScore);
  values[17] = clamp01(f.explorationRate);
  values[18] = clamp01(f.trends.skipTrend);
  values[19] = clamp01(f.trends.responseTimeTrend);
  values[20] = clamp01(f.trends.engagementTrend);
  values[21] = clamp01(f.actionStability.actionChangeFrequency / 3);
  values[22] = clamp01(f.personalityTraits.curiosity);
  values[23] = clamp01(f.personalityTraits.persistence);
  values[24] = clamp01(f.personalityTraits.distractibility);
  values[25] = clamp01(f.personalityTraits.challengeSeeking);
  values[26] = clamp01(f.personalityTraits.rewardSensitivity);
  return { values, names: FEATURE_NAMES };
}

export function normalizeRewardValue(raw: number): number {
  return Math.max(REWARD_MIN, Math.min(REWARD_MAX, raw));
}

export function skillLevelForModule(
  profile: LearningProfile,
  moduleId: ModuleId,
): number {
  return profile.skills[moduleToSkill(moduleId)].level;
}
