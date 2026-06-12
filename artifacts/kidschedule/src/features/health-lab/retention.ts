import { dateKeyLocal } from "./storage";
import type { HealthLabPersistedState } from "./types";

export const SECRET_BADGE_IDS = [
  "secret-midnight-scientist",
  "secret-perfect-week",
  "secret-golden-touch",
] as const;

export type SecretBadgeId = (typeof SECRET_BADGE_IDS)[number];

export const WEEKLY_CHALLENGES = [
  { id: "wk-focus", title: "Focus Week", gameId: "breath-control", bonusXp: 50 },
  { id: "wk-balance", title: "Balance Week", gameId: "flamingo-balance", bonusXp: 50 },
  { id: "wk-reaction", title: "Speed Week", gameId: "reaction-time", bonusXp: 50 },
] as const;

export const SEASONAL_THEMES = [
  { id: "spring-bloom", name: "Spring Bloom", emoji: "🌸", months: [3, 4, 5] },
  { id: "summer-sun", name: "Summer Sun", emoji: "☀️", months: [6, 7, 8] },
  { id: "autumn-leaves", name: "Autumn Leaves", emoji: "🍂", months: [9, 10, 11] },
  { id: "winter-frost", name: "Winter Frost", emoji: "❄️", months: [12, 1, 2] },
] as const;

export function weekKey(d = new Date()): string {
  const dk = dateKeyLocal(d);
  const date = new Date(dk + "T12:00:00");
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${week}`;
}

export function monthKey(d = new Date()): string {
  const dk = dateKeyLocal(d);
  return dk.slice(0, 7);
}

export function getSeasonalTheme(d = new Date()): (typeof SEASONAL_THEMES)[number] {
  const m = d.getMonth() + 1;
  return SEASONAL_THEMES.find((s) => (s.months as readonly number[]).includes(m)) ?? SEASONAL_THEMES[0];
}

export function getWeeklyChallenge(d = new Date()) {
  const wk = weekKey(d);
  const idx = wk.charCodeAt(wk.length - 1) % WEEKLY_CHALLENGES.length;
  return WEEKLY_CHALLENGES[idx];
}

export function isGoldenChallengeDay(d = new Date()): boolean {
  return d.getDay() === 6;
}

export function isDoubleXpDay(d = new Date()): boolean {
  return d.getDay() === 0;
}

export type DailySurpriseType = "coins" | "xp" | "chest_hint";

export function rollDailySurprise(seed: string): { type: DailySurpriseType; amount: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const roll = Math.abs(h) % 100;
  if (roll < 40) return { type: "coins", amount: 10 + (roll % 15) };
  if (roll < 75) return { type: "xp", amount: 25 + (roll % 30) };
  return { type: "chest_hint", amount: 1 };
}

export function canOpenTreasureChest(state: HealthLabPersistedState): boolean {
  return state.streakDays >= 7 && !state.treasureChestOpenedThisWeek;
}

export const MONTHLY_MEGA_QUEST = {
  targetSessions: 20,
  bonusXp: 200,
  bonusCoins: 100,
} as const;

export const SPECIAL_EVENTS = [
  { id: "space-week", name: "Space Week", emoji: "🚀", weeks: [1, 5, 9] },
  { id: "ocean-week", name: "Ocean Week", emoji: "🌊", weeks: [2, 6, 10] },
  { id: "science-week", name: "Science Week", emoji: "🔬", weeks: [3, 7, 11] },
  { id: "dino-week", name: "Dinosaur Week", emoji: "🦕", weeks: [4, 8, 12] },
] as const;

export function getActiveSpecialEvent(d = new Date()) {
  const wk = weekKey(d);
  const weekNum = Number(wk.split("-W")[1] ?? 1) % 12 || 12;
  return SPECIAL_EVENTS.find((e) => (e.weeks as readonly number[]).includes(weekNum)) ?? SPECIAL_EVENTS[0];
}

export function getAmyEncouragement(seed: number): string {
  const msgs = [
    "You're doing amazing, scientist!",
    "Every try makes you stronger!",
    "Amy is proud of your focus today!",
    "Keep exploring your superpowers!",
    "Wow — what a wellness adventure!",
  ];
  return msgs[seed % msgs.length];
}

export function treasureChestReward(streakDays: number): { coins: number; itemId?: string } {
  if (streakDays >= 30) return { coins: 100, itemId: "trail-rainbow" };
  if (streakDays >= 14) return { coins: 60, itemId: "particle-stars" };
  return { coins: 35 };
}
