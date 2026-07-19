import type { AdaptiveProfile, AdaptiveSessionStats } from "./adaptive.js";
import type { AbacusLang } from "./language.js";
import type { LearningDna } from "./learning-dna.js";

export type EmotionState =
  | "frustrated"
  | "excited"
  | "idle"
  | "improving"
  | "focused"
  | "proud";

export type EmotionCue = {
  state: EmotionState;
  line: string;
  /** Soft UI intensity 0–1 for animations. */
  intensity: number;
};

const LINE_BANK: Record<EmotionState, { en: string[]; hi: string[] }> = {
  frustrated: {
    en: [
      "I see this is tricky — let's slow down together.",
      "No rush. One bead at a time.",
      "Mistakes help brains grow. Try again softly.",
    ],
    hi: [
      "Thoda mushkil lag raha hai — chalo dheere karte hain.",
      "Jaldi nahi. Ek bead at a time.",
      "Galti se dimaag seekhta hai. Softly try again.",
    ],
  },
  excited: {
    en: ["Yes! That sparkle! Again!", "You're on fire — keep going!", "Woohoo! That was brilliant!"],
    hi: ["Wah! Bahut tez!", "Tum on fire ho — continue!", "Woohoo! Zabardast!"],
  },
  idle: {
    en: [
      "I'm here when you're ready.",
      "Shall we play one quick bead game?",
      "Your abacus is waiting for a tiny try!",
    ],
    hi: [
      "Jab ready ho, main yahin hoon.",
      "Ek chota bead game khelen?",
      "Tumhara abacus wait kar raha hai!",
    ],
  },
  improving: {
    en: [
      "Look at that improvement — I'm proud of you!",
      "You're getting steadier every round.",
      "Confidence rising — I can feel it!",
    ],
    hi: [
      "Improvement dikh raha hai — proud of you!",
      "Har round steadier ho rahe ho.",
      "Confidence badh raha hai!",
    ],
  },
  focused: {
    en: ["Nice focus. Stay with the picture.", "Steady breathing — you've got this.", "Clear mind, clear beads."],
    hi: ["Acchi focus! Picture pakdo.", "Steady — tum kar sakte ho.", "Clear mind, clear beads."],
  },
  proud: {
    en: ["Champion energy!", "That deserves a cheer!", "You made Amy smile!"],
    hi: ["Champion energy!", "Yeh cheer deserve karta hai!", "Amy smile kar rahi hai!"],
  },
};

export function detectEmotion(input: {
  stats: AdaptiveSessionStats;
  profile: AdaptiveProfile;
  dna?: LearningDna | null;
  idleMs?: number;
}): EmotionState {
  if ((input.idleMs ?? 0) >= 45_000) return "idle";
  if (
    input.profile.signal === "repeated_mistakes" ||
    input.profile.signal === "needs_help" ||
    input.profile.signal === "random_guessing"
  ) {
    return "frustrated";
  }
  if (input.profile.signal === "fast_learner") return "excited";
  if ((input.dna?.improvementRate ?? 50) >= 65) return "improving";
  if (input.stats.correct >= 5 && input.stats.correct === input.stats.attempts) return "proud";
  return "focused";
}

/** Pick a non-repeating line using a rotating index. */
export function emotionCue(input: {
  state: EmotionState;
  language?: AbacusLang;
  rotate?: number;
}): EmotionCue {
  const lang = input.language === "hi" ? "hi" : "en";
  const bank = LINE_BANK[input.state][lang];
  const idx = Math.abs(input.rotate ?? 0) % bank.length;
  const intensity =
    input.state === "excited" || input.state === "proud"
      ? 0.9
      : input.state === "frustrated"
        ? 0.45
        : 0.6;
  return { state: input.state, line: bank[idx]!, intensity };
}
