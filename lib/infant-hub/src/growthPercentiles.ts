/**
 * Simplified WHO growth reference bands (approximate medians by age in months).
 * For parent reassurance — not clinical diagnosis.
 */
export type GrowthMetric = "weight" | "height" | "head";

type RefRow = { p15: number; p50: number; p85: number };

/** Weight kg by age months (boys/girls blended median-ish). */
const WEIGHT_REF: Record<number, RefRow> = {
  0: { p15: 2.8, p50: 3.3, p85: 3.9 },
  1: { p15: 3.8, p50: 4.5, p85: 5.2 },
  2: { p15: 4.7, p50: 5.6, p85: 6.4 },
  3: { p15: 5.4, p50: 6.4, p85: 7.4 },
  6: { p15: 6.4, p50: 7.5, p85: 8.8 },
  9: { p15: 7.2, p50: 8.5, p85: 9.9 },
  12: { p15: 7.8, p50: 9.2, p85: 10.8 },
  18: { p15: 8.8, p50: 10.5, p85: 12.2 },
  24: { p15: 9.5, p50: 11.5, p85: 13.5 },
};

const HEIGHT_REF: Record<number, RefRow> = {
  0: { p15: 47, p50: 50, p85: 53 },
  1: { p15: 51, p50: 54, p85: 57 },
  3: { p15: 57, p50: 60, p85: 63 },
  6: { p15: 63, p50: 66, p85: 69 },
  12: { p15: 70, p50: 74, p85: 78 },
  18: { p15: 76, p50: 81, p85: 86 },
  24: { p15: 81, p50: 86, p85: 91 },
};

const HEAD_REF: Record<number, RefRow> = {
  0: { p15: 32.5, p50: 34.5, p85: 36.5 },
  3: { p15: 38, p50: 40, p85: 42 },
  6: { p15: 41, p50: 43, p85: 45 },
  12: { p15: 44, p50: 46, p85: 48 },
  24: { p15: 46, p50: 48, p85: 50 },
};

function nearestRef(
  table: Record<number, RefRow>,
  ageMonths: number,
): RefRow {
  const keys = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  let best = keys[0]!;
  for (const k of keys) {
    if (k <= ageMonths) best = k;
    else break;
  }
  return table[best]!;
}

export type PercentileBand = "low" | "typical" | "high";

export function estimatePercentileBand(
  metric: GrowthMetric,
  value: number,
  ageMonths: number,
): PercentileBand {
  const table =
    metric === "weight"
      ? WEIGHT_REF
      : metric === "height"
        ? HEIGHT_REF
        : HEAD_REF;
  const ref = nearestRef(table, ageMonths);
  if (value < ref.p15) return "low";
  if (value > ref.p85) return "high";
  return "typical";
}

export function growthReassurance(
  metric: GrowthMetric,
  band: PercentileBand,
): string {
  const noun =
    metric === "weight" ? "weight" : metric === "height" ? "length" : "head size";
  if (band === "typical") {
    return `${noun.charAt(0).toUpperCase() + noun.slice(1)} is in a typical range for this age. Steady growth matters more than any single reading.`;
  }
  if (band === "low") {
    return `${noun.charAt(0).toUpperCase() + noun.slice(1)} is below typical — many healthy babies sit here. Mention it at your next check-up if you're concerned.`;
  }
  return `${noun.charAt(0).toUpperCase() + noun.slice(1)} is above typical — often normal genetics. Your paediatrician can confirm at the next visit.`;
}
