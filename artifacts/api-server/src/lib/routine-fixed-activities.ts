/**
 * Recurring fixed activities (tuition, sports, classes) — locked schedule blocks.
 */
import type { RoutineScheduleItem } from "./routine-scheduler.js";
import {
  isLockedScheduleItem,
  minsToTime24,
  normalizeTo24h,
  parseTimeToMins,
  resolveTimelineOverlaps,
} from "./routine-scheduler.js";
import {
  shiftNonLockedAroundLockedEvents,
  type TimelineShift,
} from "./routine-special-event.js";
import type { ParsedSpecialEvent } from "./routine-special-event.js";

export type FixedActivityInput = {
  activity: string;
  /** Weekday labels, e.g. ["Mon", "Wed"] or ["monday", "wednesday"]. */
  days: string[];
  /** 24h or 12h clock, e.g. "17:00" or "5:00pm". */
  start: string;
  end: string;
};

export type ParsedFixedActivity = {
  activity: string;
  startMins: number;
  endMins: number;
  duration: number;
  days: string[];
  raw: FixedActivityInput;
};

export type FixedActivityConflictSeverity = "blocking" | "non_blocking";

export type FixedActivityConflict = {
  warning: string;
  suggestion: string;
  kind: "school" | "sleep" | "special_event" | "meal" | "wake" | "invalid";
  severity: FixedActivityConflictSeverity;
  activity: string;
};

export type FixedActivityShift = {
  activity: string;
  from?: string;
  to?: string;
  reason: string;
};

export type FixedActivitiesDebug = {
  fixedActivitiesApplied: boolean;
  hasBlockingConflicts: boolean;
  summaryMessage: string | null;
  activitiesForToday: string[];
  conflicts: FixedActivityConflict[];
  conflictsDetected: string[];
  adjustmentsMade: string[];
  shiftsApplied: FixedActivityShift[];
  validationWarnings: string[];
};

export function emptyFixedActivitiesDebug(): FixedActivitiesDebug {
  return {
    fixedActivitiesApplied: false,
    hasBlockingConflicts: false,
    summaryMessage: null,
    activitiesForToday: [],
    conflicts: [],
    conflictsDetected: [],
    adjustmentsMade: [],
    shiftsApplied: [],
    validationWarnings: [],
  };
}

export function conflictSeverity(
  kind: FixedActivityConflict["kind"],
): FixedActivityConflictSeverity {
  if (kind === "school" || kind === "meal" || kind === "special_event") {
    return "non_blocking";
  }
  return "blocking";
}

function pushConflict(
  debug: FixedActivitiesDebug,
  conflict: Omit<FixedActivityConflict, "severity"> & { severity?: FixedActivityConflictSeverity },
): void {
  const full: FixedActivityConflict = {
    ...conflict,
    severity: conflict.severity ?? conflictSeverity(conflict.kind),
  };
  debug.conflicts.push(full);
  debug.conflictsDetected.push(full.warning);
  if (full.severity === "blocking") {
    debug.hasBlockingConflicts = true;
  }
}

const MEAL_SHIFT_GAP = 10;
/** Dinner should not end after 21:00 unless sleep is earlier. */
const DINNER_MAX_END_MINS = 21 * 60;
/** Afternoon snack window (inclusive start, exclusive end of placement). */
const SNACK_WINDOW_START = 14 * 60;
const SNACK_WINDOW_END = 17 * 60 + 30;

type MealKind = "breakfast" | "lunch" | "dinner" | "snack" | "other";

function classifyMealKind(activity: string): MealKind {
  const a = activity.toLowerCase();
  if (/\bbreakfast\b/.test(a)) return "breakfast";
  if (/\blunch\b|tiffin|drunch\b/.test(a)) return "lunch";
  if (/\bdinner\b/.test(a)) return "dinner";
  if (/\bsnack\b|refuel\b/.test(a)) return "snack";
  return "other";
}

function mealPlacementFits(
  startMins: number,
  duration: number,
  kind: MealKind,
  bounds: { wakeMins: number; sleepMins: number },
): boolean {
  const end = startMins + duration;
  if (startMins < bounds.wakeMins || end > bounds.sleepMins) return false;

  if (kind === "dinner") {
    const latestEnd = Math.min(DINNER_MAX_END_MINS, bounds.sleepMins - 20);
    return end <= latestEnd;
  }
  if (kind === "snack") {
    return startMins >= SNACK_WINDOW_START && end <= SNACK_WINDOW_END;
  }
  return true;
}

