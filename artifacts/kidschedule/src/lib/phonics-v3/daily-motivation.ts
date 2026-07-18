/**
 * Gentle daily return loops — consistency without streak shame.
 */
import { getLetterGroup } from "@workspace/phonics-curriculum";

export type DailyMotivationCard = {
  dateKey: string;
  kind: "mystery_sound" | "bonus_star" | "surprise_story" | "weekend_adventure";
  title: string;
  subtitle: string;
  emoji: string;
  /** Grapheme for mystery sound (UI hint only) */
  mysteryGrapheme?: string;
};

export type DailyMotivationState = {
  version: 1;
  /** Days with any phonics practice (not a punishing streak) */
  practiceDays: string[];
  lastBonusClaimedDate: string | null;
  bonusStars: number;
  treasureOpenedForGroups: number[];
};

const STORAGE_PREFIX = "amynest:phonics-daily-motivation:";

export function defaultDailyMotivationState(): DailyMotivationState {
  return {
    version: 1,
    practiceDays: [],
    lastBonusClaimedDate: null,
    bonusStars: 0,
    treasureOpenedForGroups: [],
  };
}

export function loadDailyMotivationState(childId: number): DailyMotivationState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultDailyMotivationState();
    return { ...defaultDailyMotivationState(), ...JSON.parse(raw) };
  } catch {
    return defaultDailyMotivationState();
  }
}

export function saveDailyMotivationState(
  childId: number,
  state: DailyMotivationState,
): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

function dateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Soft “days active this week” — never guilt language. */
export function gentlePracticeDays(state: DailyMotivationState): number {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return state.practiceDays.filter((k) => {
    const t = Date.parse(k);
    return Number.isFinite(t) && t >= weekAgo;
  }).length;
}

export function recordPracticeDay(
  state: DailyMotivationState,
  when = new Date(),
): DailyMotivationState {
  const key = dateKey(when);
  if (state.practiceDays.includes(key)) return state;
  return {
    ...state,
    practiceDays: [key, ...state.practiceDays].slice(0, 60),
  };
}

export function claimDailyBonus(
  state: DailyMotivationState,
): { state: DailyMotivationState; claimed: boolean } {
  const key = dateKey();
  if (state.lastBonusClaimedDate === key) {
    return { state, claimed: false };
  }
  return {
    claimed: true,
    state: {
      ...state,
      lastBonusClaimedDate: key,
      bonusStars: state.bonusStars + 1,
    },
  };
}

export function openWorldTreasure(
  state: DailyMotivationState,
  letterGroupIndex: number,
): { state: DailyMotivationState; opened: boolean } {
  if (state.treasureOpenedForGroups.includes(letterGroupIndex)) {
    return { state, opened: false };
  }
  return {
    opened: true,
    state: {
      ...state,
      treasureOpenedForGroups: [
        ...state.treasureOpenedForGroups,
        letterGroupIndex,
      ],
      bonusStars: state.bonusStars + 3,
    },
  };
}

export function buildDailyMotivationCard(opts: {
  letterGroupIndex: number;
  childId: number;
  now?: Date;
}): DailyMotivationCard {
  const now = opts.now ?? new Date();
  const key = dateKey(now);
  const group = getLetterGroup(opts.letterGroupIndex);
  const grapheme =
    group.graphemes[Math.abs(opts.childId + now.getUTCDate()) % group.graphemes.length]!;
  const dow = now.getUTCDay();

  if (dow === 0 || dow === 6) {
    return {
      dateKey: key,
      kind: "weekend_adventure",
      title: "Weekend reading adventure",
      subtitle: "A short lesson keeps your world glowing.",
      emoji: "🌈",
      mysteryGrapheme: grapheme,
    };
  }
  const rot = (opts.childId + now.getUTCDate()) % 3;
  if (rot === 0) {
    return {
      dateKey: key,
      kind: "mystery_sound",
      title: "Mystery sound",
      subtitle: `Can you find /${grapheme}/ today?`,
      emoji: "🔮",
      mysteryGrapheme: grapheme,
    };
  }
  if (rot === 1) {
    return {
      dateKey: key,
      kind: "bonus_star",
      title: "Bonus star waiting",
      subtitle: "Finish today’s lesson to collect it.",
      emoji: "⭐",
      mysteryGrapheme: grapheme,
    };
  }
  return {
    dateKey: key,
    kind: "surprise_story",
    title: "Surprise story path",
    subtitle: "After your lesson, open a decodable book.",
    emoji: "🎁",
    mysteryGrapheme: grapheme,
  };
}

export function amyDailyGreeting(opts: {
  childName: string;
  practiceDaysThisWeek: number;
  worldName: string;
}): string {
  const name = opts.childName.trim() || "friend";
  if (opts.practiceDaysThisWeek <= 0) {
    return `Hi ${name}! Ready for ${opts.worldName}?`;
  }
  if (opts.practiceDaysThisWeek >= 5) {
    return `Wow ${name} — you visited ${opts.practiceDaysThisWeek} days this week!`;
  }
  return `Welcome back, ${name}! Amy is happy you’re here.`;
}
