/**
 * AI Reading Coach — pronunciation analysis, phoneme confusion detection,
 * encouraging feedback, articulation tips, and fluency banding.
 *
 * Privacy: scores transcripts only. Raw audio is never persisted by this module.
 * STT may use on-device Web Speech or a short-lived server transcript (no audio archive).
 */
import { getCvcWordEntry, getPhonemeAudioText } from "@workspace/phonics-sounds";

/** Normalize coach scores that may be 0–1 or 0–100. */
export function normalizeScore01(score: number): number {
  if (!Number.isFinite(score)) return 0;
  if (score > 1) return Math.max(0, Math.min(1, score / 100));
  return Math.max(0, Math.min(1, score));
}

export type CoachTargetKind = "phoneme" | "word" | "phrase" | "sentence";

export type FluencyBand =
  | "emerging"
  | "developing"
  | "confident"
  | "fluent"
  | "advanced";

export type PhonemeConfusionPair = {
  expected: string;
  heard: string;
  count: number;
};

export type ArticulationTip = {
  grapheme: string;
  title: string;
  steps: string[];
  airflow: string;
  mouthEmoji: string;
};

export type CoachEvaluation = {
  targetKind: CoachTargetKind;
  expected: string;
  transcript: string;
  /** 0–100 pronunciation accuracy */
  pronunciationScore: number;
  /** 0–100 STT/coach confidence */
  confidencePct: number;
  accuracyPct: number;
  correct: boolean;
  tier: "excellent" | "good" | "almost" | "try_again";
  /** Always encouraging — never uses "wrong/failed/incorrect". */
  feedback: string;
  /** Phoneme the child likely produced instead (if detectable). */
  heardAs: string | null;
  confusion: PhonemeConfusionPair | null;
  articulation: ArticulationTip | null;
  retryRecommended: boolean;
  qualityFlags: {
    possibleSchwa: boolean;
    possibleBackgroundNoise: boolean;
    emptyTranscript: boolean;
  };
};

/** Common early-reader phoneme substitutions (grapheme space). */
export const PHONEME_CONFUSIONS: ReadonlyArray<readonly [string, string]> = [
  ["s", "sh"],
  ["sh", "s"],
  ["m", "b"],
  ["b", "m"],
  ["t", "d"],
  ["d", "t"],
  ["k", "g"],
  ["c", "g"],
  ["g", "k"],
  ["f", "v"],
  ["v", "f"],
  ["p", "b"],
  ["b", "p"],
  ["n", "m"],
  ["th", "f"],
  ["th", "s"],
  ["r", "w"],
  ["w", "r"],
  ["l", "w"],
  ["ch", "sh"],
  ["j", "ch"],
];

