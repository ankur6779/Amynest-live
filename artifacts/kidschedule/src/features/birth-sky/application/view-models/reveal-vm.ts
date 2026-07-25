/**
 * Reveal view-model builder (Pack 3 Part 4–5). No LLM.
 * Premium mentor tone; essence line still ≤14 words (contract).
 */

import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";

export type RevealViewModel = {
  mode: "full" | "day_sky";
  essenceLine: string;
  essenceCard: { title: string; body: string } | null;
  metaCaption: string;
  daySkyBadge: string | null;
  risingNote: string | null;
  childName: string;
  timePrecisionLabel: string;
};

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function trimWords(s: string, max: number): string {
  const parts = s.trim().split(/\s+/);
  if (parts.length <= max) return parts.join(" ");
  return parts.slice(0, max).join(" ");
}

export function buildRevealViewModel(
  profile: BirthProfile,
  snapshot: SkySnapshot,
  childName: string,
): RevealViewModel {
  const { astronomy, mode } = snapshot;
  const phase = astronomy.moonPhaseLabel;
  const sun = astronomy.sunSign;
  const moon = astronomy.moonSign;
  const name = childName.trim() || "your child";

  let essenceLine =
    mode === "day_sky"
      ? `A quiet ${phase} held their day.`
      : `${name}'s sky: ${sun} light, ${phase}.`;

  essenceLine = trimWords(essenceLine, 14);
  if (wordCount(essenceLine) > 14) {
    essenceLine =
      mode === "day_sky" ? "Their Day Sky still holds meaning." : "Their sky has gently formed.";
  }

  const essenceCard =
    mode === "day_sky"
      ? {
          title: "A day worth remembering",
          body:
            `You may notice how a ${phase.toLowerCase()} can feel like a soft beginning — even without an exact clock time. ` +
            `This Day Sky keeps the poetry of that civil day intact. Rising waits patiently if you ever choose to add birth time. ` +
            `Nothing here predicts who ${name} must become; it simply invites you to look with wonder.`,
        }
      : {
          title: "One quiet truth from their sky",
          body:
            `As ${name} arrived, a ${phase.toLowerCase()} Moon rested in ${moon}, while the Sun offered ${sun} daylight. ` +
            `You might later notice curiosity, comfort, or courage showing up in ordinary rooms — not as destiny, but as weather you can meet with love. ` +
            `This is for awareness and reflection, not prediction.`,
        };

  const timeLabel =
    profile.timePrecision === "unknown"
      ? "Day Sky"
      : profile.timePrecision === "approximate"
        ? "Approx. time"
        : "Exact time";

  const placeLabel = profile.birthPlace?.label ?? "Place not set";
  const metaCaption = `${profile.birthDate} · ${timeLabel} · ${placeLabel}`;

  return {
    mode,
    essenceLine,
    essenceCard,
    metaCaption,
    daySkyBadge: mode === "day_sky" ? "Day Sky · Time unknown" : null,
    risingNote:
      mode === "day_sky"
        ? "Rising stays gently closed without birth time — optional anytime."
        : null,
    childName,
    timePrecisionLabel: timeLabel,
  };
}
