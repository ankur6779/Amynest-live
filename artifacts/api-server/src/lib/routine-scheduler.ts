/**
 * Deterministic routine timeline builder — all logic in minutes-from-midnight;
 * HH:MM strings only at output boundaries.
 */
import { type AgeGroup } from "./routine-templates.js";
import type { LaunchCountry } from "./routine-country-profile.js";
import {
  clampOutdoorToEveningWindow,
  isOutdoorBlockedByHeat,
  isPreDinnerActiveBlock,
  orderItemsByCountryStructure,
  type StructureBlockKind,
} from "./routine-country-structure.js";

export type ScheduleDecisionMeta = {
  reason: string;
  source: "safety" | "health" | "development" | "preference" | "structure";
  originalActivity?: string;
};

/** EQIE health guidance when air quality or weather limits activity. */
export type RoutineActivityAdvisory = {
  level: "info" | "warning" | "critical";
  message: string;
  actions: string[];
};

export type RoutineScheduleItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
  status?: "pending" | "completed" | "skipped" | "delayed";
  rewardPoints?: number;
  meal?: string | null;
  recipe?: unknown;
  nutrition?: unknown;
  ageBand?: "2-5" | "6-10" | "10+";
  parentHubTopic?: string;
  /** Explainability metadata for patent / UX traceability. */
  scheduleDecision?: ScheduleDecisionMeta;
  /** Cultural localization tag for analytics / UX. */
  culturalTag?: string;
  /** Country structure template kind — drives ordering before placement. */
  structureKind?: StructureBlockKind;
  /** Country-specific dish suggestions for meal blocks. */
  dishes?: string[];
  /** Block kind for infant feeding (no dishes on 0–6 months). */
  type?: string;
  /** Infant milk type — breast_milk | formula (distinct from parent feedingType enum). */
  feedingType?: "breast_milk" | "formula" | "mixed";
  culturalReason?: string;
  energyImpact?: string;
  /** AQI / pollution guidance for parents (India metros, high AQI). */
  advisory?: RoutineActivityAdvisory;
  /** UI/debug only — does not affect scheduling. */
  routineExplanation?: { reason: string; source: string };
  displayStart?: string;
  displayEnd?: string;
  /** Parent special plan — must not be moved by meal/weather passes. */
  locked?: boolean;
  /** `fixed` = recurring parent-set activity; `special` = one-off plan. */
  activitySource?: "fixed" | "special" | "generated";
};

export type TimePeriod = "morning" | "afternoon" | "evening" | "night";

export type ScheduledBlock = {
  activity: string;
  start: string;
  end: string;
};

export type MealWindow = { start: number; end: number };

export type ScheduleOpts = {
  wakeUpTime: string;
  sleepTime: string;
  ageGroup: AgeGroup;
  schoolStartMins?: number;
  schoolEndMins?: number;
  hasSchool?: boolean;
  /** Launch market — drives structure ordering and heat-aware placement. */
  country?: LaunchCountry | string;
  /** When set, overrides static meal windows (from context interpretation layer). */
  mealWindows?: {
    breakfast: MealWindow;
    lunch: MealWindow;
    dinner: MealWindow;
  };
  /** Skip lunch/dinner re-anchoring when enforceIntegratedRoutineFlow already placed meals. */
  skipMealReanchor?: boolean;
  /** Child age in months — infant/toddler feeding integration. */
  ageInMonths?: number;
  feedingType?: "breastfeeding" | "formula" | "mixed";
};

export type ValidationResult = {
  valid: boolean;
  items: RoutineScheduleItem[];
  errors: string[];
};

export type ResolveResult = ValidationResult & {
  usedFallback: boolean;
};

/** Internal slot — times are extended minutes (supports cross-midnight days). */
type InternalSlot = {
  startExt: number;
  duration: number;
  item: RoutineScheduleItem;
  priority: number;
};

type DayBounds = {
  wakeMins: number;
  sleepMins: number;
  endExt: number;
  windowMins: number;
};

const MIN_ACTIVITY_MINS = 10;
const MIN_WINDOW_MINS = 6 * 60;
const MAX_WINDOW_MINS = 20 * 60;

const PRIORITY_SPECIAL_EVENT = 1;
const PRIORITY_SLEEP = 2;
const PRIORITY_SCHOOL = 3;
const PRIORITY_MEAL = 4;
const PRIORITY_STUDY = 5;
const PRIORITY_PLAY = 6;
const PRIORITY_DEFAULT = 7;
const PRIORITY_FREE = 8;

const HIGH_ENERGY_CATS = new Set(["play", "outdoor", "exercise", "activity"]);
const STUDY_CATS = new Set(["study", "school"]);
const PLAY_CATS = new Set(["play", "outdoor", "creative", "exercise", "activity"]);
const OUTDOOR_RE =
  /\b(outdoor|park|playground|walk|nature|garden|cricket|beach)\b/i;

const MIN_GAP_DEFAULT = 10;
const MIN_GAP_MEAL = 15;
const MIN_GAP_HIGH_ENERGY = 15;

const STUDY_LATEST_START = 21 * 60;
const PLAY_LATEST_START = 22 * 60;
const DEFAULT_MEAL_WINDOWS = {
  breakfast: { start: 6 * 60, end: 10 * 60 },
  lunch: { start: 12 * 60, end: 15 * 60 },
  dinner: { start: 18 * 60, end: 21 * 60 + 30 },
} as const;

function mealWindows(opts?: ScheduleOpts): typeof DEFAULT_MEAL_WINDOWS {
  return opts?.mealWindows ?? DEFAULT_MEAL_WINDOWS;
}

// ─── Debug (dev only) ───────────────────────────────────────────────────────

function scheduleDebug(label: string, data?: unknown): void {
  if (
    process.env.ROUTINE_SCHEDULER_DEBUG === "1" ||
    process.env.NODE_ENV === "development"
  ) {
    if (data !== undefined) {
      console.log(`[routine-scheduler] ${label}`, data);
    } else {
      console.log(`[routine-scheduler] ${label}`);
    }
  }
}