const ARTICULATION: Record<string, ArticulationTip> = {
  s: {
    grapheme: "s",
    title: "Snake sound",
    steps: ["Smile a little.", "Keep your tongue behind your teeth.", "Push air out: ssss."],
    airflow: "Continuous air — no voice buzz.",
    mouthEmoji: "😊💨",
  },
  a: {
    grapheme: "a",
    title: "Short a",
    steps: ["Open your mouth wide.", "Say /a/ like in apple — short and quick."],
    airflow: "Voiced vowel.",
    mouthEmoji: "😮",
  },
  t: {
    grapheme: "t",
    title: "Tap sound",
    steps: ["Put your tongue tip behind your top teeth.", "Tap and let a puff of air out."],
    airflow: "Quick puff — no hum.",
    mouthEmoji: "👅",
  },
  p: {
    grapheme: "p",
    title: "Pop sound",
    steps: ["Close your lips.", "Pop them open with a little puff."],
    airflow: "Burst of air.",
    mouthEmoji: "💨",
  },
  i: {
    grapheme: "i",
    title: "Short i",
    steps: ["Smile gently.", "Say /i/ like in igloo — short."],
    airflow: "Voiced vowel.",
    mouthEmoji: "🙂",
  },
  n: {
    grapheme: "n",
    title: "Nose sound",
    steps: ["Tongue tip on the roof of your mouth.", "Hum through your nose: nnn."],
    airflow: "Nasal hum.",
    mouthEmoji: "👃",
  },
  m: {
    grapheme: "m",
    title: "Humming lips",
    steps: ["Close your lips gently.", "Hum: mmm — feel the buzz on your lips."],
    airflow: "Nasal hum — lips closed.",
    mouthEmoji: "👄",
  },
  d: {
    grapheme: "d",
    title: "Soft tap",
    steps: ["Tongue tip behind top teeth.", "Tap with your voice on: /d/."],
    airflow: "Voiced tap.",
    mouthEmoji: "👅",
  },
  g: {
    grapheme: "g",
    title: "Back tongue",
    steps: ["Raise the back of your tongue.", "Say /g/ like in go."],
    airflow: "Voiced back stop.",
    mouthEmoji: "🗣️",
  },
  o: {
    grapheme: "o",
    title: "Short o",
    steps: ["Round your lips a little.", "Say /o/ like in octopus — short."],
    airflow: "Voiced vowel.",
    mouthEmoji: "⭕",
  },
  c: {
    grapheme: "c",
    title: "Hard c / k",
    steps: ["Raise the back of your tongue.", "Pop air: /k/."],
    airflow: "Quiet puff.",
    mouthEmoji: "🗣️",
  },
  k: {
    grapheme: "k",
    title: "K sound",
    steps: ["Raise the back of your tongue.", "Pop air: /k/."],
    airflow: "Quiet puff.",
    mouthEmoji: "🗣️",
  },
  f: {
    grapheme: "f",
    title: "Biting lip",
    steps: ["Put your top teeth on your lower lip.", "Blow softly: ffff."],
    airflow: "Continuous soft air.",
    mouthEmoji: "🦷",
  },
  b: {
    grapheme: "b",
    title: "Buzzy pop",
    steps: ["Close your lips.", "Pop with your voice: /b/."],
    airflow: "Voiced burst.",
    mouthEmoji: "👄",
  },
  h: {
    grapheme: "h",
    title: "Breath sound",
    steps: ["Open your mouth a little.", "Breathe out gently: /h/."],
    airflow: "Warm breath.",
    mouthEmoji: "💨",
  },
  r: {
    grapheme: "r",
    title: "Curly tongue",
    steps: ["Curl your tongue tip up a little.", "Voice on: /r/ — not /w/."],
    airflow: "Voiced.",
    mouthEmoji: "👅",
  },
  l: {
    grapheme: "l",
    title: "Tongue tip up",
    steps: ["Touch the tip of your tongue behind top teeth.", "Voice on: /l/."],
    airflow: "Voiced.",
    mouthEmoji: "👅",
  },
  sh: {
    grapheme: "sh",
    title: "Quiet sound",
    steps: ["Round your lips a little.", "Push air: shhh (like quiet)."],
    airflow: "Continuous air.",
    mouthEmoji: "🤫",
  },
  ch: {
    grapheme: "ch",
    title: "Train sound",
    steps: ["Start like /t/, then slide to /sh/.", "Say /ch/ like a little train."],
    airflow: "Quick burst then air.",
    mouthEmoji: "🚂",
  },
  th: {
    grapheme: "th",
    title: "Tongue peek",
    steps: ["Peek your tongue between your teeth.", "Blow gently for soft /th/."],
    airflow: "Soft continuous air.",
    mouthEmoji: "👅",
  },
  qu: {
    grapheme: "qu",
    title: "Queen sound",
    steps: ["Always with U.", "Say /kw/ like in queen."],
    airflow: "Blend /k/ + /w/.",
    mouthEmoji: "👑",
  },
};

const CONFUSION_FEEDBACK: Record<string, string> = {
  "s>sh": "Excellent effort! That sounded closer to /sh/. Let's try a soft long /ssss/ together.",
  "sh>s": "Nice try! Stretch it a little longer for /sh/ — like you're saying shhh.",
  "m>b": "Great try! Keep your lips closed and hum /mmm/ — no pop.",
  "b>m": "You're close! Pop your lips with your voice for /b/.",
  "t>d": "Lovely effort! Make a quick quiet tap for /t/ — less buzz.",
  "d>t": "Nice work! Add a little voice buzz for /d/.",
  "k>g": "Good listening! Keep /k/ quiet — a soft puff at the back.",
  "c>g": "Good listening! Keep /c/ quiet — a soft puff at the back.",
  "g>k": "You're getting it! Turn your voice on for /g/.",
  "f>v": "Super try! Blow softly for /f/ without the buzz.",
  "p>b": "Almost there! /p/ is a quiet pop — no voice yet.",
  "r>w": "Great effort! Curl your tongue a tiny bit for /r/.",
  "w>r": "Nice try! Round lips for /w/ like you're about to say 'woo'.",
  "ch>sh": "Wonderful try! Start with a tiny tap for /ch/.",
};

function stripTranscript(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s']/g, "")
    .replace(/\s+/g, " ");
}

function detectSchwa(expected: string, said: string): boolean {
  const e = expected.toLowerCase();
  if (e.length !== 1) return false;
  // "muh", "buh", "tuh" patterns for single consonants
  return new RegExp(`^${e}[aeiouh]+$`).test(said) || said.endsWith("uh") || said.endsWith("ah");
}

