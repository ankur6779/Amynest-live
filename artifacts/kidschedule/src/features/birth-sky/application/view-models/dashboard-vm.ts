/**
 * Dashboard view-models (Pack 4 §6.1) — snapshot-driven, no recompute.
 */

import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import { buildRevealViewModel } from "./reveal-vm";

export type CompletenessChip = {
  id: "day" | "time" | "place";
  label: string;
  complete: boolean;
};

export type DashboardHeroVM = {
  childName: string;
  essenceLine: string;
  metaCaption: string;
  timePrecisionLabel: string;
  placeLabel: string;
  chips: CompletenessChip[];
  mode: "full" | "day_sky";
  computedAtLabel: string;
  snapshotVersion: string;
  engineVersion: string;
  daySky: boolean;
};

export type SkyBodyKey = "sun" | "moon" | "rising";

export type SkyBodyMarker = {
  key: SkyBodyKey;
  label: string;
  sign: string;
  /** 0–1 position on abstract ecliptic ring */
  angleNorm: number;
  locked: boolean;
  selectable: boolean;
};

export type SkySummaryCard = {
  key: SkyBodyKey;
  title: string;
  body: string;
  locked: boolean;
};

export type SkySegmentVM = {
  mode: "full" | "day_sky";
  markers: SkyBodyMarker[];
  cards: SkySummaryCard[];
  mapAriaLabel: string;
};

export type AstronomyExpandableCard = {
  id: string;
  title: string;
  summary: string;
  detail: string;
  locked: boolean;
  lockHint?: string;
};

export type AstronomySegmentVM = {
  intro: string;
  cards: AstronomyExpandableCard[];
  seasonalNote: string;
  observableNote: string;
  precisionFooter: string;
  daySky: boolean;
};

function formatComputedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function seasonFromMonth(month: number): string {
  // Northern-hemisphere soft framing — educational, not weather.
  if (month >= 3 && month <= 5) return "Their birth day fell in the spring sky season.";
  if (month >= 6 && month <= 8) return "Their birth day fell in the summer sky season.";
  if (month >= 9 && month <= 11) return "Their birth day fell in the autumn sky season.";
  return "Their birth day fell in the winter sky season.";
}

function bodyAngle(sign: string, longitudeDeg?: number): number {
  if (typeof longitudeDeg === "number" && Number.isFinite(longitudeDeg)) {
    return ((longitudeDeg % 360) + 360) % 360 / 360;
  }
  const signs = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
  ];
  const idx = signs.indexOf(sign);
  return idx >= 0 ? (idx + 0.5) / 12 : 0;
}

export function buildDashboardHeroVM(
  profile: BirthProfile,
  snapshot: SkySnapshot,
  childName: string,
): DashboardHeroVM {
  const reveal = buildRevealViewModel(profile, snapshot, childName);
  const placeLabel = profile.birthPlace?.label ?? "Not set";
  return {
    childName,
    essenceLine: reveal.essenceLine,
    metaCaption: reveal.metaCaption,
    timePrecisionLabel: reveal.timePrecisionLabel,
    placeLabel,
    chips: [
      { id: "day", label: "Day", complete: Boolean(profile.birthDate) },
      { id: "time", label: "Time", complete: profile.timePrecision !== "unknown" },
      { id: "place", label: "Place", complete: Boolean(profile.birthPlace) },
    ],
    mode: snapshot.mode,
    computedAtLabel: formatComputedAt(snapshot.computedAt),
    snapshotVersion: snapshot.snapshotVersion,
    engineVersion: snapshot.engineVersion,
    daySky: snapshot.mode === "day_sky",
  };
}

