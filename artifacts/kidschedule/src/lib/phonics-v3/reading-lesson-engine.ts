/**
 * Reading Lesson Engine — sequenced 10-step phoneme → reading journey.
 * Does NOT alter SATPIN letter-group unlock order; only sequences activities.
 */
import {
  getLetterGroup,
  getUnlockedGroupWords,
  LETTER_INTRODUCTION_GROUPS,
  type LetterGroupId,
} from "@workspace/phonics-curriculum";
import { getCvcWordEntry } from "@workspace/phonics-sounds";

/** Science-of-Reading skill strands tracked per child. */
export type ReadingSkillId =
  | "phoneme_production"
  | "letter_recognition"
  | "beginning_sounds"
  | "ending_sounds"
  | "blending"
  | "segmenting"
  | "reading"
  | "fluency";

export type LessonStepId =
  | "hear"
  | "mouth"
  | "repeat"
  | "letter_id"
  | "trace"
  | "find_sound"
  | "beginning"
  | "ending"
  | "build_word"
  | "read_independent";

export type LessonStepDef = {
  id: LessonStepId;
  title: string;
  instruction: string;
  skill: ReadingSkillId;
  /** When true, step can be skipped without failing the lesson (e.g. no mic). */
  optional?: boolean;
};

/** Canonical 10-step Synthetic Phonics lesson. */
export const READING_LESSON_STEPS: readonly LessonStepDef[] = [
  {
    id: "hear",
    title: "Hear the sound",
    instruction: "Listen carefully to Amy say the sound.",
    skill: "phoneme_production",
  },
  {
    id: "mouth",
    title: "Watch the mouth",
    instruction: "Watch how Amy makes the sound with her mouth.",
    skill: "phoneme_production",
  },
  {
    id: "repeat",
    title: "Say it with Amy",
    instruction: "Your turn — say the sound out loud.",
    skill: "phoneme_production",
    optional: true,
  },
  {
    id: "letter_id",
    title: "Find the letter",
    instruction: "Tap the letter that makes this sound.",
    skill: "letter_recognition",
  },
  {
    id: "trace",
    title: "Trace the letter",
    instruction: "Trace the letter with your finger.",
    skill: "letter_recognition",
  },
  {
    id: "find_sound",
    title: "Find the sound",
    instruction: "Tap the picture that starts with this sound.",
    skill: "beginning_sounds",
  },
  {
    id: "beginning",
    title: "Beginning sound",
    instruction: "Which word starts with this sound?",
    skill: "beginning_sounds",
  },
  {
    id: "ending",
    title: "Ending sound",
    instruction: "Which word ends with this sound?",
    skill: "ending_sounds",
  },
  {
    id: "build_word",
    title: "Build the word",
    instruction: "Put the sounds together to make a word.",
    skill: "blending",
  },
  {
    id: "read_independent",
    title: "Read the word",
    instruction: "Read the word by yourself — no help first!",
    skill: "reading",
  },
] as const;

export type ReadingLessonTarget = {
  /** Target grapheme (e.g. "s", "qu", "sh"). */
  grapheme: string;
  /** Display letter (uppercase for UI). */
  displayLetter: string;
  /** IPA / phoneme key for audio when available. */
  phonemeKey: string;
  /** Focus CVC word for blend/build/read steps. */
  focusWord: string;
  /** Words for beginning/ending/find-sound distractors. */
  practiceWords: string[];
  letterGroupIndex: LetterGroupId;
};

export type LessonStepResult = {
  stepId: LessonStepId;
  correct: boolean;
  attempts: number;
  skipped?: boolean;
};

export type ReadingLessonState = {
  target: ReadingLessonTarget;
  stepIndex: number;
  results: LessonStepResult[];
  complete: boolean;
  starsEarned: number;
};

/** Picture options for find-sound / beginning drills. */
export type SoundPictureOption = {
  word: string;
  emoji: string;
  isTarget: boolean;
};

const WORD_EMOJI: Record<string, string> = {
  sat: "🧘",
  sit: "🪑",
  pin: "📌",
  pan: "🍳",
  tap: "🚰",
  pat: "🤚",
  nip: "🤏",
  tin: "🥫",
  sip: "🥤",
  tip: "☝️",
  nap: "😴",
  tan: "☀️",
  dog: "🐶",
  dig: "⛏️",
  got: "✅",
  mat: "🧘",
  cat: "🐱",
  cot: "🛏️",
  kit: "🧰",
  mop: "🧹",
  can: "🥫",
  man: "🧑",
  pot: "🍲",
  pig: "🐷",
  sun: "☀️",
  moon: "🌙",
  hat: "🎩",
  bed: "🛏️",
  fan: "🪭",
  log: "🪵",
  hop: "🐰",
  bus: "🚌",
  fog: "🌫️",
  lip: "👄",
  red: "🔴",
  run: "🏃",
  cup: "🥤",
  pen: "🖊️",
  net: "🥅",
  duck: "🦆",
  van: "🚐",
  win: "🏆",
  box: "📦",
  zip: "🤐",
  jam: "🍓",
  jet: "✈️",
};

