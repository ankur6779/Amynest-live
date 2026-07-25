/**
 * Varied chapter endings — no single closing block may dominate.
 */

import { pickFromPool } from "./sky-copy";

export type EndingKind =
  | "reflection"
  | "encouragement"
  | "practical"
  | "observation"
  | "journal"
  | "family"
  | "celebration"
  | "mindful";

const DISCLAIMERS = [
  "This is for awareness and reflection, not prediction — never diagnosis, never destiny.",
  "Hold these words as a noticing lens, not a forecast or a fixed label.",
  "Use what resonates; leave the rest. The sky invites reflection, never certainty.",
  "Amy Astro offers optional insight for parents — never medical, financial, or fate claims.",
] as const;

function pools(name: string): Record<EndingKind, string[]> {
  return {
    reflection: [
      `Before you close this page, ask quietly: what did I notice about ${name} this week that no chart could invent?`,
      `Let one true moment from ${name}'s week sit with you — unedited, unexplained.`,
      `If only one sentence stays with you about ${name}, let it be kind and specific.`,
    ],
    encouragement: [
      `You are already doing the hard work of noticing ${name} with care. That is enough for today.`,
      `${name} does not need a perfect parent — they need a present one. You are practicing that.`,
      `Small attunements add up. Trust the quiet ways you already meet ${name}.`,
    ],
    practical: [
      `Tonight, try one tiny move: name a feeling, offer a choice, or celebrate one effort before any outcome.`,
      `Keep guidance short: connect, then guide. Repair quickly if the day frays.`,
      `Protect sleep and snack rhythm — they change the whole weather of ${name}'s day.`,
    ],
    observation: [
      `Watch for the ordinary brilliance: how ${name} recovers, the question they ask twice, the kindness nobody scores.`,
      `Notice without labeling. Patterns can inform patience; they do not freeze identity.`,
      `When ${name} softens after nearness, that is data for love — not a diagnosis.`,
    ],
    journal: [
      `If it helps, jot three lines about ${name} tonight — no polishing required.`,
      `A soft notebook of moments is often more trustworthy than any sky story.`,
      `Write what made ${name}'s eyes light up, even briefly. Keep that sentence.`,
    ],
    family: [
      `Share one gentle observation with another adult who loves ${name} — no fixing, just witnessing.`,
      `Ask at dinner: what felt easy for ${name} today? Listen more than you advise.`,
      `Family climate is part of their sky. One calm adult ritual before a transition can change the room.`,
    ],
    celebration: [
      `Celebrate one try ${name} made this week — effort first, outcome second.`,
      `Name a strength out loud: “I saw you keep going.” Let ${name} borrow your pride.`,
      `Joy is also data. Mark a moment of play or laughter without turning it into a lesson.`,
    ],
    mindful: [
      `Pause. Breathe once for yourself, once for ${name}. Then return to the evening as it is.`,
      `You can leave this chapter unfinished. Wonder and simplicity can take turns.`,
      `Release the need to complete the chart. Completeness lives in how you meet ${name} today.`,
    ],
  };
}

const KIND_ROTATION: EndingKind[] = [
  "reflection",
  "encouragement",
  "practical",
  "observation",
  "journal",
  "family",
  "celebration",
  "mindful",
];

export function composeChapterClosing(opts: {
  childName: string;
  sectionId: string;
}): string {
  const name = opts.childName.trim() || "your child";
  const kind =
    KIND_ROTATION[
      Math.abs(
        opts.sectionId.split("").reduce((a, c) => a + c.charCodeAt(0), 0),
      ) % KIND_ROTATION.length
    ]!;
  const ending = pickFromPool(pools(name)[kind], `${opts.sectionId}:${name}:end`);
  const disclaimer = pickFromPool(DISCLAIMERS, `${opts.sectionId}:${name}:disc`);
  return `\n\n${ending}\n\n${disclaimer}`;
}
