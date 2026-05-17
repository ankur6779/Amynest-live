/**
 * Country-specific after-school structure templates — block order, not just labels.
 */
import type { LaunchCountry } from "./routine-country-profile.js";
import { normalizeCountryCode } from "./routine-country-profile.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";
import { parseTimeToMins } from "./routine-scheduler.js";

/** Semantic block kinds used for ordering (meals/school/sleep are pinned separately). */
export type StructureBlockKind =
  | "morning_routine"
  | "independence"
  | "snack"
  | "study"
  | "study_optional"
  | "extracurricular"
  | "outdoor"
  | "outdoor_structured"
  | "outdoor_evening"
  | "play"
  | "indoor_rest"
  | "indoor_creative"
  | "family"
  | "relax"
  | "wind_down"
  | "post_dinner_study"
  | "other";

/** UAE heat — outdoor forbidden before evening window (hard constraint). */
export const UAE_OUTDOOR_BLOCK_WINDOW: readonly [number, number] = [0, 18 * 60 + 30];
export const UAE_EVENING_OUTDOOR_WINDOW: readonly [number, number] = [18 * 60 + 30, 20 * 60];

const EXTRACURRICULAR_RE =
  /\b(soccer|football|sports practice|sports club|music|club|tuition|hobby|extracurricular)\b/i;
const OUTDOOR_RE =
  /\b(outdoor|park|playground|backyard|beach|cricket|walk|nature|garden)\b/i;
const STUDY_RE = /\b(homework|study|tuition|hausaufgaben|revision|learning)\b/i;
const SNACK_RE = /\b(snack|tiffin|drunch|after-school snack)\b/i;
const WIND_DOWN_RE = /\b(wind.?down|story|bedtime routine|calm|bath)\b/i;
const RELAX_RE = /\b(relax|free time|rest|chill)\b/i;

/** After-school segment order per launch market (indices define placement sequence). */
const COUNTRY_STRUCTURE_ORDER: Record<LaunchCountry, readonly StructureBlockKind[]> = {
  // Activity-first: snack → sports/outdoor → light homework optional → wind-down
  US: [
    "morning_routine",
    "independence",
    "snack",
    "extracurricular",
    "outdoor",
    "study_optional",
    "wind_down",
  ],
  // Family-first: snack → homework → clubs → calm evening
  UK: [
    "morning_routine",
    "independence",
    "snack",
    "study",
    "family",
    "extracurricular",
    "relax",
    "wind_down",
  ],
  // school → outdoor → snack → sports → dinner → relax
  AU: [
    "morning_routine",
    "outdoor",
    "snack",
    "extracurricular",
    "relax",
    "family",
    "wind_down",
  ],
  NZ: [
    "morning_routine",
    "outdoor",
    "snack",
    "extracurricular",
    "relax",
    "family",
    "wind_down",
  ],
  // school → lunch (pinned) → tuition → play → dinner → optional study → sleep
  IN: [
    "morning_routine",
    "study",
    "play",
    "snack",
    "outdoor_evening",
    "outdoor",
    "family",
    "study_optional",
    "wind_down",
  ],
  // school → indoor/rest → evening outdoor → dinner → family → sleep
  AE: [
    "morning_routine",
    "indoor_rest",
    "indoor_creative",
    "outdoor_evening",
    "family",
    "wind_down",
  ],
  // school → homework → structured outdoor → dinner → early wind-down
  AT: [
    "morning_routine",
    "study",
    "outdoor_structured",
    "family",
    "wind_down",
  ],
};

const WESTERN_ANGLO = new Set<LaunchCountry>(["US", "UK"]);

export function getCountryStructureOrder(country: string | LaunchCountry): readonly StructureBlockKind[] {
  return COUNTRY_STRUCTURE_ORDER[normalizeCountryCode(country)];
}

export function classifyStructureBlock(item: RoutineScheduleItem): StructureBlockKind {
  const cat = (item.category ?? "").toLowerCase();
  const act = item.activity;
  const tag = (item as { structureKind?: string }).structureKind;

  if (tag === "post_dinner_study") return "post_dinner_study";
  if (cat === "morning_routine" || /\bwake\b/i.test(act)) return "morning_routine";
  if (cat === "self_care" || /\b(get ready|independently|selbstständig|on your own)\b/i.test(act)) {
    return "independence";
  }
  if (SNACK_RE.test(act) || cat === "tiffin") return "snack";
  if (/\b(optional revision|light revision|post-dinner study)\b/i.test(act)) {
    return "study_optional";
  }
  if (STUDY_RE.test(act) || cat === "study") return "study";
  if (EXTRACURRICULAR_RE.test(act) || (cat === "exercise" && !OUTDOOR_RE.test(act))) {
    return "extracurricular";
  }
  if (/\bevening\b/i.test(act) && OUTDOOR_RE.test(act)) return "outdoor_evening";
  if (cat === "outdoor" || OUTDOOR_RE.test(act)) {
    if (/\bstructured\b/i.test(act)) return "outdoor_structured";
    return "outdoor";
  }
  if (WIND_DOWN_RE.test(act)) return "wind_down";
  if (RELAX_RE.test(act) || (cat === "rest" && !/free time/i.test(act))) return "relax";
  if (cat === "creative" || /\b(creative|crafts|basteln|drawing|puzzles)\b/i.test(act)) {
    return "indoor_creative";
  }
  if (cat === "play") return "play";
  if (cat === "family" || /\bfamily\b/i.test(act)) return "family";
  if (cat === "rest" && /indoor rest|quiet time/i.test(act)) return "indoor_rest";
  return "other";
}

