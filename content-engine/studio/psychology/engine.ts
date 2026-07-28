/**
 * Parent psychology engine — warm emotional triggers only.
 * Never use fear-based manipulation.
 */

import type { PsychologyTriggers, StudioEmotion, StudioTopicIdea } from "../types.js";

export const FORBIDDEN_PSYCHOLOGY = [
  "fear",
  "shame",
  "guilt-trip",
  "scare parents",
  "you're failing",
  "behind forever",
  "damage your child",
  "worst parent",
] as const;

const EMOTION_GUIDANCE: Record<StudioEmotion, string> = {
  confidence: "Show parents they already have what it takes; AmyNest makes the next step clear.",
  pride: "Celebrate small visible wins — a smile, a completed habit, a proud moment.",
  curiosity: "Invite wonder. Open a question parents want answered in the next 10 seconds.",
  hope: "Paint a hopeful tomorrow that feels achievable tonight.",
  achievement: "Highlight progress parents can feel after one short session.",
  calm: "Lower pressure. Soft pacing, reassuring voice, no urgency tactics.",
  bonding: "Center shared moments — parent and child learning side by side.",
  "routine-success": "Make consistency feel light: tiny rituals that stick without stress.",
};

export function buildPsychologyTriggers(idea: StudioTopicIdea): PsychologyTriggers {
  const secondary = secondaryEmotions(idea.emotion);
  return {
    primary: idea.emotion,
    secondary,
    forbidden: FORBIDDEN_PSYCHOLOGY,
    guidance: [
      EMOTION_GUIDANCE[idea.emotion],
      "Never use fear, shame, or scarcity. Lead with warmth, competence, and family joy.",
      `Primary emotion: ${idea.emotion}. Secondary: ${secondary.join(", ")}.`,
    ].join(" "),
  };
}

function secondaryEmotions(primary: StudioEmotion): StudioEmotion[] {
  const pool: StudioEmotion[] = [
    "confidence",
    "pride",
    "curiosity",
    "hope",
    "achievement",
    "calm",
    "bonding",
    "routine-success",
  ];
  return pool.filter((e) => e !== primary).slice(0, 2);
}

export function formatPsychologyForPrompt(triggers: PsychologyTriggers): string {
  return [
    "PARENT PSYCHOLOGY:",
    triggers.guidance,
    `Forbidden: ${triggers.forbidden.join("; ")}.`,
  ].join("\n");
}
