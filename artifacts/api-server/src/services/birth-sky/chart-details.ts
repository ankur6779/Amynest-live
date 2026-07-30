/**
 * Enrich AstronomyData with Vedic house/planet detail layers for kundli, AI, and PDF.
 * Additive only — never invents houses or planet positions.
 */

import type { AstronomyData, PlanetBodyId } from "./ephemeris-port.js";

export const CHART_DETAILS_VERSION = "birth_sky_chart_details/1.0.0" as const;

export const VEDIC_GRAHAS = [
  "sun",
  "moon",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
  "rahu",
  "ketu",
] as const;

export type VedicGrahaId = (typeof VEDIC_GRAHAS)[number];

const SIGNS = [
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
] as const;

const SIGN_LORDS: Record<(typeof SIGNS)[number], string> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter",
};

const HOUSE_META: Record<
  number,
  { name: string; sanskrit: string; meaning: string; strengths: string; challenges: string }
> = {
  1: {
    name: "Self & Presence",
    sanskrit: "Lagna / Tanu Bhava",
    meaning: "How the child meets the world — vitality, temperament, and first impressions.",
    strengths: "Natural presence and self-expression when supported without pressure.",
    challenges: "Sensitivity to comparison; needs room to discover their own pace.",
  },
  2: {
    name: "Security & Values",
    sanskrit: "Dhana Bhava",
    meaning: "Family security, speech tone, early values, and what feels like enough.",
    strengths: "Steadying rituals and clear family values build calm confidence.",
    challenges: "Scarcity talk or harsh speech can land harder than intended.",
  },
  3: {
    name: "Curiosity & Courage",
    sanskrit: "Sahaja Bhava",
    meaning: "Siblings, peers, short journeys, courage to try, and everyday learning.",
    strengths: "Hands-on practice and sibling/peer play feed growth.",
    challenges: "Restlessness when curiosity has no safe outlet.",
  },
  4: {
    name: "Home & Roots",
    sanskrit: "Sukha Bhava",
    meaning: "Emotional home base, comfort, belonging, and inner quiet.",
    strengths: "Predictable home rhythms restore the nervous system.",
    challenges: "Disruption at home can show up as clinginess or withdrawal.",
  },
  5: {
    name: "Play & Creativity",
    sanskrit: "Putra Bhava",
    meaning: "Joy, creativity, learning through play, and being warmly seen.",
    strengths: "Praise for effort and creative time unlock engagement.",
    challenges: "Performance pressure can dim natural playfulness.",
  },
  6: {
    name: "Habits & Care",
    sanskrit: "Ripu / Shatru Bhava",
    meaning: "Daily habits, health routines, service, and small challenges.",
    strengths: "Tiny consistent habits beat intense bursts.",
    challenges: "Overwhelm when routines feel like endless correction.",
  },
  7: {
    name: "Partnership",
    sanskrit: "Kalatra Bhava",
    meaning: "One-to-one bonds, fairness, and how they meet others as equals.",
    strengths: "Modeling respectful negotiation teaches partnership.",
    challenges: "People-pleasing or conflict-avoidance without coaching.",
  },
  8: {
    name: "Depth & Transformation",
    sanskrit: "Ayu / Randhra Bhava",
    meaning: "Emotional depth, privacy, and growing through change.",
    strengths: "Trusted adults help them name big feelings safely.",
    challenges: "Secrets or fear-based talk around change can intensify worry.",
  },
  9: {
    name: "Meaning & Mentors",
    sanskrit: "Dharma Bhava",
    meaning: "Bigger questions, mentors, beliefs, and guided exploration.",
    strengths: "Stories and mentors expand their moral imagination.",
    challenges: "Dogmatic answers can shut down honest questions.",
  },
  10: {
    name: "Contribution & Visibility",
    sanskrit: "Karma Bhava",
    meaning: "Public role, responsibility, and how effort becomes contribution.",
    strengths: "Age-right responsibility builds quiet pride.",
    challenges: "Status pressure or adult ambition projected onto the child.",
  },
  11: {
    name: "Belonging & Hopes",
    sanskrit: "Labha Bhava",
    meaning: "Friends, groups, hopes, and finding their people.",
    strengths: "Community belonging fuels motivation.",
    challenges: "Exclusion or comparison within groups can sting.",
  },
  12: {
    name: "Rest & Inner World",
    sanskrit: "Vyaya Bhava",
    meaning: "Solitude, restoration, imagination, and letting go.",
    strengths: "Quiet time and soft endings help them reset.",
    challenges: "Overstimulation without recovery windows.",
  },
};

