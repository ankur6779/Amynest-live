export type AgeBandId =
  | "under_1"
  | "y1"
  | "y2"
  | "y3"
  | "y4"
  | "y5"
  | "y6"
  | "y7"
  | "y8_plus";

/** Map onboarding age-band selection to a stable persisted id. */
export function ageBandIdFromYearsMonths(years: number, months: number): AgeBandId {
  if (years === 0) return "under_1";
  if (years >= 8) return "y8_plus";
  return `y${years}` as AgeBandId;
}

export function yearsMonthsFromAgeBand(band: string): { years: number; months: number } {
  if (band === "under_1") return { years: 0, months: 6 };
  if (band === "y8_plus") return { years: 8, months: 0 };
  const match = /^y(\d+)$/.exec(band);
  if (match) return { years: Number(match[1]), months: 0 };
  return { years: 0, months: 6 };
}

/** Approximate DOB from age — used when exact birthday is unknown. */
export function approxDobFromAge(
  years: number,
  months: number,
  referenceDate: Date = new Date(),
): string {
  const ref = referenceDate;
  const born = new Date(
    ref.getFullYear() - years,
    ref.getMonth() - months,
    Math.min(ref.getDate(), 28),
  );
  return born.toISOString().split("T")[0]!;
}

/**
 * Resolve DOB for routines and content orchestration.
 * Priority: exact DOB → estimated DOB from age → age-band fallback.
 */
export function resolveChildDob(input: {
  dob?: string | null;
  age?: number | null;
  ageMonths?: number | null;
  selectedAgeBand?: string | null;
}): string {
  const trimmed = input.dob?.trim();
  if (trimmed) return trimmed;

  if (input.selectedAgeBand) {
    const fromBand = yearsMonthsFromAgeBand(input.selectedAgeBand);
    return approxDobFromAge(fromBand.years, fromBand.months);
  }

  const years = input.age ?? 0;
  const months = input.ageMonths ?? 0;
  if (years > 0 || months > 0) {
    return approxDobFromAge(years, months);
  }

  return approxDobFromAge(4, 0);
}
