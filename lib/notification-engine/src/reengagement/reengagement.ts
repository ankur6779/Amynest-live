import type { NotificationGoal, OutcomeSignals } from "../outcomes/types.js";

export type InactivityReason =
  | "unfinished_routine"
  | "unfinished_lesson"
  | "streak_broken"
  | "never_activated"
  | "habit_faded"
  | "unknown";

export interface ReengagementDraft {
  title: string;
  body: string;
  deepLink: string;
  goal: NotificationGoal;
  reason: InactivityReason;
  trigger: string;
  personalizationUsed: string[];
}

/**
 * Infer the most likely reason a user stopped, from their behavioral signals.
 * This drives *why*-specific re-engagement instead of generic day-N reminders.
 */
export function inferInactivityReason(s: OutcomeSignals): InactivityReason {
  if (!s.firstRoutineCompleted && !s.firstLearningCompleted) {
    return "never_activated";
  }
  if (s.routinesMissedYesterday || (s.routineCompletionRate7d > 0 && s.routineCompletionRate7d < 0.5)) {
    return "unfinished_routine";
  }
  if (s.unfinishedLessonCount > 0) {
    return "unfinished_lesson";
  }
  if (s.streakBrokenDaysAgo != null || s.hadSevenDayStreak) {
    return "streak_broken";
  }
  if (s.accountAgeDays > 14) {
    return "habit_faded";
  }
  return "unknown";
}

/**
 * Produce the best re-engagement message for an inactive user, tailored to the
 * inferred reason and the depth of inactivity. Emotional, guilt-free, and
 * grounded in real saved progress — never fabricated.
 *
 * `daysSinceLastActive` controls tone: gentle early, stronger reason later,
 * respectful and low-frequency at the deepest stages.
 */
export function buildReengagementCopy(s: OutcomeSignals): ReengagementDraft {
  const name = safeName(s.childName);
  const reason = inferInactivityReason(s);
  const days = s.daysSinceLastActive;
  const deep = days >= 7;
  const used: string[] = ["childName", "daysSinceLastActive"];

  switch (reason) {
    case "unfinished_routine":
      return {
        title: deep ? `${name}'s routine is waiting` : "Pick up where you left off",
        body: deep
          ? `No pressure — ${name}'s routine is saved and ready whenever you are.`
          : `One small step on ${name}'s routine keeps the day on track.`,
        deepLink: "/routines?source=notif_winback",
        goal: deep ? "GOAL_REACTIVATION" : "GOAL_ROUTINE_COMPLETION",
        reason,
        trigger: `winback_routine_d${days}`,
        personalizationUsed: used,
      };

    case "unfinished_lesson":
      return {
        title: `${name} was in the middle of something`,
        body: `A lesson is still open for ${name} — pick it back up in a tap.`,
        deepLink: "/learning?source=notif_winback",
        goal: deep ? "GOAL_REACTIVATION" : "GOAL_LEARNING_COMPLETION",
        reason,
        trigger: `winback_lesson_d${days}`,
        personalizationUsed: used,
      };

    case "streak_broken":
      return {
        title: "Streaks are easy to restart",
        body: `${name} had a great run going. One activity today starts a fresh streak.`,
        deepLink: "/routines?source=notif_winback",
        goal: "GOAL_STREAK_RECOVERY",
        reason,
        trigger: `winback_streak_d${days}`,
        personalizationUsed: used,
      };

    case "never_activated":
      return {
        title: `Let's set up ${name}'s first routine`,
        body: `It takes a minute and Amy does the heavy lifting — a calmer day for ${name} starts here.`,
        deepLink: "/routines/generate?source=notif_winback",
        goal: "GOAL_ROUTINE_COMPLETION",
        reason,
        trigger: `winback_activate_d${days}`,
        personalizationUsed: used,
      };

    case "habit_faded":
      return {
        title: deep ? `We saved everything for ${name}` : `A fresh start for ${name}`,
        body: deep
          ? `Whenever you're ready, ${name}'s plans and progress are right where you left them.`
          : `New activities are ready for ${name} — drop in when it suits you.`,
        deepLink: "/dashboard?source=notif_winback",
        goal: "GOAL_REACTIVATION",
        reason,
        trigger: `winback_habit_d${days}`,
        personalizationUsed: used,
      };

    default:
      return {
        title: `${name}'s journey is saved`,
        body: `No rush — everything for ${name} is here whenever you want to continue.`,
        deepLink: "/dashboard?source=notif_winback",
        goal: "GOAL_REACTIVATION",
        reason,
        trigger: `winback_generic_d${days}`,
        personalizationUsed: used,
      };
  }
}

function safeName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  return trimmed.length > 0 ? trimmed : "your child";
}