export function buildSkySegmentVM(snapshot: SkySnapshot): SkySegmentVM {
  const a = snapshot.astronomy;
  const daySky = snapshot.mode === "day_sky";
  const sunBody = a.bodies.find((b) => b.id === "sun");
  const moonBody = a.bodies.find((b) => b.id === "moon");

  const markers: SkyBodyMarker[] = [
    {
      key: "sun",
      label: "Sun",
      sign: a.sunSign,
      angleNorm: bodyAngle(a.sunSign, sunBody?.eclipticLongitudeDeg),
      locked: false,
      selectable: true,
    },
    {
      key: "moon",
      label: "Moon",
      sign: a.moonSign,
      angleNorm: bodyAngle(a.moonSign, moonBody?.eclipticLongitudeDeg),
      locked: false,
      selectable: true,
    },
  ];

  if (!daySky && a.risingSign) {
    markers.push({
      key: "rising",
      label: "Rising",
      sign: a.risingSign,
      angleNorm: bodyAngle(a.risingSign),
      locked: false,
      selectable: true,
    });
  } else if (daySky) {
    markers.push({
      key: "rising",
      label: "Rising",
      sign: "—",
      angleNorm: 0.05,
      locked: true,
      selectable: false,
    });
  }

  const cards: SkySummaryCard[] = [
    {
      key: "sun",
      title: "Sun",
      body: `You may notice daylight themes glowing through a ${a.sunSign} Sun — vitality, creative heat, the quiet pride of being seen. A noticing lens, never a fixed label.`,
      locked: false,
    },
    {
      key: "moon",
      title: "Moon",
      body: `Your child's emotional world is illuminated by a ${a.moonPhaseLabel} Moon resting in ${a.moonSign}, suggesting comfort often grows through belonging and gentle rhythm.`,
      locked: false,
    },
  ];

  if (!daySky && a.risingSign) {
    cards.push({
      key: "rising",
      title: "Rising",
      body: `As they meet a room, Rising ${a.risingSign} can feel like a soft doorway — how others first greet them. Measured astronomy, offered for reflection.`,
      locked: false,
    });
  } else if (daySky) {
    cards.push({
      key: "rising",
      title: "Rising",
      body: "Rising waits for birth time — optional anytime. Your Day Sky remains complete and beautiful without it.",
      locked: true,
    });
  }

  return {
    mode: snapshot.mode,
    markers,
    cards: cards.slice(0, 3),
    mapAriaLabel: daySky
      ? "Day Sky map showing Sun and Moon. Rising locked without birth time."
      : "Birth Sky map showing Sun, Moon, and Rising.",
  };
}

export function buildAstronomySegmentVM(
  profile: BirthProfile,
  snapshot: SkySnapshot,
): AstronomySegmentVM {
  const a = snapshot.astronomy;
  const daySky = snapshot.mode === "day_sky";
  const month = Number(profile.birthDate.slice(5, 7));

  const cards: AstronomyExpandableCard[] = [
    {
      id: "sun",
      title: "Sun",
      summary: `${a.sunSign}`,
      detail:
        `The Sun’s ecliptic longitude places it in ${a.sunSign} on this civil date. ` +
        `This is positional astronomy — where the Sun appears along the zodiac belt — not a prediction.`,
      locked: false,
    },
    {
      id: "moon",
      title: "Moon",
      summary: `${a.moonPhaseLabel} · ${a.moonSign}`,
      detail:
        `The Moon was in ${a.moonSign} with a ${a.moonPhaseLabel.toLowerCase()} phase. ` +
        `Phase comes from the Moon–Sun elongation; it describes sky geometry, not personality.`,
      locked: false,
    },
    {
      id: "rising",
      title: "Rising",
      summary: daySky ? "Locked · needs birth time" : (a.risingSign ?? "—"),
      detail: daySky
        ? "Rising (Ascendant) depends on exact birth time and place. Your Day Sky stays complete without it."
        : `Rising sign ${a.risingSign ?? "—"} marks the eastern horizon direction at the recorded birth moment.`,
      locked: daySky,
      lockHint: daySky ? "Add birth time anytime — no pressure." : undefined,
    },
  ];

  return {
    intro: "Positions computed from birth details — science, calmly labeled.",
    cards,
    seasonalNote: seasonFromMonth(month),
    observableNote: daySky
      ? "A clear night that day would still have held the Sun’s path and the Moon’s phase — time only refines the horizon."
      : "A clear sky near that moment would have shown these lights along their paths — approximate, never absolute weather.",
    precisionFooter: "Based on your birth details. Houses are not shown for Day Sky.",
    daySky,
  };
}
