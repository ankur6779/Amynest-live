/**
 * Reveal view-model builder (Pack 3 Part 4–5). No LLM.
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

  let essenceLine =
    mode === "day_sky"
      ? `A ${phase} lit their Day Sky.`
      : `Born under a ${sun} Sun, ${phase}.`;

  essenceLine = trimWords(essenceLine, 14);
  if (wordCount(essenceLine) > 14) {
    essenceLine = mode === "day_sky" ? "Their Day Sky still holds meaning." : "Their Birth Sky has formed.";
  }

  const essenceCard =
    mode === "day_sky"
      ? {
          title: "Day Sky",
          body: "Without an exact time, we map the sky of that day — still meaningful.",
        }
      : {
          title: "One fact from their sky",
          body: `The Moon was ${phase.toLowerCase()} when they arrived.`,
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
        ? "Rising isn’t shown without birth time. You can add it later."
        : null,
    childName,
    timePrecisionLabel: timeLabel,
  };
}
