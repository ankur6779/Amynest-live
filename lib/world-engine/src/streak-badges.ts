export type StreakBadgeId = "explorer_streak" | "super_learner_streak" | "world_master_streak";

export type StreakBadgeDefinition = {
  id: StreakBadgeId;
  title: string;
  description: string;
  emoji: string;
  minDays: number;
};

export const STREAK_BADGES: StreakBadgeDefinition[] = [
  {
    id: "explorer_streak",
    title: "Explorer Streak",
    description: "Play Discovery Worlds 3 days in a row",
    emoji: "🔥",
    minDays: 3,
  },
  {
    id: "super_learner_streak",
    title: "Super Learner Streak",
    description: "Keep learning 7 days in a row",
    emoji: "⭐",
    minDays: 7,
  },
  {
    id: "world_master_streak",
    title: "World Master Streak",
    description: "An amazing 14-day learning rhythm",
    emoji: "👑",
    minDays: 14,
  },
];

export function unlockedStreakBadges(streakDays: number): StreakBadgeDefinition[] {
  return STREAK_BADGES.filter((b) => streakDays >= b.minDays);
}

export function nextStreakBadge(streakDays: number): StreakBadgeDefinition | null {
  return STREAK_BADGES.find((b) => streakDays < b.minDays) ?? null;
}
