/**
 * Adaptive lesson selection — 70% weak / 20% review / 10% new.
 */
import type { DisplayPhonicsItem, PhonicsProgressMap } from "@/hooks/use-phonics-data";
import { getCvcWordEntry } from "@workspace/phonics-sounds";
import { isContentUnlocked, type CurriculumLevel } from "@workspace/phonics-curriculum";
import { sanitizeDisplayPhonicsItems } from "@/lib/phonics-item-guards";
import { WORD_FAMILIES, getFamilyForWord } from "@/lib/phonics-v2/content/word-families";
import type { PhonicsMasteryState } from "./mastery-engine";
import { getWeakestWords } from "./mastery-engine";
import {
  filterMissionWordItems,
  formatMissionWordLabel,
  type DailyMissionTask,
  type DailyReadingMission,
} from "@/lib/phonics-v2/daily-missions";
import {
  getOverdueWordIds,
  type PhonicsRetentionState,
} from "./spaced-repetition";
import { selectDigraphAdaptiveLessons } from "./content/digraph-adaptive";
import { selectBlendAdaptiveLessons } from "./content/blend-adaptive";
import { getCvccWordBank, isCvccPathwayAvailable } from "./content/cvcc-catalog";

export type WeakSkillProfile = {
  weakLetters: string[];
  weakPhonemes: string[];
  weakFamilies: string[];
  weakWords: string[];
  weakBlendPatterns: string[];
};

export type AdaptiveLessonPick = {
  word: string;
  reason: "overdue" | "weak" | "review" | "new";
  skillTag: string;
};

function hashChildDay(childId: number, dateKey: string): number {
  let h = childId;
  for (const c of dateKey) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function wordUnlocked(
  word: string,
  level: CurriculumLevel,
  letterGroupIndex = 1,
): boolean {
  const w = word.trim().toLowerCase();
  if (!/^[a-z]+$/.test(w)) return false;
  return isContentUnlocked(w, level, "word", { letterGroupIndex });
}

function symbolFromItem(item: DisplayPhonicsItem | undefined): string | undefined {
  if (!item) return undefined;
  const w = item.symbol.trim().toLowerCase();
  return /^[a-z]+$/.test(w) ? w : undefined;
}

export function buildWeakSkillProfile(
  mastery: PhonicsMasteryState,
  items: DisplayPhonicsItem[],
  progress: PhonicsProgressMap,
): WeakSkillProfile {
  const weakWords = getWeakestWords(mastery, 12).map((r) => r.id);

  const weakLetters = Object.values(mastery.letters)
    .filter((r) => r.score < 70)
    .map((r) => r.id);

  const weakPhonemes = Object.values(mastery.phonemes)
    .filter((r) => r.score < 70)
    .map((r) => r.id);

  const familyScores = new Map<string, number>();
  for (const f of WORD_FAMILIES) {
    const rec = mastery.families[f.id];
    familyScores.set(f.id, rec?.score ?? 0);
  }
  const weakFamilies = [...familyScores.entries()]
    .filter(([, s]) => s < 70)
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id);

  const weakBlendPatterns: string[] = [];
  for (const w of weakWords) {
    const entry = getCvcWordEntry(w);
    if (entry) weakBlendPatterns.push(entry.phonemes.join("-"));
  }

  if (weakWords.length === 0) {
    const practiced = sanitizeDisplayPhonicsItems(items).filter(
      (it) => (progress.practiced[it.id] ?? 0) > 0,
    );
    weakWords.push(
      ...practiced.slice(0, 5).map((it) => it.symbol.toLowerCase()),
    );
  }

  return {
    weakLetters,
    weakPhonemes,
    weakFamilies,
    weakWords,
    weakBlendPatterns: [...new Set(weakBlendPatterns)].slice(0, 8),
  };
}

