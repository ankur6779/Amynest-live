// Age-Band system for Parent Hub
// Drives the "For {Child}" / "Explore Next Stage" two-section layout.
// Bands are deliberately fine-grained so content can scale automatically as
// the child grows. Adding a new band only requires extending AGE_BANDS and
// any per-band content maps — no UI changes needed.

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
  "0-2":   { min: 0,  max: 2  },
  "2-4":   { min: 2,  max: 4  },
  "4-6":   { min: 4,  max: 6  },
  "6-8":   { min: 6,  max: 8  },
  "8-10":  { min: 8,  max: 10 },
  "10-12": { min: 10, max: 12 },
  "12-15": { min: 12, max: 15 },
};

export function getAgeBand(years: number, months = 0): AgeBand {
  const totalYears = years + (months || 0) / 12;
  if (totalYears < 2)  return "0-2";
  if (totalYears < 4)  return "2-4";
  if (totalYears < 6)  return "4-6";
  if (totalYears < 8)  return "6-8";
  if (totalYears < 10) return "8-10";
  if (totalYears < 12) return "10-12";
  return "12-15";
}

export function getNextAgeBand(band: AgeBand): AgeBand | null {
  const i = AGE_BANDS.indexOf(band);
  if (i < 0 || i >= AGE_BANDS.length - 1) return null;
  return AGE_BANDS[i + 1];
}

/** "Age 4-6" — used in Coming Next badges. */
export function bandLabel(band: AgeBand): string {
  return `Age ${band.replace("-", "–")}`;
}

/** "4+" — used in "For Age X+" microcopy. */
export function bandLowerLabel(band: AgeBand): string {
  return `${BAND_BOUNDS[band].min}+`;
}

export function bandRangeLabel(band: AgeBand): string {
  const { min, max } = BAND_BOUNDS[band];
  return `${min}–${max} years`;
}