/** Pre-flight check on parent-configured times (before full pipeline). */
export function validateFixedActivityInputs(
  fixedList: ParsedFixedActivity[],
  opts: { wakeMins: number; sleepMins: number },
): FixedActivitiesDebug {
  const debug = emptyFixedActivitiesDebug();
  if (!fixedList.length) return debug;

  debug.fixedActivitiesApplied = true;
  debug.activitiesForToday = fixedList.map((f) => f.activity);

  for (const fixed of fixedList) {
    if (fixed.startMins >= fixed.endMins) {
      pushConflict(debug, {
        activity: fixed.activity,
        kind: "invalid",
        severity: "blocking",
        warning: `${fixed.activity} has an invalid time range`,
        suggestion: "End time must be after start time",
      });
    }
    if (fixed.startMins < opts.wakeMins) {
      pushConflict(debug, {
        activity: fixed.activity,
        kind: "wake",
        warning: `${fixed.activity} starts before wake-up`,
        suggestion: `Start ${fixed.activity} at ${formatClockSuggestion(opts.wakeMins + 15)} or later`,
      });
    }
    if (fixed.endMins > opts.sleepMins || fixed.startMins >= opts.sleepMins) {
      pushConflict(debug, {
        activity: fixed.activity,
        kind: "sleep",
        warning: `${fixed.activity} overlaps bedtime — may reduce sleep`,
        suggestion: sleepImpactSuggestion(fixed, opts.sleepMins),
      });
    }
  }

  finalizeFixedActivitiesSummary(debug);
  return debug;
}

export function finalizeFixedActivitiesSummary(
  debug: FixedActivitiesDebug,
  childName?: string | null,
): void {
  if (!debug.fixedActivitiesApplied) {
    debug.summaryMessage = null;
    debug.hasBlockingConflicts = false;
    return;
  }

  debug.hasBlockingConflicts = debug.conflicts.some((c) => c.severity === "blocking");
  const who = childName?.trim() || "your child";

  if (debug.hasBlockingConflicts) {
    debug.summaryMessage =
      `${who}'s weekly activities may reduce rest time. Please review before saving.`;
  } else if (debug.conflicts.length > 0 || debug.shiftsApplied.length > 0) {
    debug.summaryMessage = `Adjusted around ${who}'s activities.`;
  } else {
    debug.summaryMessage = `Built around ${who}'s weekly activities.`;
  }
}

function formatClockSuggestion(mins: number): string {
  return minsToTime24(Math.max(0, Math.min(24 * 60 - 1, mins)));
}

function sleepImpactSuggestion(fixed: ParsedFixedActivity, sleepMins: number): string {
  const latestEnd = sleepMins - 30;
  if (fixed.endMins > latestEnd) {
    return `End ${fixed.activity} by ${formatClockSuggestion(latestEnd)} to protect bedtime`;
  }
  return `Move ${fixed.activity} earlier so it ends before bedtime`;
}

function schoolOverlapSuggestion(
  fixed: ParsedFixedActivity,
  schoolStartMins: number,
  schoolEndMins: number,
): string {
  return `Try ${fixed.activity} after ${formatClockSuggestion(schoolEndMins + MEAL_SHIFT_GAP)} or before ${formatClockSuggestion(Math.max(schoolStartMins - fixed.duration - MEAL_SHIFT_GAP, 6 * 60))}`;
}

const DAY_INDEX: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Similar dynamic blocks to drop when a fixed activity covers the same slot. */
const SIMILAR_REMOVAL_RULES: Array<{ fixed: RegExp; remove: RegExp }> = [
  {
    fixed: /tuition|tutor/i,
    remove: /\b(tuition|study|homework|learning block|study time)\b/i,
  },
  {
    fixed: /football|soccer|cricket|basketball|tennis|swim/i,
    remove: /\b(soccer|football club|sports practice|football|active play|outdoor play)\b/i,
  },
  {
    fixed: /dance|music|karate|ballet|piano|guitar|class/i,
    remove: /\b(soccer|football|sports practice|extracurricular|club|class time)\b/i,
  },
];

function normalizeDayToken(day: string): string {
  return day.trim().toLowerCase().replace(/\./g, "");
}

export function weekdayLabelFromDate(date: string): (typeof WEEKDAY_LABELS)[number] {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return WEEKDAY_LABELS[dow] ?? "Mon";
}

