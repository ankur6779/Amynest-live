/**
 * Country Routine Profile Engine — deep localization for launch markets.
 *
 * USA, UK, Australia, New Zealand, Austria, UAE, India
 */

export type LaunchCountry = "US" | "UK" | "AU" | "NZ" | "AT" | "AE" | "IN";

export type CultureIntensity = "high" | "medium" | "low";

export type MealPattern = "indian" | "western" | "mixed" | "middle_eastern";

/** Clock-minute range [start, end] inclusive. */
export type MinuteWindow = readonly [number, number];

export type CountryRoutineProfile = {
  country: LaunchCountry;
  wakeWindow: MinuteWindow;
  sleepWindow: MinuteWindow;
  dinnerWindow: MinuteWindow;
  schoolEndTimeRange: MinuteWindow;
  extracurricularCulture: CultureIntensity;
  outdoorPreference: CultureIntensity;
  academicIntensity: CultureIntensity;
  independenceLevel: CultureIntensity;
  mealPattern: MealPattern;
};

export type CountryLabelPack = {
  extracurricular: string;
  outdoorPlay: string;
  studyBlock: string;
  independenceMorning: string;
  independenceEvening: string;
  familyTime: string;
  indoorCreative: string;
};

const M = (h: number, min = 0): number => h * 60 + min;

const PROFILES: Record<LaunchCountry, CountryRoutineProfile> = {
  US: {
    country: "US",
    wakeWindow: [M(6, 30), M(8, 0)],
    sleepWindow: [M(20, 0), M(21, 30)],
    dinnerWindow: [M(17, 30), M(19, 0)],
    schoolEndTimeRange: [M(14, 0), M(15, 30)],
    extracurricularCulture: "high",
    outdoorPreference: "medium",
    academicIntensity: "medium",
    independenceLevel: "high",
    mealPattern: "western",
  },
  UK: {
    country: "UK",
    wakeWindow: [M(7, 0), M(8, 0)],
    sleepWindow: [M(19, 30), M(21, 0)],
    dinnerWindow: [M(17, 30), M(19, 30)],
    schoolEndTimeRange: [M(15, 0), M(16, 0)],
    extracurricularCulture: "high",
    outdoorPreference: "medium",
    academicIntensity: "medium",
    independenceLevel: "medium",
    mealPattern: "western",
  },
  AU: {
    country: "AU",
    wakeWindow: [M(7, 0), M(7, 30)],
    sleepWindow: [M(19, 30), M(20, 30)],
    dinnerWindow: [M(17, 30), M(19, 0)],
    schoolEndTimeRange: [M(15, 0), M(16, 0)],
    extracurricularCulture: "high",
    outdoorPreference: "high",
    academicIntensity: "medium",
    independenceLevel: "medium",
    mealPattern: "western",
  },
  NZ: {
    country: "NZ",
    wakeWindow: [M(7, 0), M(7, 30)],
    sleepWindow: [M(19, 30), M(20, 30)],
    dinnerWindow: [M(17, 30), M(19, 0)],
    schoolEndTimeRange: [M(15, 0), M(16, 0)],
    extracurricularCulture: "high",
    outdoorPreference: "high",
    academicIntensity: "medium",
    independenceLevel: "medium",
    mealPattern: "western",
  },
  AT: {
    country: "AT",
    wakeWindow: [M(7, 0), M(7, 30)],
    sleepWindow: [M(19, 0), M(20, 30)],
    dinnerWindow: [M(17, 30), M(19, 0)],
    schoolEndTimeRange: [M(13, 0), M(14, 30)],
    extracurricularCulture: "medium",
    outdoorPreference: "medium",
    academicIntensity: "high",
    independenceLevel: "medium",
    mealPattern: "mixed",
  },
  AE: {
    country: "AE",
    wakeWindow: [M(6, 30), M(7, 30)],
    sleepWindow: [M(21, 0), M(22, 30)],
    dinnerWindow: [M(20, 0), M(22, 30)],
    schoolEndTimeRange: [M(14, 0), M(15, 0)],
    extracurricularCulture: "medium",
    outdoorPreference: "low",
    academicIntensity: "medium",
    independenceLevel: "low",
    mealPattern: "middle_eastern",
  },
  IN: {
    country: "IN",
    wakeWindow: [M(6, 30), M(7, 30)],
    sleepWindow: [M(21, 0), M(22, 0)],
    dinnerWindow: [M(20, 0), M(22, 0)],
    schoolEndTimeRange: [M(14, 30), M(16, 0)],
    extracurricularCulture: "low",
    outdoorPreference: "medium",
    academicIntensity: "high",
    independenceLevel: "low",
    mealPattern: "indian",
  },
};

