/**
 * Dinner anchor protection — ensures dinner exists, is trust-valid, and survives
 * meal merges / country windows / bedtime compression.
 */
import type { LaunchCountry } from "./routine-country-profile.js";
import { getCountryRoutineProfile } from "./routine-country-profile.js";
import { classifyCanonicalMealKind } from "./routine-meal-day-type.js";
import {
  isBedtimeSleepItem,
  minsToTime24,
  parseTimeToMins,
  type RoutineScheduleItem,
} from "./routine-scheduler.js";

const MIN_DINNER_DURATION = 25;
const DEFAULT_DINNER_DURATION = 35;

export type DinnerRepairOpts = {
  country?: LaunchCountry | string;
  sleepMins: number;
  ageInMonths?: number;
  dinnerWindow?: readonly [number, number];
};

export function dinnerRequiredForAge(ageInMonths?: number): boolean {
  if (ageInMonths == null) return true;
  if (ageInMonths < 12) return false;
  return ageInMonths >= 36;
}

function isTrustDinnerBlock(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  return cat === "meal" && /\bdinner\b/i.test(item.activity);
}

function findDinnerCandidates(items: RoutineScheduleItem[]): RoutineScheduleItem[] {
  return items.filter(
    (it) => isTrustDinnerBlock(it) || classifyCanonicalMealKind(it) === "dinner",
  );
}

function locateItemIndex(items: RoutineScheduleItem[], target: RoutineScheduleItem): number {
  const idx = items.indexOf(target);
  if (idx >= 0) return idx;
  const t = parseTimeToMins(target.time);
  return items.findIndex(
    (it) => parseTimeToMins(it.time) === t && it.activity === target.activity,
  );
}

function itemEndMins(item: RoutineScheduleItem): number {
  return parseTimeToMins(item.time) + (item.duration ?? 30);
}

/** Trust requires dinner end strictly before sleep anchor / bedtime block. */
function enforceDinnerBeforeBed(
  start: number,
  dur: number,
  sleepMins: number,
  winLo: number,
  winHi: number,
): { start: number; dur: number } {
  const bedBuffer = 10;
  const maxEnd = sleepMins - bedBuffer;

  if (start + dur > maxEnd) {
    dur = Math.max(MIN_DINNER_DURATION, maxEnd - start);
  }
  if (start + dur >= sleepMins) {
    start = Math.max(winLo, sleepMins - bedBuffer - dur);
  }
  if (start + dur >= sleepMins) {
    dur = Math.max(MIN_DINNER_DURATION, sleepMins - bedBuffer - start);
  }
  if (start + dur >= sleepMins) {
    start = Math.max(winLo, sleepMins - bedBuffer - MIN_DINNER_DURATION);
    dur = MIN_DINNER_DURATION;
  }
  start = Math.max(winLo, Math.min(winHi, start));
  if (start + dur >= sleepMins) {
    start = Math.max(winLo, sleepMins - bedBuffer - dur);
  }
  return { start, dur };
}

function avoidDinnerOverlaps(
  working: RoutineScheduleItem[],
  dinnerIdx: number,
  winLo: number,
  winHi: number,
  sleepMins: number,
  adjustments: string[],
): RoutineScheduleItem[] {
  const dinner = working[dinnerIdx]!;
  let start = parseTimeToMins(dinner.time);
  let dur = Math.max(MIN_DINNER_DURATION, dinner.duration ?? DEFAULT_DINNER_DURATION);

  const sorted = working
    .filter((it) => !isBedtimeSleepItem(it))
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
  const pos = sorted.findIndex((it) => it === dinner);

  if (pos > 0) {
    const prev = sorted[pos - 1]!;
    const prevEnd = itemEndMins(prev);
    if (start < prevEnd + 5) {
      start = prevEnd + 5;
      adjustments.push(`dinner shifted past "${prev.activity}"`);
    }
  }
  if (pos >= 0 && pos < sorted.length - 1) {
    const next = sorted[pos + 1]!;
    const nextStart = parseTimeToMins(next.time);
    if (start + dur > nextStart - 5) {
      const fit = nextStart - start - 5;
      if (fit >= MIN_DINNER_DURATION) {
        dur = fit;
        adjustments.push(`dinner shortened before "${next.activity}"`);
      } else {
        start = Math.max(winLo, nextStart - MIN_DINNER_DURATION - 10);
        dur = Math.min(dur, Math.max(MIN_DINNER_DURATION, nextStart - start - 5));
        adjustments.push(`dinner repositioned before "${next.activity}"`);
      }
    }
  }

  ({ start, dur } = enforceDinnerBeforeBed(start, dur, sleepMins, winLo, winHi));

  const out = [...working];
  out[dinnerIdx] = { ...dinner, time: minsToTime24(start), duration: dur };
  return out;
}

/**
 * Guarantee exactly one trust-valid dinner block: correct labels, country window,
 * and end before bedtime.
 */