export function dayMatches(scheduleDay: string, todayLabel: string): boolean {
  const key = normalizeDayToken(scheduleDay);
  const todayKey = normalizeDayToken(todayLabel);
  if (key === todayKey) return true;
  const idx = DAY_INDEX[key];
  const todayIdx = DAY_INDEX[todayKey];
  return idx != null && todayIdx != null && idx === todayIdx;
}

export function filterFixedActivitiesForDate(
  fixed: FixedActivityInput[] | null | undefined,
  date: string,
): FixedActivityInput[] {
  if (!fixed?.length) return [];
  const today = weekdayLabelFromDate(date);
  return fixed.filter((a) => a.days?.some((d) => dayMatches(d, today)));
}

function parseClockToMins(clock: string): number | null {
  const raw = clock.trim();
  const m24 = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (m24) {
    const h = Number(m24[1]);
    const min = Number(m24[2]);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return h * 60 + min;
  }
  const m12 = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i.exec(raw);
  if (m12) {
    let h = Number(m12[1]);
    const min = m12[2] ? Number(m12[2]) : 0;
    const ap = m12[3]!.toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return h * 60 + min;
  }
  return null;
}

export function parseFixedActivityInput(input: FixedActivityInput): ParsedFixedActivity | null {
  const activity = input.activity?.trim();
  if (!activity) return null;
  const startMins = parseClockToMins(input.start);
  const endMins = parseClockToMins(input.end);
  if (startMins == null || endMins == null || endMins <= startMins) return null;
  return {
    activity,
    startMins,
    endMins,
    duration: endMins - startMins,
    days: [...input.days],
    raw: input,
  };
}

export function parseFixedActivitiesForDate(
  fixed: FixedActivityInput[] | null | undefined,
  date: string,
): { activities: ParsedFixedActivity[]; debug: FixedActivitiesDebug } {
  const empty = emptyFixedActivitiesDebug();
  const forToday = filterFixedActivitiesForDate(fixed, date);
  if (!forToday.length) return { activities: [], debug: empty };

  const activities: ParsedFixedActivity[] = [];
  const debug = emptyFixedActivitiesDebug();
  for (const raw of forToday) {
    const parsed = parseFixedActivityInput(raw);
    if (!parsed) {
      debug.validationWarnings.push(`fixed-activity: invalid time for "${raw.activity}"`);
      pushConflict(debug, {
        activity: raw.activity || "Activity",
        kind: "invalid",
        severity: "blocking",
        warning: `Invalid time for "${raw.activity}"`,
        suggestion: "Use a valid start and end time (e.g. 17:00–18:00)",
      });
      continue;
    }
    activities.push(parsed);
  }

  debug.fixedActivitiesApplied = activities.length > 0;
  debug.activitiesForToday = activities.map((a) => a.activity);
  finalizeFixedActivitiesSummary(debug);
  return { activities, debug };
}

function isMealLikeItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  return cat === "meal" || cat === "tiffin" || /\b(breakfast|lunch|dinner|snack|drunch|tiffin)\b/i.test(item.activity);
}

/** Priority: special event > fixed activity > AI-generated blocks. */
export function detectSpecialFixedConflicts(
  fixedList: ParsedFixedActivity[],
  specialEvent: ParsedSpecialEvent | ParsedSpecialEvent[] | null,
): FixedActivityConflict[] {
  if (!specialEvent || !fixedList.length) return [];
  const events = Array.isArray(specialEvent) ? specialEvent : [specialEvent];
  const out: FixedActivityConflict[] = [];
  for (const ev of events) {
    const specialEnd = ev.startMins + ev.duration;
    for (const fixed of fixedList) {
      if (fixed.startMins < specialEnd && fixed.endMins > ev.startMins) {
        out.push({
          activity: fixed.activity,
          kind: "special_event",
          severity: "non_blocking",
          warning: `${fixed.activity} overlaps with ${ev.activity}`,
          suggestion: `Move ${fixed.activity} to ${formatClockSuggestion(ev.startMins + ev.duration + MEAL_SHIFT_GAP)} or reschedule the special plan`,
        });
      }
    }
  }
  return out;
}

function mealsOverlapFixed(
  start: number,
  end: number,
  fixed: ParsedFixedActivity,
): boolean {
  return start < fixed.endMins + MEAL_SHIFT_GAP && end > fixed.startMins - MEAL_SHIFT_GAP;
}

