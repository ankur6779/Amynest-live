import type { EducationCountry, EducationStageCode, EducationStageOption } from "./types";

type AgeBand = {
  minMonths: number;
  maxMonths: number;
  stages: EducationStageCode[];
};

const STAGE_LABELS: Record<EducationStageCode, { labelKey: string; emoji: string }> = {
  at_home: { labelKey: "stage_at_home", emoji: "🏠" },
  daycare: { labelKey: "stage_daycare", emoji: "🧸" },
  playgroup: { labelKey: "stage_playgroup", emoji: "🎨" },
  nursery: { labelKey: "stage_nursery", emoji: "🌱" },
  lkg: { labelKey: "stage_lkg", emoji: "📘" },
  ukg: { labelKey: "stage_ukg", emoji: "📗" },
  preschool: { labelKey: "stage_preschool", emoji: "🎨" },
  pre_k: { labelKey: "stage_pre_k", emoji: "🖍️" },
  kindergarten: { labelKey: "stage_kindergarten", emoji: "🎒" },
  reception: { labelKey: "stage_reception", emoji: "🎒" },
  kindy: { labelKey: "stage_kindy", emoji: "🌻" },
  prep: { labelKey: "stage_prep", emoji: "📚" },
  homeschool: { labelKey: "stage_homeschool", emoji: "🏡" },
  school: { labelKey: "stage_school", emoji: "🏫" },
};

/** Per-country age bands → allowed stage codes (India spec from product). */
const COUNTRY_BANDS: Record<EducationCountry, AgeBand[]> = {
  IN: [
    { minMonths: 0, maxMonths: 23, stages: ["at_home", "daycare"] },
    { minMonths: 24, maxMonths: 35, stages: ["at_home", "daycare", "playgroup"] },
    { minMonths: 36, maxMonths: 47, stages: ["at_home", "daycare", "playgroup", "nursery"] },
    { minMonths: 48, maxMonths: 59, stages: ["at_home", "daycare", "nursery", "lkg"] },
    { minMonths: 60, maxMonths: 71, stages: ["at_home", "daycare", "lkg", "ukg"] },
    { minMonths: 72, maxMonths: 999, stages: ["homeschool", "school"] },
  ],
  US: [
    { minMonths: 0, maxMonths: 23, stages: ["at_home", "daycare"] },
    { minMonths: 24, maxMonths: 35, stages: ["at_home", "daycare", "preschool"] },
    { minMonths: 36, maxMonths: 47, stages: ["daycare", "preschool", "pre_k"] },
    { minMonths: 48, maxMonths: 59, stages: ["preschool", "pre_k", "kindergarten"] },
    { minMonths: 60, maxMonths: 71, stages: ["pre_k", "kindergarten"] },
    { minMonths: 72, maxMonths: 999, stages: ["homeschool", "school"] },
  ],
  UK: [
    { minMonths: 0, maxMonths: 23, stages: ["at_home", "daycare"] },
    { minMonths: 24, maxMonths: 59, stages: ["at_home", "daycare", "nursery"] },
    { minMonths: 60, maxMonths: 71, stages: ["nursery", "reception"] },
    { minMonths: 72, maxMonths: 999, stages: ["homeschool", "school"] },
  ],
  AU: [
    { minMonths: 0, maxMonths: 23, stages: ["at_home", "daycare"] },
    { minMonths: 24, maxMonths: 59, stages: ["at_home", "daycare", "kindy"] },
    { minMonths: 60, maxMonths: 71, stages: ["kindy", "prep"] },
    { minMonths: 72, maxMonths: 999, stages: ["homeschool", "school"] },
  ],
  DEFAULT: [
    { minMonths: 0, maxMonths: 23, stages: ["at_home", "daycare"] },
    { minMonths: 24, maxMonths: 47, stages: ["at_home", "daycare", "preschool"] },
    { minMonths: 48, maxMonths: 71, stages: ["preschool", "kindergarten"] },
    { minMonths: 72, maxMonths: 999, stages: ["homeschool", "school"] },
  ],
};

/** Minimum age (months) a stage may be selected — prevents impossible combos. */
const STAGE_MIN_MONTHS: Partial<Record<EducationStageCode, number>> = {
  playgroup: 24,
  nursery: 36,
  lkg: 48,
  ukg: 60,
  preschool: 24,
  pre_k: 36,
  kindergarten: 48,
  reception: 60,
  kindy: 24,
  prep: 60,
  school: 72,
  homeschool: 72,
};

/** Maximum age (months) for early-learning stages (not school/homeschool). */
const STAGE_MAX_MONTHS: Partial<Record<EducationStageCode, number>> = {
  playgroup: 47,
  nursery: 71,
  lkg: 71,
  ukg: 71,
  preschool: 71,
  pre_k: 71,
  kindergarten: 71,
  reception: 71,
  kindy: 71,
  prep: 71,
};

export function normalizeEducationCountry(raw?: string | null): EducationCountry {
  if (!raw?.trim()) return "DEFAULT";
  const u = raw.trim().toUpperCase();
  if (u === "GB") return "UK";
  if (u === "IN" || u === "US" || u === "UK" || u === "AU") return u;
  if (["PK", "BD", "LK", "NP"].includes(u)) return "IN";
  return "DEFAULT";
}

export function getTotalMonths(years: number, months = 0): number {
  return Math.max(0, years * 12 + months);
}

function findBand(country: EducationCountry, totalMonths: number): AgeBand | null {
  const bands = COUNTRY_BANDS[country];
  return bands.find((b) => totalMonths >= b.minMonths && totalMonths <= b.maxMonths) ?? null;
}

export function getEducationStagesForChild(
  countryRaw: string | null | undefined,
  years: number,
  months = 0,
): EducationStageOption[] {
  const country = normalizeEducationCountry(countryRaw);
  const total = getTotalMonths(years, months);
  const band = findBand(country, total);
  if (!band) return [];
  return band.stages.map((code) => ({
    code,
    labelKey: STAGE_LABELS[code].labelKey,
    emoji: STAGE_LABELS[code].emoji,
  }));
}

export function isStageAllowedForAge(
  stage: EducationStageCode,
  totalMonths: number,
  countryRaw?: string | null,
): boolean {
  const country = normalizeEducationCountry(countryRaw);
  const band = findBand(country, totalMonths);
  if (!band?.stages.includes(stage)) return false;

  const min = STAGE_MIN_MONTHS[stage] ?? 0;
  const max = STAGE_MAX_MONTHS[stage];
  if (totalMonths < min) return false;
  if (max != null && totalMonths > max && stage !== "school" && stage !== "homeschool") {
    return false;
  }
  return true;
}

export function isInfantAge(totalMonths: number): boolean {
  return totalMonths < 24;
}

export function requiresClassSelection(stage: EducationStageCode, totalMonths: number): boolean {
  return stage === "school" && totalMonths >= 72;
}

export function requiresScheduleQuestion(stage: EducationStageCode, totalMonths: number): boolean {
  return stage === "school" && totalMonths >= 72;
}

export function shouldAskEducationStage(totalMonths: number): boolean {
  return true;
}

export function shouldAskWakeSleepAfterStage(_stage: EducationStageCode): boolean {
  return true;
}
