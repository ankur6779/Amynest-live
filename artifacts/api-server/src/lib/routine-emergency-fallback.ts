/**
 * Last-resort routine builder when the intelligence pipeline cannot validate.
 * Guarantees a parent-safe schedule that passes hard + trust validators.
 */
import type { AgeGroup } from "./routine-templates.js";
import {
  applyAgeFeedingRoutineFlow,
  buildRealisticInfant0_6Routine,
  isExclusiveInfantPhase,
  type AgeFeedingOpts,
} from "./routine-age-feeding.js";
import {
  enforceSleepBoundary,
  enforceWakeAnchor,
  resolveOverlapsByPriority,
} from "./routine-final-integrity.js";
import { repairDinnerAnchor } from "./routine-meal-dinner-integrity.js";
import {
  hardValidateSchedule,
  minsToTime24,
  normalizeTo24h,
  parseTimeToMins,
  type RoutineScheduleItem,
} from "./routine-scheduler.js";
import {
  runBlockingTrustValidation,
  type TrustValidationOpts,
} from "./routine-trust-validators.js";
import { generateValidatedInfantRoutine } from "./infant-adaptive-routine.js";

function isAdaptiveInfantAge(ageInMonths: number): boolean {
  return ageInMonths >= 6 && ageInMonths < 12;
}

export type EmergencyRoutineOpts = {
  wakeUpTime: string;
  sleepTime: string;
  ageInMonths: number;
  ageGroup: AgeGroup;
  country?: string;
  hasSchool?: boolean;
  feedingType?: "breastfeeding" | "formula" | "mixed";
  seed?: number;
};

function trustOpts(opts: EmergencyRoutineOpts): TrustValidationOpts {
  const wake = normalizeTo24h(opts.wakeUpTime);
  const sleep = normalizeTo24h(opts.sleepTime);
  return {
    wakeMins: parseTimeToMins(wake),
    sleepMins: parseTimeToMins(sleep),
    ageGroup: opts.ageGroup,
    ageInMonths: opts.ageInMonths,
    country: opts.country,
    hasSchool: opts.hasSchool ?? false,
  };
}

function polishInfantSchedule(
  items: RoutineScheduleItem[],
  wake: string,
  sleep: string,
): RoutineScheduleItem[] {
  const wakeMins = parseTimeToMins(wake);
  const sleepMins = parseTimeToMins(sleep);
  let working = enforceSleepBoundary(items, sleepMins, wakeMins).items;
  working = resolveOverlapsByPriority(working, sleepMins).items;
  working = enforceWakeAnchor(working, wakeMins, sleepMins).items;
  return working;
}

function passesAllValidators(
  items: RoutineScheduleItem[],
  opts: EmergencyRoutineOpts,
): boolean {
  const wake = normalizeTo24h(opts.wakeUpTime);
  const sleep = normalizeTo24h(opts.sleepTime);
  const hard = hardValidateSchedule(items, wake, sleep);
  const trust = runBlockingTrustValidation(items, trustOpts(opts));
  return hard.valid && trust.valid;
}

function buildMinimalToddlerPlusRoutine(opts: EmergencyRoutineOpts): RoutineScheduleItem[] {
  const wakeMins = parseTimeToMins(normalizeTo24h(opts.wakeUpTime));
  const sleepMins = parseTimeToMins(normalizeTo24h(opts.sleepTime));
  const dinnerStart = Math.min(
    Math.max(wakeMins + 10 * 60, sleepMins - 75),
    sleepMins - 45,
  );
  const dinnerDuration = 35;
  const windStart = Math.max(dinnerStart + dinnerDuration + 1, sleepMins - 30);
  const items: RoutineScheduleItem[] = [
    {
      time: minsToTime24(wakeMins),
      activity: "Wake up & morning routine",
      duration: 30,
      category: "hygiene",
      status: "pending",
    },
    {
      time: minsToTime24(wakeMins + 35),
      activity: "Breakfast",
      duration: 25,
      category: "meal",
      status: "pending",
    },
    {
      time: minsToTime24(wakeMins + 120),
      activity: "Morning play & learning",
      duration: 60,
      category: "play",
      status: "pending",
    },
    {
      time: minsToTime24(wakeMins + 300),
      activity: "Lunch",
      duration: 30,
      category: "meal",
      status: "pending",
    },
    {
      time: minsToTime24(wakeMins + 360),
      activity: "Quiet rest or nap",
      duration: 45,
      category: "rest",
      status: "pending",
    },
    {
      time: minsToTime24(wakeMins + 420),
      activity: "Afternoon activity",
      duration: 60,
      category: "play",
      status: "pending",
    },
    {
      time: minsToTime24(dinnerStart),
      activity: "Dinner",
      duration: dinnerDuration,
      category: "meal",
      status: "pending",
    },
    {
      time: minsToTime24(windStart),
      activity: "Wind-down time",
      duration: Math.max(15, sleepMins - windStart - 5),
      category: "rest",
      status: "pending",
    },
    {
      time: minsToTime24(sleepMins),
      activity: "Lights out",
      duration: 30,
      category: "sleep",
      status: "pending",
    },
  ];
  let working = resolveOverlapsByPriority(items, sleepMins).items;
  const dinner = working.find(
    (it) => (it.category ?? "").toLowerCase() === "meal" && /\bdinner\b/i.test(it.activity),
  );
  if (dinner) {
    const dinnerStartMins = parseTimeToMins(dinner.time);
    const maxDinnerEnd = sleepMins - 20;
    if (dinnerStartMins + (dinner.duration ?? 35) > maxDinnerEnd) {
      dinner.time = minsToTime24(Math.max(wakeMins + 8 * 60, maxDinnerEnd - 30));
      dinner.duration = Math.max(
        20,
        Math.min(30, maxDinnerEnd - parseTimeToMins(dinner.time)),
      );
    }
  }
  const wind = working.find((it) => /wind-down/i.test(it.activity));
  if (dinner && wind) {
    const windStartMins = parseTimeToMins(dinner.time) + (dinner.duration ?? 30) + 1;
    wind.time = minsToTime24(windStartMins);
    wind.duration = Math.max(15, sleepMins - windStartMins - 5);
  }
  working = enforceSleepBoundary(working, sleepMins, wakeMins).items;
  working = resolveOverlapsByPriority(working, sleepMins).items;
  const dinnerFinal = working.find(
    (it) => (it.category ?? "").toLowerCase() === "meal" && /\bdinner\b/i.test(it.activity),
  );
  const windFinal = working.find((it) => /wind-down/i.test(it.activity));
  if (dinnerFinal && windFinal) {
    const windStartMins =
      parseTimeToMins(dinnerFinal.time) + (dinnerFinal.duration ?? 30) + 1;
    windFinal.time = minsToTime24(windStartMins);
    windFinal.duration = Math.max(15, sleepMins - windStartMins - 5);
  }
  return working;
}