/** Map single-letter grapheme → common CVC phoneme key for audio. */
const GRAPHEME_PHONEME: Record<string, string> = {
  s: "s",
  a: "æ",
  t: "t",
  p: "p",
  i: "ɪ",
  n: "n",
  m: "m",
  d: "d",
  g: "g",
  o: "ɒ",
  c: "k",
  k: "k",
  e: "ɛ",
  u: "ʌ",
  r: "r",
  h: "h",
  b: "b",
  f: "f",
  l: "l",
  j: "ʤ",
  v: "v",
  w: "w",
  x: "ks",
  y: "j",
  z: "z",
  q: "kw",
  qu: "kw",
  ck: "k",
  sh: "ʃ",
  ch: "ʧ",
  th: "θ",
  ng: "ŋ",
};

function pickFocusWord(grapheme: string, groupIndex: number): string {
  const g = grapheme.trim().toLowerCase();
  const bank = getUnlockedGroupWords(groupIndex);
  const withLetter = bank.filter((w) => w.includes(g === "qu" ? "q" : g === "ck" ? "c" : g));
  const pool = withLetter.length > 0 ? withLetter : bank;
  return pool[0] ?? "sat";
}

/**
 * Build a lesson target for a grapheme at the child's current SATPIN group.
 * Never advances groups — only uses already-unlocked words.
 */
export function buildLessonTarget(
  grapheme: string,
  letterGroupIndex: number,
): ReadingLessonTarget {
  const g = grapheme.trim().toLowerCase();
  const group = Math.max(1, Math.min(8, Math.round(letterGroupIndex))) as LetterGroupId;
  const focusWord = pickFocusWord(g, group);
  const unlocked = getUnlockedGroupWords(group);
  const practiceWords = [
    focusWord,
    ...unlocked.filter((w) => w !== focusWord).slice(0, 5),
  ];
  return {
    grapheme: g,
    displayLetter: g.length === 1 ? g.toUpperCase() : g.toUpperCase(),
    phonemeKey: GRAPHEME_PHONEME[g] ?? g,
    focusWord,
    practiceWords,
    letterGroupIndex: group,
  };
}

/** Prefer the first unfinished grapheme in the current SATPIN group. */
export function pickNextLessonGrapheme(
  letterGroupIndex: number,
  masteredLetters: Iterable<string>,
): string {
  const group = getLetterGroup(letterGroupIndex);
  const mastered = new Set(
    [...masteredLetters].map((l) => l.trim().toLowerCase()),
  );
  for (const gr of group.graphemes) {
    const key = gr === "qu" ? "q" : gr === "ck" ? "c" : gr.length === 1 ? gr : gr;
    if (!mastered.has(key) && !mastered.has(gr)) return gr;
  }
  return group.graphemes[0] ?? "s";
}

export function createLessonState(target: ReadingLessonTarget): ReadingLessonState {
  return {
    target,
    stepIndex: 0,
    results: [],
    complete: false,
    starsEarned: 0,
  };
}

export function currentStep(state: ReadingLessonState): LessonStepDef {
  return (
    READING_LESSON_STEPS[state.stepIndex] ??
    READING_LESSON_STEPS[READING_LESSON_STEPS.length - 1]!
  );
}

export function advanceLessonStep(
  state: ReadingLessonState,
  result: Omit<LessonStepResult, "stepId"> & { stepId?: LessonStepId },
): ReadingLessonState {
  const step = currentStep(state);
  const entry: LessonStepResult = {
    stepId: result.stepId ?? step.id,
    correct: result.correct,
    attempts: result.attempts,
    skipped: result.skipped,
  };
  const results = [...state.results, entry];
  const nextIndex = state.stepIndex + 1;
  const complete = nextIndex >= READING_LESSON_STEPS.length;
  const correctCount = results.filter((r) => r.correct && !r.skipped).length;
  const starsEarned = complete
    ? correctCount >= 9
      ? 3
      : correctCount >= 7
        ? 2
        : 1
    : state.starsEarned;

  return {
    ...state,
    stepIndex: complete ? state.stepIndex : nextIndex,
    results,
    complete,
    starsEarned,
  };
}