const PLANET_META: Record<
  VedicGrahaId,
  { label: string; meaning: string; parenting: string }
> = {
  sun: {
    label: "Sun",
    meaning: "Vitality, confidence, and the wish to be warmly recognized.",
    parenting: "Offer genuine notice without turning every moment into performance.",
  },
  moon: {
    label: "Moon",
    meaning: "Emotional weather, comfort needs, and the felt sense of safety.",
    parenting: "Protect soft landings — routines and co-regulation matter more than lectures.",
  },
  mars: {
    label: "Mars",
    meaning: "Drive, courage, heat, and the need to move energy through the body.",
    parenting: "Channel intensity into play, sports, and clear boundaries — never shame the fire.",
  },
  mercury: {
    label: "Mercury",
    meaning: "Curiosity, speech, learning style, and playful mental agility.",
    parenting: "Answer questions with questions; short, vivid explanations beat long lectures.",
  },
  jupiter: {
    label: "Jupiter",
    meaning: "Growth, optimism, meaning-making, and expansive learning.",
    parenting: "Feed big questions and gentle wisdom stories without moralizing.",
  },
  venus: {
    label: "Venus",
    meaning: "Affection, aesthetics, harmony, and what feels lovely or fair.",
    parenting: "Beauty, music, and kind tone teach as much as rules.",
  },
  saturn: {
    label: "Saturn",
    meaning: "Patience, structure, responsibility, and earned confidence.",
    parenting: "Small reliable responsibilities build dignity; harsh criticism freezes growth.",
  },
  rahu: {
    label: "Rahu",
    meaning: "Hunger for the new, unconventional paths, and intense focus spikes.",
    parenting: "Guide novelty with safety rails — curiosity without chaos.",
  },
  ketu: {
    label: "Ketu",
    meaning: "Inwardness, detachment from noise, and quiet competence.",
    parenting: "Honor solitude and don’t force constant social performance.",
  },
};

/** Classical combust orbs (degrees from Sun). Nodes/Sun never combust. */
const COMBUST_ORBS: Partial<Record<VedicGrahaId, number>> = {
  moon: 12,
  mars: 17,
  mercury: 14,
  jupiter: 11,
  venus: 10,
  saturn: 15,
};

export type ChartCompletenessStatus =
  | "complete"
  | "day_sky"
  | "incomplete_fallback"
  | "missing_place"
  | "missing_houses"
  | "legacy";

export type ChartCompleteness = {
  status: ChartCompletenessStatus;
  canRenderKundli: boolean;
  canExportPdf: boolean;
  reasons: string[];
  fallbackUsed: boolean;
  houseCount: number;
  grahaHouseCount: number;
};

export type HouseDetail = {
  house: number;
  name: string;
  sanskrit: string;
  sign: string;
  lord: string;
  planets: VedicGrahaId[];
  meaning: string;
  strengths: string;
  challenges: string;
  /** Deterministic interpretation for AI/PDF — not live LLM. */
  aiInterpretation: string;
  startLongitudeDeg: number;
  endLongitudeDeg: number;
};

export type PlanetDetail = {
  id: VedicGrahaId;
  label: string;
  sign: string;
  house: number | null;
  eclipticLongitudeDeg: number;
  degreeInSign: number | null;
  nakshatra: string | null;
  pada: number | null;
  nakshatraLord: string | null;
  retrograde: boolean;
  combust: boolean;
  combustOrbDeg: number | null;
  meaning: string;
  parentingInterpretation: string;
};

export type ChartDetailsBundle = {
  chartDetailsVersion: typeof CHART_DETAILS_VERSION;
  completeness: ChartCompleteness;
  houseDetails: HouseDetail[];
  planetDetails: PlanetDetail[];
  lagna: {
    sign: string | null;
    eclipticLongitudeDeg: number | null;
    degreeInSign: number | null;
  };
};

