import type { DailyUnlockItem, GetUnlocksInput, SectionKey } from "./types";
import {
  NUMBERS_STAGES,
  ALPHABET_STAGES,
  PHONICS_LEVELS,
  SPEECH_LEVELS,
  STORY_LEVELS,
} from "./study-zone-progression";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

export function dailyUnlockSeed(dateIso: string, childId: number | string): number {
  return hashStr(`${dateIso}:${childId}`);
}

function pickFromPool<T>(
  pool: T[],
  seed: number,
  offset: number,
): T | null {
  if (pool.length === 0) return null;
  return pool[(seed + offset) % pool.length] ?? null;
}

const TODAY_POOL: Omit<DailyUnlockItem, "id">[] = [
  { section: "math", title: "New number challenge", emoji: "🔢", description: "Practice today's number tier" },
  { section: "phonics", title: "Phonics drill", emoji: "🔤", description: "Fresh sound practice" },
  { section: "stories", title: "Story of the day", emoji: "📖", description: "Level-matched story" },
  { section: "puzzles", title: "Brain teaser", emoji: "🧩", description: "Daily puzzle" },
  { section: "worksheets", title: "Printable worksheet", emoji: "📝", description: "Skill-matched worksheet" },
  { section: "speech", title: "Speak & shine", emoji: "🎤", description: "Pronunciation practice" },
  { section: "numbers", title: "Counting fun", emoji: "🔢", description: "New counting activity" },
  { section: "rhymes", title: "Rhyme time", emoji: "🎵", description: "Listen and repeat" },
];

const NEXT_SESSION_POOL: Omit<DailyUnlockItem, "id">[] = [
  { section: "stories", title: "New Story Challenge", emoji: "📚", description: "Unlock after this session" },
  { section: "math", title: "New Math Level", emoji: "➕", description: "Next number stage" },
  { section: "speech", title: "New Speech Activity", emoji: "🗣️", description: "Conversation practice" },
  { section: "phonics", title: "Blends practice", emoji: "✨", description: "Advanced phonics" },
  { section: "puzzles", title: "Harder puzzle", emoji: "🧠", description: "Level up difficulty" },
  { section: "lifeSkills", title: "Life skill mission", emoji: "🌟", description: "Daily habit task" },
];

export function buildTodaysUnlocks(
  input: GetUnlocksInput,
  opts: {
    numbersStage: string;
    phonicsLevel: number;
    storyLevel: number;
  },
): DailyUnlockItem[] {
  const seed = dailyUnlockSeed(
    input.dateIso ?? new Date().toISOString().slice(0, 10),
    input.childId ?? 0,
  );
  const items: DailyUnlockItem[] = [];
  for (let i = 0; i < 5; i++) {
    const base = pickFromPool(TODAY_POOL, seed, i);
    if (!base) continue;
    items.push({
      ...base,
      id: `today_${seed}_${i}`,
      title:
        i === 0
          ? `Numbers: ${opts.numbersStage}`
          : i === 1
            ? `Phonics: ${PHONICS_LEVELS[opts.phonicsLevel] ?? "sounds"}`
            : base.title,
    });
  }
  return items;
}

export function buildNextSessionUnlocks(
  input: GetUnlocksInput,
  learningLevel: number,
): DailyUnlockItem[] {
  const seed = dailyUnlockSeed(
    input.dateIso ?? new Date().toISOString().slice(0, 10),
    `${input.childId ?? 0}_next`,
  );
  const count = input.isPremium ? 3 : 2;
  const items: DailyUnlockItem[] = [];
  for (let i = 0; i < count; i++) {
    const base = pickFromPool(NEXT_SESSION_POOL, seed, i + learningLevel);
    if (!base) continue;
    items.push({ ...base, id: `next_${seed}_${i}` });
  }
  return items;
}

export function buildRevisionContent(
  weakSkills: SectionKey[],
  seed: number,
): DailyUnlockItem[] {
  if (weakSkills.length === 0) return [];
  return weakSkills.slice(0, 3).map((section, i) => ({
    id: `revision_${seed}_${section}`,
    section,
    title: `Review ${section}`,
    emoji: "🔄",
    description: "Practice to boost mastery",
  }));
}

export { NUMBERS_STAGES, ALPHABET_STAGES, PHONICS_LEVELS, SPEECH_LEVELS, STORY_LEVELS };