export function selectAdaptiveLessons(opts: {
  childId: number;
  dateKey: string;
  mastery: PhonicsMasteryState;
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  retention?: PhonicsRetentionState;
  totalCount?: number;
  now?: number;
  currentLevel?: number;
  /** SATPIN letter group (1–8); gates L1 CVC / letter picks. */
  letterGroupIndex?: number;
}): AdaptiveLessonPick[] {
  const level = (opts.currentLevel ?? 1) as CurriculumLevel;
  const letterGroupIndex = opts.letterGroupIndex ?? 1;
  const profile = buildWeakSkillProfile(opts.mastery, opts.items, opts.progress);
  const seed = hashChildDay(opts.childId, opts.dateKey);
  const total = opts.totalCount ?? 10;
  const now = opts.now ?? Date.now();
  // Overdue IDs come from the retention state, i.e. skills the child was already
  // taught — reviews must not be dropped by current-level gating (only guard
  // against malformed symbols).
  const overdueIds = (opts.retention ? getOverdueWordIds(opts.retention, now) : []).filter(
    (w) => /^[a-z]+$/.test(w.trim().toLowerCase()),
  );
  const overdueSlots = Math.min(overdueIds.length, total);
  const remaining = total - overdueSlots;
  const weakSlots = Math.floor(remaining * 0.7);
  const reviewSlots = Math.floor(remaining * 0.2);
  const newSlots = Math.max(0, overdueSlots > 0 ? 0 : remaining - weakSlots - reviewSlots);

  const picks: AdaptiveLessonPick[] = [];

  for (let i = 0; i < overdueSlots; i++) {
    const word = overdueIds[i];
    if (!word) break;
    picks.push({
      word,
      reason: "overdue",
      skillTag: "overdue-review",
    });
  }

  const weakPool = profile.weakWords.filter((w) =>
    wordUnlocked(w, level, letterGroupIndex),
  );

  for (let i = 0; i < weakSlots; i++) {
    if (weakPool.length === 0) break;
    const word = weakPool[(seed + i) % weakPool.length]!;
    picks.push({
      word,
      reason: "weak",
      skillTag: getFamilyForWord(word)?.suffix ?? "blend",
    });
  }

  const missionItems = filterMissionWordItems(opts.items);
  const reviewed = missionItems.filter(
    (it) => (opts.progress.practiced[it.id] ?? 0) > 0 || opts.progress.mastered[it.id],
  );
  for (let i = 0; i < reviewSlots; i++) {
    if (reviewed.length === 0) break;
    const item = reviewed[(seed + i + 3) % reviewed.length];
    const word = symbolFromItem(item);
    if (!word || !wordUnlocked(word, level, letterGroupIndex)) continue;
    picks.push({
      word,
      reason: "review",
      skillTag: "review",
    });
  }

  const fresh = missionItems.filter(
    (it) => !opts.progress.practiced[it.id] && !opts.progress.mastered[it.id],
  );
  const newPool = fresh.length > 0 ? fresh : missionItems;
  for (let i = 0; i < newSlots; i++) {
    if (newPool.length === 0) break;
    const item = newPool[(seed + i + 7) % newPool.length];
    const word = symbolFromItem(item);
    if (!word || !wordUnlocked(word, level, letterGroupIndex)) continue;
    picks.push({
      word,
      reason: "new",
      skillTag: "new",
    });
  }

  return picks;
}