/** Build a minimal schedule that passes hard + trust validation. */
export function buildEmergencySafeRoutine(opts: EmergencyRoutineOpts): RoutineScheduleItem[] {
  const wake = normalizeTo24h(opts.wakeUpTime);
  const sleep = normalizeTo24h(opts.sleepTime);
  const wakeMins = parseTimeToMins(wake);
  const sleepMins = parseTimeToMins(sleep);
  const feedingOpts: AgeFeedingOpts = {
    wakeMins,
    sleepMins,
    ageInMonths: opts.ageInMonths,
    feedingType: opts.feedingType,
    seed: opts.seed ?? opts.ageInMonths,
  };

  const candidates: RoutineScheduleItem[][] = [];

  if (isExclusiveInfantPhase(opts.ageInMonths)) {
    candidates.push(
      polishInfantSchedule(
        applyAgeFeedingRoutineFlow([], "infant_0_6", feedingOpts).items,
        wake,
        sleep,
      ),
      polishInfantSchedule(buildRealisticInfant0_6Routine(feedingOpts), wake, sleep),
    );
  } else if (isAdaptiveInfantAge(opts.ageInMonths)) {
    candidates.push(
      polishInfantSchedule(
        applyAgeFeedingRoutineFlow([], "infant_6_12", feedingOpts).items,
        wake,
        sleep,
      ),
    );
    const adaptive = generateValidatedInfantRoutine({
      ageMonths: opts.ageInMonths,
      wakeTime: wake,
      sleepTime: sleep,
      feedingType: opts.feedingType ?? "breastfeeding",
    });
    candidates.push(
      polishInfantSchedule(adaptive.result.items, wake, sleep),
    );
  } else {
    candidates.push(buildMinimalToddlerPlusRoutine(opts));
    candidates.push(
      polishInfantSchedule(
        applyAgeFeedingRoutineFlow([], "toddler", feedingOpts).items,
        wake,
        sleep,
      ),
    );
  }

  for (const candidate of candidates) {
    if (passesAllValidators(candidate, opts)) {
      return candidate;
    }
  }

  const fallback = buildMinimalToddlerPlusRoutine(opts);
  if (passesAllValidators(fallback, opts)) {
    return fallback;
  }

  if (opts.ageInMonths >= 12) {
    return fallback;
  }

  return polishInfantSchedule(
    buildRealisticInfant0_6Routine({
      ...feedingOpts,
      ageInMonths: Math.min(opts.ageInMonths, 5),
    }),
    wake,
    sleep,
  );
}

/** Attempt trust repair on an existing schedule; returns repaired items if valid. */
export function repairTrustValidationFailures(
  items: RoutineScheduleItem[],
  opts: EmergencyRoutineOpts,
): { items: RoutineScheduleItem[]; repaired: boolean } {
  const wake = normalizeTo24h(opts.wakeUpTime);
  const sleep = normalizeTo24h(opts.sleepTime);
  const sleepMins = parseTimeToMins(sleep);
  const wakeMins = parseTimeToMins(wake);

  let working = resolveOverlapsByPriority(items, sleepMins).items;
  if ((opts.ageInMonths ?? 36) >= 36) {
    working = repairDinnerAnchor(working, {
      country: opts.country ?? "IN",
      sleepMins,
      ageInMonths: opts.ageInMonths,
    }).items;
    const dinner = working.find(
      (it) => (it.category ?? "").toLowerCase() === "meal" && /\bdinner\b/i.test(it.activity),
    );
    if (dinner) {
      const maxDinnerEnd = sleepMins - 20;
      if (parseTimeToMins(dinner.time) + (dinner.duration ?? 35) > maxDinnerEnd) {
        dinner.time = minsToTime24(Math.max(wakeMins + 8 * 60, maxDinnerEnd - 30));
        dinner.duration = Math.max(
          20,
          Math.min(30, maxDinnerEnd - parseTimeToMins(dinner.time)),
        );
      }
    } else {
      working.push({
        time: minsToTime24(Math.max(wakeMins + 8 * 60, sleepMins - 65)),
        activity: "Dinner",
        duration: Math.min(30, sleepMins - 20 - Math.max(wakeMins + 8 * 60, sleepMins - 65)),
        category: "meal",
        status: "pending",
      });
    }
  }
  working = enforceSleepBoundary(working, sleepMins, wakeMins).items;
  working = resolveOverlapsByPriority(working, sleepMins).items;

  if (passesAllValidators(working, opts)) {
    return { items: working, repaired: true };
  }
  return { items, repaired: false };
}
