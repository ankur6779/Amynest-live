/**
 * Build kundli graha list from persisted astronomy — never invents houses.
 */

import type { AstronomyData, PlanetHouseMap } from "../domain/models/birth-profile";
import type { KundliBody, KundliGrahaKey } from "../components/north-indian-kundli";

const GRAHAS: Array<{ id: KundliGrahaKey; label: string }> = [
  { id: "sun", label: "Sun" },
  { id: "moon", label: "Moon" },
  { id: "mars", label: "Mars" },
  { id: "mercury", label: "Mercury" },
  { id: "jupiter", label: "Jupiter" },
  { id: "venus", label: "Venus" },
  { id: "saturn", label: "Saturn" },
  { id: "rahu", label: "Rahu" },
  { id: "ketu", label: "Ketu" },
];

function placement(
  astronomy: AstronomyData,
  id: KundliGrahaKey,
): {
  sign: string;
  eclipticLongitudeDeg: number;
  degreeInSign?: number;
  retrograde?: boolean;
} | null {
  const named = astronomy[id];
  if (named && typeof named.eclipticLongitudeDeg === "number" && named.sign) {
    return named;
  }
  const deg = astronomy.planetDegrees?.[id];
  if (deg && typeof deg.eclipticLongitudeDeg === "number") return deg;
  const body = astronomy.bodies?.find((b) => b.id === id);
  if (body) {
    return { sign: body.sign, eclipticLongitudeDeg: body.eclipticLongitudeDeg };
  }
  return null;
}

export function canRenderKundliFromAstronomy(astronomy: AstronomyData): {
  canRender: boolean;
  reason: string | null;
} {
  const completeness = astronomy.chartCompleteness;
  if (completeness) {
    return {
      canRender: Boolean(completeness.canRenderKundli),
      reason: completeness.canRenderKundli
        ? null
        : completeness.status === "day_sky"
          ? "Birth time is needed for Lagna and houses. Day Sky stays meaningful — kundli waits for time and place."
          : completeness.fallbackUsed
            ? "Astronomy fell back to a simplified engine without houses. Regenerate when the full chart service is available — we will not invent placements."
            : "A complete house chart is not available yet. Add birth time and place, then regenerate.",
    };
  }
  const map = astronomy.planetHouseMap;
  const houses = astronomy.houses?.cusps?.length ?? 0;
  if (astronomy.precision?.timePrecision === "unknown" || !astronomy.risingSign) {
    return {
      canRender: false,
      reason:
        "Birth time is needed for Lagna and houses. Day Sky stays meaningful — kundli waits for time and place.",
    };
  }
  if (astronomy.metadata?.fallbackUsed) {
    return {
      canRender: false,
      reason:
        "Astronomy fell back to a simplified engine without houses. Regenerate when the full chart service is available — we will not invent placements.",
    };
  }
  if (houses !== 12 || !map) {
    return {
      canRender: false,
      reason: "House cusps are incomplete. Regenerate the sky with birth time and place.",
    };
  }
  return { canRender: true, reason: null };
}

export function buildKundliBodies(
  astronomy: AstronomyData,
  opts?: { childName?: string },
): KundliBody[] {
  const map = (astronomy.planetHouseMap ?? {}) as PlanetHouseMap;
  const details = astronomy.planetDetails ?? [];
  const child = opts?.childName ?? "your child";

  return GRAHAS.map(({ id, label }) => {
    const detail = details.find((d) => d.id === id);
    const p = placement(astronomy, id);
    const house =
      typeof detail?.house === "number"
        ? detail.house
        : typeof map[id] === "number"
          ? map[id]
          : null;
    const sign = detail?.sign ?? p?.sign ?? "—";
    const deg =
      detail?.degreeInSign ??
      p?.degreeInSign ??
      (p ? ((p.eclipticLongitudeDeg % 30) + 30) % 30 : null);
    const story =
      detail?.parentingInterpretation ??
      (house != null
        ? `${label} sits in house ${house} in ${sign} for ${child}.`
        : undefined);

    return {
      key: id,
      label,
      sign,
      house,
      degreeLabel: deg != null ? `${deg.toFixed(1)}°` : undefined,
      retrograde: detail?.retrograde ?? Boolean(p?.retrograde) ?? Boolean(astronomy.retrograde?.includes(id)),
      combust: detail?.combust ?? false,
      nakshatra: detail?.nakshatra ?? astronomy.planetNakshatra?.[id]?.name ?? null,
      story,
      locked: house == null && (!p || sign === "—"),
    };
  });
}
