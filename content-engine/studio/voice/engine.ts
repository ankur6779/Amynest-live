/**
 * Voice engine — warm, professional, encouraging, parent-friendly.
 * Supports English, Hindi, Hinglish (+ future multilingual).
 */

import type { StudioLanguage, StudioTopicIdea, VoiceStyleProfile } from "../types.js";

export function resolveStudioLanguage(language: string): StudioLanguage {
  const n = language.toLowerCase();
  if (n === "hi" || n.startsWith("hindi")) return "hi";
  if (n.includes("hinglish") || n === "hi-en" || n === "en-hi") return "hinglish";
  return "en";
}

export function buildVoiceStyle(input: {
  idea: StudioTopicIdea;
  language: string;
}): VoiceStyleProfile {
  const language = resolveStudioLanguage(input.language);
  const tone =
    input.idea.emotion === "calm"
      ? "warm"
      : input.idea.category === "Premium"
        ? "professional"
        : "encouraging";

  const pace =
    input.idea.recommendedDuration <= 15
      ? "brisk"
      : input.idea.emotion === "calm"
        ? "slow"
        : "moderate";

  return {
    language,
    tone,
    pace,
    guidance: guidanceFor(language, tone, pace),
  };
}

function guidanceFor(
  language: StudioLanguage,
  tone: VoiceStyleProfile["tone"],
  pace: VoiceStyleProfile["pace"],
): string {
  const langLine =
    language === "hi"
      ? "Narrate in clear, warm Hindi suitable for Indian parents."
      : language === "hinglish"
        ? "Narrate in natural Hinglish — simple Hindi + familiar English parenting words."
        : "Narrate in clear, warm Indian/global English for parents.";

  return [
    langLine,
    `Tone: ${tone}. Pace: ${pace}.`,
    "Parent-friendly: no jargon dumps, no fear language, no shouting.",
    "Smile in the voice; pause briefly before the CTA.",
  ].join(" ");
}

export function formatVoiceForPrompt(profile: VoiceStyleProfile): string {
  return `VOICE: language=${profile.language}; tone=${profile.tone}; pace=${profile.pace}. ${profile.guidance}`;
}
