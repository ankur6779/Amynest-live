// ─────────────────────────────────────────────────────────────────────────────
// Amy Speech Coach — learning journey memory
//
// Tracks sounds, skills, achievements, and effort — not just scores.
// ─────────────────────────────────────────────────────────────────────────────

import type { WeakSoundEntry } from "./weak-sounds";
import type { PronouncePromptKind } from "./types";

export type JourneyAchievementId =
  | "first_word_spoken"
  | "first_perfect_session"
  | "longest_streak_record"
  | "first_mastered_sound"
  | "first_blend_lesson"
  | "words_100";

export type JourneyActivityKind = "live" | "practice" | "games";

export type SoundCategory = "vowel" | "blend" | "digraph" | "consonant" | "word" | "sentence" | "other";

export interface PromptJourneyRecord {
  promptId: string;
  promptText: string;
  bestScore: number;
  attempts: number;
  lastPracticed: string;
  kind: PronouncePromptKind;
}

export interface CoachLocalSnapshot {
  childId: number;
  lastSessionDate: string;
  lastSessionScore: number;
  lastSessionBestStreak: number;
  longestStreakEver: number;
  lastSessionItemsCompleted: number;
  totalSessions: number;
  promptHistory?: Record<string, PromptJourneyRecord>;
  achievements?: JourneyAchievementId[];
  activityCounts?: Partial<Record<JourneyActivityKind, number>>;
  lastSessionStruggled?: boolean;
  totalWordsPracticed?: number;
  recentlyMasteredPromptIds?: string[];
}

export interface JourneySoundEntry {
  promptId: string;
  promptText: string;
  avgScore: number;
  attempts: number;
  category: SoundCategory;
}

export interface CoachLearningJourney {
  masteredSounds: readonly JourneySoundEntry[];
  improvingSounds: readonly JourneySoundEntry[];
  strugglingSounds: readonly JourneySoundEntry[];
  recentlyMastered: readonly JourneySoundEntry[];
  favoriteActivity: JourneyActivityKind | null;
  biggestImprovementArea: string | null;
  achievements: readonly JourneyAchievementId[];
  totalMasteredSounds: number;
  totalWordsPracticed: number;
  vowelsMasteredCount: number;
  blendsCompleted: boolean;
  hadRecentStruggle: boolean;
}

export interface SessionAttemptInput {
  promptId: string;
  promptText: string;
  kind: PronouncePromptKind;
  score: number;
}

export interface SessionJourneyInput {
  childId: number;
  score: number;
  bestStreak: number;
  itemsCompleted: number;
  attempts: readonly SessionAttemptInput[];
  activity: JourneyActivityKind;
  perfectSession?: boolean;
}

const MASTERED_MIN_SCORE = 85;
const MASTERED_MIN_ATTEMPTS = 2;
const IMPROVING_MIN_SCORE = 55;

const VOWEL_TEXTS = new Set(["a", "e", "i", "o", "u", "ah", "eh", "ee", "oo"]);
const BLEND_TEXTS = new Set(["bl", "cr", "st", "tr", "gr", "pr"]);
const DIGRAPH_TEXTS = new Set(["sh", "th", "ch", "wh", "ph", "ng"]);

export function classifySoundCategory(text: string, kind: PronouncePromptKind): SoundCategory {
  const t = text.trim().toLowerCase();
  if (kind === "sentence") return "sentence";
  if (kind === "word") return "word";
  if (VOWEL_TEXTS.has(t)) return "vowel";
  if (BLEND_TEXTS.has(t)) return "blend";
  if (DIGRAPH_TEXTS.has(t)) return "digraph";
  if (t.length === 1) return "consonant";
  return "other";
}

function toJourneyEntry(
  promptId: string,
  promptText: string,
  avgScore: number,
  attempts: number,
  kind: PronouncePromptKind,
): JourneySoundEntry {
  return {
    promptId,
    promptText,
    avgScore,
    attempts,
    category: classifySoundCategory(promptText, kind),
  };
}

function statusForScore(bestScore: number, attempts: number): "mastered" | "improving" | "struggling" {
  if (bestScore >= MASTERED_MIN_SCORE && attempts >= MASTERED_MIN_ATTEMPTS) return "mastered";
  if (bestScore >= IMPROVING_MIN_SCORE) return "improving";
  return "struggling";
}

