/**
 * Collection catalog — unlocked only through learning (never payment).
 */

export type CollectionKind = "gem" | "star" | "pet" | "sticker" | "theme" | "avatar" | "card";

export type CollectionItemId =
  | "gem_teal"
  | "gem_amber"
  | "gem_violet"
  | "star_first"
  | "star_streak"
  | "star_perfect"
  | "pet_fox"
  | "pet_owl"
  | "pet_panda"
  | "sticker_lightning"
  | "sticker_beads"
  | "sticker_trophy"
  | "theme_sunrise"
  | "theme_ocean"
  | "avatar_explorer"
  | "avatar_champion"
  | "card_warmup"
  | "card_mission"
  | "card_master";

export type CollectionItemDef = {
  id: CollectionItemId;
  kind: CollectionKind;
  title: string;
  emoji: string;
  /** How the child earns it (learning only). */
  unlockHint: string;
};

export const COLLECTION_CATALOG: readonly CollectionItemDef[] = [
  { id: "gem_teal", kind: "gem", title: "Teal Brain Gem", emoji: "💎", unlockHint: "Complete a warm-up" },
  { id: "gem_amber", kind: "gem", title: "Amber Gem", emoji: "🔶", unlockHint: "Finish today's mission" },
  { id: "gem_violet", kind: "gem", title: "Violet Gem", emoji: "💜", unlockHint: "Ask Amy 3 times" },
  { id: "star_first", kind: "star", title: "First Star", emoji: "⭐", unlockHint: "First correct answer" },
  { id: "star_streak", kind: "star", title: "Streak Star", emoji: "🌟", unlockHint: "3-day streak" },
  { id: "star_perfect", kind: "star", title: "Perfect Star", emoji: "✨", unlockHint: "Perfect challenge" },
  { id: "pet_fox", kind: "pet", title: "Clever Fox", emoji: "🦊", unlockHint: "10 correct answers" },
  { id: "pet_owl", kind: "pet", title: "Wise Owl", emoji: "🦉", unlockHint: "Mental mastery developing+" },
  { id: "pet_panda", kind: "pet", title: "Calm Panda", emoji: "🐼", unlockHint: "Complete 5 missions" },
  { id: "sticker_lightning", kind: "sticker", title: "Lightning", emoji: "⚡", unlockHint: "Play Lightning Round" },
  { id: "sticker_beads", kind: "sticker", title: "Magic Beads", emoji: "🧮", unlockHint: "Play Magic Beads" },
  { id: "sticker_trophy", kind: "sticker", title: "Trophy", emoji: "🏆", unlockHint: "Unlock a new level" },
  { id: "theme_sunrise", kind: "theme", title: "Sunrise Board", emoji: "🌅", unlockHint: "7-day streak" },
  { id: "theme_ocean", kind: "theme", title: "Ocean Board", emoji: "🌊", unlockHint: "Master addition" },
  { id: "avatar_explorer", kind: "avatar", title: "Explorer Hat", emoji: "🎩", unlockHint: "Finish Learn lesson" },
  { id: "avatar_champion", kind: "avatar", title: "Champion Cape", emoji: "🦸", unlockHint: "Legend mental speed" },
  { id: "card_warmup", kind: "card", title: "Warm-up Card", emoji: "🔥", unlockHint: "First warm-up" },
  { id: "card_mission", kind: "card", title: "Quest Card", emoji: "🗺️", unlockHint: "First mission complete" },
  { id: "card_master", kind: "card", title: "Master Card", emoji: "📜", unlockHint: "Any skill Master tier" },
] as const;

export type CollectionState = {
  unlocked: CollectionItemId[];
  gems: number;
  stars: number;
  missionsCompleted: number;
  tutorAsks: number;
};

export function emptyCollectionState(): CollectionState {
  return {
    unlocked: [],
    gems: 0,
    stars: 0,
    missionsCompleted: 0,
    tutorAsks: 0,
  };
}

export function unlockItem(state: CollectionState, id: CollectionItemId): CollectionState {
  if (state.unlocked.includes(id)) return state;
  return { ...state, unlocked: [...state.unlocked, id] };
}

export function grantGems(state: CollectionState, n: number): CollectionState {
  return { ...state, gems: state.gems + Math.max(0, n) };
}

export function grantStars(state: CollectionState, n: number): CollectionState {
  return { ...state, stars: state.stars + Math.max(0, n) };
}

export type CollectionUnlockContext = {
  totalCorrect: number;
  streakDays: number;
  perfectChallenge: boolean;
  warmupDone: boolean;
  missionComplete: boolean;
  tutorAsks: number;
  levelUnlocked: boolean;
  learnComplete: boolean;
  playedLightning: boolean;
  playedMagicBeads: boolean;
  mentalTierAtLeastDeveloping: boolean;
  additionMaster: boolean;
  anyMaster: boolean;
  mentalLegend: boolean;
  missionsCompleted: number;
};

/** Evaluate which catalog items should unlock from learning signals. */
export function evaluateCollectionUnlocks(
  state: CollectionState,
  ctx: CollectionUnlockContext,
): { state: CollectionState; newlyUnlocked: CollectionItemId[] } {
  let next = { ...state, unlocked: [...state.unlocked] };
  const newly: CollectionItemId[] = [];
  const tryUnlock = (id: CollectionItemId, cond: boolean) => {
    if (!cond || next.unlocked.includes(id)) return;
    next = unlockItem(next, id);
    newly.push(id);
  };

  tryUnlock("gem_teal", ctx.warmupDone);
  tryUnlock("gem_amber", ctx.missionComplete);
  tryUnlock("gem_violet", ctx.tutorAsks >= 3);
  tryUnlock("star_first", ctx.totalCorrect >= 1);
  tryUnlock("star_streak", ctx.streakDays >= 3);
  tryUnlock("star_perfect", ctx.perfectChallenge);
  tryUnlock("pet_fox", ctx.totalCorrect >= 10);
  tryUnlock("pet_owl", ctx.mentalTierAtLeastDeveloping);
  tryUnlock("pet_panda", ctx.missionsCompleted >= 5);
  tryUnlock("sticker_lightning", ctx.playedLightning);
  tryUnlock("sticker_beads", ctx.playedMagicBeads);
  tryUnlock("sticker_trophy", ctx.levelUnlocked);
  tryUnlock("theme_sunrise", ctx.streakDays >= 7);
  tryUnlock("theme_ocean", ctx.additionMaster);
  tryUnlock("avatar_explorer", ctx.learnComplete);
  tryUnlock("avatar_champion", ctx.mentalLegend);
  tryUnlock("card_warmup", ctx.warmupDone);
  tryUnlock("card_mission", ctx.missionComplete);
  tryUnlock("card_master", ctx.anyMaster);

  return { state: next, newlyUnlocked: newly };
}

export function getCollectionItem(id: CollectionItemId): CollectionItemDef | undefined {
  return COLLECTION_CATALOG.find((c) => c.id === id);
}
