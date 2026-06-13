import type { DisplayPhonicsItem, PhonicsProgressMap } from "@/hooks/use-phonics-data";
import { getCvcWordEntry } from "@workspace/phonics-sounds";
import {
  isValidDisplayPhonicsItem,
  sanitizeDisplayPhonicsItems,
} from "@/lib/phonics-item-guards";
import { WORD_FAMILIES } from "./content/word-families";
import { getFamilyForWord } from "./content/word-families";

export type DailyMissionSlot =
  | "review"
  | "practice"
  | "new_word"
  | "challenge"
  | "story";

export type DailyMissionTask = {
  slot: DailyMissionSlot;
  id: string;
  emoji: string;
  label: string;
  word?: string;
  familyId?: string;
  storyId?: string;
  completed: boolean;
};

export type DailyReadingMission = {
  dateKey: string;
  tasks: DailyMissionTask[];
  estimatedMinutes: number;
  streakDay: number;
  completed: boolean;
};

const STORAGE_PREFIX = "amynest:phonics-v2-mission:";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function hashChildDay(childId: number, dateKey: string): number {
  let h = childId;
  for (const c of dateKey) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** Short decodable words only — excludes sentences, stories, and long symbols. */
export function isMissionWordItem(
  item: DisplayPhonicsItem | null | undefined,
): item is DisplayPhonicsItem {
  if (!isValidDisplayPhonicsItem(item)) return false;
  if (item.type === "sentence" || item.type === "story" || item.type === "sound") {
    return false;
  }
  const word = item.symbol.trim().toLowerCase();
  if (!word || word.includes(" ")) return false;
  return getCvcWordEntry(word) !== undefined || (item.type === "word" && word.length <= 6);
}

export function filterMissionWordItems(items: DisplayPhonicsItem[]): DisplayPhonicsItem[] {
  return sanitizeDisplayPhonicsItems(items).filter(isMissionWordItem);
}

export function formatMissionWordLabel(prefix: string, word: string): string {
  return `${prefix}: ${word.trim().toLowerCase()}`;
}

function pickKnownWord(
  items: DisplayPhonicsItem[],
  progress: PhonicsProgressMap,
  seed: number,
): DisplayPhonicsItem | null {
  const missionItems = filterMissionWordItems(items);
  const known = missionItems.filter(
    (it) =>
      (progress.practiced[it.id] ?? 0) > 0 ||
      progress.mastered[it.id],
  );
  if (known.length === 0) return missionItems[0] ?? null;
  return known[seed % known.length] ?? null;
}

function pickNewWord(
  items: DisplayPhonicsItem[],
  progress: PhonicsProgressMap,
  seed: number,
): DisplayPhonicsItem | null {
  const missionItems = filterMissionWordItems(items);
  const fresh = missionItems.filter(
    (it) => !progress.practiced[it.id] && !progress.mastered[it.id],
  );
  const pool = fresh.length > 0 ? fresh : missionItems;
  return pool[seed % pool.length] ?? null;
}

function pickCvcWords(items: DisplayPhonicsItem[], count: number, seed: number): string[] {
  const words = filterMissionWordItems(items)
    .map((it) => it.symbol.trim().toLowerCase())
    .filter((w) => getCvcWordEntry(w));
  if (words.length === 0) {
    return WORD_FAMILIES[0]!.words.slice(0, count).map((w) => w.word);
  }
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(words[(seed + i) % words.length]!);
  }
  return [...new Set(out)].slice(0, count);
}

export function buildDailyReadingMission(opts: {
  childId: number;
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  streakDay?: number;
  storyId?: string;
}): DailyReadingMission {
  const dateKey = todayKey();
  const seed = hashChildDay(opts.childId, dateKey);
  const reviewItem = pickKnownWord(opts.items, opts.progress, seed);
  const practiceWords = pickCvcWords(opts.items, 2, seed + 3);
  const newItem = pickNewWord(opts.items, opts.progress, seed + 7);
  const challengeWord = practiceWords[0] ?? "cat";
  const family = getFamilyForWord(challengeWord);

  const tasks: DailyMissionTask[] = [
    {
      slot: "review",
      id: `review-${reviewItem?.id ?? "warmup"}`,
      emoji: "🔄",
      label: reviewItem
        ? formatMissionWordLabel("Review", reviewItem.symbol)
        : "Warm-up sound",
      word: reviewItem?.symbol.trim().toLowerCase(),
      completed: false,
    },
    ...practiceWords.map((w, i) => ({
      slot: "practice" as const,
      id: `practice-${w}-${i}`,
      emoji: "🎯",
      label: formatMissionWordLabel("Practice", w),
      word: w,
      completed: false,
    })),
    {
      slot: "new_word",
      id: `new-${newItem?.id ?? "word"}`,
      emoji: "✨",
      label: newItem ? formatMissionWordLabel("New", newItem.symbol) : "New word",
      word: newItem?.symbol.trim().toLowerCase(),
      completed: false,
    },
    {
      slot: "challenge",
      id: `blend-${challengeWord}`,
      emoji: "🎵",
      label: formatMissionWordLabel("Blend", challengeWord),
      word: challengeWord,
      familyId: family?.id,
      completed: false,
    },
    {
      slot: "story",
      id: `story-${opts.storyId ?? "story-sam-hat"}`,
      emoji: "📖",
      label: "Mini story",
      storyId: opts.storyId ?? "story-sam-hat",
      completed: false,
    },
  ];

  return {
    dateKey,
    tasks,
    estimatedMinutes: 4,
    streakDay: opts.streakDay ?? 1,
    completed: false,
  };
}

export function loadDailyMission(childId: number): DailyReadingMission | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyReadingMission;
    if (parsed.dateKey !== todayKey()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDailyMission(childId: number, mission: DailyReadingMission): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(mission));
  } catch {
    /* quota */
  }
}

export function completeMissionTask(
  mission: DailyReadingMission,
  taskId: string,
): DailyReadingMission {
  const tasks = mission.tasks.map((t) =>
    t.id === taskId ? { ...t, completed: true } : t,
  );
  const completed = tasks.every((t) => t.completed);
  return { ...mission, tasks, completed };
}

export function missionStreakFromHabit(practiceDays: number): number {
  return Math.max(1, practiceDays);
}