/** Multiple-choice options for beginning or ending sound. */
export function buildSoundPositionOptions(
  targetGrapheme: string,
  position: "beginning" | "ending",
  unlockedWords: string[],
  seed = 1,
): SoundPictureOption[] {
  const g = targetGrapheme.trim().toLowerCase();
  const matchChar = g === "qu" ? "q" : g === "ck" ? "k" : g[0]!;

  const matches = unlockedWords.filter((w) => {
    if (position === "beginning") return w.startsWith(matchChar) || (g === "ck" && w.startsWith("c"));
    if (g === "ck") return w.endsWith("ck") || w.endsWith("k") || w.endsWith("c");
    return w.endsWith(matchChar);
  });
  const distractors = unlockedWords.filter((w) => !matches.includes(w));

  const target = matches[(seed + matches.length) % Math.max(1, matches.length)] ?? matches[0];
  if (!target) {
    // Fallback: invent a safe target from focus bank
    const fallback = position === "beginning" ? "sat" : "sat";
    return [
      { word: fallback, emoji: WORD_EMOJI[fallback] ?? "📖", isTarget: true },
      { word: "moon", emoji: "🌙", isTarget: false },
      { word: "sun", emoji: "☀️", isTarget: false },
    ];
  }

  const wrong = distractors.length
    ? [distractors[seed % distractors.length]!, distractors[(seed + 1) % distractors.length]!]
    : ["moon", "sun"];

  const opts: SoundPictureOption[] = [
    { word: target, emoji: WORD_EMOJI[target] ?? "📖", isTarget: true },
    ...wrong
      .filter((w) => w && w !== target)
      .slice(0, 2)
      .map((w) => ({
        word: w,
        emoji: WORD_EMOJI[w] ?? "📦",
        isTarget: false,
      })),
  ];

  // Deterministic shuffle
  return opts.sort((a, b) => {
    const ha = (a.word.charCodeAt(0) + seed) % 7;
    const hb = (b.word.charCodeAt(0) + seed) % 7;
    return ha - hb;
  });
}

/** Letter ID distractors from nearby SATPIN letters. */
export function buildLetterIdOptions(
  targetGrapheme: string,
  seed = 1,
): { letter: string; isTarget: boolean }[] {
  const g = targetGrapheme.trim().toLowerCase();
  const display = g.length === 1 ? g : g;
  const all = LETTER_INTRODUCTION_GROUPS.flatMap((gr) =>
    gr.graphemes.filter((x) => x.length === 1 || x === "qu" || x === "ck"),
  );
  const distractors = all.filter((x) => x !== display).slice(seed % 5, (seed % 5) + 3);
  const opts = [
    { letter: display, isTarget: true },
    ...distractors.slice(0, 2).map((letter) => ({ letter, isTarget: false })),
  ];
  return opts.sort((a, b) => {
    const ha = (a.letter.charCodeAt(0) + seed) % 5;
    const hb = (b.letter.charCodeAt(0) + seed) % 5;
    return ha - hb;
  });
}

/** Segmenting: child picks phonemes in order for a word. */
export function buildSegmentChoices(word: string): {
  targetPhonemes: string[];
  displayLetters: string[];
  distractors: string[];
} {
  const entry = getCvcWordEntry(word);
  const letters = word.trim().toLowerCase().split("");
  const targetPhonemes = entry?.phonemes ?? letters;
  const pool = ["s", "a", "t", "p", "i", "n", "m", "d", "g", "o", "c", "k", "e", "u", "r"];
  const distractors = pool.filter((p) => !letters.includes(p)).slice(0, 3);
  return { targetPhonemes, displayLetters: letters, distractors };
}

/** Group assessment unlock gate — enough skill mastery to advance. */
export function canUnlockNextLetterGroup(opts: {
  letterGroupIndex: number;
  skillScores: Partial<Record<ReadingSkillId, number>>;
  blendingAccuracy: number;
  readingAccuracy: number;
}): { ok: boolean; reason: string } {
  const blend = opts.blendingAccuracy;
  const read = opts.readingAccuracy;
  const letter = opts.skillScores.letter_recognition ?? 0;
  const beginning = opts.skillScores.beginning_sounds ?? 0;

  if (letter < 60) {
    return { ok: false, reason: "Keep practising letter sounds in this group." };
  }
  if (beginning < 55) {
    return { ok: false, reason: "Practise hearing beginning sounds a bit more." };
  }
  if (blend < 65) {
    return { ok: false, reason: "Blend a few more words before the next group." };
  }
  if (read < 55) {
    return { ok: false, reason: "Read your group words once more." };
  }
  return { ok: true, reason: "Ready for the next letter group!" };
}

export function lessonProgressPct(state: ReadingLessonState): number {
  if (state.complete) return 100;
  return Math.round((state.stepIndex / READING_LESSON_STEPS.length) * 100);
}

export function emojiForWord(word: string): string {
  return WORD_EMOJI[word.trim().toLowerCase()] ?? "📖";
}