// ─── Time primitives (minutes only) ─────────────────────────────────────────

/** Parse any display time → clock minutes 0–1439. */
export function parseTimeToMins(t: string): number {
  const normalized = normalizeTo24h(t);
  const [h, m] = normalized.split(":").map((x) => parseInt(x, 10));
  return h! * 60 + m!;
}

/** "7:00 AM" | "07:00" → "07:00" (output helper only). */
export function normalizeTo24h(t: string): string {
  if (!t) return "07:00";
  const cleaned = t.replace(/\s+/g, " ").trim();
  const m12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1]!, 10);
    const min = parseInt(m12[2]!, 10);
    const ap = m12[3]!.toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
  }
  const m24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = parseInt(m24[1]!, 10);
    const min = parseInt(m24[2]!, 10);
    return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
  }
  return "07:00";
}

export function minsToTime24(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function clockFromExt(ext: number): number {
  return ((ext % 1440) + 1440) % 1440;
}

function toExtended(clockMins: number, wakeMins: number): number {
  if (clockMins < wakeMins - 120) return clockMins + 1440;
  return clockMins;
}

export function computeDayBounds(wakeUpTime: string, sleepTime: string): DayBounds {
  const wakeMins = parseTimeToMins(wakeUpTime);
  let sleepMins = parseTimeToMins(sleepTime);
  let endExt = sleepMins;
  if (sleepMins <= wakeMins) {
    endExt = sleepMins + 1440;
  }
  const windowMins = endExt - wakeMins;
  return { wakeMins, sleepMins, endExt, windowMins };
}

export function getTimePeriod(mins: number): TimePeriod {
  const m = clockFromExt(mins);
  if (m >= 5 * 60 && m < 12 * 60) return "morning";
  if (m >= 12 * 60 && m < 17 * 60) return "afternoon";
  if (m >= 17 * 60 && m < 21 * 60) return "evening";
  return "night";
}

// ─── Item classification ──────────────────────────────────────────────────────

export function isSleepItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  return cat === "sleep" || /sleep|bedtime|lights out|good night/i.test(item.activity);
}

function isSchoolItem(item: RoutineScheduleItem): boolean {
  return (item.category ?? "").toLowerCase() === "school";
}

function isTiffinItem(item: RoutineScheduleItem): boolean {
  return (item.category ?? "").toLowerCase() === "tiffin";
}

function isMealItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  return cat === "meal" || cat === "tiffin";
}

function isPinnedMealItem(item: RoutineScheduleItem): boolean {
  if (isTiffinItem(item)) return true;
  const act = item.activity.toLowerCase();
  return (
    isMealItem(item) &&
    /\b(breakfast|lunch|dinner|drunch|tiffin|quick meal before school)\b/i.test(act)
  );
}

export function isLockedScheduleItem(item: RoutineScheduleItem): boolean {
  return (
    item.locked === true ||
    item.culturalTag === "special_event" ||
    item.culturalTag === "fixed_recurring" ||
    item.activitySource === "fixed" ||
    item.activitySource === "special" ||
    (item as { structureKind?: string }).structureKind === "special_event"
  );
}

function isPinnedScheduleItem(item: RoutineScheduleItem): boolean {
  return (
    isLockedScheduleItem(item) ||
    isSchoolItem(item) ||
    isPinnedMealItem(item) ||
    isSleepItem(item)
  );
}

function mealKind(activity: string): keyof typeof DEFAULT_MEAL_WINDOWS | null {
  const a = activity.toLowerCase();
  if (/\b(breakfast|morning starter|wake-up nutrition|quick meal)\b/i.test(a)) return "breakfast";
  if (/\bdrunch\b/i.test(a)) return null;
  if (/\blunch\b/i.test(a)) return "lunch";
  if (/\bdinner\b/i.test(a)) return "dinner";
  return null;
}

function itemPriority(item: RoutineScheduleItem): number {
  if (isLockedScheduleItem(item)) return PRIORITY_SPECIAL_EVENT;
  if (isSleepItem(item)) return PRIORITY_SLEEP;
  if (isSchoolItem(item)) return PRIORITY_SCHOOL;
  if (isPinnedMealItem(item)) return PRIORITY_MEAL;
  const cat = (item.category ?? "").toLowerCase();
  if (
    cat === "outdoor" ||
    (item as { structureKind?: string }).structureKind === "outdoor_evening"
  ) {
    return PRIORITY_STUDY;
  }
  if (STUDY_CATS.has(cat)) return PRIORITY_STUDY;
  if (PLAY_CATS.has(cat)) return PRIORITY_PLAY;
  if (cat === "rest" && /free time/i.test(item.activity)) return PRIORITY_FREE;
  return PRIORITY_DEFAULT;
}

export function isCategoryAllowedAt(period: TimePeriod, category: string): boolean {
  const cat = category.toLowerCase();
  if (cat === "sleep" || cat === "rest") {
    return period === "night" || period === "evening";
  }
  if (STUDY_CATS.has(cat)) {
    return period === "morning" || period === "afternoon";
  }
  if (PLAY_CATS.has(cat)) {
    return period === "afternoon" || period === "evening" || period === "morning";
  }
  if (period === "night") {
    return ["meal", "self_care", "family", "morning_routine", "tiffin"].includes(cat);
  }
  return true;
}

