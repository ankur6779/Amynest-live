/**
 * Phase G.5 — Mastery-driven learning-path prediction (deterministic).
 *
 * Unified "what will the child actually do next" layer used to prewarm ONLY the
 * audio assets the next session needs. Reads the real V3 mastery + retention +
 * story-progress state (client localStorage) and the curriculum level; never
 * the whole catalog. Pure/deterministic for a given (childId, level, day).
 */
import {
  CVC_WORDS,
  getCvcWordEntry,
  resolvePhonicsSequenceKeys,
} from "@workspace/phonics-sounds";
import {
  defaultLevelForAgeMonths,
  getLevelWordPool,
  isContentUnlocked,
  type CurriculumLevel,
} from "@workspace/phonics-curriculum";
import {
  getWeakestWords,
  loadMasteryState,
  type PhonicsMasteryState,
} from "./mastery-engine";
import {
  getOverdueWordIds,
  getSkillsAtRisk,
  loadRetentionState,
  type PhonicsRetentionState,
} from "./spaced-repetition";
import {
  getStoryById,
  getUnlockedStoriesV3,
} from "./content/story-catalog";
import { loadStoryProgressLocal } from "./story-progress";

export type RecommendationReason = "overdue" | "weak" | "review" | "new" | "starter";

export type WordRecommendation = { word: string; reason: RecommendationReason };

export type LearningPathInput = {
  childId: number;
  /** From curriculum API when known; otherwise derived from ageMonths. */
  curriculumLevel?: number;
  /** SATPIN letter group (1–8); defaults to 1 at L1. */
  letterGroupIndex?: number;
  ageMonths?: number;
  now?: number;
  /** Test seam — inject state instead of reading localStorage. */
  mastery?: PhonicsMasteryState;
  retention?: PhonicsRetentionState;
};

export type MasteryContext = {
  childId: number;
  level: CurriculumLevel;
  letterGroupIndex: number;
  mastery: PhonicsMasteryState;
  retention: PhonicsRetentionState;
  completedStoryIds: string[];
  masteryScoreAvg: number;
  masteredFamilies: string[];
  /** False for a brand-new child with no recorded mastery — lowers confidence. */
  hasMasteryData: boolean;
  now: number;
};

export type LessonRecommendation = {
  words: WordRecommendation[];
  phonemeKeys: string[];
  focusSkill: string;
  confidence: number;
};
export type StoryRecommendation = { storyId: string | null; lines: string[]; confidence: number };
export type AssessmentRecommendation = {
  kind: "daily_check";
  level: number;
  weakPhonemes: string[];
  probeWords: string[];
  confidence: number;
};
export type RemediationRecommendation = {
  overdueWords: string[];
  weakWords: string[];
  weakPhonemes: string[];
  atRiskSkillIds: string[];
  confidence: number;
};

const MAX_WORDS = 8;
const NEW_POOL_SCAN = 24;

