import { todayIsoDate, yesterdayIsoDate } from "./age-bands";
import type {
  PlaygroundActivityId,
  PlaygroundBadge,
  PlaygroundRewardState,
  PlaygroundSticker,
} from "./types";

export const BADGE_CATALOG: PlaygroundBadge[] = [
  { id: "first_count", emoji: "🍎", titleKey: "badge_first_count" },
  { id: "addition_star", emoji: "➕", titleKey: "badge_addition_star" },
  { id: "daily_hero", emoji: "🏆", titleKey: "badge_daily_hero" },
  { id: "factory_master", emoji: "🏭", titleKey: "badge_factory_master" },
  { id: "fair_sharer", emoji: "🍪", titleKey: "badge_fair_sharer" },
  { id: "pattern_pro", emoji: "🔢", titleKey: "badge_pattern_pro" },
  { id: "puzzle_wiz", emoji: "🧩", titleKey: "badge_puzzle_wiz" },
];

export const STICKER_CATALOG: PlaygroundSticker[] = [
  { id: "sticker_star", emoji: "🌟", titleKey: "sticker_star", starsRequired: 10 },
  { id: "sticker_rainbow", emoji: "🌈", titleKey: "sticker_rainbow", starsRequired: 25 },
  { id: "sticker_rocket", emoji: "🚀", titleKey: "sticker_rocket", starsRequired: 50 },
  { id: "sticker_unicorn", emoji: "🦄", titleKey: "sticker_unicorn", starsRequired: 75 },
];

export function defaultRewardState(): PlaygroundRewardState {
  return {
    stars: 0,
    streakDays: 0,
    lastPlayDate: "",
    badges: [],
    unlockedStickers: [],
    activityCompletions: {},
    dailyCompletedDates: [],
  };
}

export function starsForCompletion(hintsUsed: number): number {
  return hintsUsed === 0 ? 3 : 1;
}

export function recordStreak(rewards: PlaygroundRewardState): PlaygroundRewardState {
  const today = todayIsoDate();
  if (rewards.lastPlayDate === today) return rewards;
  const continued = rewards.lastPlayDate === yesterdayIsoDate();
  return {
    ...rewards,
    streakDays: continued ? rewards.streakDays + 1 : 1,
    lastPlayDate: today,
  };
}

export function applyActivityComplete(
  rewards: PlaygroundRewardState,
  activityId: PlaygroundActivityId,
  starsEarned: number,
): PlaygroundRewardState {
  const next = recordStreak({
    ...rewards,
    stars: rewards.stars + starsEarned,
    activityCompletions: {
      ...rewards.activityCompletions,
      [activityId]: (rewards.activityCompletions[activityId] ?? 0) + 1,
    },
  });
  return applyStickerUnlocks(applyBadgeUnlocks(next, activityId));
}

export function applyDailyComplete(
  rewards: PlaygroundRewardState,
  starsEarned: number,
): PlaygroundRewardState {
  const today = todayIsoDate();
  const base = rewards.dailyCompletedDates.includes(today)
    ? rewards
    : {
        ...rewards,
        dailyCompletedDates: [...rewards.dailyCompletedDates, today].slice(-30),
        activityCompletions: {
          ...rewards.activityCompletions,
          daily_challenge: (rewards.activityCompletions.daily_challenge ?? 0) + 1,
        },
      };
  const next = recordStreak({
    ...base,
    stars: base.stars + starsEarned,
  });
  return applyStickerUnlocks(applyBadgeUnlocks(next, "daily_challenge"));
}

function applyBadgeUnlocks(
  rewards: PlaygroundRewardState,
  activityId: PlaygroundActivityId,
): PlaygroundRewardState {
  const owned = new Set(rewards.badges.map((b) => b.id));
  const unlock: PlaygroundBadge[] = [];
  const counts = rewards.activityCompletions;

  const rules: { id: string; check: () => boolean }[] = [
    {
      id: "first_count",
      check: () =>
        activityId === "counting_adventure" && (counts.counting_adventure ?? 0) >= 1,
    },
    {
      id: "addition_star",
      check: () => activityId === "addition_lab" && (counts.addition_lab ?? 0) >= 3,
    },
    {
      id: "daily_hero",
      check: () =>
        activityId === "daily_challenge" && rewards.dailyCompletedDates.length >= 3,
    },
    {
      id: "factory_master",
      check: () =>
        activityId === "multiplication_factory" &&
        (counts.multiplication_factory ?? 0) >= 3,
    },
    {
      id: "fair_sharer",
      check: () =>
        activityId === "division_bakery" && (counts.division_bakery ?? 0) >= 3,
    },
    {
      id: "pattern_pro",
      check: () =>
        activityId === "number_patterns" && (counts.number_patterns ?? 0) >= 5,
    },
    {
      id: "puzzle_wiz",
      check: () => activityId === "math_puzzles" && (counts.math_puzzles ?? 0) >= 5,
    },
  ];

  for (const rule of rules) {
    if (!owned.has(rule.id) && rule.check()) {
      const def = BADGE_CATALOG.find((b) => b.id === rule.id);
      if (def) unlock.push({ ...def, unlockedAt: Date.now() });
    }
  }

  if (unlock.length === 0) return rewards;
  return { ...rewards, badges: [...rewards.badges, ...unlock] };
}

function applyStickerUnlocks(rewards: PlaygroundRewardState): PlaygroundRewardState {
  const owned = new Set(rewards.unlockedStickers);
  const unlock: string[] = [];
  for (const sticker of STICKER_CATALOG) {
    if (!owned.has(sticker.id) && rewards.stars >= sticker.starsRequired) {
      unlock.push(sticker.id);
    }
  }
  if (unlock.length === 0) return rewards;
  return { ...rewards, unlockedStickers: [...rewards.unlockedStickers, ...unlock] };
}

/** Backfill sticker unlocks when loading persisted state. */
export function syncRewardProgress(rewards: PlaygroundRewardState): PlaygroundRewardState {
  return applyStickerUnlocks(rewards);
}

/** Top activities by completion count — for parent summary. */
export function topPlaygroundActivities(
  rewards: PlaygroundRewardState,
  limit = 3,
): { activityId: PlaygroundActivityId; count: number }[] {
  return Object.entries(rewards.activityCompletions)
    .map(([activityId, count]) => ({
      activityId: activityId as PlaygroundActivityId,
      count: count ?? 0,
    }))
    .filter((e) => e.activityId !== "daily_challenge" && e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