/** Activity context enforcer — returns corrected clock-minute start. */
export function enforceActivityContext(
  clockStart: number,
  item: RoutineScheduleItem,
  windows: typeof DEFAULT_MEAL_WINDOWS = DEFAULT_MEAL_WINDOWS,
): number {
  if (isLockedScheduleItem(item) || isTiffinItem(item) || isSchoolItem(item)) {
    return clockStart;
  }

  let start = clockStart;
  const cat = (item.category ?? "").toLowerCase();

  if (STUDY_CATS.has(cat) && start >= STUDY_LATEST_START) {
    start = Math.max(windows.lunch.start, STUDY_LATEST_START - 60);
  }
  if (PLAY_CATS.has(cat) && start >= PLAY_LATEST_START) {
    start = Math.min(PLAY_LATEST_START - 45, 17 * 60);
  }

  if (/\bdrunch\b/i.test(item.activity)) {
    const dur = item.duration ?? 30;
    if (start < 17 * 60) start = 17 * 60;
    if (start > 18 * 60 + 30 - dur) start = Math.max(17 * 60, 18 * 60 + 30 - dur);
  }

  const kind = mealKind(item.activity);
  if (kind) {
    const win = windows[kind];
    if (start < win.start) start = win.start;
    if (start > win.end - MIN_ACTIVITY_MINS) {
      start = Math.max(win.start, win.end - (item.duration ?? 30));
    }
  }

  if (!isCategoryAllowedAt(getTimePeriod(start), cat)) {
    for (let probe = start; probe < start + 6 * 60; probe += 15) {
      if (isCategoryAllowedAt(getTimePeriod(probe), cat)) return probe;
    }
  }

  return start;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function ensureSleepBlock(
  items: RoutineScheduleItem[],
  sleepMins: number,
): RoutineScheduleItem[] {
  if (items.some(isSleepItem)) return items;
  return [
    ...items,
    {
      time: minsToTime24(sleepMins),
      activity: "Lights out",
      duration: 30,
      category: "sleep",
      status: "pending",
    },
  ];
}

/** Restore meal/school anchors after energy-curve swaps (mirrors anchorMealSlots). */
function reassertMealAnchors(
  items: RoutineScheduleItem[],
  opts: ScheduleOpts,
): void {
  const tiffinIdxs: number[] = [];
  items.forEach((it, i) => {
    if (isTiffinItem(it) || /\btiffin\b/i.test(it.activity)) tiffinIdxs.push(i);
  });
  if (tiffinIdxs.length > 1) {
    for (let j = tiffinIdxs.length - 1; j > 0; j--) {
      items.splice(tiffinIdxs[j]!, 1);
    }
  }

  const hasSchool = opts.hasSchool === true;
  const schoolStart = opts.schoolStartMins ?? -1;
  const schoolEnd = opts.schoolEndMins ?? -1;
  const ageGroup = opts.ageGroup;

  let anchoredLunchMins = -1;

  for (const item of items) {
    if (/\bbreakfast\b/i.test(item.activity) && (item.category ?? "").toLowerCase() === "meal") {
      if (hasSchool && schoolStart >= 0) {
        item.activity = "Quick Meal Before School";
        item.duration = 15;
        item.time = minsToTime24(Math.max(0, schoolStart - 15));
      } else {
        item.time = minsToTime24(clamp(parseTimeToMins(item.time), 8 * 60, 9 * 60));
      }
    }
  }

  if (
    hasSchool &&
    schoolStart >= 0 &&
    (ageGroup === "early_school" || ageGroup === "pre_teen" || ageGroup === "preschool")
  ) {
    for (const item of items) {
      if (isTiffinItem(item) || /\btiffin\b/i.test(item.activity)) {
        item.activity = "Tiffin";
        item.category = "tiffin";
        item.time = minsToTime24(schoolStart + 60);
        item.duration = Math.max(item.duration ?? 15, 15);
      }
    }
  }

  for (const item of items) {
    if (/\blunch\b/i.test(item.activity) && (item.category ?? "").toLowerCase() === "meal") {
      if (
        hasSchool &&
        schoolEnd > 0 &&
        (ageGroup === "preschool" || ageGroup === "early_school" || ageGroup === "pre_teen")
      ) {
        anchoredLunchMins = schoolEnd + 75;
        item.time = minsToTime24(anchoredLunchMins);
      } else if (!hasSchool) {
        anchoredLunchMins = clamp(parseTimeToMins(item.time), 13 * 60 + 30, 14 * 60 + 30);
        item.time = minsToTime24(anchoredLunchMins);
      }
    }
  }

  if (ageGroup !== "infant") {
    const drunchEarliest =
      anchoredLunchMins > 0 ? Math.max(17 * 60, anchoredLunchMins + 120) : 17 * 60;
    const drunchLatest = 18 * 60 + 30;
    for (const item of items) {
      if (
        /(\bdrunch\b|afternoon snack|after-school snack|evening snack)/i.test(item.activity) &&
        (item.category ?? "").toLowerCase() === "meal"
      ) {
        item.activity = "Drunch";
        item.time = minsToTime24(clamp(parseTimeToMins(item.time), drunchEarliest, drunchLatest));
        item.duration = Math.max(item.duration ?? 20, 20);
      }
    }
  }

  const dinnerWin = mealWindows(opts).dinner;
  for (const item of items) {
    if (/\bdinner\b/i.test(item.activity) && (item.category ?? "").toLowerCase() === "meal") {
      item.time = minsToTime24(
        clamp(parseTimeToMins(item.time), dinnerWin.start, dinnerWin.end),
      );
    }
  }

  if (hasSchool && schoolStart >= 0 && schoolEnd > schoolStart) {
    for (const item of items) {
      if (isSchoolItem(item)) {
        item.time = minsToTime24(schoolStart);
        item.duration = schoolEnd - schoolStart;
      }
    }
  }
}

export function clampDurationForCategory(category: string, duration: number): number {
  const cat = category.toLowerCase();
  const d = Math.max(MIN_ACTIVITY_MINS, Math.round(duration));
  if (STUDY_CATS.has(cat)) return Math.min(90, Math.max(30, d));
  if (PLAY_CATS.has(cat)) return Math.min(60, Math.max(30, d));
  if (cat === "meal" || cat === "tiffin") return Math.min(40, Math.max(20, d));
  if (cat === "sleep" || cat === "rest") return Math.min(30, Math.max(15, d));
  if (cat === "self_care" || cat === "morning_routine") return Math.min(30, Math.max(15, d));
  return Math.min(90, Math.max(MIN_ACTIVITY_MINS, d));
}

function gapAfter(item: RoutineScheduleItem): number {
  const cat = (item.category ?? "").toLowerCase();
  if (HIGH_ENERGY_CATS.has(cat)) return MIN_GAP_HIGH_ENERGY;
  if (cat === "meal" || cat === "tiffin") return MIN_GAP_MEAL;
  return MIN_GAP_DEFAULT;
}

/** No more than 2 consecutive items of the same category group. */
export function diversifyActivityOrder(items: RoutineScheduleItem[]): RoutineScheduleItem[] {
  const pool = [...items];
  const out: RoutineScheduleItem[] = [];
  let lastGroup = "";
  let run = 0;

  const groupOf = (it: RoutineScheduleItem): string => {
    const c = (it.category ?? "").toLowerCase();
    if (STUDY_CATS.has(c)) return "study";
    if (PLAY_CATS.has(c)) return "play";
    if (isMealItem(it)) return "meal";
    return c || "other";
  };

  while (pool.length > 0) {
    let idx = 0;
    const group = groupOf(pool[0]!);
    if (group === lastGroup && run >= 2) {
      const alt = pool.findIndex((p) => groupOf(p) !== group);
      if (alt >= 0) idx = alt;
    }
    const picked = pool.splice(idx, 1)[0]!;
    const g = groupOf(picked);
    run = g === lastGroup ? run + 1 : 1;
    lastGroup = g;
    out.push(picked);
  }
  return out;
}

// ─── Slot helpers ─────────────────────────────────────────────────────────────

function slotsToItems(slots: InternalSlot[]): RoutineScheduleItem[] {
  return slots
    .sort((a, b) => a.startExt - b.startExt)
    .map((s) => ({
      ...s.item,
      time: minsToTime24(clockFromExt(s.startExt)),
      duration: s.duration,
    }));
}

function slotEnd(slot: InternalSlot): number {
  return slot.startExt + slot.duration;
}

function overlaps(a: InternalSlot, b: InternalSlot): boolean {
  return a.startExt < slotEnd(b) && b.startExt < slotEnd(a);
}

// ─── Priority-based timeline builder ─────────────────────────────────────────

export function buildPriorityTimeline(
  sourceItems: RoutineScheduleItem[],
  bounds: DayBounds,
  opts: ScheduleOpts,
): InternalSlot[] {
  const windows = mealWindows(opts);
  const { wakeMins, sleepMins, endExt } = bounds;
  const schoolStart =
    opts.hasSchool && opts.schoolStartMins != null ? opts.schoolStartMins : -1;
  const schoolEnd =
    opts.hasSchool && opts.schoolEndMins != null ? opts.schoolEndMins : -1;

  let sleepTemplate: RoutineScheduleItem | null = null;
  const buckets: RoutineScheduleItem[] = [];

  const lockedEvents: RoutineScheduleItem[] = [];

  for (const item of sourceItems) {
    if (isSleepItem(item)) {
      if (!sleepTemplate) sleepTemplate = { ...item };
      continue;
    }
    if (isLockedScheduleItem(item)) {
      lockedEvents.push(item);
      continue;
    }
    if (isSchoolItem(item) && schoolStart >= 0) continue;
    buckets.push(item);
  }

  const adaptivePool = buckets.filter((it) => !isPinnedMealItem(it) && !isTiffinItem(it));
  const adaptive = opts.country
    ? orderItemsByCountryStructure(adaptivePool, opts.country)
    : diversifyActivityOrder(adaptivePool);
  const pinnedMeals = buckets.filter(isPinnedMealItem);

  const slots: InternalSlot[] = [];

  const addSlot = (
    item: RoutineScheduleItem,
    startExt: number,
    duration: number,
    priority: number,
    pinExactStart = false,
  ): void => {
    const dur = Math.max(MIN_ACTIVITY_MINS, duration);
    const clock = clockFromExt(startExt);
    const fixedClock = enforceActivityContext(clock, item, windows);
    const fixedExt = toExtended(fixedClock, wakeMins);
    const placedStart = pinExactStart
      ? fixedExt
      : Math.max(wakeMins, Math.min(fixedExt, endExt - dur));
    slots.push({
      startExt: placedStart,
      duration: dur,
      item: { ...item, duration: dur },
      priority,
    });
  };

  // 1. Sleep (fixed)
  const sleepDur = clampDurationForCategory(
    "sleep",
    sleepTemplate?.duration ?? 30,
  );
  addSlot(
    sleepTemplate ?? {
      time: "",
      activity: "Lights out",
      duration: sleepDur,
      category: "sleep",
      status: "pending",
    },
    toExtended(sleepMins, wakeMins),
    sleepDur,
    PRIORITY_SLEEP,
    true,
  );

  // 2. Locked special events (parent plans — fixed time)
  for (const ev of lockedEvents) {
    const clock = parseTimeToMins(normalizeTo24h(ev.time));
    addSlot(
      ev,
      toExtended(clock, wakeMins),
      clampDurationForCategory(ev.category ?? "family", ev.duration ?? 45),
      PRIORITY_SPECIAL_EVENT,
      true,
    );
  }

  // 3. School (fixed)
  if (schoolStart >= 0 && schoolEnd > schoolStart) {
    addSlot(
      {
        time: "",
        activity: "At school",
        duration: schoolEnd - schoolStart,
        category: "school",
        status: "pending",
      },
      toExtended(schoolStart, wakeMins),
      schoolEnd - schoolStart,
      PRIORITY_SCHOOL,
    );
  }

  // 4. Pinned meals (anchored clock positions)
  for (const meal of pinnedMeals) {
    const clock = enforceActivityContext(
      parseTimeToMins(normalizeTo24h(meal.time)),
      meal,
      windows,
    );
    addSlot(
      meal,
      toExtended(clock, wakeMins),
      isPinnedMealItem(meal) && /quick meal/i.test(meal.activity)
        ? meal.duration ?? 15
        : clampDurationForCategory(meal.category, meal.duration ?? 30),
      PRIORITY_MEAL,
    );
  }

  // Sort fixed slots by priority then time
  slots.sort((a, b) => a.priority - b.priority || a.startExt - b.startExt);

  // 4–5. Adaptive study / play — sequential fill avoiding fixed slots
  let cursor = wakeMins;
  const fixedSorted = [...slots].sort((a, b) => a.startExt - b.startExt);

  const dinnerSlot = slots.find((s) => /\bdinner\b/i.test(s.item.activity));
  const dinnerStartExt = dinnerSlot?.startExt ?? -1;

  const nextGapStart = (from: number): number => {
    for (const fixed of fixedSorted) {
      if (fixed.startExt >= from && fixed.startExt < from + 240) {
        if (from < fixed.startExt) return from;
        return slotEnd(fixed) + MIN_GAP_DEFAULT;
      }
    }
    return from;
  };

  for (const item of adaptive) {
    const cat = (item.category ?? "").toLowerCase();
    const priority = itemPriority(item);
    let dur = clampDurationForCategory(cat, item.duration ?? 30);

    cursor = nextGapStart(cursor);
    if (schoolStart >= 0 && cursor < schoolEnd && cursor >= schoolStart) {
      cursor = schoolEnd + MIN_GAP_DEFAULT;
    }
    cursor = nextAllowedExt(cursor, cat, endExt - dur, wakeMins, opts.country);

    if (
      dinnerStartExt > 0 &&
      isPreDinnerActiveBlock(item) &&
      cursor + dur > dinnerStartExt - MIN_GAP_MEAL
    ) {
      cursor = Math.max(wakeMins, dinnerStartExt - dur - MIN_GAP_MEAL);
      if (schoolEnd > 0 && cursor < schoolEnd) {
        cursor = schoolEnd + MIN_GAP_DEFAULT;
      }
    }

    if (opts.country && (OUTDOOR_RE.test(item.activity) || cat === "outdoor")) {
      const clock = clockFromExt(cursor);
      if (isOutdoorBlockedByHeat(clock, opts.country)) {
        cursor = toExtended(clampOutdoorToEveningWindow(clock, opts.country), wakeMins);
      }
    }

    for (const fixed of fixedSorted) {
      if (overlaps({ startExt: cursor, duration: dur, item, priority }, fixed)) {
        cursor = slotEnd(fixed) + gapAfter(fixed.item);
      }
    }

    if (cursor + dur > endExt - sleepDur - MIN_GAP_DEFAULT) break;

    slots.push({
      startExt: cursor,
      duration: dur,
      item: { ...item, duration: dur },
      priority,
    });
    cursor = cursor + dur + gapAfter(item);
  }

  // 6. Free time fill before sleep
  const merged = mergeAndFillGaps(slots, bounds);
  return merged;
}

function nextAllowedExt(
  from: number,
  category: string,
  ceiling: number,
  wakeMins: number,
  country?: string,
): number {
  let cursor = from;
  for (let i = 0; i < 96 && cursor < ceiling; i++) {
    const clock = clockFromExt(cursor);
    if (
      country &&
      (OUTDOOR_RE.test(category) || category === "outdoor") &&
      isOutdoorBlockedByHeat(clock, country)
    ) {
      cursor = toExtended(clampOutdoorToEveningWindow(clock, country), wakeMins);
      continue;
    }
    if (isCategoryAllowedAt(getTimePeriod(cursor), category)) return cursor;
    cursor += 15;
  }
  return from;
}

/**
 * Shift or shorten non-pinned blocks so meal anchors never overlap neighbors.
 * Runs after reassertMealAnchors when dinner/lunch times are re-clamped.
 */
export function resolveTimelineOverlaps(
  items: RoutineScheduleItem[],
  wakeMins: number,
  sleepMins: number,
  errors: string[] = [],
): RoutineScheduleItem[] {
  const sorted = [...items].sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));

  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;
      if (isSleepItem(prev)) continue;

      const prevStart = parseTimeToMins(prev.time);
      const prevEnd = prevStart + (prev.duration ?? 30);
      let currStart = parseTimeToMins(curr.time);

      if (currStart >= prevEnd) continue;

      if (isPinnedScheduleItem(curr) && !isSleepItem(curr)) {
        if (!isPinnedScheduleItem(prev) || isSleepItem(prev)) {
          const maxPrevDur = Math.max(
            MIN_ACTIVITY_MINS,
            currStart - prevStart - gapAfter(prev),
          );
          if ((prev.duration ?? 30) > maxPrevDur) {
            prev.duration = maxPrevDur;
            changed = true;
            errors.push(`overlap: shortened "${prev.activity}" before pinned "${curr.activity}"`);
          }
        }
        continue;
      }

      if (isPinnedScheduleItem(prev) && !isSleepItem(prev)) {
        currStart = prevEnd + gapAfter(prev);
      } else {
        currStart = prevEnd + gapAfter(prev);
      }
      if (currStart !== parseTimeToMins(curr.time)) {
        curr.time = minsToTime24(currStart);
        changed = true;
        errors.push(`overlap: shifted "${curr.activity}" after "${prev.activity}"`);
      }
    }

    const sleepItem = sorted.find(isSleepItem);
    if (sleepItem) sleepItem.time = minsToTime24(sleepMins);

    if (!changed) break;
  }

  void wakeMins;
  return sorted;
}