function clampLevel(level: number): CurriculumLevel {
  return Math.max(1, Math.min(7, Math.round(level))) as CurriculumLevel;
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

/** Load (or accept injected) child state and derive aggregate signals. */
export function buildMasteryContext(input: LearningPathInput): MasteryContext {
  const now = input.now ?? Date.now();
  const mastery = input.mastery ?? loadMasteryState(input.childId);
  const retention = input.retention ?? loadRetentionState(input.childId);
  const storyProgress = loadStoryProgressLocal(input.childId);

  const wordRecords = Object.values(mastery.words);
  const masteryScoreAvg =
    wordRecords.length > 0
      ? Math.round(wordRecords.reduce((s, r) => s + r.score, 0) / wordRecords.length)
      : 0;
  const masteredFamilies = Object.values(mastery.families)
    .filter((r) => r.isMastered)
    .map((r) => r.id);

  const level = clampLevel(
    input.curriculumLevel ??
      (input.ageMonths != null ? defaultLevelForAgeMonths(input.ageMonths) : 1),
  );
  const letterGroupIndex =
    level >= 2 ? 8 : Math.max(1, Math.min(8, Math.round(input.letterGroupIndex ?? 1)));

  return {
    childId: input.childId,
    level,
    letterGroupIndex,
    mastery,
    retention,
    completedStoryIds: Object.keys(storyProgress.completed ?? {}),
    masteryScoreAvg,
    masteredFamilies,
    hasMasteryData: wordRecords.length > 0,
    now,
  };
}

/** Deterministic level-appropriate "new" word pool (no dynamic content list). */
function levelNewWordPool(level: CurriculumLevel, letterGroupIndex = 1): string[] {
  const fromCurriculum = getLevelWordPool(level, { letterGroupIndex }).filter((w) =>
    /^[a-z]+$/.test(w),
  );
  if (fromCurriculum.length > 0) return fromCurriculum;
  return CVC_WORDS.map((e) => e.word);
}

/**
 * Phase 2 — getNextRecommendedWordPack. Mastery-driven order:
 * overdue (retention) → weak (mastery) → new (level pool, not yet seen).
 */
export function getNextRecommendedWordPack(ctx: MasteryContext): {
  words: WordRecommendation[];
  confidence: number;
} {
  const picks: WordRecommendation[] = [];
  const seen = new Set<string>();
  const push = (word: string, reason: RecommendationReason) => {
    const w = word.trim().toLowerCase();
    if (!w || seen.has(w) || !wordUnlocked(w, ctx.level, ctx.letterGroupIndex)) return;
    seen.add(w);
    picks.push({ word: w, reason });
  };

  for (const w of getOverdueWordIds(ctx.retention, ctx.now)) push(w, "overdue");
  for (const r of getWeakestWords(ctx.mastery, 12)) push(r.id, "weak");

  const masteredWords = new Set(
    Object.values(ctx.mastery.words).filter((r) => r.isMastered).map((r) => r.id),
  );
  const newPool = levelNewWordPool(ctx.level, ctx.letterGroupIndex).slice(0, NEW_POOL_SCAN);
  for (const w of newPool) {
    if (picks.length >= MAX_WORDS) break;
    if (!masteredWords.has(w.toLowerCase())) push(w, ctx.hasMasteryData ? "new" : "starter");
  }

  const words = picks.slice(0, MAX_WORDS);
  // Phase 6 confidence: personalized weak/overdue picks are high-confidence;
  // a cold-start child gets a deterministic level pack (medium confidence).
  const personalizedShare = words.filter((w) => w.reason === "overdue" || w.reason === "weak").length;
  const confidence = ctx.hasMasteryData
    ? Math.min(98, 80 + personalizedShare * 3)
    : 72;
  return { words, confidence };
}

/** Phase 2 — getNextRecommendedPhonemePack (derived from the word pack + weak phonemes). */
export function getNextRecommendedPhonemePack(
  ctx: MasteryContext,
  words: WordRecommendation[],
): { phonemeKeys: string[]; confidence: number } {
  const keys = new Set<string>();
  for (const { word } of words) {
    for (const k of resolvePhonicsSequenceKeys(word)) keys.add(k);
    const entry = getCvcWordEntry(word);
    for (const p of entry?.phonemes ?? []) keys.add(p);
  }
  // Explicit weak phoneme + letter targets from mastery.
  for (const r of Object.values(ctx.mastery.phonemes)) if (r.score < 70) keys.add(r.id);
  for (const r of Object.values(ctx.mastery.letters)) if (r.score < 70) keys.add(r.id);

  const phonemeKeys = [...keys].map((k) => k.trim().toLowerCase()).filter(Boolean);
  const confidence = words.length > 0 ? (ctx.hasMasteryData ? 95 : 75) : 40;
  return { phonemeKeys, confidence };
}

/** Phase 2 — getNextRecommendedStory: first unlocked story not yet completed. */
export function getNextRecommendedStory(ctx: MasteryContext): StoryRecommendation {
  const unlocked = getUnlockedStoriesV3({
    masteredFamilies: ctx.masteredFamilies,
    masteryScoreAvg: ctx.masteryScoreAvg,
    currentLevel: ctx.level,
  });
  if (unlocked.length === 0) return { storyId: null, lines: [], confidence: 0 };

  const completed = new Set(ctx.completedStoryIds);
  const next = unlocked.find((s) => !completed.has(s.id)) ?? unlocked[0]!;
  const story = getStoryById(next.id);
  const lines = (story?.lines ?? []).map((l) => l.text);
  // High confidence when there is a clear unread unlocked story.
  const confidence = completed.has(next.id) ? 70 : 93;
  return { storyId: next.id, lines, confidence };
}

/** Phase 2 — getNextRecommendedAssessment (daily check scoped to level + weak phonemes). */
export function getNextRecommendedAssessment(
  ctx: MasteryContext,
  wordPack: WordRecommendation[],
): AssessmentRecommendation {
  const weakPhonemes = Object.values(ctx.mastery.phonemes)
    .filter((r) => r.score < 70)
    .map((r) => r.id);
  const probeWords = wordPack.slice(0, 4).map((w) => w.word);
  const confidence = ctx.hasMasteryData ? 88 : 80;
  return { kind: "daily_check", level: ctx.level, weakPhonemes, probeWords, confidence };
}

/** Phase 2 — getNextRecommendedRemediation (overdue + at-risk + weak). */
export function getNextRecommendedRemediation(ctx: MasteryContext): RemediationRecommendation {
  const overdueWords = getOverdueWordIds(ctx.retention, ctx.now).filter((w) =>
    wordUnlocked(w, ctx.level, ctx.letterGroupIndex),
  );
  const atRisk = getSkillsAtRisk(ctx.retention, ctx.now);
  const weakWords = getWeakestWords(ctx.mastery, 8).map((r) => r.id);
  const weakPhonemes = Object.values(ctx.mastery.phonemes)
    .filter((r) => r.score < 60)
    .map((r) => r.id);
  const load = overdueWords.length + atRisk.length;
  const confidence = load === 0 ? 30 : Math.min(96, 70 + load * 5);
  return {
    overdueWords,
    weakWords,
    weakPhonemes,
    atRiskSkillIds: atRisk.map((t) => t.id),
    confidence,
  };
}

/** Phase 2 — getNextRecommendedLesson (composite word + phoneme target). */
export function getNextRecommendedLesson(ctx: MasteryContext): LessonRecommendation {
  const { words, confidence: wordConf } = getNextRecommendedWordPack(ctx);
  const { phonemeKeys, confidence: phonemeConf } = getNextRecommendedPhonemePack(ctx, words);
  const focusSkill =
    words.find((w) => w.reason === "overdue" || w.reason === "weak")?.reason ??
    words[0]?.reason ??
    "starter";
  return {
    words,
    phonemeKeys,
    focusSkill,
    confidence: Math.round((wordConf + phonemeConf) / 2),
  };
}

export type LearningPathPrediction = {
  context: Pick<MasteryContext, "childId" | "level" | "masteryScoreAvg" | "hasMasteryData">;
  lesson: LessonRecommendation;
  wordPack: { words: WordRecommendation[]; confidence: number };
  phonemePack: { phonemeKeys: string[]; confidence: number };
  story: StoryRecommendation;
  assessment: AssessmentRecommendation;
  remediation: RemediationRecommendation;
};

/** Phase 5 — per-session warm budget (device/network derived by the caller). */
export type PrewarmBudget = { maxPhonemeKeys: number; maxWords: number; maxStoryLines: number };

/** Phase 6 — minimum confidence to warrant prewarming each target class. */
export type PrewarmThresholds = {
  word: number;
  phoneme: number;
  story: number;
};

export const DEFAULT_PREWARM_THRESHOLDS: PrewarmThresholds = { word: 60, phoneme: 60, story: 70 };

export type SessionAssetBundle = {
  phonemeKeys: string[];
  wordTexts: string[];
  storyTexts: string[];
  /** What was included after threshold + budget filtering (for telemetry). */
  included: { phonemes: boolean; words: boolean; story: boolean };
  reasons: string[];
};

/**
 * Phase 4 — turn a prediction into the EXACT, minimal asset set the next
 * session needs. Excludes anything below confidence threshold and caps to the
 * device budget so we never download unused content or pollute the cache.
 */
export function buildSessionAssetBundle(
  prediction: LearningPathPrediction,
  budget: PrewarmBudget,
  thresholds: PrewarmThresholds = DEFAULT_PREWARM_THRESHOLDS,
): SessionAssetBundle {
  const reasons: string[] = [];
  const wordsOk = prediction.wordPack.confidence >= thresholds.word;
  const phonemesOk = prediction.phonemePack.confidence >= thresholds.phoneme;
  const storyOk =
    prediction.story.confidence >= thresholds.story && prediction.story.lines.length > 0;

  const wordTexts = wordsOk ? prediction.wordPack.words.map((w) => w.word).slice(0, budget.maxWords) : [];
  const phonemeKeys = phonemesOk
    ? prediction.phonemePack.phonemeKeys.slice(0, budget.maxPhonemeKeys)
    : [];
  const storyTexts = storyOk ? prediction.story.lines.slice(0, budget.maxStoryLines) : [];

  if (!wordsOk) reasons.push(`word conf ${prediction.wordPack.confidence} < ${thresholds.word}`);
  if (!phonemesOk) reasons.push(`phoneme conf ${prediction.phonemePack.confidence} < ${thresholds.phoneme}`);
  if (!storyOk) reasons.push(`story conf ${prediction.story.confidence} < ${thresholds.story}`);

  return {
    phonemeKeys,
    wordTexts,
    storyTexts,
    included: { phonemes: phonemeKeys.length > 0, words: wordTexts.length > 0, story: storyTexts.length > 0 },
    reasons,
  };
}

/** One call → every "next" target for the child. Deterministic. */
export function buildLearningPathPrediction(input: LearningPathInput): LearningPathPrediction {
  const ctx = buildMasteryContext(input);
  const wordPack = getNextRecommendedWordPack(ctx);
  const phonemePack = getNextRecommendedPhonemePack(ctx, wordPack.words);
  const lesson: LessonRecommendation = {
    words: wordPack.words,
    phonemeKeys: phonemePack.phonemeKeys,
    focusSkill:
      wordPack.words.find((w) => w.reason === "overdue" || w.reason === "weak")?.reason ??
      wordPack.words[0]?.reason ??
      "starter",
    confidence: Math.round((wordPack.confidence + phonemePack.confidence) / 2),
  };
  return {
    context: {
      childId: ctx.childId,
      level: ctx.level,
      masteryScoreAvg: ctx.masteryScoreAvg,
      hasMasteryData: ctx.hasMasteryData,
    },
    lesson,
    wordPack,
    phonemePack,
    story: getNextRecommendedStory(ctx),
    assessment: getNextRecommendedAssessment(ctx, wordPack.words),
    remediation: getNextRecommendedRemediation(ctx),
  };
}