/**
 * Automatically shift meals around locked fixed blocks (non-blocking when resolved).
 */
export function shiftMealsAroundFixedBlocks(
  items: RoutineScheduleItem[],
  fixedList: ParsedFixedActivity[],
  bounds: { wakeMins: number; sleepMins: number },
): {
  items: RoutineScheduleItem[];
  shifts: TimelineShift[];
  adjustments: string[];
  unresolved: FixedActivityConflict[];
  warnings: string[];
} {
  if (!fixedList.length) {
    return { items, shifts: [], adjustments: [], unresolved: [], warnings: [] };
  }

  const shifts: TimelineShift[] = [];
  const adjustments: string[] = [];
  const unresolved: FixedActivityConflict[] = [];
  const warnings: string[] = [];
  const working = [...items].sort(
    (a, b) => parseTimeToMins(normalizeTo24h(a.time)) - parseTimeToMins(normalizeTo24h(b.time)),
  );

  for (const meal of working) {
    if (!isMealLikeItem(meal) || isLockedScheduleItem(meal)) continue;

    let start = parseTimeToMins(normalizeTo24h(meal.time));
    const dur = meal.duration ?? 30;
    let end = start + dur;
    let overlapping = fixedList.some((f) => mealsOverlapFixed(start, end, f));
    if (!overlapping) continue;

    const mealKind = classifyMealKind(meal.activity);
    const noOverlap = (slotStart: number) =>
      !fixedList.some((f) => mealsOverlapFixed(slotStart, slotStart + dur, f));

    const tryPlace = (slotStart: number, reason: string): boolean => {
      if (!mealPlacementFits(slotStart, dur, mealKind, bounds) || !noOverlap(slotStart)) {
        return false;
      }
      const from = meal.time;
      meal.time = minsToTime24(slotStart);
      meal.scheduleDecision = {
        reason,
        source: "structure",
        originalActivity: meal.scheduleDecision?.originalActivity ?? meal.activity,
      };
      shifts.push({ activity: meal.activity, from, to: meal.time, reason });
      adjustments.push(reason);
      return true;
    };

    let placed = false;
    for (const fixed of fixedList) {
      if (!mealsOverlapFixed(start, end, fixed)) continue;

      const afterStart = fixed.endMins + MEAL_SHIFT_GAP;
      if (tryPlace(afterStart, `Moved ${meal.activity} after ${fixed.activity}`)) {
        placed = true;
        break;
      }

      const beforeStart = fixed.startMins - dur - MEAL_SHIFT_GAP;
      if (tryPlace(beforeStart, `Moved ${meal.activity} before ${fixed.activity}`)) {
        placed = true;
        break;
      }

      // Dinner past 21:00 — try earlier slot before fixed
      if (mealKind === "dinner") {
        const earlyDinner = Math.min(
          beforeStart,
          DINNER_MAX_END_MINS - dur - MEAL_SHIFT_GAP,
        );
        if (tryPlace(earlyDinner, `Moved ${meal.activity} earlier to stay before 21:00`)) {
          placed = true;
          break;
        }
      }

      // Snack outside afternoon — clamp into snack window
      if (mealKind === "snack") {
        const snackStart = Math.max(
          SNACK_WINDOW_START,
          Math.min(SNACK_WINDOW_END - dur, beforeStart),
        );
        if (tryPlace(snackStart, `Moved ${meal.activity} into the afternoon snack window`)) {
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      start = parseTimeToMins(normalizeTo24h(meal.time));
      end = start + dur;
      const fixed = fixedList.find((f) => mealsOverlapFixed(start, end, f));
      if (fixed) {
        const fix =
          mealKind === "dinner"
            ? `Serve dinner before ${formatClockSuggestion(DINNER_MAX_END_MINS - dur)} or move ${fixed.activity} later`
            : mealKind === "snack"
              ? `Place snack between ${formatClockSuggestion(SNACK_WINDOW_START)} and ${formatClockSuggestion(SNACK_WINDOW_END - dur)}`
              : `Move ${meal.activity} to ${formatClockSuggestion(fixed.endMins + MEAL_SHIFT_GAP)} or ${formatClockSuggestion(fixed.startMins - dur - MEAL_SHIFT_GAP)}`;
        unresolved.push({
          activity: fixed.activity,
          kind: "meal",
          severity: "non_blocking",
          warning: `${meal.activity} still overlaps ${fixed.activity}`,
          suggestion: fix,
        });
      }
    }
  }

  const resolved = resolveTimelineOverlaps(working, bounds.wakeMins, bounds.sleepMins);
  return { items: resolved, shifts, adjustments, unresolved, warnings };
}

export function mergeTimelineShifts(
  debug: FixedActivitiesDebug,
  shifts: TimelineShift[],
): void {
  for (const s of shifts) {
    debug.shiftsApplied.push({
      activity: s.activity,
      from: s.from,
      to: s.to,
      reason: s.reason,
    });
    if (s.from && s.to && s.from !== s.to) {
      debug.adjustmentsMade.push(`${s.activity}: ${s.from} → ${s.to} (${s.reason})`);
    }
  }
}

export function isFixedRecurringItem(item: RoutineScheduleItem): boolean {
  return (
    item.locked === true &&
    (item.culturalTag === "fixed_recurring" || item.activitySource === "fixed")
  );
}

function isProbableDuplicateOfFixed(
  item: RoutineScheduleItem,
  fixed: ParsedFixedActivity,
): boolean {
  const act = item.activity.toLowerCase();
  const label = fixed.activity.toLowerCase();
  if (act === label) return true;
  if (label.length >= 6 && act.includes(label.slice(0, Math.min(24, label.length)))) {
    return true;
  }
  return false;
}

function categoryForFixedActivity(label: string): string {
  const act = label.toLowerCase();
  if (/\b(math|tuition|homework|study|learning|music|piano|violin|coding)\b/i.test(act)) {
    return "study";
  }
  if (/\b(football|soccer|swim|basketball|cricket|sport|training|dance)\b/i.test(act)) {
    return "play";
  }
  return "family";
}

export function buildFixedScheduleItem(fixed: ParsedFixedActivity): RoutineScheduleItem {
  return {
    time: minsToTime24(fixed.startMins),
    activity: fixed.activity,
    duration: fixed.duration,
    category: categoryForFixedActivity(fixed.activity),
    status: "pending",
    locked: true,
    culturalTag: "fixed_recurring",
    activitySource: "fixed",
    scheduleDecision: {
      reason: `Fixed recurring: ${fixed.activity}`,
      source: "structure",
    },
    notes: `Recurring on ${fixed.days.join(", ")}.`,
  };
}

export function removeSimilarDynamicBlocks(
  items: RoutineScheduleItem[],
  fixedList: ParsedFixedActivity[],
): { items: RoutineScheduleItem[]; removed: string[] } {
  if (!fixedList.length) return { items, removed: [] };
  const removed: string[] = [];
  const patterns = fixedList.flatMap((f) =>
    SIMILAR_REMOVAL_RULES.filter((r) => r.fixed.test(f.activity)).map((r) => r.remove),
  );
  if (!patterns.length) return { items, removed: [] };

  const out = items.filter((it) => {
    if (isLockedScheduleItem(it)) return true;
    const act = it.activity;
    for (const re of patterns) {
      if (re.test(act)) {
        removed.push(act);
        return false;
      }
    }
    return true;
  });
  return { items: out, removed };
}

export function injectFixedActivityBlocks(
  items: RoutineScheduleItem[],
  fixedList: ParsedFixedActivity[],
): RoutineScheduleItem[] {
  let out = [...items];
  for (const f of fixedList) {
    out = out.filter((i) => !isProbableDuplicateOfFixed(i, f));
    out.push(buildFixedScheduleItem(f));
  }
  return out;
}

export function validateFixedActivitiesPlacement(
  items: RoutineScheduleItem[],
  fixedList: ParsedFixedActivity[],
  opts: {
    wakeMins: number;
    sleepMins: number;
    schoolStartMins?: number;
    schoolEndMins?: number;
    hasSchool?: boolean;
  },
): FixedActivitiesDebug {
  const debug = emptyFixedActivitiesDebug();

  if (!fixedList.length) {
    return debug;
  }

  for (const fixed of fixedList) {
    const match =
      items.find((i) => isFixedRecurringItem(i) && isProbableDuplicateOfFixed(i, fixed)) ??
      items.find(
        (i) =>
          i.activity.toLowerCase() === fixed.activity.toLowerCase() &&
          Math.abs(parseTimeToMins(normalizeTo24h(i.time)) - fixed.startMins) <= 15,
      );

    if (!match) {
      debug.validationWarnings.push(`fixed-activity: missing in final schedule — ${fixed.activity}`);
      continue;
    }

    const start = parseTimeToMins(normalizeTo24h(match.time));
    const end = start + (match.duration ?? fixed.duration);

    if (start < opts.wakeMins) {
      pushConflict(debug, {
        activity: fixed.activity,
        kind: "wake",
        warning: `${fixed.activity} starts before wake-up`,
        suggestion: "Adjust timing or wake-up time",
      });
    }
    if (start >= opts.sleepMins) {
      pushConflict(debug, {
        activity: fixed.activity,
        kind: "sleep",
        warning: `${fixed.activity} starts at or after bedtime`,
        suggestion: "Move the activity earlier or adjust bedtime",
      });
    }

    if (
      opts.hasSchool &&
      opts.schoolStartMins != null &&
      opts.schoolEndMins != null &&
      start < opts.schoolEndMins &&
      end > opts.schoolStartMins
    ) {
      pushConflict(debug, {
        activity: fixed.activity,
        kind: "school",
        warning: `${fixed.activity} overlaps with school hours`,
        suggestion: schoolOverlapSuggestion(
          fixed,
          opts.schoolStartMins,
          opts.schoolEndMins,
        ),
      });
      debug.adjustmentsMade.push(
        `Kept "${fixed.activity}" at parent-set time despite school overlap`,
      );
    }

    const sleepItem = items.find((i) => /lights out|sleep/i.test(i.activity));
    if (sleepItem) {
      const sleepStart = parseTimeToMins(normalizeTo24h(sleepItem.time));
      if (end > sleepStart) {
        pushConflict(debug, {
          activity: fixed.activity,
          kind: "sleep",
          warning: `${fixed.activity} runs into wind-down — may reduce sleep`,
          suggestion: sleepImpactSuggestion(fixed, sleepStart),
        });
        debug.adjustmentsMade.push(
          `Kept "${fixed.activity}" — user-defined priority over sleep buffer`,
        );
      }
    }
  }

  debug.fixedActivitiesApplied = true;
  debug.activitiesForToday = fixedList.map((f) => f.activity);
  finalizeFixedActivitiesSummary(debug);
  return debug;
}

export function ensureFixedActivitiesPreserved(
  items: RoutineScheduleItem[],
  fixedList: ParsedFixedActivity[],
  bounds: { wakeMins: number; sleepMins: number },
  debug?: FixedActivitiesDebug,
): RoutineScheduleItem[] {
  if (!fixedList.length) return items;

  let working = injectFixedActivityBlocks(
    items.filter(
      (i) =>
        !fixedList.some((f) => isProbableDuplicateOfFixed(i, f)) ||
        isFixedRecurringItem(i),
    ),
    fixedList,
  );

  const shifted = shiftNonLockedAroundLockedEvents(working);
  if (debug) mergeTimelineShifts(debug, shifted.shiftsApplied);
  working = shifted.items;
  return resolveTimelineOverlaps(working, bounds.wakeMins, bounds.sleepMins);
}

export function fixedActivitiesAdaptationTags(debug: FixedActivitiesDebug): string[] {
  if (!debug.fixedActivitiesApplied) return [];
  return [
    "fixed-activities:applied",
    ...debug.activitiesForToday.map((a) => `fixed-activity:${a}`),
    ...debug.conflicts.map((c) => `fixed-conflict:${c.warning}`),
    ...debug.shiftsApplied.map((s) => `fixed-shift:${s.activity}:${s.reason}`),
    ...debug.adjustmentsMade.map((a) => `fixed-adjust:${a}`),
    ...debug.validationWarnings,
  ];
}

/** API-facing shape for GeneratedRoutine.fixedActivitiesResult */
export function toFixedActivitiesResult(
  debug: FixedActivitiesDebug,
  childName?: string | null,
) {
  finalizeFixedActivitiesSummary(debug, childName);
  return {
    fixedActivitiesApplied: debug.fixedActivitiesApplied,
    hasBlockingConflicts: debug.hasBlockingConflicts,
    summaryMessage: debug.summaryMessage,
    activitiesForToday: debug.activitiesForToday,
    conflicts: debug.conflicts,
    conflictsDetected: debug.conflictsDetected,
    adjustmentsMade: debug.adjustmentsMade,
    shiftsApplied: debug.shiftsApplied,
    validationWarnings: debug.validationWarnings,
  };
}