/** Strip free-time blocks and rebuild gaps without overlaps (post meal-anchor). */
export function compactRoutineTimeline(
  items: RoutineScheduleItem[],
  wakeUpTime: string,
  sleepTime: string,
): RoutineScheduleItem[] {
  const bounds = computeDayBounds(wakeUpTime, sleepTime);
  const locked = items.filter((it) => isLockedScheduleItem(it) && !/free time/i.test(it.activity));
  const core = items.filter(
    (it) => !/free time/i.test(it.activity) && !isLockedScheduleItem(it),
  );
  const slots: InternalSlot[] = core.map((it) => ({
    startExt: toExtended(parseTimeToMins(it.time), bounds.wakeMins),
    duration: it.duration ?? 30,
    item: it,
    priority: itemPriority(it),
  }));
  for (const ev of locked) {
    const clock = parseTimeToMins(normalizeTo24h(ev.time));
    slots.push({
      startExt: toExtended(clock, bounds.wakeMins),
      duration: clampDurationForCategory(ev.category ?? "family", ev.duration ?? 45),
      item: { ...ev },
      priority: PRIORITY_SPECIAL_EVENT,
    });
  }
  return slotsToItems(mergeAndFillGaps(slots, bounds));
}

function mergeAndFillGaps(slots: InternalSlot[], bounds: DayBounds): InternalSlot[] {
  const { wakeMins, endExt } = bounds;
  const sorted = [...slots].sort((a, b) => a.startExt - b.startExt || a.priority - b.priority);
  const out: InternalSlot[] = [];
  let cursor = wakeMins;

  for (const slot of sorted) {
    if (isSleepItem(slot.item)) {
      out.push(slot);
      continue;
    }
    const gapMins = slot.startExt - cursor;
    if (gapMins > 14) {
      const fillActivity =
        cursor < 12 * 60
          ? "Morning play & exploration"
          : cursor < 17 * 60
            ? "Creative play time"
            : "Family unwind time";
      const fillCategory =
        cursor < 12 * 60 ? "outdoor" : cursor < 17 * 60 ? "creative" : "family";
      out.push({
        startExt: cursor,
        duration: gapMins,
        item: {
          time: "",
          activity: fillActivity,
          duration: gapMins,
          category: fillCategory,
          notes: "Keeps the day flowing between scheduled blocks.",
          status: "pending",
        },
        priority: PRIORITY_FREE,
      });
    }
    const last = out[out.length - 1];
    if (last && !isSleepItem(last.item) && overlaps(last, slot)) {
      if (isLockedScheduleItem(slot.item)) {
        if (!isLockedScheduleItem(last.item)) {
          const lockStart = slot.startExt;
          const maxLastDur = Math.max(
            MIN_ACTIVITY_MINS,
            lockStart - last.startExt - gapAfter(last.item),
          );
          if (last.duration > maxLastDur) {
            last.duration = maxLastDur;
          }
        }
      } else if (isLockedScheduleItem(last.item)) {
        slot.startExt = slotEnd(last) + gapAfter(last.item);
      } else {
        slot.startExt = slotEnd(last) + gapAfter(last.item);
      }
    }
    out.push(slot);
    cursor = Math.max(cursor, slotEnd(slot) + gapAfter(slot.item));
  }

  const sleepSlot = out.find((s) => isSleepItem(s.item));
  if (sleepSlot) {
    const lastAwake = [...out]
      .filter((s) => !isSleepItem(s.item))
      .sort((a, b) => a.startExt - b.startExt)
      .pop();
    if (lastAwake) {
      const gapEnd = sleepSlot.startExt;
      const lastEnd = slotEnd(lastAwake) + gapAfter(lastAwake.item);
      if (gapEnd > lastEnd + 14) {
        const maxDur = Math.max(15, gapEnd - lastEnd - 5);
        const gapMins = Math.min(maxDur, 90);
        const idx = out.indexOf(sleepSlot);
        out.splice(idx, 0, {
          startExt: lastEnd,
          duration: gapMins,
          item: {
            time: "",
            activity:
              gapMins > 75
                ? "Calm family time before bed"
                : "Quiet wind-down time",
            duration: gapMins,
            category: gapMins > 75 ? "family" : "rest",
            status: "pending",
          },
          priority: PRIORITY_FREE,
        });
      }
    }
  }

  return out.sort((a, b) => a.startExt - b.startExt || a.priority - b.priority);
}

