/**
 * Hub tab audio pre-warm (limited, idle-scheduled):
 *   📚 Learning — Spelling Mastery, Abacus, Smart Study
 *   📖 Stories & Communication — Speech Coach
 */

import { buildLessonScript, type LevelId } from "@workspace/abacus";
import { getCoachDialogueWarmupPhrases } from "@workspace/speech-coach";
import {
  getPlayCategoriesForChild,
  getPlayItemCatalogSpeakOpts,
} from "@workspace/study-zone";
import type { AuthFetchFn } from "@/lib/poll-result";
import {
  getSpellingManifest,
  historyStorageKey,
  loadSessionHistory,
  selectSessionWords,
  spellingAgeGroupFor,
  type SpellingDifficulty,
} from "@workspace/spelling-catalog";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import { warmSpeechCoach } from "@/lib/global-audio-warmup";
import {
  buildLearningZoneAudioStateKey,
  scheduleLearningZoneAudioPrewarm,
} from "@/lib/learning-zone-audio-prewarm";
import { warmLocalCacheFromUrl } from "@/lib/local-tts-cache";
import { preloadStaticPhrases } from "@/lib/static-audio";
import { ABACUS_STATIC_TTS_PROBE } from "@/lib/unified-catalog-playback";
import {
  buildSpellingSessionPrewarmItems,
  prefetchSpellingAudioUrls,
} from "@/lib/spelling-audio-map";

const SPELLING_MIN_AGE_MONTHS = 24;
const SESSION_WORD_COUNT = 5;
const SPELLING_LOOKAHEAD = 4;
const DEFAULT_PLAYER_LEVEL = 50;
const DEFAULT_DIFFICULTY: SpellingDifficulty = "easy";
const ABACUS_WARM_LEVEL: LevelId = 1;
const ABACUS_MAX_STEPS = 4;
const SMART_STUDY_MAX_TEXTS = 6;
const SPEECH_COACH_TAB_WARM_LIMIT = 12;

let lastSpellingTabWarmKey = "";
let lastAbacusTabWarmKey = "";
let lastSmartStudyTabWarmKey = "";
let lastSpeechCoachTabWarmKey = "";

function todaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10_000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function runIdle(task: () => void): void {
  if (typeof window !== "undefined" && window.requestIdleCallback) {
    window.requestIdleCallback(task, { timeout: 1500 });
    return;
  }
  if (typeof window !== "undefined") {
    window.setTimeout(task, 120);
    return;
  }
  task();
}

/** Pick likely catalog words for this child — read-only; does not persist session history. */
export function pickSpellingTabWarmWords(
  childId: number,
  ageMonths: number,
  playerLevel = DEFAULT_PLAYER_LEVEL,
  difficulty: SpellingDifficulty = DEFAULT_DIFFICULTY,
): Array<{ id: string; word: string }> {
  if (ageMonths < SPELLING_MIN_AGE_MONTHS) return [];

  const ageGroup = spellingAgeGroupFor(ageMonths);
  const manifest = getSpellingManifest();
  const historyKey = historyStorageKey(childId, ageGroup, difficulty);
  const history = loadSessionHistory(historyKey);
  const { words } = selectSessionWords(manifest, {
    ageGroup,
    difficulty,
    playerLevel,
    count: SESSION_WORD_COUNT,
    history,
  });
  return words.map((w) => ({ id: w.id, word: w.word }));
}

/**
 * Warm Spelling Mastery assets when Parent Hub → Learning tab opens.
 * Does not mutate spelling session history (prefetch only).
 */
export function warmSpellingMasteryOnLearningTabOpen(
  authFetch: AuthFetchFn,
  params: {
    childId: number;
    ageMonths: number;
    playerLevel?: number;
    difficulty?: SpellingDifficulty;
  },
): void {
  if (typeof window === "undefined") return;
  if (params.ageMonths < SPELLING_MIN_AGE_MONTHS) return;

  const ageGroup = spellingAgeGroupFor(params.ageMonths);
  const difficulty = params.difficulty ?? DEFAULT_DIFFICULTY;
  const warmKey = `${todaySeed()}:spelling-tab:${params.childId}:${ageGroup}:${difficulty}`;
  if (warmKey === lastSpellingTabWarmKey) return;
  lastSpellingTabWarmKey = warmKey;

  const words = pickSpellingTabWarmWords(
    params.childId,
    params.ageMonths,
    params.playerLevel,
    difficulty,
  );
  if (words.length === 0) return;

  logAmyVoiceDiag("learning_tab_spelling_warmup", {
    ageGroup,
    difficulty,
    wordCount: words.length,
    words: words.slice(0, 3).map((w) => w.word),
  });

  runIdle(() => {
    const prewarmItems = buildSpellingSessionPrewarmItems(words, 0, SPELLING_LOOKAHEAD);
    prefetchSpellingAudioUrls(prewarmItems.map((item) => item.url));

    for (const item of prewarmItems) {
      void warmLocalCacheFromUrl(item.memoryCacheKey, item.url);
    }

    const wordTexts = words.map((w) => w.word);
    scheduleLearningZoneAudioPrewarm(authFetch, {
      module: "spelling",
      texts: wordTexts,
      sequenceTexts: wordTexts,
      difficulty,
      ageGroup,
      stateKey: buildLearningZoneAudioStateKey({
        module: "spelling",
        ageGroup,
        difficulty,
        revision: "hub-learning-tab",
      }),
    });
  });
}

