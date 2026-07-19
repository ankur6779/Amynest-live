import type { CollectionState } from "./collections.js";
import type { MasteryState } from "./mastery.js";

export type AchievementV2Id =
  | "streak_7"
  | "perfect_100"
  | "fast_thinker"
  | "mental_master"
  | "tutor_explorer"
  | "weekend_warrior"
  | "consistency_hero"
  | "collector"
  | "boss_slayer"
  | "story_voyager"
  | "review_champion";

export type AchievementV2Def = {
  id: AchievementV2Id;
  title: string;
  emoji: string;
  hint: string;
};

export const ACHIEVEMENTS_V2: readonly AchievementV2Def[] = [
  { id: "streak_7", title: "7-Day Streak", emoji: "🔥", hint: "Practice 7 days in a row" },
  { id: "perfect_100", title: "100 Perfect", emoji: "💯", hint: "100 correct answers" },
  { id: "fast_thinker", title: "Fast Thinker", emoji: "⚡", hint: "High speed DNA" },
  { id: "mental_master", title: "Mental Master", emoji: "🧠", hint: "Mental skill Master+" },
  { id: "tutor_explorer", title: "Tutor Explorer", emoji: "💜", hint: "Ask Amy 10 times" },
  { id: "weekend_warrior", title: "Weekend Warrior", emoji: "🗓️", hint: "Complete a weekend mission" },
  { id: "consistency_hero", title: "Consistency Hero", emoji: "📈", hint: "High consistency DNA" },
  { id: "collector", title: "Collector", emoji: "🎒", hint: "Unlock 8 collection items" },
  { id: "boss_slayer", title: "Boss Slayer", emoji: "🐉", hint: "Defeat a chapter Boss" },
  { id: "story_voyager", title: "Story Voyager", emoji: "🗺️", hint: "Unlock 4 story worlds" },
  { id: "review_champion", title: "Review Champion", emoji: "🔁", hint: "Complete 5 spaced reviews" },
] as const;

export type AchievementV2Context = {
  streakDays: number;
  totalCorrect: number;
  dnaSpeed?: number;
  dnaConsistency?: number;
  mastery?: MasteryState | null;
  collection?: CollectionState | null;
  tutorAsks?: number;
  weekendMissionDone?: boolean;
  bossesDefeated?: number;
  worldsUnlocked?: number;
  reviewsCompleted?: number;
};

export function evaluateAchievementsV2(ctx: AchievementV2Context): AchievementV2Id[] {
  const earned: AchievementV2Id[] = [];
  const mental = ctx.mastery?.mental_speed;
  if (ctx.streakDays >= 7) earned.push("streak_7");
  if (ctx.totalCorrect >= 100) earned.push("perfect_100");
  if ((ctx.dnaSpeed ?? 0) >= 75) earned.push("fast_thinker");
  if (mental && (mental.tier === "master" || mental.tier === "legend")) {
    earned.push("mental_master");
  }
  if ((ctx.tutorAsks ?? 0) >= 10) earned.push("tutor_explorer");
  if (ctx.weekendMissionDone) earned.push("weekend_warrior");
  if ((ctx.dnaConsistency ?? 0) >= 70) earned.push("consistency_hero");
  if ((ctx.collection?.unlocked.length ?? 0) >= 8) earned.push("collector");
  if ((ctx.bossesDefeated ?? 0) >= 1) earned.push("boss_slayer");
  if ((ctx.worldsUnlocked ?? 0) >= 4) earned.push("story_voyager");
  if ((ctx.reviewsCompleted ?? 0) >= 5) earned.push("review_champion");
  return earned;
}
