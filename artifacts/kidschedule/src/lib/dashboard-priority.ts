import type { Entitlements } from "@/hooks/use-subscription";
import { isExpiredInternalTrial, isInternalTrial } from "@/lib/internal-trial";
import type { ActivationResumeState } from "@/lib/activation-resume";

/** Derived from production analytics cohort behavior. */
export type DashboardUserState =
  | "no_routine"
  | "has_routine_incomplete"
  | "routine_completed_today"
  | "trial_ending"
  | "trial_expired"
  | "paid_subscriber"
  | "returning_parent"
  | "inactive_parent";

export type DashboardPriorityInput = {
  hasTodayRoutine: boolean;
  todayDone: number;
  todayTotal: number;
  checkedInToday: boolean;
  dashboardVisitCount?: number;
  entitlements: Entitlements | null | undefined;
  trialDaysRemaining: number | null;
  inactiveDays?: number;
};

export function resolveDashboardUserState(
  input: DashboardPriorityInput,
): DashboardUserState {
  const { entitlements } = input;

  if (entitlements?.isPremiumSubscriber) return "paid_subscriber";
  if (isExpiredInternalTrial(entitlements)) return "trial_expired";
  if (
    isInternalTrial(entitlements) &&
    input.trialDaysRemaining != null &&
    input.trialDaysRemaining <= 2
  ) {
    return "trial_ending";
  }

  if ((input.inactiveDays ?? 0) >= 3) return "inactive_parent";
  if ((input.dashboardVisitCount ?? 0) >= 2) return "returning_parent";

  if (!input.hasTodayRoutine) return "no_routine";
  if (
    input.todayTotal > 0 &&
    input.todayDone >= input.todayTotal
  ) {
    return "routine_completed_today";
  }
  return "has_routine_incomplete";
}

/**
 * Mobile timeline used `order-1`, pushing routine timeline above resume/check-in.
 * Production: 58 dashboard viewers, 15 check-ins, 7 completions — continue flow
 * must stay above timeline (restore DOM order).
 */
export function timelineFlexOrderClass(priorityEnabled: boolean): string {
  return priorityEnabled ? "" : "order-1 md:order-none";
}

/**
 * DailyCheckInCard already surfaces the same local resume state.
 * Production: 0 activation_resume navigation events vs retention resume path.
 */
export function shouldShowActivationResumeBanner(
  priorityEnabled: boolean,
  localResume: ActivationResumeState | null,
  retentionSectionReady: boolean,
): boolean {
  if (!localResume) return false;
  if (!priorityEnabled) return true;
  if (retentionSectionReady) return false;
  return true;
}

/**
 * feature_open from discovery strip: 4 users / 221 app opens (30d).
 * Hide for engaged parents who already have today's routine or checked in.
 */
export function shouldShowFeatureDiscovery(
  priorityEnabled: boolean,
  state: DashboardUserState,
): boolean {
  if (!priorityEnabled) return true;
  if (state === "no_routine") return true;
  if (state === "inactive_parent") return true;
  return false;
}

type DashboardWidget =
  | "activation_resume"
  | "retention"
  | "timeline"
  | "today_progress"
  | "weekly_summary"
  | "value_bridge"
  | "seven_day_journey"
  | "children"
  | "amy_coach"
  | "coaching"
  | "discovery"
  | "more_insights";

/** Ideal widget order index (lower = higher on dashboard). */
export function widgetPriorityRank(
  widget: DashboardWidget,
  state: DashboardUserState,
): number {
  const base: Record<DashboardWidget, number> = {
    activation_resume: 10,
    retention: 20,
    timeline: 30,
    today_progress: 40,
    weekly_summary: 25,
    value_bridge: 26,
    seven_day_journey: 50,
    children: 55,
    amy_coach: 70,
    coaching: 75,
    discovery: 90,
    more_insights: 95,
  };

  if (state === "no_routine") {
    const weights: Partial<Record<DashboardWidget, number>> = {
      activation_resume: 10,
      retention: 15,
      timeline: 25,
      today_progress: 40,
      seven_day_journey: 20,
      discovery: 35,
    };
    return weights[widget] ?? base[widget] ?? 80;
  }

  if (
    state === "has_routine_incomplete" ||
    state === "routine_completed_today"
  ) {
    const weights: Partial<Record<DashboardWidget, number>> = {
      activation_resume: 10,
      retention: 15,
      timeline: 20,
      today_progress: 25,
      weekly_summary: 22,
      value_bridge: 23,
      seven_day_journey: 60,
      discovery: 100,
      amy_coach: 65,
    };
    return weights[widget] ?? base[widget] ?? 80;
  }

  return base[widget] ?? 80;
}