/** First Learn-mode steps for default abacus level (tab-open prefetch). */
export function pickAbacusTabWarmTexts(maxSteps = ABACUS_MAX_STEPS): string[] {
  const script = buildLessonScript(ABACUS_WARM_LEVEL);
  const steps = script.steps.slice(0, maxSteps).map((s) => s.text.trim()).filter(Boolean);
  return uniqueTexts([ABACUS_STATIC_TTS_PROBE, ...steps]).slice(0, maxSteps + 1);
}

/** Nursery play tiles likely shown in Smart Study (tab-open prefetch). */
export function pickSmartStudyTabWarmTexts(
  ageYears: number,
  country?: string | null,
  journeyDay = 1,
  maxTexts = SMART_STUDY_MAX_TEXTS,
): string[] {
  const cats = getPlayCategoriesForChild(country, ageYears, journeyDay);
  const texts: string[] = [];
  for (const cat of cats) {
    for (const item of cat.items.slice(0, 2)) {
      const opts = getPlayItemCatalogSpeakOpts(item, cat.id);
      const primary = opts.staticCatalogTexts[0]?.trim();
      if (primary) texts.push(primary);
      if (texts.length >= maxTexts) break;
    }
    if (texts.length >= maxTexts) break;
  }
  return uniqueTexts(texts).slice(0, maxTexts);
}

function uniqueTexts(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function scheduleLimitedLearningZonePrewarm(
  authFetch: AuthFetchFn,
  module: "abacus" | "learn_with_amy",
  texts: string[],
  stateRevision: string,
  ageGroup: string,
): void {
  if (texts.length === 0) return;
  scheduleLearningZoneAudioPrewarm(authFetch, {
    module,
    texts,
    sequenceTexts: texts,
    ageGroup,
    stateKey: buildLearningZoneAudioStateKey({
      module,
      ageGroup,
      revision: stateRevision,
    }),
  });
  preloadStaticPhrases(texts, "default", texts.length);
}

/** Abacus Learn-mode intro lines when Learning tab opens. */
export function warmAbacusOnLearningTabOpen(
  authFetch: AuthFetchFn,
  params: { ageMonths: number },
): void {
  if (typeof window === "undefined") return;

  const warmKey = `${todaySeed()}:abacus-tab:${params.ageMonths}`;
  if (warmKey === lastAbacusTabWarmKey) return;
  lastAbacusTabWarmKey = warmKey;

  const texts = pickAbacusTabWarmTexts();
  if (texts.length === 0) return;

  logAmyVoiceDiag("learning_tab_abacus_warmup", { stepCount: texts.length });

  runIdle(() => {
    scheduleLimitedLearningZonePrewarm(
      authFetch,
      "abacus",
      texts,
      "hub-learning-tab",
      String(ABACUS_WARM_LEVEL),
    );
  });
}

/** Smart Study play-zone tiles when Learning tab opens. */
export function warmSmartStudyOnLearningTabOpen(
  authFetch: AuthFetchFn,
  params: {
    ageMonths: number;
    country?: string | null;
    journeyDay?: number;
  },
): void {
  if (typeof window === "undefined") return;

  const ageYears = Math.max(1, Math.floor(params.ageMonths / 12));
  const warmKey = `${todaySeed()}:smart-study-tab:${ageYears}:${params.journeyDay ?? 1}`;
  if (warmKey === lastSmartStudyTabWarmKey) return;
  lastSmartStudyTabWarmKey = warmKey;

  const texts = pickSmartStudyTabWarmTexts(
    ageYears,
    params.country,
    params.journeyDay ?? 1,
  );
  if (texts.length === 0) return;

  logAmyVoiceDiag("learning_tab_smart_study_warmup", {
    textCount: texts.length,
    ageYears,
  });

  runIdle(() => {
    scheduleLimitedLearningZonePrewarm(
      authFetch,
      "learn_with_amy",
      texts,
      "hub-learning-tab",
      String(ageYears),
    );
  });
}

/** Speech Coach static dialogue when Stories & Communication tab opens. */
export function warmSpeechCoachOnStoriesTabOpen(): void {
  if (typeof window === "undefined") return;

  const warmKey = `${todaySeed()}:speech-coach-tab`;
  if (warmKey === lastSpeechCoachTabWarmKey) return;
  lastSpeechCoachTabWarmKey = warmKey;

  const phrases = getCoachDialogueWarmupPhrases()
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, SPEECH_COACH_TAB_WARM_LIMIT);
  if (phrases.length === 0) return;

  logAmyVoiceDiag("stories_tab_speech_coach_warmup", { phraseCount: phrases.length });

  runIdle(() => {
    preloadStaticPhrases(phrases, "default", phrases.length);
    warmSpeechCoach(phrases);
  });
}

export type LearningZoneTabWarmParams = {
  childId: number;
  ageMonths: number;
  country?: string | null;
  journeyDay?: number;
  playerLevel?: number;
  difficulty?: SpellingDifficulty;
};

/** All Learning tab module prefetches (spelling, abacus, smart study). */
export function warmLearningZoneTabOnOpen(
  authFetch: AuthFetchFn,
  params: LearningZoneTabWarmParams,
): void {
  warmSpellingMasteryOnLearningTabOpen(authFetch, params);
  warmAbacusOnLearningTabOpen(authFetch, { ageMonths: params.ageMonths });
  warmSmartStudyOnLearningTabOpen(authFetch, {
    ageMonths: params.ageMonths,
    country: params.country,
    journeyDay: params.journeyDay,
  });
}

/** Test-only reset */
export function _resetLearningZoneTabWarmupForTests(): void {
  lastSpellingTabWarmKey = "";
  lastAbacusTabWarmKey = "";
  lastSmartStudyTabWarmKey = "";
  lastSpeechCoachTabWarmKey = "";
}
