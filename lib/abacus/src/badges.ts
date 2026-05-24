export type AbacusBadgeId =
  | "first_correct"
  | "perfect_score"
  | "daily_goal"
  | "streak_3"
  | "streak_7"
  | "speed_star"
  | "level_cleared";

export interface AbacusBadgeDef {
  id: AbacusBadgeId;
  emoji: string;
  labelKey: string;
  defaultLabel: string;
}

export const ABACUS_BADGES: readonly AbacusBadgeDef[] = [
  { id: "first_correct", emoji: "🎯", labelKey: "abacus.badge_first_correct", defaultLabel: "First correct!" },
  { id: "daily_goal", emoji: "☀️", labelKey: "abacus.badge_daily_goal", defaultLabel: "Daily goal met" },
  { id: "streak_3", emoji: "🔥", labelKey: "abacus.badge_streak_3", defaultLabel: "3-day streak" },
  { id: "streak_7", emoji: "🌟", labelKey: "abacus.badge_streak_7", defaultLabel: "7-day streak" },
  { id: "perfect_score", emoji: "💯", labelKey: "abacus.badge_perfect", defaultLabel: "Perfect challenge" },
  { id: "speed_star", emoji: "⚡", labelKey: "abacus.badge_speed", defaultLabel: "Speed star" },
  { id: "level_cleared", emoji: "🏆", labelKey: "abacus.badge_level_cleared", defaultLabel: "Level cleared" },
] as const;

export interface BadgeEvalInput {
  totalCorrect: number;
  completedLevels: readonly number[];
  bestScores: Record<string, { points: number; accuracyPct: number }>;
  streakDays: number;
  dailyCorrect: number;
  dailyGoal: number;
}

/** Return badge ids earned for the current progress snapshot. */
export function evaluateAbacusBadges(input: BadgeEvalInput): AbacusBadgeId[] {
  const earned = new Set<AbacusBadgeId>();

  if (input.totalCorrect >= 1) earned.add("first_correct");
  if (input.dailyCorrect >= input.dailyGoal) earned.add("daily_goal");
  if (input.streakDays >= 3) earned.add("streak_3");
  if (input.streakDays >= 7) earned.add("streak_7");
  if (input.completedLevels.length >= 1) earned.add("level_cleared");

  for (const score of Object.values(input.bestScores)) {
    if (score.accuracyPct === 100) earned.add("perfect_score");
    // 5 questions × (10 + 5 fast) = 75 max; ≥60 implies most answers were fast.
    if (score.points >= 60) earned.add("speed_star");
  }

  return ABACUS_BADGES.filter((b) => earned.has(b.id)).map((b) => b.id);
}
