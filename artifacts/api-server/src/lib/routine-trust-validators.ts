/**
 * Blocking trust validators — sleep anchor, dinner, infant feeding structure.
 * Failures are HARD (reject / revert), not soft warnings.
 */
import type { AgeGroup } from "./routine-templates.js";
import {
  getAgeGroup,
  isAdultMealBlock,
  isFeedingBlock,
  isOptionalNightFeed,
  isSoftMealBlock,
  type FeedingAgeGroup,
  validateAgeFeedingIntegration,
} from "./routine-age-feeding.js";
import type { LaunchCountry } from "./routine-country-profile.js";
import { getCountryRoutineProfile } from "./routine-country-profile.js";
import {
  isBedtimeSleepItem,
  parseTimeToMins,
  type RoutineScheduleItem,
} from "./routine-scheduler.js";

export type TrustValidationResult = {
  valid: boolean;
  errors: string[];
};

export type TrustValidationOpts = {
  wakeMins: number;
  sleepMins: number;
  ageGroup?: AgeGroup;
  ageInMonths?: number;
  country?: LaunchCountry | string;
  hasSchool?: boolean;
};

/** Age-appropriate bedtime window (minutes from midnight). */
const BEDTIME_WINDOW: Record<AgeGroup, readonly [number, number]> = {
  infant: [18 * 60, 21 * 60 + 30],
  toddler: [19 * 60, 21 * 60 + 30],
  preschool: [19 * 60, 22 * 60],
  early_school: [19 * 60 + 30, 22 * 60 + 30],
  pre_teen: [20 * 60, 23 * 60],
};

function isDinnerBlock(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  return cat === "meal" && /\bdinner\b/i.test(item.activity);
}

function resolveAgeGroup(opts: TrustValidationOpts): AgeGroup {
  if (opts.ageGroup) return opts.ageGroup;
  const m = opts.ageInMonths ?? 96;
  if (m < 12) return "infant";
  if (m < 36) return "toddler";
  if (m < 60) return "preschool";
  if (m < 144) return "early_school";
  return "pre_teen";
}

function dinnerRequired(opts: TrustValidationOpts): boolean {
  const group = resolveAgeGroup(opts);
  if (group === "infant") return false;
  return (opts.ageInMonths ?? 36) >= 36;
}

/**
 * Exactly one bedtime anchor; must follow dinner when dinner exists; age-appropriate time.
 */