/** Build adaptive daily mission tasks from weak-skill profile. */
export function buildAdaptiveDailyMission(opts: {
  childId: number;
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  mastery: PhonicsMasteryState;
  retention?: PhonicsRetentionState;
  streakDay: number;
  storyId?: string;
  now?: number;
  curriculumLevel?: number;
  letterGroupIndex?: number;
}): Omit<DailyReadingMission, "dateKey"> & { adaptivePicks: AdaptiveLessonPick[] } {
  const dateKey = new Date().toISOString().slice(0, 10);
  const curriculumLevel = opts.curriculumLevel ?? 1;
  const letterGroupIndex = opts.letterGroupIndex ?? 1;
  const masteryAvg =
    Object.values(opts.mastery.words).length > 0
      ? Math.round(
          Object.values(opts.mastery.words).reduce((s, r) => s + r.score, 0) /
            Object.values(opts.mastery.words).length,
        )
      : 0;
  const digraphPicks = selectDigraphAdaptiveLessons({
    childId: opts.childId,
    dateKey,
    masteryAvg,
    mastery: opts.mastery,
    retention: opts.retention,
    maxPicks: 2,
    now: opts.now,
    currentLevel: curriculumLevel,
  });
  const blendPicks = selectBlendAdaptiveLessons({
    childId: opts.childId,
    dateKey,
    masteryAvg,
    mastery: opts.mastery,
    retention: opts.retention,
    maxPicks: 1,
    now: opts.now,
    currentLevel: curriculumLevel,
  });
  const picks = selectAdaptiveLessons({
    childId: opts.childId,
    dateKey,
    mastery: opts.mastery,
    items: opts.items,
    progress: opts.progress,
    retention: opts.retention,
    totalCount: 6,
    now: opts.now,
    currentLevel: curriculumLevel,
    letterGroupIndex,
  });

  const overdue = picks.filter((p) => p.reason === "overdue");
  const weak = picks.filter((p) => p.reason === "weak");
  const review = picks.filter((p) => p.reason === "review");
  const neu = picks.filter((p) => p.reason === "new");

  const tasks: DailyMissionTask[] = [];

  for (let i = 0; i < Math.min(2, overdue.length); i++) {
    const p = overdue[i]!;
    tasks.push({
      slot: "review",
      id: `ad-overdue-${p.word}-${i}`,
      emoji: "⏰",
      label: formatMissionWordLabel("Overdue", p.word),
      word: p.word,
      completed: false,
    });
  }

  if (review[0] && overdue.length === 0) {
    tasks.push({
      slot: "review",
      id: `ad-review-${review[0].word}`,
      emoji: "🔄",
      label: formatMissionWordLabel("Review", review[0].word),
      word: review[0].word,
      completed: false,
    });
  }

  for (const dp of digraphPicks) {
    tasks.push({
      slot: dp.reason === "overdue" ? "review" : "practice",
      id: `ad-dig-${dp.digraphId}-${dp.word}`,
      emoji: dp.reason === "overdue" ? "⏰" : "🔤",
      label:
        dp.reason === "overdue"
          ? `Digraph review: ${dp.word}`
          : `Digraph ${dp.digraphId}: ${dp.word}`,
      word: dp.word,
      completed: false,
    });
  }

  for (const bp of blendPicks) {
    tasks.push({
      slot: bp.reason === "overdue" ? "review" : "practice",
      id: `ad-blend-${bp.blend}-${bp.word}`,
      emoji: "🌿",
      label:
        bp.reason === "overdue"
          ? `Blend review: ${bp.word}`
          : `Blend ${bp.blend}: ${bp.word}`,
      word: bp.word,
      completed: false,
    });
  }

  if (isCvccPathwayAvailable(masteryAvg, curriculumLevel as import("@workspace/phonics-curriculum").CurriculumLevel)) {
    const cvccBank = getCvccWordBank();
    const cvccWord =
      cvccBank[(opts.childId + opts.streakDay) % cvccBank.length] ?? cvccBank[0];
    if (cvccWord && wordUnlocked(cvccWord, curriculumLevel as CurriculumLevel)) {
      tasks.push({
        slot: "practice",
        id: `ad-cvcc-${cvccWord}`,
        emoji: "📘",
        label: `CVCC: ${cvccWord}`,
        word: cvccWord,
        completed: false,
      });
    }
  }

  for (let i = 0; i < Math.min(2, weak.length); i++) {
    const p = weak[i]!;
    tasks.push({
      slot: "practice",
      id: `ad-weak-${p.word}-${i}`,
      emoji: "🎯",
      label: formatMissionWordLabel("Practice", p.word),
      word: p.word,
      familyId: getFamilyForWord(p.word)?.id,
      completed: false,
    });
  }

  if (neu[0] && overdue.length === 0) {
    tasks.push({
      slot: "new_word",
      id: `ad-new-${neu[0].word}`,
      emoji: "✨",
      label: formatMissionWordLabel("New", neu[0].word),
      word: neu[0].word,
      completed: false,
    });
  }

  const challenge = weak[2] ?? weak[0] ?? picks[0];
  if (challenge) {
    tasks.push({
      slot: "challenge",
      id: `ad-blend-${challenge.word}`,
      emoji: "🎵",
      label: formatMissionWordLabel("Blend", challenge.word),
      word: challenge.word,
      completed: false,
    });
  }

  if (opts.storyId) {
    tasks.push({
      slot: "story",
      id: `ad-story-${opts.storyId}`,
      emoji: "📖",
      label: "Mini story",
      storyId: opts.storyId,
      completed: false,
    });
  }

  return {
    tasks,
    estimatedMinutes: 4,
    streakDay: opts.streakDay,
    completed: false,
    adaptivePicks: picks,
  };
}
