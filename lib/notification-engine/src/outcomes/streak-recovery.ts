import type { NotificationGoal } from "./types.js";

export interface StreakRecoveryNotification {
  title: string;
  body: string;
  deepLink: string;
  goal: NotificationGoal;
  recoveryDay: 1 | 2 | 3 | 5;
}

/**
 * Streak recovery ladder after a broken streak.
 * Day 1: gentle → Day 5: comeback journey.
 */
export function getStreakRecoveryNotification(
  streakBrokenDaysAgo: number,
  childName: string,
  hadSevenDayStreak: boolean,
): StreakRecoveryNotification | null {
  if (streakBrokenDaysAgo < 1) return null;

  if (streakBrokenDaysAgo === 1) {
    return {
      recoveryDay: 1,
      goal: "GOAL_STREAK_RECOVERY",
      title: "No worries — tomorrow is fresh 🌤️",
      body: `Yesterday slipped by. One small routine task today restarts momentum for ${childName}.`,
      deepLink: "/routine",
    };
  }

  if (streakBrokenDaysAgo === 2) {
    return {
      recoveryDay: 2,
      goal: "GOAL_STREAK_RECOVERY",
      title: `${childName} is ready when you are 💪`,
      body: hadSevenDayStreak
        ? "You've done 7 days before — you can do it again. Pick the easiest task."
        : "Two days off happens. A 3-minute win today counts.",
      deepLink: "/routine",
    };
  }

  if (streakBrokenDaysAgo === 3) {
    return {
      recoveryDay: 3,
      goal: "GOAL_STREAK_RECOVERY",
      title: "Recovery challenge: 1 task ✅",
      body: `Complete just one routine item for ${childName} — that's the whole challenge today.`,
      deepLink: "/routine",
    };
  }

  if (streakBrokenDaysAgo >= 5 && streakBrokenDaysAgo <= 7) {
    return {
      recoveryDay: 5,
      goal: "GOAL_REACTIVATION",
      title: "Comeback journey starts now 🚀",
      body: `${childName}'s personalized plan is waiting. Tap to restart your streak story.`,
      deepLink: "/hub",
    };
  }

  return null;
}