function detectHeardPhoneme(
  expected: string,
  said: string,
): { heardAs: string | null; confusion: PhonemeConfusionPair | null } {
  const exp = expected.trim().toLowerCase();
  const s = stripTranscript(said).replace(/\s/g, "");
  if (!s) return { heardAs: null, confusion: null };
  if (s === exp) return { heardAs: null, confusion: null };

  // Prefer multi-letter confusion matches before single-letter prefix checks
  // (e.g. said "sh" should not count as a correct start for expected "s").
  for (const [from, to] of PHONEME_CONFUSIONS) {
    if (from !== exp) continue;
    if (s === to || s.startsWith(to) || (to.length > 1 && s.includes(to))) {
      return {
        heardAs: to,
        confusion: { expected: from, heard: to, count: 1 },
      };
    }
  }

  if (s.startsWith(exp) && exp.length > 1) {
    return { heardAs: null, confusion: null };
  }
  // Exact single-letter match only when the spoken token is that letter alone
  if (exp.length === 1 && s === exp) {
    return { heardAs: null, confusion: null };
  }

  // First letter heuristic for word targets
  if (exp.length > 1 && s[0] && s[0] !== exp[0]) {
    const pair = PHONEME_CONFUSIONS.find(([a, b]) => a === exp[0] && (b === s[0] || s.startsWith(b)));
    if (pair) {
      return {
        heardAs: pair[1],
        confusion: { expected: pair[0], heard: pair[1], count: 1 },
      };
    }
  }

  return { heardAs: s.slice(0, Math.min(2, s.length)), confusion: null };
}

function tierFromScore(score01: number, correct: boolean): CoachEvaluation["tier"] {
  if (correct || score01 >= 0.9) return "excellent";
  if (score01 >= 0.75) return "good";
  if (score01 >= 0.55) return "almost";
  return "try_again";
}

function encouragingFeedback(opts: {
  tier: CoachEvaluation["tier"];
  expected: string;
  heardAs: string | null;
  confusion: PhonemeConfusionPair | null;
  targetKind: CoachTargetKind;
  possibleSchwa: boolean;
}): string {
  const { tier, expected, confusion, possibleSchwa, targetKind } = opts;
  if (confusion) {
    const key = `${confusion.expected}>${confusion.heard}`;
    if (CONFUSION_FEEDBACK[key]) return CONFUSION_FEEDBACK[key]!;
  }
  if (possibleSchwa) {
    return `Great try! Let's keep /${expected}/ pure — no extra "uh" at the end. Listen and copy Amy.`;
  }
  if (tier === "excellent") {
    return targetKind === "phoneme"
      ? `Wonderful /${expected}/! Your mouth remembered it.`
      : `Wonderful reading! You said it clearly.`;
  }
  if (tier === "good") {
    return `You're getting better! Listen carefully and try once more.`;
  }
  if (tier === "almost") {
    return `Great try! Let's say /${expected}/ together one more time.`;
  }
  return `Nice effort! Listen to Amy, watch your mouth, then have another go.`;
}

/**
 * Evaluate a child's spoken attempt against a phoneme, word, or phrase.
 * Prefer passing `rawScore01` / `confidence01` from speech-coach after normalization.
 */
