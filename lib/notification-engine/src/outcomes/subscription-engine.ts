import type { NotificationGoal, OutcomeSignals } from "./types.js";

export interface ConversionNotification {
  title: string;
  body: string;
  deepLink: string;
  goal: NotificationGoal;
  trigger: string;
}

export interface ActivationStatus {
  activated: boolean;
  milestones: string[];
}

/** Free users must hit activation before conversion journeys fire. */
export function detectActivation(s: OutcomeSignals): ActivationStatus {
  const milestones: string[] = [];
  if (s.lessonsCompletedTotal >= 10) milestones.push("10_lessons");
  if (s.sessionsLast7d >= 7) milestones.push("7_day_usage");
  if (s.firstRoutineCompleted) milestones.push("first_routine");
  if (s.currentStreakDays >= 7) milestones.push("7_day_streak");
  if (s.firstLearningCompleted) milestones.push("first_lesson");

  const activated =
    milestones.includes("10_lessons") ||
    milestones.includes("7_day_usage") ||
    (milestones.includes("first_routine") && milestones.includes("first_lesson"));

  return { activated, milestones };
}

export function shouldTriggerConversionJourney(s: OutcomeSignals): boolean {
  if (s.isPremium) return false;
  const { activated } = detectActivation(s);
  if (!activated) return false;
  if (s.churnRisk30d > 0.7) return false;
  if (s.accountAgeDays < 7) return false;
  return true;
}

export function buildConversionCopy(s: OutcomeSignals): ConversionNotification | null {
  if (!shouldTriggerConversionJourney(s)) return null;

  const { milestones } = detectActivation(s);

  if (milestones.includes("10_lessons")) {
    return {
      goal: "GOAL_SUBSCRIPTION",
      trigger: "10_lessons",
      title: `${s.childName} is learning fast 🚀`,
      body: "Unlock unlimited lessons and personalized plans — you've already seen the impact.",
      deepLink: "/subscription",
    };
  }

  if (milestones.includes("7_day_streak")) {
    return {
      goal: "GOAL_SUBSCRIPTION",
      trigger: "7_day_streak",
      title: "Protect that streak ⭐",
      body: "Premium keeps advanced routines, insights, and learning paths unlocked.",
      deepLink: "/subscription",
    };
  }

  if (milestones.includes("7_day_usage")) {
    return {
      goal: "GOAL_SUBSCRIPTION",
      trigger: "7_day_usage",
      title: "You're an AmyNest regular 💛",
      body: "Families like yours save time with Premium — see what's included.",
      deepLink: "/subscription",
    };
  }

  return {
    goal: "GOAL_SUBSCRIPTION",
    trigger: "activation_default",
    title: "Ready for the next level?",
    body: `${s.childName}'s progress deserves the full AmyNest experience.`,
    deepLink: "/subscription",
  };
}