export function validateRequiredSleepAnchor(
  items: RoutineScheduleItem[],
  opts: TrustValidationOpts,
): TrustValidationResult {
  const errors: string[] = [];
  const bedtimeItems = items.filter(isBedtimeSleepItem);

  if (bedtimeItems.length === 0) {
    errors.push("trust-sleep: missing bedtime sleep block");
  } else if (bedtimeItems.length > 1) {
    errors.push(
      `trust-sleep: expected exactly 1 bedtime block, found ${bedtimeItems.length}`,
    );
  } else {
    const bed = bedtimeItems[0]!;
    const bedMins = parseTimeToMins(bed.time);
    if (Math.abs(bedMins - opts.sleepMins) > 5) {
      errors.push(
        `trust-sleep: bedtime at ${bed.time} does not match sleep anchor ${opts.sleepMins}`,
      );
    }
    const group = resolveAgeGroup(opts);
    const [lo, hi] = BEDTIME_WINDOW[group];
    if (bedMins < lo - 15 || bedMins > hi + 15) {
      errors.push(
        `trust-sleep: bedtime ${bed.time} outside age-appropriate window for ${group}`,
      );
    }
    const dinner = items.find(isDinnerBlock);
    if (dinner) {
      const dinnerEnd =
        parseTimeToMins(dinner.time) + (dinner.duration ?? 35);
      if (bedMins <= dinnerEnd) {
        errors.push(
          `trust-sleep: bedtime must be after dinner (dinner ends ~${dinnerEnd}, bedtime ${bed.time})`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Toddler+ must include dinner before bedtime with realistic timing.
 */
export function validateRequiredDinner(
  items: RoutineScheduleItem[],
  opts: TrustValidationOpts,
): TrustValidationResult {
  const errors: string[] = [];
  if (!dinnerRequired(opts)) {
    return { valid: true, errors };
  }

  const dinner = items.find(isDinnerBlock);
  if (!dinner) {
    errors.push("trust-dinner: missing dinner block");
    return { valid: false, errors };
  }

  const dinnerMins = parseTimeToMins(dinner.time);
  const country = opts.country ?? "IN";
  const profile = getCountryRoutineProfile(country);
  const [winLo, winHi] = profile.dinnerWindow;
  if (dinnerMins < winLo - 30 || dinnerMins > winHi + 45) {
    errors.push(
      `trust-dinner: dinner at ${dinner.time} outside realistic window for ${country}`,
    );
  }
  const dinnerEnd = dinnerMins + (dinner.duration ?? 35);
  if (dinnerEnd >= opts.sleepMins) {
    errors.push(
      `trust-dinner: dinner ends after bedtime anchor (${dinner.time} + ${dinner.duration ?? 35}min)`,
    );
  }

  const bedtime = items.find(isBedtimeSleepItem);
  if (bedtime) {
    const bedMins = parseTimeToMins(bedtime.time);
    if (dinnerEnd > bedMins) {
      errors.push("trust-dinner: dinner must finish before bedtime");
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Engine uses "Milk & solids" — count toward 6–12 month solid exposure. */
function countsAsInfantSolidExposure(item: RoutineScheduleItem): boolean {
  if (isSoftMealBlock(item)) return true;
  const act = item.activity.toLowerCase();
  return (
    isFeedingBlock(item) &&
    !isOptionalNightFeed(item) &&
    (/milk\s*&\s*solids/i.test(act) ||
      /\b(solids|puree|mash|finger food)\b/i.test(act) ||
      /\bfeed\s*&\s*settle\b/i.test(act))
  );
}

/**
 * Blocking infant/toddler feeding structure — wraps age-feeding rules with
 * engine-aligned solid-meal detection (does not weaken nap rules).
 */
export function validateInfantFeedingStructure(
  items: RoutineScheduleItem[],
  opts: { ageInMonths: number },
): TrustValidationResult {
  const group = getAgeGroup(opts.ageInMonths);
  if (group === "child") {
    return { valid: true, errors: [] };
  }

  const baseWarnings = validateAgeFeedingIntegration(items, group);
  const solids =
    group === "infant_6_12" ? items.filter(countsAsInfantSolidExposure) : [];
  const errors: string[] = baseWarnings
    .filter((w) => {
      if (group !== "infant_6_12") return true;
      if (/expected 2–3 soft meals/i.test(w) && solids.length >= 2) return false;
      return true;
    })
    .map((w) =>
      w.startsWith("age-feeding:")
        ? w.replace(/^age-feeding:/, "trust-feeding:")
        : `trust-feeding: ${w}`,
    );

  if (group === "infant_6_12") {
    if (solids.length < 2) {
      errors.push(
        `trust-feeding: 6–12 months expected at least 2 solid-feed exposures (found ${solids.length})`,
      );
    }
    const dayFeeds = items.filter(
      (i) => isFeedingBlock(i) && !isOptionalNightFeed(i),
    );
    if (dayFeeds.length < 2) {
      errors.push(
        `trust-feeding: 6–12 months expected at least 2 daytime feeds (found ${dayFeeds.length})`,
      );
    }
  }

  if (group === "infant_0_6") {
    const feeds = items.filter(
      (i) => isFeedingBlock(i) && !isOptionalNightFeed(i),
    );
    if (feeds.length < 6) {
      errors.push(
        `trust-feeding: infant 0–6 expected at least 6 daytime feeds (found ${feeds.length})`,
      );
    }
    if (items.some(isAdultMealBlock)) {
      errors.push("trust-feeding: infant 0–6 must not include adult meal blocks");
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Run all applicable blocking trust checks for a schedule. */
export function runBlockingTrustValidation(
  items: RoutineScheduleItem[],
  opts: TrustValidationOpts,
): TrustValidationResult {
  const errors: string[] = [];
  const sleep = validateRequiredSleepAnchor(items, opts);
  const dinner = validateRequiredDinner(items, opts);
  errors.push(...sleep.errors, ...dinner.errors);

  const months = opts.ageInMonths;
  if (months != null && months < 36) {
    const feeding = validateInfantFeedingStructure(items, { ageInMonths: months });
    errors.push(...feeding.errors);
  }

  return { valid: errors.length === 0, errors };
}

export function feedingGroupFromMonths(ageInMonths?: number): FeedingAgeGroup | null {
  if (ageInMonths == null) return null;
  const g = getAgeGroup(ageInMonths);
  return g === "child" ? null : g;
}
