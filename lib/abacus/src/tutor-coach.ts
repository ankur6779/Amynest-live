import type { AdaptiveProfile, AdaptiveSessionStats } from "./adaptive.js";
import type { AbacusLang } from "./language.js";
import type { MasteryState } from "./mastery.js";
import { SKILL_LABELS, weakestSkill } from "./mastery.js";

export type TutorObservation = {
  stats: AdaptiveSessionStats;
  profile: AdaptiveProfile;
  mastery?: MasteryState;
  lastMistakePrompt?: string;
  language?: AbacusLang;
};

/** Short living-teacher lines — never ChatGPT-flavored. */
export function livingCoachLine(obs: TutorObservation): string {
  const hi = obs.language === "hi";
  const { profile, stats } = obs;

  if (stats.repeatMistakes >= 2) {
    return hi
      ? "Maine dekha — yeh galti do baar hui. Chalo dheere se theek karte hain."
      : "I saw you made the same mistake twice. Let's slow down and fix it.";
  }

  switch (profile.signal) {
    case "fast_learner":
      return hi
        ? "Wah! Bahut tez! Ready for a tougher one?"
        : "That was super fast! Ready for a tougher one?";
    case "needs_help":
      return hi
        ? "Koi baat nahi — pehle beads se try karo, phir dimaag se."
        : "Let's slow down. Try the beads first, then go mental.";
    case "repeated_mistakes":
      return hi
        ? "Same pattern aa raha hai. Ek baar beads picture karo."
        : "Same pattern again — picture the beads once more.";
    case "long_hesitation":
      return hi
        ? "Socho, dheere. Ek bead at a time."
        : "Take a breath. One bead at a time.";
    case "random_guessing":
      return hi
        ? "Guess mat karo — pehle abacus dimaag mein banao."
        : "Don't guess — build the abacus in your mind first.";
    default:
      break;
  }

  if (stats.correct >= 3 && stats.attempts === stats.correct) {
    return hi ? "Perfect streak! Tum kar sakte ho!" : "Perfect streak! You've got this!";
  }

  const weak = obs.mastery ? weakestSkill(obs.mastery) : null;
  if (weak && weak.score < 40) {
    return hi
      ? `${SKILL_LABELS[weak.skill]} pe thoda aur practice — main saath hoon.`
      : `Let's strengthen ${SKILL_LABELS[weak.skill]} — I'm with you.`;
  }

  return hi ? "Bahut accha! Try it!" : "Great! Try it!";
}

/** Extra system prompt fragment for the API tutor (backward-compatible additive). */
export function buildLivingTutorCoachFragment(obs: TutorObservation): string {
  const line = livingCoachLine(obs);
  const accuracy =
    obs.stats.attempts > 0
      ? Math.round((obs.stats.correct / obs.stats.attempts) * 100)
      : null;
  const parts = [
    "You are a living classroom teacher named Amy — warm, brief, specific. Never sound like a chatbot.",
    `Recent coaching vibe to honor: "${line}"`,
    `Session signal: ${obs.profile.signal}.`,
  ];
  if (accuracy != null) parts.push(`Recent accuracy ~${accuracy}%.`);
  if (obs.stats.avgElapsedMs > 0) {
    parts.push(`Average thinking time ~${Math.round(obs.stats.avgElapsedMs / 1000)}s.`);
  }
  if (obs.lastMistakePrompt) {
    parts.push(`Child recently struggled with: ${obs.lastMistakePrompt}.`);
  }
  parts.push("Use bead-movement language and end with tiny encouragement.");
  return parts.join(" ");
}
