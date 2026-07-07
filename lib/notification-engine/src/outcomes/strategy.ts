import type { NotificationCategory } from "@workspace/db";
import type {
  NotificationGoal,
  OutcomeContext,
  OutcomeSignals,
} from "./types.js";
import { detectChildLifecycleStage, strategyForStage } from "./child-journey.js";
import { detectParentMilestones, primaryParentMilestone, milestoneJourneyCopy } from "./parent-journey.js";
import { getStreakRecoveryNotification } from "./streak-recovery.js";
import { buildLearningOutcomeCopy } from "./learning-signals.js";
import { buildRoutineOutcomeCopy } from "./routine-signals.js";
import { buildConversionCopy, shouldTriggerConversionJourney } from "./subscription-engine.js";
import { enrichSignalsWithChurn } from "./retention-prediction.js";
import {
  suggestCampaign,
  nextCampaignStep,
  campaignNotification,
  type CampaignProgress,
} from "./campaigns.js";
import { goalForCategory } from "./goal-map.js";
import { resolveExperiments } from "./experiments.js";
import { coachifyCopy } from "./coach-copy.js";
import { detectLifecycleStage } from "../lifecycle/lifecycle-stage.js";
import { buildConversionLifecycleCopy } from "../conversion/conversion-lifecycle.js";
import { buildReengagementCopy } from "../reengagement/reengagement.js";

export interface OutcomeNotificationDraft {
  title: string;
  body: string;
  deepLink: string;
  goal: NotificationGoal;
  dedupKey: string;
  recommendationKey: string;
  outcome: OutcomeContext;
  priority: number;
  source: "streak_recovery" | "campaign" | "milestone" | "learning" | "routine" | "conversion" | "retention" | "category_default" | "conversion_lifecycle" | "reengagement";
}

export interface ResolveStrategyInput {
  userId: string;
  category: NotificationCategory;
  localDate: string;
  timezone: string;
  signals: OutcomeSignals;
  campaignProgress?: CampaignProgress | null;
  routineToday?: { completed: number; total: number; lateYesterday: boolean };
}

/**
 * Resolve outcome-driven notification strategy for a scheduled send.
 * Returns high-priority outcome notification or category-default goal context.
 */