/** Merge API weak sounds with locally tracked prompt history. */
export function buildCoachLearningJourney(
  weakSounds: readonly WeakSoundEntry[],
  local: CoachLocalSnapshot | null,
): CoachLearningJourney {
  const history = local?.promptHistory ?? {};
  const byId = new Map<string, JourneySoundEntry>();

  for (const rec of Object.values(history)) {
    byId.set(
      rec.promptId,
      toJourneyEntry(rec.promptId, rec.promptText, rec.bestScore, rec.attempts, rec.kind),
    );
  }

  for (const w of weakSounds) {
    if (byId.has(w.promptId)) continue;
    byId.set(
      w.promptId,
      toJourneyEntry(w.promptId, w.promptText, w.avgScore, w.attempts, inferKindFromText(w.promptText)),
    );
  }

  const mastered: JourneySoundEntry[] = [];
  const improving: JourneySoundEntry[] = [];
  const struggling: JourneySoundEntry[] = [];

  for (const entry of byId.values()) {
    const status = statusForScore(entry.avgScore, entry.attempts);
    if (status === "mastered") mastered.push(entry);
    else if (status === "improving") improving.push(entry);
    else struggling.push(entry);
  }

  mastered.sort((a, b) => b.avgScore - a.avgScore);
  improving.sort((a, b) => b.avgScore - a.avgScore);
  struggling.sort((a, b) => a.avgScore - b.avgScore);

  const recentIds = local?.recentlyMasteredPromptIds ?? [];
  const recentlyMastered = recentIds
    .map((id) => byId.get(id))
    .filter((e): e is JourneySoundEntry => !!e && statusForScore(e.avgScore, e.attempts) === "mastered");

  const activityCounts = local?.activityCounts ?? {};
  const favoriteActivity =
    (Object.entries(activityCounts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] as JourneyActivityKind | undefined) ??
    null;

  const biggestImprovementArea =
    improving[0]?.promptText ??
    (struggling[0] ? struggling[0].promptText : null);

  const vowelsMasteredCount = mastered.filter((s) => s.category === "vowel").length;
  const blendsCompleted = mastered.some((s) => s.category === "blend");

  return {
    masteredSounds: mastered,
    improvingSounds: improving,
    strugglingSounds: struggling,
    recentlyMastered,
    favoriteActivity,
    biggestImprovementArea,
    achievements: local?.achievements ?? [],
    totalMasteredSounds: mastered.length,
    totalWordsPracticed: local?.totalWordsPracticed ?? countWordsPracticed(history),
    vowelsMasteredCount,
    blendsCompleted,
    hadRecentStruggle: local?.lastSessionStruggled ?? false,
  };
}

function inferKindFromText(text: string): PronouncePromptKind {
  const t = text.trim();
  if (t.includes(" ")) return "sentence";
  if (t.length <= 3 && /^[a-z]+$/i.test(t)) return "phonic";
  if (t.length === 1) return "letter";
  return "word";
}

function countWordsPracticed(history: Record<string, PromptJourneyRecord>): number {
  return Object.values(history).filter((r) => r.kind === "word").reduce((n, r) => n + r.attempts, 0);
}

function detectNewAchievements(
  previous: JourneyAchievementId[],
  input: SessionJourneyInput,
  history: Record<string, PromptJourneyRecord>,
  longestStreakEver: number,
): JourneyAchievementId[] {
  const unlocked = new Set(previous);
  const wordAttempts = input.attempts.filter((a) => a.kind === "word");
  const blendAttempts = input.attempts.filter((a) => classifySoundCategory(a.promptText, a.kind) === "blend");

  if (wordAttempts.some((a) => a.score >= 70) && !unlocked.has("first_word_spoken")) {
    unlocked.add("first_word_spoken");
  }
  if (input.perfectSession && !unlocked.has("first_perfect_session")) {
    unlocked.add("first_perfect_session");
  }
  if (input.bestStreak >= longestStreakEver && input.bestStreak >= 3 && !unlocked.has("longest_streak_record")) {
    unlocked.add("longest_streak_record");
  }

  const masteredCount = Object.values(history).filter(
    (r) => statusForScore(r.bestScore, r.attempts) === "mastered",
  ).length;
  if (masteredCount >= 1 && !unlocked.has("first_mastered_sound")) {
    unlocked.add("first_mastered_sound");
  }
  if (blendAttempts.some((a) => a.score >= 75) && !unlocked.has("first_blend_lesson")) {
    unlocked.add("first_blend_lesson");
  }

  const totalWords = countWordsPracticed(history);
  if (totalWords >= 100 && !unlocked.has("words_100")) {
    unlocked.add("words_100");
  }

  return [...unlocked];
}