const LABELS: Record<LaunchCountry, CountryLabelPack> = {
  US: {
    extracurricular: "Soccer practice",
    outdoorPlay: "Park playdate",
    studyBlock: "Homework & self study",
    independenceMorning: "Get ready on your own",
    independenceEvening: "Pack backpack for tomorrow",
    familyTime: "Family dinner & chat",
    indoorCreative: "Indoor creative play",
  },
  UK: {
    extracurricular: "Football club",
    outdoorPlay: "After-school outdoor play",
    studyBlock: "Homework time",
    independenceMorning: "Get dressed independently",
    independenceEvening: "Tidy room before bed",
    familyTime: "Tea time together",
    indoorCreative: "Indoor crafts & puzzles",
  },
  AU: {
    extracurricular: "Sports practice",
    outdoorPlay: "Backyard cricket or playground",
    studyBlock: "Reading & homework",
    independenceMorning: "Morning routine — self care",
    independenceEvening: "Lay out clothes for tomorrow",
    familyTime: "Family BBQ or dinner",
    indoorCreative: "Rainy-day creative corner",
  },
  NZ: {
    extracurricular: "Sports practice",
    outdoorPlay: "Beach walk & nature play",
    studyBlock: "Reading & homework",
    independenceMorning: "Morning routine — self care",
    independenceEvening: "Pack school bag",
    familyTime: "Family dinner together",
    indoorCreative: "Indoor creative play",
  },
  AT: {
    extracurricular: "Music or sports club",
    outdoorPlay: "Structured outdoor time",
    studyBlock: "Hausaufgaben (homework)",
    independenceMorning: "Morning routine — selbstständig",
    independenceEvening: "Prepare school materials",
    familyTime: "Family Abendessen",
    indoorCreative: "Indoor Basteln & Lesen",
  },
  AE: {
    extracurricular: "Indoor activity club",
    outdoorPlay: "Evening outdoor walk",
    studyBlock: "Study time",
    independenceMorning: "Morning routine with parent",
    independenceEvening: "Wind-down with family",
    familyTime: "Family time",
    indoorCreative: "Indoor play",
  },
  IN: {
    extracurricular: "Tuition / hobby class",
    outdoorPlay: "Evening park time",
    studyBlock: "Tuition & study time",
    independenceMorning: "Morning routine with parent help",
    independenceEvening: "Revision with parent",
    familyTime: "Family dinner & stories",
    indoorCreative: "Indoor drawing & puzzles",
  },
};

const COUNTRY_ALIASES: Record<string, LaunchCountry> = {
  US: "US",
  USA: "US",
  "UNITED STATES": "US",
  "UNITED STATES OF AMERICA": "US",
  UK: "UK",
  GB: "UK",
  "GREAT BRITAIN": "UK",
  "UNITED KINGDOM": "UK",
  AU: "AU",
  AUS: "AU",
  AUSTRALIA: "AU",
  NZ: "NZ",
  "NEW ZEALAND": "NZ",
  AT: "AT",
  AUT: "AT",
  AUSTRIA: "AT",
  AE: "AE",
  UAE: "AE",
  "UNITED ARAB EMIRATES": "AE",
  IN: "IN",
  IND: "IN",
  INDIA: "IN",
};

/** Normalize free-text / ISO country into a launch-market code. */
export function normalizeCountryCode(country: string | null | undefined): LaunchCountry {
  if (!country?.trim()) return "IN";
  const key = country.trim().toUpperCase();
  if (key in PROFILES) return key as LaunchCountry;
  return COUNTRY_ALIASES[key] ?? "IN";
}

export function getCountryRoutineProfile(
  country: string | null | undefined,
): CountryRoutineProfile {
  return PROFILES[normalizeCountryCode(country)];
}

export function getCountryLabelPack(country: string | null | undefined): CountryLabelPack {
  return LABELS[normalizeCountryCode(country)];
}

/** Midpoint of a minute window — useful for default anchor hints. */
export function windowMidpoint(win: MinuteWindow): number {
  return Math.round((win[0] + win[1]) / 2);
}

export function clampToWindow(mins: number, win: MinuteWindow): number {
  return Math.max(win[0], Math.min(win[1], mins));
}
