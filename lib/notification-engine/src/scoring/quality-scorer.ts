import type { ContentContext, FatigueState, HistoryEntry, QualityScores } from "../types.js";
import {
  FATIGUE_MULTIPLIER_TIER_1,
  FATIGUE_MULTIPLIER_TIER_2,
  FATIGUE_MULTIPLIER_TIER_3,
  FATIGUE_TIER_1,
  FATIGUE_TIER_2,
  FATIGUE_TIER_3,
  WEIGHT_ENGAGEMENT,
  WEIGHT_NOVELTY,
  WEIGHT_RECENCY,
  WEIGHT_RELEVANCE,
} from "../constants.js";
import { daysSince } from "../personalization/context.js";
import { bodySimilarity } from "../memory/anti-repetition.js";

export function computeFatigueState(
  consecutiveIgnores: number,
  rollingIgnores30d: number,
  lastOpenedAt: Date | null,
): FatigueState {
  let frequencyMultiplier = 1;
  let highValueOnly = false;

  if (consecutiveIgnores >= FATIGUE_TIER_3 || rollingIgnores30d >= FATIGUE_TIER_3) {
    frequencyMultiplier = FATIGUE_MULTIPLIER_TIER_3;
    highValueOnly = true;
  } else if (consecutiveIgnores >= FATIGUE_TIER_2 || rollingIgnores30d >= FATIGUE_TIER_2) {
    frequencyMultiplier = FATIGUE_MULTIPLIER_TIER_2;
  } else if (consecutiveIgnores >= FATIGUE_TIER_1 || rollingIgnores30d >= FATIGUE_TIER_1) {
    frequencyMultiplier = FATIGUE_MULTIPLIER_TIER_1;
  }

  return {
    consecutiveIgnores,
    rollingIgnores30d,
    frequencyMultiplier,
    highValueOnly,
    lastOpenedAt,
  };
}

/** Probabilistic skip for fatigued users on non-critical categories. */
export function shouldSkipForFatigue(
  fatigue: FatigueState,
  isHighValue: boolean,
  seed: number,
): boolean {
  if (fatigue.highValueOnly && !isHighValue) return true;
  if (fatigue.frequencyMultiplier >= 1) return false;
  return seed > fatigue.frequencyMultiplier;
}

export function scoreCandidate(
  ctx: ContentContext,
  candidate: {
    title: string;
    body: string;
    topicKey: string;
    theme: string;
    contentType: string;
    highValue?: boolean;
  },
  history: HistoryEntry[],
  now = new Date(),
): QualityScores {
  const novelty = scoreNovelty(candidate.body, candidate.topicKey, history, now);
  const relevance = scoreRelevance(ctx, candidate);
  const recency = scoreRecency(ctx.category, history, now);
  const engagementPrediction = scoreEngagement(ctx, candidate, history);

  const composite = Math.round(
    novelty * WEIGHT_NOVELTY +
      relevance * WEIGHT_RELEVANCE +
      recency * WEIGHT_RECENCY +
      engagementPrediction * WEIGHT_ENGAGEMENT,
  );

  return {
    novelty,
    relevance,
    recency,
    engagementPrediction,
    composite,
  };
}

function scoreNovelty(
  body: string,
  topicKey: string,
  history: HistoryEntry[],
  now: Date,
): number {
  let score = 100;
  for (const h of history) {
    const days = daysSince(h.sentAt, now);
    if (days > 30) continue;
    if (h.topicKey === topicKey) {
      score -= Math.max(0, 40 - days);
    }
    const sim = bodySimilarity(body, h.body);
    if (sim > 0.5) score -= sim * 35;
  }
  return clamp(score);
}

function scoreRelevance(ctx: ContentContext, candidate: { contentType: string; highValue?: boolean }): number {
  let score = 55;
  if (ctx.isSchoolDay && candidate.contentType === "educational") score += 15;
  if (ctx.isWeekend && candidate.contentType === "action_challenge") score += 10;
  if (ctx.timeOfDay === "evening" && candidate.contentType === "curiosity") score += 12;
  if (ctx.timeOfDay === "morning" && candidate.contentType === "parent_insight") score += 10;
  if (ctx.season === "festive" && candidate.contentType === "curiosity") score += 8;
  if (ctx.engagementScore > 70) score += 10;
  if (ctx.engagementScore < 30 && candidate.highValue) score += 15;
  if (ctx.ageGroup === "tween" && candidate.contentType === "motivational") score += 8;
  return clamp(score);
}

function scoreRecency(category: string, history: HistoryEntry[], now: Date): number {
  const sameCat = history.filter((h) => h.category === category);
  if (sameCat.length === 0) return 90;
  const last = sameCat[0]!;
  const days = daysSince(last.sentAt, now);
  if (days >= 2) return 85;
  if (days >= 1) return 60;
  return 35;
}

function scoreEngagement(
  ctx: ContentContext,
  candidate: { contentType: string },
  history: HistoryEntry[],
): number {
  const opened = history.filter((h) => h.openedAt).length;
  const sent = history.filter((h) => h.category === ctx.category).length;
  const openRate = sent > 0 ? opened / sent : 0.5;

  let score = 50 + ctx.engagementScore * 0.3 + openRate * 25;
  if (candidate.contentType === "achievement" && ctx.engagementScore > 60) score += 10;
  if (candidate.contentType === "motivational" && ctx.engagementScore < 40) score += 8;
  return clamp(score);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