function angularDistanceDeg(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

function normalizeSign(sign: string | null | undefined): (typeof SIGNS)[number] | null {
  if (!sign) return null;
  const hit = SIGNS.find((s) => s.toLowerCase() === sign.toLowerCase());
  return hit ?? null;
}

function placementOf(
  astronomy: AstronomyData,
  id: VedicGrahaId,
): {
  eclipticLongitudeDeg: number;
  sign: string;
  retrograde?: boolean;
  degreeInSign?: number;
} | null {
  const named = astronomy[id as keyof AstronomyData];
  if (named && typeof named === "object" && "eclipticLongitudeDeg" in named) {
    const p = named as {
      eclipticLongitudeDeg: number;
      sign: string;
      retrograde?: boolean;
      degreeInSign?: number;
    };
    if (typeof p.eclipticLongitudeDeg === "number" && typeof p.sign === "string") return p;
  }
  const fromDegrees = astronomy.planetDegrees?.[id];
  if (fromDegrees && typeof fromDegrees.eclipticLongitudeDeg === "number") {
    return fromDegrees;
  }
  const body = astronomy.bodies?.find((b) => b.id === id);
  if (body) {
    return {
      eclipticLongitudeDeg: body.eclipticLongitudeDeg,
      sign: body.sign,
    };
  }
  return null;
}

export function isCombust(
  planetId: VedicGrahaId,
  planetLon: number,
  sunLon: number,
): { combust: boolean; orbDeg: number | null } {
  const limit = COMBUST_ORBS[planetId];
  if (limit == null) return { combust: false, orbDeg: null };
  const dist = angularDistanceDeg(planetLon, sunLon);
  return { combust: dist <= limit, orbDeg: dist };
}

export function evaluateChartCompleteness(astronomy: AstronomyData): ChartCompleteness {
  const reasons: string[] = [];
  const fallbackUsed = Boolean(astronomy.metadata?.fallbackUsed);
  const cusps = astronomy.houses?.cusps ?? [];
  const houseCount = cusps.length;
  const map = astronomy.planetHouseMap ?? {};
  const grahaHouseCount = VEDIC_GRAHAS.filter((g) => typeof map[g as PlanetBodyId] === "number").length;
  const placeProvided = Boolean(astronomy.precision?.placeProvided);
  const timeUnknown = astronomy.precision?.timePrecision === "unknown";

  if (timeUnknown || astronomy.risingSign == null) {
    reasons.push("birth_time_unavailable");
    return {
      status: "day_sky",
      canRenderKundli: false,
      canExportPdf: false,
      reasons,
      fallbackUsed,
      houseCount,
      grahaHouseCount,
    };
  }
  if (fallbackUsed) {
    reasons.push("lite_fallback_used");
  }
  if (!placeProvided) {
    reasons.push("birth_place_missing");
    return {
      status: "missing_place",
      canRenderKundli: false,
      canExportPdf: false,
      reasons,
      fallbackUsed,
      houseCount,
      grahaHouseCount,
    };
  }
  if (houseCount !== 12) {
    reasons.push("houses_incomplete");
    return {
      status: fallbackUsed ? "incomplete_fallback" : "missing_houses",
      canRenderKundli: false,
      canExportPdf: false,
      reasons,
      fallbackUsed,
      houseCount,
      grahaHouseCount,
    };
  }
  if (grahaHouseCount < 9) {
    reasons.push("planet_house_map_incomplete");
    return {
      status: fallbackUsed ? "incomplete_fallback" : "missing_houses",
      canRenderKundli: false,
      canExportPdf: false,
      reasons,
      fallbackUsed,
      houseCount,
      grahaHouseCount,
    };
  }
  if (!astronomy.sunSign || !astronomy.moonSign || !astronomy.risingSign) {
    reasons.push("core_signs_missing");
    return {
      status: "legacy",
      canRenderKundli: false,
      canExportPdf: false,
      reasons,
      fallbackUsed,
      houseCount,
      grahaHouseCount,
    };
  }
  // Cross-check rising vs house 1 / ascendant — mismatches block PDF.
  const h1 = cusps.find((c) => c.house === 1);
  if (h1 && normalizeSign(h1.sign) !== normalizeSign(astronomy.risingSign)) {
    reasons.push("lagna_house1_mismatch");
  }
  const ascSign = normalizeSign(astronomy.ascendant?.sign ?? null);
  if (ascSign && ascSign !== normalizeSign(astronomy.risingSign)) {
    reasons.push("ascendant_rising_mismatch");
  }

  if (fallbackUsed) {
    return {
      status: "incomplete_fallback",
      canRenderKundli: houseCount === 12 && grahaHouseCount >= 9,
      canExportPdf: false,
      reasons: reasons.length ? reasons : ["lite_fallback_used"],
      fallbackUsed,
      houseCount,
      grahaHouseCount,
    };
  }

  const hasMismatch = reasons.some((r) => r.endsWith("_mismatch"));
  return {
    status: hasMismatch ? "legacy" : "complete",
    canRenderKundli: true,
    canExportPdf: !hasMismatch,
    reasons,
    fallbackUsed,
    houseCount,
    grahaHouseCount,
  };
}

function planetsInHouse(
  map: NonNullable<AstronomyData["planetHouseMap"]>,
  house: number,
): VedicGrahaId[] {
  return VEDIC_GRAHAS.filter((g) => map[g as PlanetBodyId] === house);
}

export function buildChartDetails(astronomy: AstronomyData): ChartDetailsBundle {
  const completeness = evaluateChartCompleteness(astronomy);
  const map = astronomy.planetHouseMap ?? {};
  const sunLon =
    placementOf(astronomy, "sun")?.eclipticLongitudeDeg ??
    astronomy.bodies?.find((b) => b.id === "sun")?.eclipticLongitudeDeg ??
    0;

  const houseDetails: HouseDetail[] = [];
  const cusps = astronomy.houses?.cusps ?? [];
  if (cusps.length === 12) {
    for (const cusp of [...cusps].sort((a, b) => a.house - b.house)) {
      const meta = HOUSE_META[cusp.house]!;
      const sign = normalizeSign(cusp.sign)?.toString() ?? cusp.sign;
      const lord = SIGN_LORDS[sign as (typeof SIGNS)[number]] ?? "Unknown";
      const planets = planetsInHouse(map, cusp.house);
      const planetLabels = planets.map((p) => PLANET_META[p].label).join(", ");
      const aiInterpretation =
        planets.length === 0
          ? `House ${cusp.house} (${meta.name}) in ${sign} is currently empty of grahas — themes of ${meta.sanskrit} still color the chart through the house lord (${lord}).`
          : `House ${cusp.house} (${meta.name}) in ${sign} hosts ${planetLabels}. Lord ${lord} stewards this bhava; notice ${meta.meaning}`;

      houseDetails.push({
        house: cusp.house,
        name: meta.name,
        sanskrit: meta.sanskrit,
        sign,
        lord,
        planets,
        meaning: meta.meaning,
        strengths: meta.strengths,
        challenges: meta.challenges,
        aiInterpretation,
        startLongitudeDeg: cusp.startLongitudeDeg,
        endLongitudeDeg: cusp.endLongitudeDeg,
      });
    }
  }

  const planetDetails: PlanetDetail[] = [];
  for (const id of VEDIC_GRAHAS) {
    const p = placementOf(astronomy, id);
    if (!p) continue;
    const nak = astronomy.planetNakshatra?.[id] ?? (id === "moon" ? astronomy.nakshatra : null);
    const combustInfo = isCombust(id, p.eclipticLongitudeDeg, sunLon);
    const house = typeof map[id as PlanetBodyId] === "number" ? (map[id as PlanetBodyId] as number) : null;
    const meta = PLANET_META[id];
    const parenting =
      house != null
        ? `${meta.parenting} Currently in house ${house} (${HOUSE_META[house]?.name ?? "bhava"}) in ${p.sign}.`
        : meta.parenting;

    planetDetails.push({
      id,
      label: meta.label,
      sign: p.sign,
      house,
      eclipticLongitudeDeg: p.eclipticLongitudeDeg,
      degreeInSign:
        typeof p.degreeInSign === "number"
          ? p.degreeInSign
          : ((p.eclipticLongitudeDeg % 30) + 30) % 30,
      nakshatra: nak?.name ?? null,
      pada: nak?.pada ?? null,
      nakshatraLord: nak?.lord ?? null,
      retrograde: Boolean(p.retrograde) || Boolean(astronomy.retrograde?.includes(id)),
      combust: combustInfo.combust,
      combustOrbDeg: combustInfo.orbDeg,
      meaning: meta.meaning,
      parentingInterpretation: parenting,
    });
  }

  return {
    chartDetailsVersion: CHART_DETAILS_VERSION,
    completeness,
    houseDetails,
    planetDetails,
    lagna: {
      sign: astronomy.risingSign ?? astronomy.ascendant?.sign ?? null,
      eclipticLongitudeDeg: astronomy.ascendant?.eclipticLongitudeDeg ?? null,
      degreeInSign: astronomy.ascendant?.degreeInSign ?? null,
    },
  };
}

/** Attach chart details onto astronomy jsonb (additive). */
export function attachChartDetails(astronomy: AstronomyData): AstronomyData {
  const details = buildChartDetails(astronomy);
  return {
    ...astronomy,
    houseDetails: details.houseDetails,
    planetDetails: details.planetDetails,
    chartCompleteness: details.completeness,
    chartDetailsVersion: details.chartDetailsVersion,
    lagna: details.lagna,
  } as AstronomyData;
}
