import type { NotificationGoal } from "./types.js";

export interface RoutineOutcomeCopy {
  title: string;
  body: string;
  deepLink: string;
  goal: NotificationGoal;
  recommendationKey: string;
}

export interface RoutineSignals {
  childName: string;
  routineCompletionRate7d: number;
  routinesCompletedToday: number;
  routinesMissedYesterday: boolean;
  weeklyRoutineConsistency: number;
  completedToday: number;
  totalToday: number;
  lateRoutineYesterday: boolean;
}

export function buildRoutineOutcomeCopy(s: RoutineSignals): RoutineOutcomeCopy | null {
  if (s.totalToday > 0 && s.completedToday === 0 && s.routinesCompletedToday === 0) {
    return {
      goal: "GOAL_ROUTINE_COMPLETION",
      title: `${s.totalToday} tasks ready for ${s.childName} ☀️`,
      body: "Morning routine is set — check off the first task to start the streak.",
      deepLink: "/routine",
      recommendationKey: "routine:start_today",
    };
  }

  if (s.routinesMissedYesterday) {
    return {
      goal: "GOAL_ROUTINE_COMPLETION",
      title: "Fresh start today 🌅",
      body: `Yesterday was busy — ${s.childName}'s routine is lighter today. One win counts.`,
      deepLink: "/routine",
      recommendationKey: "routine:missed_yesterday",
    };
  }

  if (s.lateRoutineYesterday) {
    return {
      goal: "GOAL_ROUTINE_COMPLETION",
      title: "Earlier start today? ⏰",
      body: `Starting 15 minutes earlier helped families like yours finish ${s.childName}'s routine.`,
      deepLink: "/routine",
      recommendationKey: "routine:late_yesterday",
    };
  }

  if (s.routineCompletionRate7d >= 0.8 && s.weeklyRoutineConsistency >= 0.7) {
    return {
      goal: "GOAL_ROUTINE_COMPLETION",
      title: "Consistency champion 🏆",
      body: `${s.childName} completed ${Math.round(s.routineCompletionRate7d * 100)}% of routines this week. Keep it going.`,
      deepLink: "/routine",
      recommendationKey: "routine:high_consistency",
    };
  }

  if (s.routineCompletionRate7d <= 0.35 && s.weeklyRoutineConsistency < 0.4) {
    return {
      goal: "GOAL_ROUTINE_COMPLETION",
      title: "Simplify the routine ✂️",
      body: `Try 3 must-do tasks for ${s.childName} — smaller routines stick better.`,
      deepLink: "/routine",
      recommendationKey: "routine:simplify",
    };
  }

  if (s.totalToday > 0 && s.completedToday > 0 && s.completedToday < s.totalToday) {
    const remaining = s.totalToday - s.completedToday;
    return {
      goal: "GOAL_ROUTINE_COMPLETION",
      title: `${remaining} task${remaining > 1 ? "s" : ""} left today`,
      body: `${s.childName} is ${remaining} step${remaining > 1 ? "s" : ""} from finishing today's routine.`,
      deepLink: "/routine",
      recommendationKey: "routine:finish_today",
    };
  }

  return null;
}