function findNewlyMastered(
  previousHistory: Record<string, PromptJourneyRecord>,
  nextHistory: Record<string, PromptJourneyRecord>,
): string[] {
  const ids: string[] = [];
  for (const [id, rec] of Object.entries(nextHistory)) {
    const prev = previousHistory[id];
    const wasMastered = prev && statusForScore(prev.bestScore, prev.attempts) === "mastered";
    const isMastered = statusForScore(rec.bestScore, rec.attempts) === "mastered";
    if (isMastered && !wasMastered) ids.push(id);
  }
  return ids;
}

/** Persist session learning data into the local snapshot. */
export function mergeCoachJourneySnapshot(
  previous: CoachLocalSnapshot | null,
  input: SessionJourneyInput,
): CoachLocalSnapshot {
  const today = new Date().toISOString().slice(0, 10);
  const history: Record<string, PromptJourneyRecord> = { ...(previous?.promptHistory ?? {}) };

  let struggled = false;
  for (const attempt of input.attempts) {
    const cur = history[attempt.promptId];
    const bestScore = Math.max(cur?.bestScore ?? 0, attempt.score);
    if (attempt.score < IMPROVING_MIN_SCORE) struggled = true;
    history[attempt.promptId] = {
      promptId: attempt.promptId,
      promptText: attempt.promptText,
      bestScore,
      attempts: (cur?.attempts ?? 0) + 1,
      lastPracticed: today,
      kind: attempt.kind,
    };
  }

  const longestStreakEver = Math.max(previous?.longestStreakEver ?? 0, input.bestStreak);
  const achievements = detectNewAchievements(
    previous?.achievements ?? [],
    input,
    history,
    longestStreakEver,
  );

  const newMastered = findNewlyMastered(previous?.promptHistory ?? {}, history);
  const recentlyMasteredPromptIds = [
    ...newMastered,
    ...(previous?.recentlyMasteredPromptIds ?? []).filter((id) => !newMastered.includes(id)),
  ].slice(0, 8);

  const activityCounts = { ...(previous?.activityCounts ?? {}) };
  activityCounts[input.activity] = (activityCounts[input.activity] ?? 0) + 1;

  return {
    childId: input.childId,
    lastSessionDate: today,
    lastSessionScore: input.score,
    lastSessionBestStreak: input.bestStreak,
    longestStreakEver,
    lastSessionItemsCompleted: input.itemsCompleted,
    totalSessions: (previous?.totalSessions ?? 0) + 1,
    promptHistory: history,
    achievements,
    activityCounts,
    lastSessionStruggled: struggled,
    totalWordsPracticed: countWordsPracticed(history),
    recentlyMasteredPromptIds,
  };
}

export function achievementLabel(id: JourneyAchievementId): string {
  switch (id) {
    case "first_word_spoken":
      return "your first word spoken clearly";
    case "first_perfect_session":
      return "your first perfect practice session";
    case "longest_streak_record":
      return "your longest speaking streak";
    case "first_mastered_sound":
      return "your first mastered sound";
    case "first_blend_lesson":
      return "your first blending lesson";
    case "words_100":
      return "one hundred words practiced";
    default:
      return "a learning milestone";
  }
}

export function formatJourneySoundForSpeech(text: string): string {
  const t = text.trim();
  if (!t) return "that sound";
  if (t.length <= 3 && /^[a-z]+$/i.test(t)) return `${t} sound`;
  if (t.length === 1) return `the letter ${t.toUpperCase()}`;
  return t;
}
