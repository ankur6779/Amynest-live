import {
  decideNotification,
  type DecisionContext,
  type NotificationCandidate,
} from "../decision/decision-engine.js";
import { assessFatigue } from "../decision/fatigue.js";
import type { LifecycleStage, OutcomeSignals } from "../outcomes/types.js";
import { isMonetizationAllowedForSegment } from "./caps.js";
import type { AudienceSegment, CrmDecision, JourneyStepDefinition } from "./types.js";

export interface CrmDecisionInput {
  segment: AudienceSegment;
  lifecycleStage: LifecycleStage;
  step: JourneyStepDefinition;
  signals: OutcomeSignals;
  inQuietHours?: boolean;
  isActiveInAppNow?: boolean;
  crmNonCriticalSentToday?: number;
  maxNonCriticalPerDay?: number;
  minutesSinceLastNotification?: number;
}

/**
 * CRM decision wrapper — send / delay / skip using the existing decision engine
 * plus segment-specific monetization guards and frequency caps.
 */
export function decideCrmNotification(input: CrmDecisionInput): CrmDecision {
  const factors: string[] = [];
  const monetization = input.step.category === "conversion";

  if (monetization && !isMonetizationAllowedForSegment(input.segment, input.step.category)) {
    return {
      action: "skip",
      reason: "monetization_blocked_for_segment",
      expectedValue: 0,
      factors: ["segment_monetization_guard"],
      segment: input.segment,
      journeyStepId: input.step.stepId,
    };
  }

  const max = input.maxNonCriticalPerDay ?? 2;
  const sent = input.crmNonCriticalSentToday ?? 0;
  if (sent >= max) {
    return {
      action: "delay",
      reason: "segment_daily_cap",
      expectedValue: 0,
      factors: ["segment_cap"],
      segment: input.segment,
      journeyStepId: input.step.stepId,
    };
  }

  const engagement = input.signals.engagement;
  const fatigue = assessFatigue({
    sent7d: engagement?.notificationsSent7d ?? input.signals.notificationsOpened7d,
    opened7d: input.signals.notificationsOpened7d,
    dismissed7d: engagement?.notificationsDismissed7d ?? 0,
    consecutiveIgnored: engagement?.consecutiveIgnored ?? 0,
    permissionGranted: engagement?.permissionGranted,
  });
  const openRate =
    input.signals.engagement && input.signals.notificationsOpened7d > 0
      ? input.signals.notificationsOpened7d /
        Math.max(1, input.signals.engagement.notificationsSent7d)
      : undefined;

  const ctx: DecisionContext = {
    lifecycleStage: input.lifecycleStage,
    fatigue,
    inQuietHours: input.inQuietHours,
    isActiveInAppNow: input.isActiveInAppNow,
    permissionGranted: input.signals.engagement?.permissionGranted,
    isPremium: input.signals.isPremium,
    openRate7d: openRate,
    minutesSinceLastNotification: input.minutesSinceLastNotification,
  };

  const candidate: NotificationCandidate = {
    goal: input.step.goal,
    priority: monetization ? 70 : 55,
    monetization,
    critical: false,
  };

  const decision = decideNotification(candidate, ctx);
  factors.push(...decision.factors);

  if (!decision.send) {
    const action = input.inQuietHours ? "delay" : "skip";
    return {
      action,
      reason: decision.reason,
      expectedValue: decision.expectedValue,
      factors,
      segment: input.segment,
      journeyStepId: input.step.stepId,
    };
  }

  return {
    action: "send",
    reason: decision.reason,
    expectedValue: decision.expectedValue,
    factors,
    segment: input.segment,
    journeyStepId: input.step.stepId,
  };
}

/** Composite engagement score 0–1 for analytics / send-time optimization. */
export function computeEngagementScore(signals: OutcomeSignals): number {
  const sessions = Math.min(1, signals.sessionsLast7d / 7);
  const routine = signals.routineCompletionRate7d;
  const opens =
    signals.engagement && signals.engagement.notificationsSent7d > 0
      ? signals.notificationsOpened7d / signals.engagement.notificationsSent7d
      : 0.4;
  const recency = Math.max(0, 1 - signals.daysSinceLastActive / 14);
  return round2(sessions * 0.25 + routine * 0.35 + opens * 0.2 + recency * 0.2);
}

/** Subscription intent 0–1 — behavioral triggers boost score. */
export function computeSubscriptionIntent(signals: OutcomeSignals): number {
  if (signals.isPremium) return 0;
  let score = 0.1;
  const sub = signals.subscription;
  if (sub?.paywallViewCount) score += Math.min(0.3, sub.paywallViewCount * 0.1);
  if (sub?.paywallViewedDaysAgo != null && sub.paywallViewedDaysAgo <= 3) score += 0.2;
  const routines7d = signals.activity?.routinesCompleted7d ?? 0;
  if (routines7d >= 3) score += 0.25;
  if (signals.currentStreakDays >= 5) score += 0.15;
  return round2(Math.min(1, score));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