export function repairDinnerAnchor(
  items: RoutineScheduleItem[],
  opts: DinnerRepairOpts,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  if (!dinnerRequiredForAge(opts.ageInMonths)) {
    return { items, adjustments };
  }

  const country = opts.country ?? "IN";
  const profile = getCountryRoutineProfile(country);
  const window = opts.dinnerWindow ?? profile.dinnerWindow;
  const [winLo, winHi] = window;

  let working = items.map((it) => ({ ...it }));
  let candidates = findDinnerCandidates(working);

  if (candidates.length === 0) {
    const eveningMeal = working.find((it) => {
      const cat = (it.category ?? "").toLowerCase();
      if (cat !== "meal" && cat !== "tiffin") return false;
      const dishes = (it as { dishes?: string[] }).dishes;
      const t = parseTimeToMins(it.time);
      return (
        (dishes != null && dishes.length > 0 && t >= 17 * 60) ||
        (t >= winLo - 60 && /\b(meal|tea|evening)\b/i.test(it.activity))
      );
    });
    if (eveningMeal) {
      const idx = locateItemIndex(working, eveningMeal);
      if (idx >= 0) {
        working[idx] = { ...eveningMeal, activity: "Dinner", category: "meal" };
        adjustments.push(`dinner promoted from "${eveningMeal.activity}"`);
        candidates = [working[idx]!];
      }
    }
  }

  if (candidates.length === 0) {
    const bedBuffer = 20;
    const maxStart = Math.min(winHi, opts.sleepMins - bedBuffer - MIN_DINNER_DURATION);
    let anchor = Math.round((winLo + winHi) / 2);
    anchor = Math.max(winLo, Math.min(maxStart, anchor));
    const newDinner: RoutineScheduleItem = {
      time: minsToTime24(anchor),
      activity: "Dinner",
      duration: DEFAULT_DINNER_DURATION,
      category: "meal",
      status: "pending",
    };
    working.push(newDinner);
    working.sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
    adjustments.push(`dinner inserted at ${newDinner.time}`);
    const newIdx = locateItemIndex(working, newDinner);
    if (newIdx >= 0) {
      working = avoidDinnerOverlaps(working, newIdx, winLo, winHi, opts.sleepMins, adjustments);
    }
    return { items: working, adjustments };
  }

  const ranked = [...candidates].sort((a, b) => {
    const trustA = isTrustDinnerBlock(a) ? 1 : 0;
    const trustB = isTrustDinnerBlock(b) ? 1 : 0;
    if (trustB !== trustA) return trustB - trustA;
    const tA = parseTimeToMins(a.time);
    const tB = parseTimeToMins(b.time);
    const inA = tA >= winLo && tA <= winHi ? 1 : 0;
    const inB = tB >= winLo && tB <= winHi ? 1 : 0;
    if (inB !== inA) return inB - inA;
    const da = (a as { dishes?: string[] }).dishes?.length ?? 0;
    const db = (b as { dishes?: string[] }).dishes?.length ?? 0;
    return db - da;
  });
  const keep = ranked[0]!;
  const dropSet = new Set(candidates.filter((c) => c !== keep));

  if (dropSet.size > 0) {
    working = working.filter((it) => !dropSet.has(it));
    adjustments.push(`removed ${dropSet.size} duplicate dinner block(s)`);
  }

  let dinnerStart = parseTimeToMins(keep.time);
  let dinnerDur = Math.max(MIN_DINNER_DURATION, keep.duration ?? DEFAULT_DINNER_DURATION);
  let clampedStart = Math.max(winLo, Math.min(winHi, dinnerStart));
  ({ start: clampedStart, dur: dinnerDur } = enforceDinnerBeforeBed(
    clampedStart,
    dinnerDur,
    opts.sleepMins,
    winLo,
    winHi,
  ));
  if (clampedStart !== dinnerStart) {
    adjustments.push(
      `dinner clamped to ${minsToTime24(clampedStart)} (window ${minsToTime24(winLo)}–${minsToTime24(winHi)})`,
    );
  }

  const keepIdx = locateItemIndex(working, keep);
  if (keepIdx >= 0) {
    const prev = working[keepIdx]!;
    const normalized: RoutineScheduleItem = {
      ...prev,
      activity: "Dinner",
      category: "meal",
      time: minsToTime24(clampedStart),
      duration: dinnerDur,
    };
    if (normalized.meal && normalized.meal !== "Dinner") {
      normalized.meal = "Dinner";
    }
    const sk = (normalized as { structureKind?: string }).structureKind;
    if (sk === "snack") {
      const { structureKind: _drop, ...rest } = normalized as RoutineScheduleItem & {
        structureKind?: string;
      };
      working[keepIdx] = rest as RoutineScheduleItem;
    } else {
      working[keepIdx] = normalized;
    }
    working = avoidDinnerOverlaps(working, keepIdx, winLo, winHi, opts.sleepMins, adjustments);
  }

  const dinnerBlock = working.find(isTrustDinnerBlock);
  if (dinnerBlock) {
    const dStart = parseTimeToMins(dinnerBlock.time);
    const trimmed = working.filter((it) => {
      if (it === dinnerBlock) return true;
      const kind = classifyCanonicalMealKind(it);
      if (kind !== "snack") return true;
      const t = parseTimeToMins(it.time);
      if (t >= dStart - 20) {
        adjustments.push(`removed post-dinner snack "${it.activity}"`);
        return false;
      }
      return true;
    });
    if (trimmed.length !== working.length) {
      working = trimmed;
    }
  }

  return { items: working, adjustments };
}