export function evaluateReadingCoachAttempt(opts: {
  expected: string;
  transcript: string;
  targetKind: CoachTargetKind;
  /** Already-normalized or raw score from speech-coach */
  score?: number;
  confidence?: number;
  /** If speech-coach already decided correctness */
  correct?: boolean;
}): CoachEvaluation {
  const expected = opts.expected.trim().toLowerCase();
  const transcript = opts.transcript ?? "";
  const cleaned = stripTranscript(transcript);
  const emptyTranscript = cleaned.length === 0;

  let score01 = normalizeScore01(opts.score ?? 0);
  let correct = opts.correct ?? false;

  // Local fallback when STT returned text but no coach score
  if (opts.score == null && cleaned) {
    if (opts.targetKind === "phoneme") {
      const pure = cleaned.replace(/\s/g, "");
      correct =
        pure === expected ||
        pure.startsWith(expected) ||
        getPhonemeAudioText(expected).toLowerCase().includes(pure);
      score01 = correct ? 0.92 : detectSchwa(expected, pure) ? 0.45 : 0.35;
    } else {
      const target = expected.replace(/[^a-z]/g, "");
      const said = cleaned.replace(/[^a-z]/g, "");
      correct = said === target || said.includes(target);
      score01 = correct ? 0.9 : said && target.includes(said) ? 0.6 : 0.3;
    }
  } else if (opts.correct == null && cleaned) {
    const target = expected.replace(/[^a-z]/g, "");
    const said = cleaned.replace(/[^a-z]/g, "");
    correct = said === target || (opts.targetKind === "phoneme" && said.startsWith(expected));
  }

  const confidence01 = normalizeScore01(opts.confidence ?? score01);
  const { heardAs, confusion } = detectHeardPhoneme(
    opts.targetKind === "phoneme" ? expected : expected[0] ?? expected,
    cleaned,
  );
  const possibleSchwa =
    opts.targetKind === "phoneme" && detectSchwa(expected, cleaned.replace(/\s/g, ""));
  const possibleBackgroundNoise =
    cleaned.split(" ").length > 4 || cleaned.length > expected.length * 4;

  const tier = emptyTranscript ? "try_again" : tierFromScore(score01, correct);
  const articulation =
    getArticulationTip(opts.targetKind === "phoneme" ? expected : expected[0] ?? expected) ??
    null;

  const feedback = emptyTranscript
    ? "I didn't catch that — tap the mic and say it a little louder near the phone."
    : encouragingFeedback({
        tier,
        expected,
        heardAs,
        confusion,
        targetKind: opts.targetKind,
        possibleSchwa,
      });

  const pronunciationScore = Math.round(score01 * 100);
  return {
    targetKind: opts.targetKind,
    expected,
    transcript: cleaned,
    pronunciationScore,
    confidencePct: Math.round(confidence01 * 100),
    accuracyPct: pronunciationScore,
    correct: correct && !emptyTranscript,
    tier,
    feedback,
    heardAs,
    confusion,
    articulation,
    retryRecommended: !correct || tier === "almost" || tier === "try_again",
    qualityFlags: {
      possibleSchwa,
      possibleBackgroundNoise,
      emptyTranscript,
    },
  };
}

export function getArticulationTip(grapheme: string): ArticulationTip | null {
  const g = grapheme.trim().toLowerCase();
  return ARTICULATION[g] ?? ARTICULATION[g[0]!] ?? null;
}

export function fluencyBandFromMetrics(opts: {
  accuracyPct: number;
  wordsPerMinute?: number;
  hesitationRate?: number;
}): FluencyBand {
  const acc = opts.accuracyPct;
  const wpm = opts.wordsPerMinute ?? 0;
  const hes = opts.hesitationRate ?? 0;
  if (acc >= 95 && wpm >= 60 && hes < 0.1) return "advanced";
  if (acc >= 90 && wpm >= 40) return "fluent";
  if (acc >= 80) return "confident";
  if (acc >= 60) return "developing";
  return "emerging";
}

export function fluencyBandLabel(band: FluencyBand): string {
  const map: Record<FluencyBand, string> = {
    emerging: "Emerging",
    developing: "Developing",
    confident: "Confident",
    fluent: "Fluent",
    advanced: "Advanced",
  };
  return map[band];
}

/** Estimate reading readiness age-band message for parents (encouraging). */
export function estimateReadingReadiness(opts: {
  wordsRead: number;
  pronunciationAvg: number;
  fluencyBand: FluencyBand;
  letterGroupIndex: number;
}): string {
  if (opts.letterGroupIndex <= 1 && opts.wordsRead < 5) {
    return "Your child is building first sounds and will soon blend simple words like sat and pin.";
  }
  if (opts.fluencyBand === "emerging" || opts.fluencyBand === "developing") {
    return "Keep short daily sessions — blending confidence grows quickly with practice.";
  }
  if (opts.pronunciationAvg >= 80 && opts.wordsRead >= 20) {
    return "Strong foundations! Ready for longer decodable phrases and short stories.";
  }
  return "Steady progress — celebrate every word read aloud.";
}

/** Suggest adaptive focus graphemes from confusion history. */
export function adaptiveFocusFromConfusions(
  confusions: PhonemeConfusionPair[],
  limit = 3,
): string[] {
  return [...confusions]
    .sort((a, b) => b.count - a.count)
    .map((c) => c.expected)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, limit);
}

/** Weak phoneme hint for a misread CVC word. */
export function weakPhonemeFromWord(word: string, transcript: string): string | null {
  const entry = getCvcWordEntry(word);
  if (!entry) return word[0] ?? null;
  const said = stripTranscript(transcript).replace(/[^a-z]/g, "");
  const target = word.toLowerCase();
  if (!said || said === target) return null;
  for (let i = 0; i < target.length; i++) {
    if (said[i] !== target[i]) return entry.phonemes[i] ?? target[i]!;
  }
  return entry.phonemes[1] ?? entry.phonemes[0] ?? null;
}