// ─── Safe fallback template ───────────────────────────────────────────────────

export function generateSafeRoutineTemplate(opts: ScheduleOpts): RoutineScheduleItem[] {
  const bounds = computeDayBounds(opts.wakeUpTime, opts.sleepTime);
  const { wakeMins, sleepMins } = bounds;

  const templates: Array<{
    activity: string;
    category: string;
    duration: number;
    clockStart: number;
    priority: number;
  }> = [
    { activity: "Wake up & freshen up", category: "morning_routine", duration: 30, clockStart: wakeMins, priority: PRIORITY_DEFAULT },
    { activity: "Breakfast", category: "meal", duration: 30, clockStart: Math.max(wakeMins + 60, DEFAULT_MEAL_WINDOWS.breakfast.start + 30), priority: PRIORITY_MEAL },
    { activity: "Learning block", category: "study", duration: 45, clockStart: wakeMins + 120, priority: PRIORITY_STUDY },
    { activity: "Creative play", category: "play", duration: 45, clockStart: wakeMins + 195, priority: PRIORITY_PLAY },
    { activity: "Lunch", category: "meal", duration: 35, clockStart: DEFAULT_MEAL_WINDOWS.lunch.start + 30, priority: PRIORITY_MEAL },
    { activity: "Indoor creative play", category: "play", duration: 45, clockStart: 15 * 60, priority: PRIORITY_PLAY },
    { activity: "Family time", category: "family", duration: 30, clockStart: 17 * 60 + 30, priority: PRIORITY_DEFAULT },
    { activity: "Dinner", category: "meal", duration: 35, clockStart: DEFAULT_MEAL_WINDOWS.dinner.start + 30, priority: PRIORITY_MEAL },
    { activity: "Wind-down & story", category: "rest", duration: 25, clockStart: sleepMins - 55, priority: PRIORITY_DEFAULT },
  ];

  if (opts.hasSchool && opts.schoolStartMins != null && opts.schoolEndMins != null) {
    templates.splice(2, 0, {
      activity: "At school",
      category: "school",
      duration: opts.schoolEndMins - opts.schoolStartMins,
      clockStart: opts.schoolStartMins,
      priority: PRIORITY_SCHOOL,
    });
    templates.splice(3, 0, {
      activity: "Tiffin",
      category: "tiffin",
      duration: 15,
      clockStart: opts.schoolStartMins + 60,
      priority: PRIORITY_MEAL,
    });
  }

  const slots: InternalSlot[] = templates.map((t) => ({
    startExt: toExtended(t.clockStart, wakeMins),
    duration: t.duration,
    item: {
      time: "",
      activity: t.activity,
      duration: t.duration,
      category: t.category,
      status: "pending" as const,
    },
    priority: t.priority,
  }));

  const sleepDur = 30;
  slots.push({
    startExt: toExtended(sleepMins, wakeMins),
    duration: sleepDur,
    item: {
      time: "",
      activity: "Lights out",
      duration: sleepDur,
      category: "sleep",
      status: "pending",
    },
    priority: PRIORITY_SLEEP,
  });

  return slotsToItems(mergeAndFillGaps(slots, bounds));
}

