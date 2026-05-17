/**
 * School vs non-school meal structure — day-type detection, dedupe, and time windows.
 */
import type { RoutineScheduleItem } from "./routine-scheduler.js";
import { minsToTime24, parseTimeToMins } from "./routine-scheduler.js";
const AFTER_SCHOOL_REFUEL_LABEL = "After-school refuel";

export type CanonicalMealKind = "breakfast" | "lunch" | "refuel" | "snack" | "dinner";

export const MEAL_TIME_WINDOWS: Record<
  Exclude<CanonicalMealKind, "refuel">,
  readonly [number, number]
> = {
  breakfast: [6 * 60 + 30, 10 * 60],
  lunch: [12 * 60, 14 * 60 + 30],
  snack: [16 * 60 + 30, 18 * 60 + 30],
  dinner: [19 * 60, 21 * 60 + 30],
};

/** Max one block per canonical meal type (refuel only on school days). */
export const MAX_MEALS_PER_KIND: Record<CanonicalMealKind, number> = {
  breakfast: 1,
  lunch: 1,
  refuel: 1,
  snack: 1,
  dinner: 1,
};

/** Conflict resolution — higher wins when duplicate kinds exist. */
export const MEAL_KIND_PRIORITY: Record<CanonicalMealKind, number> = {
  dinner: 4,
  lunch: 3,
  refuel: 3,
  breakfast: 2,
  snack: 1,
};

const MEAL_ORDER: readonly CanonicalMealKind[] = [
  "breakfast",
  "lunch",
  "refuel",
  "snack",
  "dinner",
];

export function isWeekday(date: Date = new Date()): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/**
 * School day = enrolled in school AND calendar weekday (not weekend).
 * `isWeekendDay` overrides the calendar when set explicitly.
 */
export function resolveIsSchoolDay(opts: {
  hasSchool?: boolean;
  isWeekendDay?: boolean;
  date?: Date;
}): boolean {
  if (opts.hasSchool === false) return false;
  if (opts.isWeekendDay === true) return false;
  const date = opts.date ?? new Date();
  return isWeekday(date);
}

export function isRefuelItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (cat !== "meal") return false;
  return (
    /\bafter-school refuel\b/i.test(item.activity) ||
    (/\brefuel\b/i.test(item.activity) && !/\blunch\b/i.test(item.activity))
  );
}

export function isWeekdayLunchItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (cat !== "meal") return false;
  return /\blunch\b/i.test(item.activity) && !isRefuelItem(item);
}

export function classifyCanonicalMealKind(
  item: RoutineScheduleItem,
): CanonicalMealKind | null {
  const cat = (item.category ?? "").toLowerCase();
  if (cat !== "meal" && cat !== "tiffin") return null;
  const act = item.activity;

  if (/\bbreakfast\b/i.test(act) || /\bquick meal before school\b/i.test(act)) {
    return "breakfast";
  }
  if (isRefuelItem(item)) return "refuel";
  if (/\blunch\b/i.test(act)) return "lunch";
  if (/\bdinner\b/i.test(act)) return "dinner";
  if (/\bsnack|drunch|hydration\b/i.test(act) || cat === "tiffin") return "snack";
  return null;
}

function mealKindAllowed(kind: CanonicalMealKind, isSchoolDay: boolean): boolean {
  if (!isSchoolDay && kind === "refuel") return false;
  if (isSchoolDay && kind === "lunch") {
    return false;
  }
  return true;
}

function scoreMealCandidate(item: RoutineScheduleItem, kind: CanonicalMealKind): number {
  const t = parseTimeToMins(item.time);
  let inWindow = 0;
  if (kind === "refuel") {
    inWindow = 5;
  } else {
    const [lo, hi] = MEAL_TIME_WINDOWS[kind as keyof typeof MEAL_TIME_WINDOWS];
    if (t >= lo && t <= hi) inWindow = 10;
  }
  return MEAL_KIND_PRIORITY[kind] * 1000 + inWindow;
}