export function resolveOutcomeStrategy(input: ResolveStrategyInput): OutcomeNotificationDraft | null {
  let signals = enrichSignalsWithChurn({
    ...input.signals,
    childLifecycleStage: detectChildLifecycleStage(input.signals),
    parentMilestones: detectParentMilestones({
      ...input.signals,
      childLifecycleStage: detectChildLifecycleStage(input.signals),
    }),
  });

  const stage = signals.childLifecycleStage;
  const stageStrategy = strategyForStage(stage);
  const lifecycleStage = detectLifecycleStage(signals);
  const parentMilestone = primaryParentMilestone(signals.parentMilestones);
  const experiments = resolveExperiments(input.userId);
  const coachVariant = experiments["coach_copy_v1"] ?? "generic";

  const baseOutcome: OutcomeContext = {
    signals,
    goal: goalForCategory(input.category),
    childLifecycleStage: stage,
    parentMilestone,
    campaignId: input.campaignProgress?.campaignId ?? null,
    campaignStep: input.campaignProgress?.currentStep ?? null,
    experimentId: "coach_copy_v1",
    experimentVariant: coachVariant,
  };

  // Priority 1: Streak recovery — always when streak recently broken
  if (signals.streakBrokenDaysAgo != null) {
    const recovery = getStreakRecoveryNotification(
      signals.streakBrokenDaysAgo,
      signals.childName,
      signals.hadSevenDayStreak,
    );
    if (recovery) {
      const copy = applyCoach(recovery.title, recovery.body, signals, recovery.goal, coachVariant);
      return {
        ...copy,
        deepLink: recovery.deepLink,
        goal: recovery.goal,
        dedupKey: `streak_recovery:${input.localDate}:d${recovery.recoveryDay}`,
        recommendationKey: `streak_recovery:d${recovery.recoveryDay}`,
        outcome: { ...baseOutcome, goal: recovery.goal },
        priority: 100,
        source: "streak_recovery",
      };
    }
  }

  // Priority 2: Active campaign step
  if (input.campaignProgress) {
    const campaign = suggestCampaign(signals);
    if (campaign) {
      const next = nextCampaignStep(campaign, input.campaignProgress);
      if (next) {
        const notif = campaignNotification(campaign, next.step, signals.childName);
        const copy = applyCoach(notif.title, notif.body, signals, notif.goal, coachVariant);
        return {
          ...copy,
          deepLink: notif.deepLink,
          goal: notif.goal,
          dedupKey: `campaign:${campaign.id}:step${next.step.day}:${input.localDate}`,
          recommendationKey: `campaign:${campaign.id}:${next.step.day}`,
          outcome: {
            ...baseOutcome,
            goal: notif.goal,
            campaignId: campaign.id,
            campaignStep: next.stepIndex,
          },
          priority: 90,
          source: "campaign",
        };
      }
    }
  }

  // Priority 2.5: Subscription-lifecycle conversion (trial ending, expiring,
  // high purchase intent). Only fires when detailed subscription signals are
  // present — fully backward compatible for callers that omit them.
  if (signals.subscription) {
    const lifecycleCopy = buildConversionLifecycleCopy(lifecycleStage, signals);
    if (lifecycleCopy) {
      // Trial-active nudges are engagement-slot only and lower priority; urgent
      // monetization moments (ending/expiring/intent) rank just below campaigns.
      const isUrgent =
        lifecycleStage === "TRIAL_ENDING" ||
        lifecycleStage === "SUBSCRIPTION_EXPIRING" ||
        lifecycleStage === "HIGH_PURCHASE_INTENT";
      const gateOk = isUrgent || input.category === "engagement";
      if (gateOk) {
        const copy = applyCoach(
          lifecycleCopy.title,
          lifecycleCopy.body,
          signals,
          lifecycleCopy.goal,
          coachVariant,
        );
        return {
          ...copy,
          deepLink: lifecycleCopy.deepLink,
          goal: lifecycleCopy.goal,
          dedupKey: `conv_lifecycle:${lifecycleCopy.trigger}:${input.localDate}`,
          recommendationKey: `conv_lifecycle:${lifecycleCopy.trigger}`,
          outcome: { ...baseOutcome, goal: lifecycleCopy.goal },
          priority: isUrgent ? 88 : 66,
          source: "conversion_lifecycle",
        };
      }
    }
  }

  // Priority 3: Churn / retention intervention — reason-driven re-engagement.
  if (
    signals.churnRisk7d >= 0.6 &&
    stageStrategy.interventionIntensity !== "low"
  ) {
    const reengage = buildReengagementCopy(signals);
    const copy = applyCoach(
      reengage.title,
      reengage.body,
      signals,
      reengage.goal,
      coachVariant,
    );
    return {
      ...copy,
      deepLink: reengage.deepLink,
      goal: reengage.goal,
      dedupKey: `reengagement:${reengage.reason}:${input.localDate}`,
      recommendationKey: `reengagement:${reengage.reason}`,
      outcome: { ...baseOutcome, goal: reengage.goal },
      priority: 85,
      source: "reengagement",
    };
  }

  // Priority 4: Learning outcome (learning categories)
  if (
    input.category === "learning_activity" ||
    input.category === "phonics" ||
    input.category === "story_time"
  ) {
    const learning = buildLearningOutcomeCopy({
      childName: signals.childName,
      lessonsCompletedTotal: signals.lessonsCompletedTotal,
      lessonsCompleted7d: signals.lessonsCompleted7d,
      weakSubjects: signals.weakSubjects,
      strongSubjects: signals.strongSubjects,
      unfinishedLessonCount: signals.unfinishedLessonCount,
    });
    if (learning) {
      const copy = applyCoach(learning.title, learning.body, signals, learning.goal, coachVariant);
      return {
        ...copy,
        deepLink: learning.deepLink,
        goal: learning.goal,
        dedupKey: `learning:${learning.recommendationKey}:${input.localDate}`,
        recommendationKey: learning.recommendationKey,
        outcome: { ...baseOutcome, goal: learning.goal },
        priority: 75,
        source: "learning",
      };
    }
  }

  // Priority 5: Routine outcome
  if (input.category === "routine" || input.category === "routine_item") {
    const routine = buildRoutineOutcomeCopy({
      childName: signals.childName,
      routineCompletionRate7d: signals.routineCompletionRate7d,
      routinesCompletedToday: signals.routinesCompletedToday,
      routinesMissedYesterday: signals.routinesMissedYesterday,
      weeklyRoutineConsistency: signals.weeklyRoutineConsistency,
      completedToday: input.routineToday?.completed ?? signals.routinesCompletedToday,
      totalToday: input.routineToday?.total ?? 0,
      lateRoutineYesterday: input.routineToday?.lateYesterday ?? false,
    });
    if (routine) {
      const copy = applyCoach(routine.title, routine.body, signals, routine.goal, coachVariant);
      return {
        ...copy,
        deepLink: routine.deepLink,
        goal: routine.goal,
        dedupKey: `routine:${routine.recommendationKey}:${input.localDate}`,
        recommendationKey: routine.recommendationKey,
        outcome: { ...baseOutcome, goal: routine.goal },
        priority: 70,
        source: "routine",
      };
    }
  }

  // Priority 6: Subscription conversion (engagement slot only)
  if (input.category === "engagement" && shouldTriggerConversionJourney(signals)) {
    const conversion = buildConversionCopy(signals);
    if (conversion) {
      const copy = applyCoach(conversion.title, conversion.body, signals, conversion.goal, coachVariant);
      return {
        ...copy,
        deepLink: conversion.deepLink,
        goal: conversion.goal,
        dedupKey: `conversion:${conversion.trigger}:${input.localDate}`,
        recommendationKey: `conversion:${conversion.trigger}`,
        outcome: { ...baseOutcome, goal: conversion.goal },
        priority: 65,
        source: "conversion",
      };
    }
  }

  // Priority 7: Parent milestone journey
  if (parentMilestone && input.category === "engagement") {
    const milestoneCopy = milestoneJourneyCopy(parentMilestone, signals.childName);
    if (milestoneCopy) {
      const copy = applyCoach(
        milestoneCopy.title,
        milestoneCopy.body,
        signals,
        "GOAL_PARENT_ENGAGEMENT",
        coachVariant,
      );
      return {
        ...copy,
        deepLink: milestoneCopy.deepLink,
        goal: "GOAL_PARENT_ENGAGEMENT",
        dedupKey: `milestone:${parentMilestone}:${input.localDate}`,
        recommendationKey: `milestone:${parentMilestone}`,
        outcome: { ...baseOutcome, goal: "GOAL_PARENT_ENGAGEMENT", parentMilestone },
        priority: 60,
        source: "milestone",
      };
    }
  }

  return null;
}

export function buildOutcomeContextForCategory(
  userId: string,
  category: NotificationCategory,
  signals: OutcomeSignals,
): OutcomeContext {
  const enriched = enrichSignalsWithChurn({
    ...signals,
    childLifecycleStage: detectChildLifecycleStage(signals),
    parentMilestones: detectParentMilestones({
      ...signals,
      childLifecycleStage: detectChildLifecycleStage(signals),
    }),
  });
  const experiments = resolveExperiments(userId);
  return {
    signals: enriched,
    goal: goalForCategory(category),
    childLifecycleStage: enriched.childLifecycleStage,
    parentMilestone: primaryParentMilestone(enriched.parentMilestones),
    campaignId: null,
    campaignStep: null,
    experimentId: "coach_copy_v1",
    experimentVariant: experiments["coach_copy_v1"] ?? "generic",
  };
}

function applyCoach(
  title: string,
  body: string,
  signals: OutcomeSignals,
  goal: NotificationGoal,
  variant: string,
): { title: string; body: string } {
  if (variant !== "coach") return { title, body };
  return coachifyCopy({ title, body, childName: signals.childName, goal, signals });
}
