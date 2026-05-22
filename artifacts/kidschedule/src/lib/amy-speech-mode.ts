/**
 * Speech Mode Engine — classify, normalize, and route Amy voice input before TTS.
 */

import {
  normalizePhonicsLetterKey,
  PHONICS_DIGRAPH_SOUNDS,
} from "@workspace/phonics-sounds";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import type { AmyEmotion } from "@/lib/amy-voice-emotion";
import type { AmyDifficultyLevel } from "@/lib/amy-voice-difficulty";
import type { AmyIntent } from "@/lib/amy-voice-intent";
import type { SpeakOptions } from "@/hooks/use-amy-voice";
import { enforceAmySpeechPolicyInvariants } from "@/lib/amy-voice-invariants";

export type AmySpeechMode =
  | "math"
  | "phonics"
  | "spelling"
  | "word"
  | "sentence"
  | "number"
  | "mixed"
  | "speech_coach";

/** Static phonics training lines (never alphabet letter names). */
const LETTER_SAYS: Record<string, string> = {
  a: "a says ah",
  b: "b says buh",
  c: "c says kuh",
  d: "d says duh",
  e: "e says eh",
  f: "f says fff",
  g: "g says guh",
  h: "h says huh",
  i: "i says ih",
  j: "j says juh",
  k: "k says kuh",
  l: "l says lll",
  m: "m says mmm",
  n: "n says nnn",
  o: "o says oh",
  p: "p says puh",
  q: "q says kwuh",
  r: "r says rrr",
  s: "s says sss",
  t: "t says tuh",
  u: "u says uh",
  v: "v says vvv",
  w: "w says wuh",
  x: "x says ks",
  y: "y says yuh",
  z: "z says zzz",
};

const DIGRAPH_SAYS: Record<string, string> = {
  sh: "sh says shuh, like in ship.",
  ch: "ch says chuh, like in chop.",
  th: "th says thhh, like in thumb.",
  wh: "wh says wuh, like in whale.",
  ph: "ph says fff, like in phone.",
  ng: "ng says ng, like in ring.",
  ck: "ck says kuh, like in duck.",
};

/** Common short words — helps disambiguate word vs phonics. */
const COMMON_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "is", "are", "was", "were", "be", "been",
  "i", "you", "we", "they", "he", "she", "it", "me", "my", "your", "our", "their",
  "cat", "dog", "bat", "rat", "hat", "mat", "sat", "pat", "fat", "map", "cap", "tap",
  "run", "fun", "sun", "bun", "cup", "pup", "bug", "hug", "mug", "rug", "bed", "red",
  "big", "dig", "fig", "pig", "wig", "box", "fox", "mix", "fix", "six", "yes", "no",
  "hi", "hello", "bye", "please", "thanks", "thank", "help", "love", "like", "look",
  "see", "listen", "read", "play", "eat", "drink", "good", "great", "job", "well",
  "done", "try", "again", "amazing", "nice", "cool", "wow", "yay", "mom", "dad",
  "boy", "girl", "kid", "kids", "book", "ball", "toy", "star", "moon", "day", "night",
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "step", "of", "in", "on", "at", "to", "for", "with", "from", "up", "down", "out",
]);

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

export type AmyProsodyProfile = {
  playbackRate: number;
  synthesisRate: number;
  phonicsGapMs: number;
  phraseGapMs: number;
  pauseMarker: string;
};

export type AmySpeechPolicy = {
  originalText: string;
  normalizedText: string;
  /** Prosody-formatted phrases for sequential speak (mixed/coach/sentence). */
  phrases: string[];
  useSemanticSplit: boolean;
  prosody: AmyProsodyProfile;
  learningPriority: number;
  emotion: AmyEmotion;
  intent: AmyIntent;
  difficultyLevel: AmyDifficultyLevel;
  replayCount: number;
  speechMode: AmySpeechMode;
  pipelineMode: "default" | "phonics";
  forcePhonicsOnly: boolean;
  preferDynamicTts: boolean;
  allowPhonicsFallback: boolean;
  allowPhonicsSequence: boolean;
  allowSpeechCoachSplit: boolean;
  retryDynamicTts: boolean;
  preferSpeechSynthesisFallback: boolean;
  dynamicTimeoutMs: number;
};

