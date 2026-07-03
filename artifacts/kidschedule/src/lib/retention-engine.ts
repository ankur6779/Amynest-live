/**
 * Retention engine — global engagement streaks, achievement badges, and
 * milestone celebrations with analytics tracking.
 */

import { trackGrowthEvent } from "@/lib/growth-analytics";
import { notifyReviewTrigger } from "@/lib/review-service";

const STREAK_KEY = "amynest:engagement_streak";
const LAST_ACTIVE_KEY = "amynest:engagement_last_active";
const BADGES_KEY = "amynest:achievement_badges";
const MILESTONES_KEY = "amynest:milestones_reached";

export type AchievementBadge =
  | "first_routine"
  | "first_amy_chat"
  | "streak_3"
  | "streak_7"
  | "streak_14"
  | "streak_30"
  | "speech_practice"
  | "nutrition_week"
  | "premium_member";

const BADGE_LABELS: Record<AchievementBadge, string> = {
  first_routine: "First Routine Win",
  first_amy_chat: "Met AMY",
  streak_3: "3-Day Streak",
  streak_7: "Week Warrior",
  streak_14: "Two-Week Champion",
  streak_30: "Monthly Master",
  speech_practice: "Speech Star",
  nutrition_week: "Nutrition Hero",
  premium_member: "Premium Parent",
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Record daily engagement and update streak. */
export function recordEngagementDay(source: string): number {
  const today = todayKey();
  const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
  let streak = readJson<{ days: number; lastDate: string }>(STREAK_KEY, { days: 0, lastDate: "" });

  if (lastActive === today) {
    return streak.days;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  if (lastActive === yesterdayKey) {
    streak = { days: streak.days + 1, lastDate: today };
  } else {
    streak = { days: 1, lastDate: today };
  }

  writeJson(STREAK_KEY, streak);
  localStorage.setItem(LAST_ACTIVE_KEY, today);

  trackGrowthEvent("streak_updated", { streak_days: streak.days, source });
  checkStreakMilestones(streak.days);
  notifyReviewTrigger("streak_7_day", { streakDays: streak.days });

  return streak.days;
}

export function getEngagementStreak(): number {
  return readJson<{ days: number }>(STREAK_KEY, { days: 0 }).days;
}

function checkStreakMilestones(days: number): void {
  const milestones: Array<{ days: number; badge: AchievementBadge }> = [
    { days: 3, badge: "streak_3" },
    { days: 7, badge: "streak_7" },
    { days: 14, badge: "streak_14" },
    { days: 30, badge: "streak_30" },
  ];
  for (const m of milestones) {
    if (days >= m.days) unlockBadge(m.badge, "streak");
  }
}

/** Unlock an achievement badge (idempotent). Returns true if newly unlocked. */
export function unlockBadge(badge: AchievementBadge, source: string): boolean {
  const badges = readJson<AchievementBadge[]>(BADGES_KEY, []);
  if (badges.includes(badge)) return false;
  badges.push(badge);
  writeJson(BADGES_KEY, badges);

  trackGrowthEvent("achievement_unlocked", {
    badge,
    label: BADGE_LABELS[badge],
    source,
  });
  trackGrowthEvent("growth_milestone_reached", {
    milestone: badge,
    source,
  });
  notifyReviewTrigger("child_achievement_unlocked", { badge });

  return true;
}

export function getUnlockedBadges(): AchievementBadge[] {
  return readJson<AchievementBadge[]>(BADGES_KEY, []);
}

export type OnboardingMilestone =
  | "signup_completed"
  | "first_routine_generated"
  | "first_routine_created"
  | "first_amy_chat";

export function hasOnboardingMilestone(milestone: OnboardingMilestone): boolean {
  return readJson<string[]>(MILESTONES_KEY, []).includes(milestone);
}

/** Track onboarding → activation milestones. */
export function trackOnboardingMilestone(
  milestone: OnboardingMilestone,
  extra?: Record<string, string | number | boolean>,
): void {
  const reached = readJson<string[]>(MILESTONES_KEY, []);
  if (reached.includes(milestone)) return;
  reached.push(milestone);
  writeJson(MILESTONES_KEY, reached);

  trackGrowthEvent("onboarding_milestone", { milestone, ...extra });
  trackGrowthEvent(milestone, extra ?? {});

  if (milestone === "first_routine_created") unlockBadge("first_routine", "onboarding");
  if (milestone === "first_amy_chat") unlockBadge("first_amy_chat", "onboarding");
}

export function trackPremiumConversion(source: string): void {
  unlockBadge("premium_member", source);
  trackGrowthEvent("premium_conversion", { source });
  notifyReviewTrigger("premium_milestone", { source });
}