function kindIndex(order: readonly StructureBlockKind[], kind: StructureBlockKind): number {
  const normalized =
    kind === "post_dinner_study" ? "study_optional" : kind;
  const idx = order.indexOf(normalized);
  return idx >= 0 ? idx : order.length + 1;
}

/**
 * Sort adaptive items by country-specific structure template (stable within kind).
 */
export function orderItemsByCountryStructure(
  items: RoutineScheduleItem[],
  country: string | LaunchCountry,
): RoutineScheduleItem[] {
  const order = getCountryStructureOrder(country);
  const indexed = items.map((item, i) => ({
    item,
    i,
    kind: classifyStructureBlock(item),
    rank: kindIndex(order, classifyStructureBlock(item)),
  }));
  indexed.sort((a, b) => a.rank - b.rank || a.i - b.i);
  return indexed.map((x) => x.item);
}

/**
 * Dissimilarity between two countries' structure templates (0 = identical, 1 = max different).
 * Launch markets should score > 0.3 vs distant cultures (e.g. US vs IN).
 */
export function differenceScore(
  countryA: string | LaunchCountry,
  countryB: string | LaunchCountry,
): number {
  const a = normalizeCountryCode(countryA);
  const b = normalizeCountryCode(countryB);
  if (a === b) return 0;

  const orderA = getCountryStructureOrder(a);
  const orderB = getCountryStructureOrder(b);
  const kinds = new Set<StructureBlockKind>([...orderA, ...orderB]);

  let total = 0;
  let pairs = 0;
  const maxSpan = Math.max(orderA.length, orderB.length);

  for (const kind of kinds) {
    const ia = orderA.indexOf(kind);
    const ib = orderB.indexOf(kind);
    if (ia >= 0 && ib >= 0) {
      total += Math.abs(ia - ib) / maxSpan;
      pairs++;
    } else if (ia >= 0 || ib >= 0) {
      total += 1;
      pairs++;
    }
  }

  if (pairs === 0) return 1;
  return Math.min(1, total / pairs);
}

/** Compare realized routine block sequences (post-schedule debug metric). */
export function routineStructureDifferenceScore(
  itemsA: RoutineScheduleItem[],
  itemsB: RoutineScheduleItem[],
): number {
  const seqA = adaptiveKindSequence(itemsA);
  const seqB = adaptiveKindSequence(itemsB);
  if (seqA.length === 0 && seqB.length === 0) return 0;
  const maxLen = Math.max(seqA.length, seqB.length, 1);
  let diff = 0;
  for (let i = 0; i < maxLen; i++) {
    if (seqA[i] !== seqB[i]) diff++;
  }
  return diff / maxLen;
}

function adaptiveKindSequence(items: RoutineScheduleItem[]): StructureBlockKind[] {
  const pinned = new Set(["meal", "tiffin", "school", "sleep"]);
  return [...items]
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time))
    .filter((it) => !pinned.has((it.category ?? "").toLowerCase()))
    .map(classifyStructureBlock);
}

export function isPreDinnerActiveBlock(item: RoutineScheduleItem): boolean {
  const kind = classifyStructureBlock(item);
  return (
    kind === "extracurricular" ||
    kind === "outdoor" ||
    kind === "outdoor_structured" ||
    kind === "outdoor_evening" ||
    kind === "play" ||
    kind === "snack" ||
    (kind === "study" && !/\b(light|optional|revision)\b/i.test(item.activity))
  );
}

export function isPostDinnerWindDown(item: RoutineScheduleItem): boolean {
  const kind = classifyStructureBlock(item);
  return kind === "wind_down" || kind === "study_optional" || kind === "relax";
}

export function usesWesternAngloStructure(country: string | LaunchCountry): boolean {
  return WESTERN_ANGLO.has(normalizeCountryCode(country));
}

/** India tuition block duration (minutes). */
export function indiaTuitionDuration(seed = 0): number {
  const options = [45, 60, 75, 90];
  return options[Math.abs(seed) % options.length]!;
}

export function isOutdoorBlockedByHeat(clockMins: number, country: string | LaunchCountry): boolean {
  if (normalizeCountryCode(country) !== "AE") return false;
  const [eveningStart] = UAE_EVENING_OUTDOOR_WINDOW;
  return clockMins < eveningStart;
}

export function clampOutdoorToEveningWindow(
  clockMins: number,
  country: string | LaunchCountry,
): number {
  if (normalizeCountryCode(country) !== "AE") return clockMins;
  if (!isOutdoorBlockedByHeat(clockMins, country)) return clockMins;
  return UAE_EVENING_OUTDOOR_WINDOW[0];
}

export const STRUCTURE_DIFFERENCE_THRESHOLD = 0.3;
/** US vs UK must stay structurally distinct (not identical anglo template). */
export const US_UK_DIFFERENCE_MIN = 0.2;