/** Remove invalid meals for day type and enforce max one per kind. */
export function dedupeMealsByPriority(
  items: RoutineScheduleItem[],
  isSchoolDay: boolean,
): { items: RoutineScheduleItem[]; removed: string[] } {
  const removed: string[] = [];
  const meals = items.filter((i) => classifyCanonicalMealKind(i) != null);

  const bestByKind = new Map<CanonicalMealKind, RoutineScheduleItem>();
  for (const item of meals) {
    const kind = classifyCanonicalMealKind(item)!;
    if (!mealKindAllowed(kind, isSchoolDay)) {
      removed.push(item.activity);
      continue;
    }
    const prev = bestByKind.get(kind);
    if (!prev || scoreMealCandidate(item, kind) > scoreMealCandidate(prev, kind)) {
      if (prev) removed.push(prev.activity);
      bestByKind.set(kind, item);
    } else {
      removed.push(item.activity);
    }
  }

  const keep = new Set(bestByKind.values());
  const out = items.filter((it) => {
    const kind = classifyCanonicalMealKind(it);
    if (kind == null) return true;
    if (!mealKindAllowed(kind, isSchoolDay)) return false;
    return keep.has(it);
  });

  return { items: out, removed };
}

export function clampMealToWindow(
  kind: Exclude<CanonicalMealKind, "refuel">,
  clockMins: number,
): number {
  const [lo, hi] = MEAL_TIME_WINDOWS[kind];
  return Math.max(lo, Math.min(hi, clockMins));
}

export function enforceMealTimeWindows(
  items: RoutineScheduleItem[],
  isSchoolDay: boolean,
  opts?: { schoolEndMins?: number; wakeMins?: number },
): RoutineScheduleItem[] {
  const schoolEnd = opts?.schoolEndMins ?? 15 * 60;
  const wakeMins = opts?.wakeMins ?? 7 * 60;

  return items.map((item) => {
    const kind = classifyCanonicalMealKind(item);
    if (kind == null) return item;

    let start = parseTimeToMins(item.time);

    if (kind === "refuel" && isSchoolDay) {
      const lo = schoolEnd + 10;
      const hi = schoolEnd + 90;
      start = Math.max(lo, Math.min(hi, start));
    } else if (kind === "breakfast") {
      const target = isSchoolDay
        ? Math.max(wakeMins + 15, start)
        : clampMealToWindow("breakfast", start === 0 ? 8 * 60 : start);
      start = isSchoolDay ? target : clampMealToWindow("breakfast", target);
    } else if (kind === "lunch" && !isSchoolDay) {
      start = clampMealToWindow("lunch", start < 11 * 60 ? 12 * 60 + 30 : start);
    } else if (kind === "snack") {
      start = clampMealToWindow("snack", start);
    } else if (kind === "dinner") {
      start = clampMealToWindow("dinner", start);
    }

    if (start === parseTimeToMins(item.time)) return item;
    return { ...item, time: minsToTime24(start) };
  });
}

export function ensureCanonicalMealsForDayType(
  items: RoutineScheduleItem[],
  isSchoolDay: boolean,
  opts: { schoolEndMins?: number; wakeMins?: number; sleepMins?: number },
): RoutineScheduleItem[] {
  const out = [...items];
  const hasKind = (k: CanonicalMealKind) =>
    out.some((i) => classifyCanonicalMealKind(i) === k);

  if (!isSchoolDay) {
    if (!hasKind("breakfast")) {
      out.push({
        time: minsToTime24(8 * 60),
        activity: "Breakfast",
        duration: 30,
        category: "meal",
        status: "pending",
      });
    }
    if (!hasKind("lunch")) {
      out.push({
        time: minsToTime24(12 * 60 + 30),
        activity: "Lunch",
        duration: 35,
        category: "meal",
        status: "pending",
      });
    }
    if (!hasKind("snack")) {
      out.push({
        time: minsToTime24(17 * 60),
        activity: "Snack",
        duration: 20,
        category: "meal",
        status: "pending",
      });
    }
  } else {
    const schoolEnd = opts.schoolEndMins ?? 15 * 60;
    if (!hasKind("refuel")) {
      out.push({
        time: minsToTime24(schoolEnd + 15),
        activity: AFTER_SCHOOL_REFUEL_LABEL,
        duration: 35,
        category: "meal",
        status: "pending",
        notes: "School lunch eaten at school (implicit).",
      });
    }
  }

  if (!hasKind("dinner")) {
    const sleepMins = opts.sleepMins ?? 21 * 60;
    out.push({
      time: minsToTime24(Math.min(20 * 60, sleepMins - 90)),
      activity: "Dinner",
      duration: 35,
      category: "meal",
      status: "pending",
    });
  }

  return out.sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
}