const MATH_RE = /[\d].*[+\-×÷=]|[+\-×÷=].*[\d]|^\s*\d+\s*[+\-×÷]\s*\d+/;
const PURE_NUMBER_RE = /^\s*\d+\s*$/;
const SPELLING_RE = /^[a-z](?:[\s.\-_][a-z]){1,}$/i;
const HAS_DIGITS_RE = /\d/;
const HAS_WORDS_RE = /[a-zA-Z]{2,}|[a-zA-Z]/;

export function cleanText(raw: string): string {
  return (raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s+\-×÷=.,!?'"]/g, "")
    .toLowerCase();
}

export function numberToWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  if (n < 20) return ONES[n] ?? String(n);
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return r === 0 ? TENS[t]! : `${TENS[t]!} ${ONES[r]!}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    const head = h === 1 ? "one hundred" : `${ONES[h]!} hundred`;
    return r === 0 ? head : `${head} ${numberToWords(r)}`;
  }
  if (n < 1_000_000) {
    const th = Math.floor(n / 1000);
    const r = n % 1000;
    const head = th === 1 ? "one thousand" : `${numberToWords(th)} thousand`;
    return r === 0 ? head : `${head} ${numberToWords(r)}`;
  }
  return String(n);
}

/** Spelling / ID-style reading — each digit spoken separately. */
export function numberToDigits(digits: string): string {
  return digits
    .split("")
    .map((d) => (/^\d$/.test(d) ? ONES[parseInt(d, 10)]! : d))
    .join(" ");
}

export function normalizeMathExpression(raw: string): string {
  const spaced = raw
    .replace(/×/g, " × ")
    .replace(/÷/g, " ÷ ")
    .replace(/\+/g, " + ")
    .replace(/-/g, " - ")
    .replace(/=/g, " = ")
    .replace(/\s+/g, " ")
    .trim();

  return spaced
    .split(/\s+/)
    .map((token) => {
      if (/^\d+$/.test(token)) return numberToWords(parseInt(token, 10));
      switch (token) {
        case "+":
          return "plus";
        case "-":
          return "minus";
        case "×":
          return "times";
        case "÷":
          return "divided by";
        case "=":
          return "equals";
        default:
          return token;
      }
    })
    .join(" ");
}

function normalizePureNumber(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{6,}$/.test(trimmed)) return numberToDigits(trimmed);
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) ? numberToWords(n) : cleanText(raw);
}

/** Natural number reading inside sentences — avoid over-normalizing IDs. */
export function normalizeSentenceNumbers(raw: string): string {
  const base = cleanText(raw);
  return base.replace(/\b\d+\b/g, (match) => {
    if (match.length >= 6) return numberToDigits(match);
    const n = parseInt(match, 10);
    if (!Number.isFinite(n)) return match;
    if (n <= 9999) return numberToWords(n);
    return numberToDigits(match);
  });
}

export function normalizeSpellingInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[.\-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .map((token) => (/^\d+$/.test(token) ? numberToDigits(token) : token))
    .join(" ");
}

/** Context-aware normalization before TTS pipeline. */
export function normalizeText(raw: string, speechMode: AmySpeechMode): string {
  switch (speechMode) {
    case "math":
      return normalizeMathExpression(raw);
    case "number":
      return normalizePureNumber(raw);
    case "spelling":
      return normalizeSpellingInput(raw);
    case "mixed":
    case "sentence":
    case "speech_coach":
      return normalizeSentenceNumbers(raw);
    case "word":
      return HAS_DIGITS_RE.test(raw) ? normalizeSentenceNumbers(raw) : cleanText(raw);
    default:
      return cleanText(raw);
  }
}

export function isMixedContent(text: string): boolean {
  const raw = (text ?? "").trim();
  if (!raw) return false;
  if (MATH_RE.test(raw)) return false;
  if (PURE_NUMBER_RE.test(raw)) return false;
  return HAS_DIGITS_RE.test(raw) && HAS_WORDS_RE.test(raw);
}

export function isCommonWord(token: string): boolean {
  return COMMON_WORDS.has(token.toLowerCase());
}

/** True when input is a single letter or known digraph phonics key (not a word). */
export function isPhonicsTrainingKey(raw: string): boolean {
  const trimmed = (raw ?? "").trim().toLowerCase();
  if (!trimmed || trimmed.includes(" ")) return false;
  if (trimmed.length === 1 && /[a-z]/.test(trimmed)) return true;
  const key = normalizePhonicsLetterKey(trimmed);
  if (!key) return false;
  return key.length <= 2 || Boolean(PHONICS_DIGRAPH_SOUNDS[key]);
}

const INSTRUCTION_SPLIT_RES = [
  /\s+,\s*then\s+/i,
  /\s+;\s+/,
  /\s+—\s+/,
] as const;

const INTENT_MARKER_RE =
  /\s+(?:,\s*)?(then|next|after(?:\s+(?:that|you|this))?|now)\s+/gi;

const STEP_OF_RE =
  /^(step\s+(?:\w+\s+)*of\s+\w+)\s+(.+)$/i;

/** Adaptive pacing and speech rate by mode and sentence length. */
export function getProsodyProfile(
  speechMode: AmySpeechMode,
  text: string,
  phraseCount: number,
): AmyProsodyProfile {
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  switch (speechMode) {
    case "phonics":
    case "spelling":
      return {
        playbackRate: 1,
        synthesisRate: 0.95,
        phonicsGapMs: 115,
        phraseGapMs: 120,
        pauseMarker: " ",
      };
    case "math":
    case "number":
      return {
        playbackRate: 0.96,
        synthesisRate: 0.9,
        phonicsGapMs: 120,
        phraseGapMs: 320,
        pauseMarker: " ... ",
      };
    case "speech_coach": {
      const rate = wordCount > 14 ? 0.85 : wordCount > 10 ? 0.88 : wordCount > 6 ? 0.92 : 0.94;
      const gap =
        phraseCount > 2 ? 580 : phraseCount > 1 ? 520 : wordCount > 10 ? 480 : 420;
      return {
        playbackRate: rate,
        synthesisRate: rate,
        phonicsGapMs: 115,
        phraseGapMs: gap,
        pauseMarker: " ... ... ",
      };
    }
    case "mixed":
    case "sentence":
      return {
        playbackRate: wordCount > 10 ? 0.9 : 0.94,
        synthesisRate: wordCount > 10 ? 0.88 : 0.92,
        phonicsGapMs: 120,
        phraseGapMs: wordCount > 10 ? 520 : 450,
        pauseMarker: wordCount > 8 ? " ... ... " : " ... ",
      };
    default:
      return {
        playbackRate: 1,
        synthesisRate: 0.92,
        phonicsGapMs: 120,
        phraseGapMs: 400,
        pauseMarker: " ... ",
      };
  }
}

/** Split at instructional intent markers — each segment is one clear action/idea. */
export function splitAtIntentMarkers(text: string): string[] {
  const rest = (text ?? "").trim();
  if (!rest) return [];

  const segments: string[] = [];
  let last = 0;
  const re = new RegExp(INTENT_MARKER_RE.source, INTENT_MARKER_RE.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(rest)) !== null) {
    const chunk = rest.slice(last, match.index).trim();
    if (chunk) segments.push(chunk);
    last = match.index + match[0].length;
  }
  const tail = rest.slice(last).trim();
  if (tail) segments.push(tail);

  return segments.length > 1 ? segments : [rest];
}

function collapsePauses(text: string): string {
  return text
    .replace(/\s\.\.\.\s\.\.\./g, " ... ")
    .replace(/(\s\.\.\.\s){2,}/g, " ... ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Insert pauses and sentence punctuation for natural TTS rhythm. */
export function formatProsodyForTts(
  text: string,
  speechMode: AmySpeechMode,
  prosody?: AmyProsodyProfile,
): string {
  let t = (text ?? "").trim();
  if (!t) return t;

  const p = prosody ?? getProsodyProfile(speechMode, t, 1);
  const pause = p.pauseMarker;
  const wordCount = t.split(/\s+/).length;

  t = t.charAt(0).toUpperCase() + t.slice(1);

  if (speechMode === "math" || speechMode === "number") {
    t = t.replace(/\s+(plus|minus|times|divided by|equals)\s+/gi, `${pause}$1${pause}`);
  }

  if (speechMode === "speech_coach" || speechMode === "mixed" || speechMode === "sentence") {
    const commaPause = wordCount > 10 ? `${pause}${pause}` : pause;
    t = t.replace(/,\s*/g, `,${commaPause}`);
    t = t.replace(
      /\s+(now|next|then|after|remember|try|listen|great|good job)\s+/gi,
      `${pause}$1${pause}`,
    );
    if (wordCount > 12) {
      t = t.replace(/\s+(and|but|so)\s+/gi, `${pause}$1${pause}`);
    }
    if (!/[.!?]$/.test(t)) t += ".";
  }

  return collapsePauses(t);
}

/** Break long mixed/coach sentences into smaller phrases for sequential speak. */
export function splitSemanticPhrases(
  text: string,
  speechMode: AmySpeechMode,
  prosody?: AmyProsodyProfile,
): string[] {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return [];

  const profile = prosody ?? getProsodyProfile(speechMode, trimmed, 1);
  const format = (chunk: string) => formatProsodyForTts(chunk, speechMode, profile);

  const splittable =
    speechMode === "mixed" || speechMode === "speech_coach" || speechMode === "sentence";
  if (!splittable) return [format(trimmed)];

  const wordCount = trimmed.split(/\s+/).length;
  const intentParts = splitAtIntentMarkers(trimmed);
  if (intentParts.length > 1) {
    return intentParts.map(format);
  }

  const splitThreshold =
    speechMode === "speech_coach" ? 5 : speechMode === "mixed" ? 6 : 7;
  if (wordCount <= splitThreshold) return [format(trimmed)];

  let rawParts: string[] = [];

  const stepMatch = trimmed.match(STEP_OF_RE);
  if (stepMatch?.[1] && stepMatch[2]) {
    rawParts = [stepMatch[1].trim(), stepMatch[2].trim()];
  } else {
    for (const re of INSTRUCTION_SPLIT_RES) {
      if (re.test(trimmed)) {
        rawParts = trimmed.split(re).map((p) => p.trim()).filter(Boolean);
        break;
      }
    }
    if (rawParts.length === 0 && wordCount > 8) {
      const words = trimmed.split(/\s+/);
      const mid = Math.ceil(words.length / 2);
      rawParts = [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
    }
  }

  if (rawParts.length <= 1) {
    return [format(trimmed)];
  }

  return rawParts.map(format);
}

/** Phonics chunk line for static catalog — phoneme sounds, not letter names. */
export function getPhonicsTrainingAudioText(input: string): string {
  const trimmed = (input ?? "").trim().toLowerCase();
  if (!trimmed) return trimmed;

  const key = normalizePhonicsLetterKey(trimmed);
  if (key && LETTER_SAYS[key]) return LETTER_SAYS[key];
  if (key && DIGRAPH_SAYS[key]) return DIGRAPH_SAYS[key];
  if (key && PHONICS_DIGRAPH_SOUNDS[key]) {
    return DIGRAPH_SAYS[key] ?? PHONICS_DIGRAPH_SOUNDS[key].audioText;
  }
  if (LETTER_SAYS[trimmed]) return LETTER_SAYS[trimmed];
  return trimmed;
}

export function detectSpeechMode(text: string, opts?: SpeakOptions): AmySpeechMode {
  const raw = (text ?? "").trim();
  if (!raw) return "word";

  if (opts?.mode === "phonics") return "phonics";
  if (opts?.word && SPELLING_RE.test(raw)) return "spelling";

  if (MATH_RE.test(raw)) return "math";
  if (PURE_NUMBER_RE.test(raw)) return "number";
  if (isMixedContent(raw)) return "mixed";
  if (SPELLING_RE.test(raw)) return "spelling";

  if (raw.length === 1 && /[a-z]/i.test(raw)) return "phonics";

  const words = raw.split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    const w = words[0]!;
    if (isPhonicsTrainingKey(w)) return "phonics";
    if (isCommonWord(w)) return "word";
    if (/^[a-z'-]{2,8}$/i.test(w)) return "word";
    if (/^[a-z'-]+$/i.test(w) && w.length <= 14) return "word";
  }

  const phonicsKey = normalizePhonicsLetterKey(raw);
  if (phonicsKey && isPhonicsTrainingKey(raw)) return "phonics";

  if (words.length >= 2) {
    if (words.length >= 5 || raw.length >= 55) return "speech_coach";
    return "sentence";
  }

  return "word";
}

function buildPolicy(
  originalText: string,
  normalizedText: string,
  speechMode: AmySpeechMode,
  phrases: string[],
): AmySpeechPolicy {
  const naturalSpeech =
    speechMode === "speech_coach" ||
    speechMode === "sentence" ||
    speechMode === "mixed";

  const useSemanticSplit = phrases.length > 1;

  const base: AmySpeechPolicy = {
    originalText,
    normalizedText,
    phrases,
    useSemanticSplit,
    prosody: getProsodyProfile(speechMode, normalizedText, phrases.length),
    learningPriority: 0,
    emotion: "neutral",
    intent: "neutral",
    difficultyLevel: "neutral",
    replayCount: 0,
    speechMode,
    pipelineMode: speechMode === "phonics" || speechMode === "spelling" ? "phonics" : "default",
    forcePhonicsOnly: false,
    preferDynamicTts: false,
    allowPhonicsFallback: false,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    retryDynamicTts: false,
    preferSpeechSynthesisFallback: false,
    dynamicTimeoutMs: 1500,
  };

  switch (speechMode) {
    case "math":
    case "number":
      return {
        ...base,
        preferDynamicTts: true,
        allowPhonicsFallback: false,
        allowPhonicsSequence: false,
        allowSpeechCoachSplit: false,
        dynamicTimeoutMs: 1800,
      };
    case "mixed":
      return {
        ...base,
        preferDynamicTts: true,
        allowPhonicsFallback: false,
        allowPhonicsSequence: false,
        allowSpeechCoachSplit: false,
        retryDynamicTts: true,
        preferSpeechSynthesisFallback: true,
        dynamicTimeoutMs: 1800,
      };
    case "phonics":
      return {
        ...base,
        forcePhonicsOnly: true,
        allowPhonicsFallback: true,
        allowPhonicsSequence: true,
        allowSpeechCoachSplit: false,
        preferDynamicTts: false,
      };
    case "spelling":
      return {
        ...base,
        forcePhonicsOnly: true,
        allowPhonicsFallback: true,
        allowPhonicsSequence: true,
        allowSpeechCoachSplit: false,
        preferDynamicTts: false,
      };
    case "speech_coach":
      return {
        ...base,
        preferDynamicTts: true,
        allowPhonicsFallback: false,
        allowPhonicsSequence: false,
        allowSpeechCoachSplit: false,
        retryDynamicTts: true,
        preferSpeechSynthesisFallback: true,
        dynamicTimeoutMs: 2200,
      };
    case "sentence":
      return {
        ...base,
        preferDynamicTts: true,
        allowPhonicsFallback: false,
        allowPhonicsSequence: false,
        allowSpeechCoachSplit: false,
        retryDynamicTts: true,
        preferSpeechSynthesisFallback: naturalSpeech,
        dynamicTimeoutMs: 1800,
      };
    case "word":
      return {
        ...base,
        preferDynamicTts: true,
        allowPhonicsFallback: false,
        allowPhonicsSequence: false,
        allowSpeechCoachSplit: false,
        dynamicTimeoutMs: 1600,
      };
    default:
      return base;
  }
}

/** Log final speech routing outcome including fallback layer used. */
export function logAmyModeDiagnosis(
  policy: AmySpeechPolicy,
  fallbackUsed: string,
): void {
  void import("@/lib/amy-voice-telemetry").then((m) =>
    m.recordAmyModeOutcome(policy.speechMode, fallbackUsed, {
      originalText: policy.originalText.slice(0, 120),
      useSemanticSplit: policy.useSemanticSplit,
      phraseCount: policy.phrases.length,
      learningPriority: policy.learningPriority,
      prosody: policy.prosody,
    }),
  );
  void import("@/lib/amy-voice-learning").then((m) => {
    if (import.meta.env.DEV) {
      console.info("[AmyModeStats]", m.getAmyVoiceLearningSnapshot());
    }
  });
  console.log(
    "[AmyMode]",
    policy.originalText,
    policy.speechMode,
    policy.intent,
    policy.emotion,
    policy.difficultyLevel,
    policy.normalizedText,
    fallbackUsed,
  );
}

/**
 * Amy Audio Lessons — play each paragraph as one continuous unit.
 * Avoids speech_coach semantic splits and duplicate onFinished callbacks.
 */
export function prepareAmyLessonParagraphSpeech(raw: string): AmySpeechPolicy {
  const originalText = (raw ?? "").trim();
  const speechMode: AmySpeechMode = "sentence";
  const baseNormalized = normalizeSentenceNumbers(originalText);
  const prosody = getProsodyProfile(speechMode, baseNormalized, 1);
  const phrase = formatProsodyForTts(baseNormalized, speechMode, prosody);
  const policy = buildPolicy(originalText, phrase, speechMode, [phrase]);
  policy.useSemanticSplit = false;
  policy.allowSpeechCoachSplit = false;
  policy.allowPhonicsSequence = false;
  return enforceAmySpeechPolicyInvariants(policy);
}

/** Guard: normalize + classify before any pipeline layer runs. */
export function prepareAmySpeechInput(raw: string, opts?: SpeakOptions): AmySpeechPolicy {
  if (opts?.lessonParagraph) {
    return prepareAmyLessonParagraphSpeech(raw);
  }
  const originalText = (raw ?? "").trim();
  const speechMode = detectSpeechMode(originalText, opts);
  const baseNormalized = normalizeText(originalText, speechMode);
  const draftProsody = getProsodyProfile(speechMode, baseNormalized, 1);
  const phrases = splitSemanticPhrases(baseNormalized, speechMode, draftProsody);
  const prosody = getProsodyProfile(speechMode, baseNormalized, phrases.length);
  const normalizedText = phrases.length === 1 ? phrases[0]! : phrases.join(prosody.pauseMarker);
  const policy = buildPolicy(originalText, normalizedText, speechMode, phrases);
  policy.prosody = prosody;

  // CVC blend finale — play whole word, never re-decompose into phonemes.
  if (opts?.word) {
    policy.allowPhonicsSequence = false;
  }

  logAmyVoiceDiag("speech_mode", {
    mode: speechMode,
    normalized: policy.normalizedText.slice(0, 120),
    forcePhonicsOnly: policy.forcePhonicsOnly,
    preferDynamicTts: policy.preferDynamicTts,
    retryDynamicTts: policy.retryDynamicTts,
    prosody: policy.prosody,
  });

  return enforceAmySpeechPolicyInvariants(policy);
}