// ─── Hard validation (fail-fast) ─────────────────────────────────────────────

export type HardValidationResult = {
  valid: boolean;
  errors: string[];
};

export function hardValidateSchedule(
  items: RoutineScheduleItem[],
  wakeUpTime: string,
  sleepTime: string,
): HardValidationResult {
  const errors: string[] = [];
  if (!items.length) return { valid: false, errors: ["empty routine"] };

  const bounds = computeDayBounds(wakeUpTime, sleepTime);
  const { wakeMins, sleepMins, windowMins } = bounds;

  if (windowMins < MIN_WINDOW_MINS || windowMins > MAX_WINDOW_MINS) {
    errors.push(
      `window ${windowMins}min outside ${MIN_WINDOW_MINS}–${MAX_WINDOW_MINS}min`,
    );
  }

  const slots: InternalSlot[] = items.map((it) => ({
    startExt: toExtended(parseTimeToMins(it.time), wakeMins),
    duration: it.duration ?? 30,
    item: it,
    priority: itemPriority(it),
  }));

  slots.sort((a, b) => a.startExt - b.startExt);

  for (const s of slots) {
    if (s.duration < MIN_ACTIVITY_MINS) {
      errors.push(`"${s.item.activity}" duration ${s.duration} < ${MIN_ACTIVITY_MINS}min`);
    }
  }

  for (let i = 1; i < slots.length; i++) {
    const prev = slots[i - 1]!;
    const curr = slots[i]!;
    if (isSleepItem(prev.item)) continue;
    if (
      (isSchoolItem(prev.item) && isTiffinItem(curr.item)) ||
      (isTiffinItem(prev.item) && isSchoolItem(curr.item))
    ) {
      continue;
    }
    if (curr.startExt < prev.startExt) {
      errors.push(`backward jump: "${curr.item.activity}" before "${prev.item.activity}"`);
    }
    const gap = isPinnedScheduleItem(prev.item) || isPinnedScheduleItem(curr.item) ? 0 : 1;
    if (curr.startExt < slotEnd(prev) - gap) {
      errors.push(`overlap: "${prev.item.activity}" and "${curr.item.activity}"`);
    }
  }

  const first = slots.find((s) => !isSleepItem(s.item));
  const sleep = slots.find((s) => isSleepItem(s.item));
  if (first && clockFromExt(first.startExt) !== wakeMins) {
    errors.push(`first activity not at wake (${minsToTime24(wakeMins)})`);
  }
  if (sleep && clockFromExt(sleep.startExt) !== sleepMins) {
    errors.push(`sleep not at bedtime (${minsToTime24(sleepMins)})`);
  }

  for (const s of slots) {
    if (/\b(AM|PM)\b/i.test(s.item.time)) {
      errors.push(`AM/PM in output: ${s.item.time}`);
    }
    if (!/^\d{2}:\d{2}$/.test(normalizeTo24h(s.item.time))) {
      errors.push(`invalid time format: ${s.item.time}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function slotsToRoutineItems(slots: InternalSlot[]): RoutineScheduleItem[] {
  return slotsToItems(slots);
}

/**
 * @deprecated Prefer `generateRoutineFromState` with `deriveBehavioralState`.
 * Kept for backward compatibility — runs the timeline builder without context adaptation.
 */
export function scheduleRoutineItems(
  items: RoutineScheduleItem[],
  opts: ScheduleOpts,
): RoutineScheduleItem[] {
  if (!items.length) return items;
  if (opts.ageGroup === "infant") {
    return items.map((it) => ({ ...it, time: normalizeTo24h(it.time) }));
  }

  const bounds = computeDayBounds(opts.wakeUpTime, opts.sleepTime);
  scheduleDebug("scheduleRoutineItems bounds", {
    wake: minsToTime24(bounds.wakeMins),
    sleep: minsToTime24(bounds.sleepMins),
    endExt: bounds.endExt,
    windowMins: bounds.windowMins,
  });

  const slots = buildPriorityTimeline(items, bounds, opts);
  const result = slotsToItems(slots);

  scheduleDebug("scheduleRoutineItems timeline (mins)", slots.map((s) => ({
    activity: s.item.activity,
    startExt: s.startExt,
    endExt: slotEnd(s),
    clock: minsToTime24(clockFromExt(s.startExt)),
  })));

  return result;
}

/**
 * Validate + soft-fix pinned items; does not trigger recovery.
 */
export function validateRoutineSchedule(
  items: RoutineScheduleItem[],
  wakeUpTime: string,
  sleepTime: string,
  opts?: ScheduleOpts,
): ValidationResult {
  const errors: string[] = [];
  if (!items.length) {
    return { valid: false, items, errors: ["empty routine"] };
  }

  const bounds = computeDayBounds(wakeUpTime, sleepTime);
  const { wakeMins, sleepMins } = bounds;

  let validated: RoutineScheduleItem[] = items.map((it) => ({
    ...it,
    time: normalizeTo24h(it.time),
    duration: isPinnedScheduleItem(it)
      ? Math.max(MIN_ACTIVITY_MINS, it.duration ?? 30)
      : clampDurationForCategory(it.category ?? "play", it.duration ?? 30),
  }));

  validated.sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));

  const firstAny = validated.find((it) => !isSleepItem(it));
  if (firstAny && parseTimeToMins(firstAny.time) !== wakeMins) {
    firstAny.time = minsToTime24(wakeMins);
    errors.push(`anchored first activity to wake ${minsToTime24(wakeMins)}`);
  }

  for (const item of validated) {
    if (isPinnedScheduleItem(item) && !isSleepItem(item)) continue;
    const clock = parseTimeToMins(item.time);
    const fixed = enforceActivityContext(clock, item);
    if (fixed !== clock) {
      item.time = minsToTime24(fixed);
      errors.push(`context shift "${item.activity}"`);
    }
  }

  validated.sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));

  for (let i = 1; i < validated.length; i++) {
    const prev = validated[i - 1]!;
    const curr = validated[i]!;
    if (isSleepItem(prev)) continue;

    const prevStart = parseTimeToMins(prev.time);
    const prevEnd = prevStart + (prev.duration ?? 30);
    let currStart = parseTimeToMins(curr.time);

    if (currStart >= prevEnd) continue;

    if (isPinnedScheduleItem(curr) && !isSleepItem(curr)) {
      if (!isPinnedScheduleItem(prev)) {
        const maxPrevDur = Math.max(MIN_ACTIVITY_MINS, currStart - prevStart - gapAfter(prev));
        if (maxPrevDur < (prev.duration ?? 30)) {
          prev.duration = maxPrevDur;
          errors.push(`shortened "${prev.activity}" before pinned "${curr.activity}"`);
        }
      }
      continue;
    }

    if (isPinnedScheduleItem(prev) && !isSleepItem(prev)) {
      currStart = prevEnd + gapAfter(prev);
    } else {
      currStart = prevEnd + gapAfter(prev);
    }
    curr.time = minsToTime24(currStart);
    errors.push(`fixed overlap before "${curr.activity}"`);
  }

  const sleepItem = validated.find(isSleepItem);
  if (sleepItem) {
    sleepItem.time = minsToTime24(sleepMins);
  }

  let output = validated;
  let hard = hardValidateSchedule(output, wakeUpTime, sleepTime);
  if (!hard.valid) {
    output = compactRoutineTimeline(validated, wakeUpTime, sleepTime);
    hard = hardValidateSchedule(output, wakeUpTime, sleepTime);
    if (!hard.valid) errors.push("compacted timeline still invalid");
  }

  if (opts) {
    if (!opts.skipMealReanchor) {
      reassertMealAnchors(output, opts);
    }
    output = resolveTimelineOverlaps(output, wakeMins, sleepMins, errors);
    output.sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
    hard = hardValidateSchedule(output, wakeUpTime, sleepTime);
    if (!hard.valid) {
      output = compactRoutineTimeline(output, wakeUpTime, sleepTime);
      hard = hardValidateSchedule(output, wakeUpTime, sleepTime);
    }
  }

  return {
    valid: hard.valid,
    items: output,
    errors: [...errors, ...hard.errors],
  };
}

/**
 * Final resolve: in-place validate + compact (preserves AI/meal anchors).
 * Falls back to safe template only if hard validation still fails twice.
 */
export function resolveRoutineSchedule(
  items: RoutineScheduleItem[],
  opts: ScheduleOpts,
): ResolveResult {
  const wake = normalizeTo24h(opts.wakeUpTime);
  const sleep = normalizeTo24h(opts.sleepTime);

  scheduleDebug("resolveRoutineSchedule input", {
    wake,
    sleep,
    itemCount: items.length,
    timelineMins: items.map((it) => ({
      activity: it.activity,
      start: parseTimeToMins(it.time),
      duration: it.duration,
    })),
  });

  const attemptInPlace = (source: RoutineScheduleItem[], label: string): ResolveResult => {
    const soft = validateRoutineSchedule(source, wake, sleep, { ...opts, wakeUpTime: wake, sleepTime: sleep });
    scheduleDebug(`resolveRoutineSchedule ${label}`, {
      softErrors: soft.errors,
      valid: soft.valid,
    });
    return {
      valid: soft.valid,
      items: soft.items,
      errors: soft.errors,
      usedFallback: false,
    };
  };

  let result = attemptInPlace(items, "validate-1");
  if (!result.valid) {
    result = attemptInPlace(result.items, "validate-2");
  }

  if (!result.valid) {
    let recovered = compactRoutineTimeline(result.items, wake, sleep);
    if (opts.hasSchool) {
      reassertMealAnchors(recovered, { ...opts, wakeUpTime: wake, sleepTime: sleep });
    }
    recovered.sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
    const hard = hardValidateSchedule(recovered, wake, sleep);
    if (hard.valid) {
      scheduleDebug("resolveRoutineSchedule recovered via compact+reassert", hard.errors);
      return {
        valid: true,
        items: ensureSleepBlock(recovered, parseTimeToMins(sleep)),
        errors: [...result.errors, "recovered via compact+reassert"],
        usedFallback: false,
      };
    }
  }

  const sleepMins = parseTimeToMins(sleep);

  if (!result.valid) {
    scheduleDebug("resolveRoutineSchedule fallback", result.errors);
    const fallback = generateSafeRoutineTemplate({ ...opts, wakeUpTime: wake, sleepTime: sleep });
    const recovered = validateRoutineSchedule(fallback, wake, sleep, {
      ...opts,
      wakeUpTime: wake,
      sleepTime: sleep,
    });
    return {
      valid: true,
      items: ensureSleepBlock(recovered.items, sleepMins),
      errors: [...result.errors, "used safe fallback template"],
      usedFallback: true,
    };
  }

  return {
    ...result,
    items: ensureSleepBlock(result.items, sleepMins),
  };
}

export function itemsToScheduledBlocks(items: RoutineScheduleItem[]): ScheduledBlock[] {
  return items.map((it) => {
    const startMins = parseTimeToMins(it.time);
    const endMins = startMins + (it.duration ?? 30);
    return {
      activity: it.activity,
      start: minsToTime24(startMins),
      end: minsToTime24(endMins),
    };
  });
}
