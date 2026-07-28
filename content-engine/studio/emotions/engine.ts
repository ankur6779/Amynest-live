/**
 * Emotion palette for premium AmyNest storytelling.
 */

import type { StudioEmotion, StudioTopicIdea } from "../types.js";

export const STUDIO_EMOTION_PALETTE: Record<
  StudioEmotion,
  { label: string; visualCue: string; voiceCue: string }
> = {
  confidence: {
    label: "Confidence",
    visualCue: "Steady eye-line, soft smile, clear posture",
    voiceCue: "Warm certainty without pressure",
  },
  pride: {
    label: "Pride",
    visualCue: "Parent-child high-five energy, bright eyes",
    voiceCue: "Celebrate the win lightly",
  },
  curiosity: {
    label: "Curiosity",
    visualCue: "Lean-in framing, sparkle accents, question beat",
    voiceCue: "Invite wonder with an open question",
  },
  hope: {
    label: "Hope",
    visualCue: "Sunrise soft light, open sky, gentle purple wash",
    voiceCue: "Forward-looking and kind",
  },
  achievement: {
    label: "Achievement",
    visualCue: "Micro celebration, badge pulse, completed habit glow",
    voiceCue: "Proud but grounded",
  },
  calm: {
    label: "Calm Parenting",
    visualCue: "Slow camera, soft palette, uncluttered frames",
    voiceCue: "Lower volume energy, reassuring pace",
  },
  bonding: {
    label: "Family Bonding",
    visualCue: "Side-by-side framing, shared screen moment",
    voiceCue: "Inclusive we-language",
  },
  "routine-success": {
    label: "Routine Success",
    visualCue: "Day-part transitions, checklist micro-motion",
    voiceCue: "Rhythm and ease",
  },
};

export function describeEmotion(idea: StudioTopicIdea): string {
  const palette = STUDIO_EMOTION_PALETTE[idea.emotion];
  return `${palette.label}: visual=${palette.visualCue}; voice=${palette.voiceCue}`;
}
