/**
 * Server-side mirror of `artifacts/kidschedule/src/lib/age-bands.ts`.
 *
 * Lives here (instead of being imported from the web app) because the
 * api-server and kidschedule are independent pnpm packages and the
 * api-server cannot depend on the React app. Kept deliberately small —
 * if either side adds a new band, update both.
 */

export type AgeBand =
  | "0-2"
  | "2-4"
  | "4-6"
  | "6-8"
  | "8-10"
  | "10-12"
  | "12-15";

export const AGE_BANDS: AgeBand[] = [
  "0-2",
  "2-4",
  "4-6",
  "6-8",
  "8-10",
  "10-12",
  "12-15",
];

const BAND_BOUNDS: Record<AgeBand, { min: number; max: number }> = {
  "0-2": { min: 0, max: 2 },
  "2-4": { min: 2, max: 4 },
  "4-6": { min: 4, max: 6 },
  "6-8": { min: 6, max: 8 },
  "8-10": { min: 8, max: 10 },
  "10-12": { min: 10, max: 12 },
  "12-15": { min: 12, max: 15 },
};

export function getAgeBand(years: number, months = 0): AgeBand {
  const totalYears = years + (months || 0) / 12;
  if (totalYears < 2) return "0-2";
  if (totalYears < 4) return "2-4";
  if (totalYears < 6) return "4-6";
  if (totalYears < 8) return "6-8";
  if (totalYears < 10) return "8-10";
  if (totalYears < 12) return "10-12";
  return "12-15";
}

export function getNextAgeBand(band: AgeBand): AgeBand | null {
  const i = AGE_BANDS.indexOf(band);
  if (i < 0 || i >= AGE_BANDS.length - 1) return null;
  return AGE_BANDS[i + 1] ?? null;
}

export function bandIndex(band: AgeBand): number {
  return AGE_BANDS.indexOf(band);
}

export function isKnownBand(value: string | null | undefined): value is AgeBand {
  return !!value && (AGE_BANDS as readonly string[]).includes(value);
}

/**
 * Deterministic mapping from the existing 5 phonics buckets onto the 7-band
 * Parent Hub system. Phonics catalog only spans 12 months → 6 years, so it
 * never reaches bands 6-8 and above.
 */
export function phonicsBandFor(ageGroup: string): AgeBand | null {
  switch (ageGroup) {
    case "12_24m":
      return "0-2";
    case "2_3y":
    case "3_4y":
      return "2-4";
    case "4_5y":
    case "5_6y":
      return "4-6";
    default:
      return null;
  }
}

export function bandLabel(band: AgeBand): string {
  return `Age ${band.replace("-", "–")}`;
}

export function bandRangeLabel(band: AgeBand): string {
  const b = BAND_BOUNDS[band];
  return `${b.min}–${b.max} years`;
}