export function validateMealDayStructure(
  items: RoutineScheduleItem[],
  isSchoolDay: boolean,
  opts: { schoolEndMins?: number } = {},
): string[] {
  const warnings: string[] = [];
  const kinds = items
    .map((i) => classifyCanonicalMealKind(i))
    .filter((k): k is CanonicalMealKind => k != null);

  const counts: Record<string, number> = {};
  for (const k of kinds) {
    counts[k] = (counts[k] ?? 0) + 1;
  }

  for (const [k, n] of Object.entries(counts)) {
    const max = MAX_MEALS_PER_KIND[k as CanonicalMealKind];
    if (n > max) {
      warnings.push(`meal-day: duplicate ${k} (${n} > ${max})`);
    }
  }

  if (!isSchoolDay) {
    if (counts.refuel) {
      warnings.push("meal-day: after-school refuel must not appear on non-school day");
    }
    if (!counts.lunch) {
      warnings.push("meal-day: missing lunch on non-school day");
    }
  } else {
    if (counts.lunch) {
      warnings.push("meal-day: standalone lunch block invalid on school day (use refuel)");
    }
    if (!counts.refuel) {
      warnings.push("meal-day: missing after-school refuel on school day");
    }
  }

  const mealItems = items
    .filter((i) => classifyCanonicalMealKind(i) != null)
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
  const orderIdx = (k: CanonicalMealKind) => MEAL_ORDER.indexOf(k);
  for (let i = 1; i < mealItems.length; i++) {
    const a = classifyCanonicalMealKind(mealItems[i - 1]!)!;
    const b = classifyCanonicalMealKind(mealItems[i]!)!;
    if (orderIdx(a) > orderIdx(b)) {
      warnings.push(
        `meal-day: order violation — ${mealItems[i - 1]!.activity} before ${mealItems[i]!.activity}`,
      );
    }
  }

  for (const item of mealItems) {
    const kind = classifyCanonicalMealKind(item)!;
    const t = parseTimeToMins(item.time);
    if (kind === "refuel" && isSchoolDay) {
      const schoolEnd = opts.schoolEndMins ?? 15 * 60;
      if (t < schoolEnd || t > schoolEnd + 90) {
        warnings.push(`meal-day: refuel at ${item.time} outside post-school window`);
      }
      continue;
    }
    if (kind === "refuel") continue;
    const win = MEAL_TIME_WINDOWS[kind as keyof typeof MEAL_TIME_WINDOWS];
    if (win && (t < win[0] - 15 || t > win[1] + 15)) {
      warnings.push(`meal-day: ${kind} at ${item.time} outside window`);
    }
  }

  return warnings;
}

export function finalizeMealStructure(
  items: RoutineScheduleItem[],
  opts: {
    isSchoolDay: boolean;
    schoolEndMins?: number;
    wakeMins?: number;
    sleepMins?: number;
  },
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  let out = items.filter((it) => {
    if (!opts.isSchoolDay && isRefuelItem(it)) {
      adjustments.push(`removed refuel on non-school day: ${it.activity}`);
      return false;
    }
    if (opts.isSchoolDay && isWeekdayLunchItem(it)) {
      adjustments.push(`removed midday lunch on school day: ${it.activity}`);
      return false;
    }
    return true;
  });

  const deduped = dedupeMealsByPriority(out, opts.isSchoolDay);
  if (deduped.removed.length) {
    adjustments.push(`deduped meals: ${deduped.removed.join(", ")}`);
  }
  out = deduped.items;

  out = ensureCanonicalMealsForDayType(out, opts.isSchoolDay, opts);
  out = enforceMealTimeWindows(out, opts.isSchoolDay, opts);

  const reDeduped = dedupeMealsByPriority(out, opts.isSchoolDay);
  out = reDeduped.items;

  return { items: out, adjustments };
}
