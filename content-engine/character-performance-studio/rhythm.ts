/**
 * Visual rhythm + shot density — alternate framing, 2–3s living beats.
 */

import type { DirectorBeatRole } from "../ai-director/types.js";
import type { StudioFraming } from "./types.js";

const ROLE_FRAMING: Record<DirectorBeatRole, StudioFraming[]> = {
  hook: ["close", "reaction"],
  problem: ["medium", "over-the-shoulder"],
  emotion: ["close", "reaction"],
  feature: ["over-the-shoulder", "medium", "tracking"],
  transformation: ["wide", "tracking", "medium"],
  cta: ["medium", "wide"],
  "end-card": ["wide"],
  bridge: ["tracking", "medium"],
};

/** Pick framing that does not repeat the previous shot. */
export function pickFraming(
  role: DirectorBeatRole,
  index: number,
  previous: StudioFraming | null,
): StudioFraming {
  const options = ROLE_FRAMING[role] ?? ["medium"];
  const pool = previous
    ? options.filter((f) => f !== previous)
    : options;
  const use = pool.length > 0 ? pool : options;
  return use[index % use.length]!;
}

export function shotDensityNote(durationSeconds: number): string {
  const beats = Math.max(1, Math.round(durationSeconds / 2.5));
  return [
    `SHOT DENSITY: average living beat every 2–3 seconds (~${beats} micro-beats in ${durationSeconds}s).`,
    "Avoid long static holds — each beat needs movement + emotion + interaction.",
    "If the provider clip is longer, stage internal attention shifts every 2–3s (look, gesture, posture change).",
  ].join(" ");
}

export function visualRhythmNote(
  framing: StudioFraming,
  previous: StudioFraming | null,
): string {
  return [
    `VISUAL RHYTHM: this shot framing = ${framing}.`,
    previous
      ? `Previous framing was ${previous} — do NOT repeat the same framing.`
      : "Opening framing established.",
    "Alternate wide / medium / close / reaction / over-the-shoulder / tracking across the short.",
    "Camera follows emotion with motivation — never random zoom.",
  ].join(" ");
}

export const NO_AD_MODE =
  "NO AD MODE: AmyNest is solving a parenting/learning moment, not selling. Audience should remember the feeling — hope, comfort, pride — not a promotion. Soft invite only after emotion is earned.";
