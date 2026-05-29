import type { ContentContext, HistoryEntry } from "../types.js";
import type { BusinessImpactScores, OutcomeContext, OutcomeSignals } from "./types.js";
import { goalAlignsWithContent } from "./goal-map.js";
import {
  WEIGHT_ENGAGEMENT_PROB,
  WEIGHT_LEARNING_PROB,
  WEIGHT_RETENTION_PROB,
  WEIGHT_ROUTINE_PROB,
  WEIGHT_SUBSCRIPTION_PROB,
} from "../constants.js";
import { daysSince } from "../personalization/context.js";

export function scoreBusinessImpact(
  ctx: ContentContext,
  candidate: {
    title: string;
    body: string;
    topicKey: string;
    contentType: string;
    highValue?: boolean;
  },
  outcome: OutcomeContext,
  history: HistoryEntry[],
  now = new Date(),
): BusinessImpactScores {
  const s = outcome.signals;
  const routineCompletionProb = scoreRoutineCompletion(ctx, candidate, s, outcome);
  const learningCompletionProb = scoreLearningCompletion(ctx, candidate, s, outcome);
  const retentionProb = scoreRetention(ctx, candidate, s, outcome);
  const subscriptionProb = scoreSubscription(ctx, candidate, s, outcome);
  const engagementProb = scoreEngagementProb(ctx, candidate, s, history, outcome);

  const composite = Math.round(
    routineCompletionProb * WEIGHT_ROUTINE_PROB +
      learningCompletionProb * WEIGHT_LEARNING_PROB +
      retentionProb * WEIGHT_RETENTION_PROB +
      subscriptionProb * WEIGHT_SUBSCRIPTION_PROB +
      engagementProb * WEIGHT_ENGAGEMENT_PROB,
  );

  return {
    routineCompletionProb,
    learningCompletionProb,
    retentionProb,
    subscriptionProb,
    engagementProb,
    composite,
  };
}

function scoreRoutineCompletion(
  ctx: ContentContext,
  candidate: { contentType: string },
  s: OutcomeSignals,
  outcome: OutcomeContext,
): number {
  let score = 40;
  if (outcome.goal === "GOAL_ROUTINE_COMPLETION") score += 25;
  score += goalAlignsWithContent(outcome.goal, candidate.contentType, ctx.category);
  if (s.routinesMissedYesterday) score += 15;
  if (s.routineCompletionRate7d < 0.4) score += 12;
  if (s.routineCompletionRate7d >= 0.7) score -= 8;
  if (s.currentStreakDays >= 3 && ctx.category === "routine") score += 10;
  if (ctx.timeOfDay === "morning" && ctx.category === "routine") score += 12;
  if (s.childLifecycleStage === "NEW_USER" && ctx.category === "routine") score += 8;
  return clamp(score);
}

function scoreLearningCompletion(
  ctx: ContentContext,
  candidate: { contentType: string },
  s: OutcomeSignals,
  outcome: OutcomeContext,
): number {
  let score = 40;
  if (outcome.goal === "GOAL_LEARNING_COMPLETION") score += 25;
  score += goalAlignsWithContent(outcome.goal, candidate.contentType, ctx.category);
  if (s.weakSubjects.length > 0 && candidate.contentType === "educational") score += 15;
  if (s.unfinishedLessonCount > 0) score += 12;
  if (s.lessonsCompleted7d === 0 && ctx.category === "learning_activity") score += 10;
  if (ctx.isSchoolDay && candidate.contentType === "educational") score += 8;
  if (s.strongSubjects.length >= 2 && candidate.contentType === "achievement") score += 6;
  return clamp(score);
}

function scoreRetention(
  ctx: ContentContext,
  candidate: { contentType: string; highValue?: boolean },
  s: OutcomeSignals,
  outcome: OutcomeContext,
): number {
  let score = 45;
  if (outcome.goal === "GOAL_RETENTION" || outcome.goal === "GOAL_REACTIVATION") score += 22;
  if (s.churnRisk7d > 0.6) score += 18;
  if (s.churnRisk30d > 0.5) score += 12;
  if (s.daysSinceLastActive >= 3) score += 15;
  if (s.childLifecycleStage === "AT_RISK" || s.childLifecycleStage === "CHURNING") score += 20;
  if (s.childLifecycleStage === "RETURNED") score += 10;
  if (candidate.highValue && s.churnRisk30d > 0.4) score += 8;
  if (s.daysSinceLastActive <= 1) score -= 10;
  return clamp(score);
}

function scoreSubscription(
  ctx: ContentContext,
  candidate: { contentType: string },
  s: OutcomeSignals,
  outcome: OutcomeContext,
): number {
  if (s.isPremium) return 20;
  let score = 35;
  if (outcome.goal === "GOAL_SUBSCRIPTION") score += 30;
  const activated =
    s.lessonsCompletedTotal >= 10 ||
    s.sessionsLast7d >= 7 ||
    s.firstRoutineCompleted;
  if (!activated) return clamp(15);
  if (activated && s.lessonsCompletedTotal >= 10) score += 15;
  if (activated && s.currentStreakDays >= 7) score += 12;
  if (s.accountAgeDays >= 14 && s.routineCompletionRate7d >= 0.5) score += 10;
  if (candidate.contentType === "achievement" && s.lessonsCompleted7d >= 3) score += 8;
  if (s.childLifecycleStage === "POWER_USER") score += 10;
  return clamp(score);
}

function scoreEngagementProb(
  ctx: ContentContext,
  candidate: { contentType: string },
  s: OutcomeSignals,
  history: HistoryEntry[],
  outcome: OutcomeContext,
): number {
  const opened = history.filter((h) => h.openedAt).length;
  const sent = history.length;
  const openRate = sent > 0 ? opened / sent : 0.45;

  let score = 40 + openRate * 30 + ctx.engagementScore * 0.2;
  if (outcome.goal === "GOAL_PARENT_ENGAGEMENT") score += 12;
  if (outcome.goal === "GOAL_STREAK_RECOVERY") score += 10;
  if (candidate.contentType === "motivational" && s.streakBrokenDaysAgo != null) score += 15;

  const sameGoal = history.filter(
    (h) => h.sentAt && daysSince(h.sentAt, new Date()) <= 3,
  );
  if (sameGoal.length >= 2) score -= 10;

  return clamp(score);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
