/**
 * High-quality speech feedback — 4 tiers with phoneme-specific guidance.
 */
import { getCvcWordEntry } from "@workspace/phonics-sounds";

export type SpeechTier = "excellent" | "good" | "almost" | "try_again";

export type SpeechFeedbackResult = {
  tier: SpeechTier;
  label: string;
  emoji: string;
  guidance: string;
  phonemeHint: string | null;
  confidence: number;
};

const TIER_META: Record<
  SpeechTier,
  { label: string; emoji: string; minScore: number }
> = {
  excellent: { label: "Excellent!", emoji: "🌟", minScore: 0.9 },
  good: { label: "Good!", emoji: "👍", minScore: 0.75 },
  almost: { label: "Almost there!", emoji: "💪", minScore: 0.55 },
  try_again: { label: "Try again", emoji: "🎯", minScore: 0 },
};

function vowelGuidance(phoneme: string): string {
  const map: Record<string, string> = {
    æ: "the middle sound, like in apple",
    ɛ: "the short e sound, like in egg",
    ɪ: "the short i sound, like in igloo",
    ɒ: "the short o sound, like in octopus",
    ʌ: "the short u sound, like in umbrella",
    a: "the short a sound",
    e: "the short e sound",
    i: "the short i sound",
    o: "the short o sound",
    u: "the short u sound",
  };
  return map[phoneme] ?? "the vowel sound in the middle";
}

function consonantGuidance(phoneme: string): string {
  return `the "${phoneme}" sound at the start or end`;
}

export function resolveSpeechTier(correct: boolean, score: number): SpeechTier {
  if (correct || score >= TIER_META.excellent.minScore) return "excellent";
  if (score >= TIER_META.good.minScore) return "good";
  if (score >= TIER_META.almost.minScore) return "almost";
  return "try_again";
}

/** Pick the phoneme most likely needing practice (middle vowel first). */
export function suggestWeakPhoneme(word: string, transcript: string): string | null {
  const entry = getCvcWordEntry(word);
  if (!entry) return null;
  const target = word.toLowerCase();
  const said = transcript.toLowerCase().replace(/[^a-z]/g, "");
  if (!said || said === target) return null;

  for (let i = 1; i < entry.phonemes.length - 0; i++) {
    const p = entry.phonemes[i]!;
    if (/[æɛɪɒʌaeiou]/.test(p) || i === 1) return p;
  }
  return entry.phonemes[1] ?? entry.phonemes[0] ?? null;
}

export function buildSpeechFeedback(opts: {
  word: string;
  transcript: string;
  correct: boolean;
  score: number;
  coachFeedback?: string;
}): SpeechFeedbackResult {
  const tier = resolveSpeechTier(opts.correct, opts.score);
  const meta = TIER_META[tier];
  const weak = suggestWeakPhoneme(opts.word, opts.transcript);
  let phonemeHint: string | null = null;
  let guidance = opts.coachFeedback ?? "Keep going — you are doing great!";

  if (tier !== "excellent" && weak) {
    const isVowel = /[æɛɪɒʌaeiou]/.test(weak);
    phonemeHint = isVowel ? vowelGuidance(weak) : consonantGuidance(weak);
    if (tier === "almost") {
      guidance = `Great job! Let's practice ${phonemeHint}.`;
    } else if (tier === "try_again") {
      guidance = `Nice try! Listen once more, then say ${phonemeHint}.`;
    } else {
      guidance = `Good! Watch ${phonemeHint} next time.`;
    }
  } else if (tier === "excellent") {
    guidance = `Wonderful reading of "${opts.word}"!`;
  }

  return {
    tier,
    label: meta.label,
    emoji: meta.emoji,
    guidance,
    phonemeHint,
    confidence: Math.round(opts.score * 100),
  };
}
