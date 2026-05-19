/**
 * Child Routine Optimization Engine — post-generation fixes for Indian households.
 * Improves meal timing, energy flow, study load, heatwave safety, and wind-down
 * without restructuring the whole day.
 */
import type { AgeGroup } from "./routine-templates.js";
import type { WeatherOutdoor } from "@workspace/family-routine";
import {
  classifyCanonicalMealKind,
  isRefuelItem,
} from "./routine-meal-day-type.js";

const AFTER_SCHOOL_REFUEL_LABEL = "After-school refuel";
import {
  clampDurationForCategory,
  isLockedScheduleItem,
  isSleepItem,
  minsToTime24,
  normalizeTo24h,
  parseTimeToMins,
  resolveTimelineOverlaps,
  type RoutineScheduleItem,
} from "./routine-scheduler.js";

const HEAVY_FOOD_RE =
  /\b(upma|chilla|paratha|rajma|chole|dal[\s-]?chawal|puri|biryani|khichdi|keema|bhatura|samosa|pakora|chole bhature)\b/i;

const LIGHT_WAKE_NOTES =
  "Light only — fruit, warm milk, or soaked nuts. Save a proper breakfast for the next slot.";

const LIGHT_REFUEL_NOTES =
  "Light refuel after school — fruit + milk, curd, or banana. Avoid a heavy plate right after travel.";

const LIGHT_SNACK_ONLY_NOTES = "Very light — milk or fruit only (dinner follows soon).";

const STUDY_RE =
  /\b(homework|study|tuition|revision|learning block|focused learning)\b/i;

const CHORE_RE =
  /\b(chore|responsibility task|home responsibility|setting the table|watering plants|folding laundry)\b/i;

const OUTDOOR_RE =
  /\b(outdoor|park|playground|cricket|football|cycling|walk in the sun|backyard sports)\b/i;

const WAKE_NUTRITION_RE = /\bwake[- ]?up nutrition\b/i;

export type RoutineOptimizationOpts = {
  wakeMins: number;
  sleepMins: number;
  isSchoolDay: boolean;
  isWeekendDay?: boolean;
  schoolStartMins?: number;
  schoolEndMins?: number;
  weatherOutdoor?: WeatherOutdoor;
  /** Celsius — heatwave when >= 32 */
  temperatureC?: number | null;
  ageGroup?: AgeGroup;
  // ── Decision-enforced layer inputs (optional; functions degrade gracefully) ──
  /** Concrete age in years — drives study/independence rules. */
  age?: number;
  /** Country profile signal — drives study volume in `enforceStudyBlock`. */
  academicIntensity?: "high" | "medium" | "low";
  /** Country profile signal — drives `applyIndependence`. */
  independenceLevel?: "high" | "medium" | "low";
  /** Country profile clamp for `enforceDinner` ([startMins, endMins]). */
  dinnerWindow?: readonly [number, number];
  /** `home_lunch | packed_lunch | school_lunch | cafeteria | …` — drives lunch block. */
  schoolMealMode?: string | null;
  /** `vegetarian | mixed | non_veg | …` — drives `enforceDiet`. */
  diet?: string | null;
  /** `mom | dad | both | grandparent | babysitter | self` — drives independence tasks. */
  caregiver?: string | null;
  /** Free-text region label (e.g. `british`, `indian`, `western`) — drives UK merge + diet. */
  region?: string | null;
  /** Optional ISO-style country code (US | UK | AU | IN | …) — fallback for region. */
  country?: string | null;
};

export type RoutineOptimizationResult = {
  title?: string;
  items: RoutineScheduleItem[];
  adaptations: string[];
};

function itemEndMins(item: RoutineScheduleItem): number {
  return parseTimeToMins(item.time) + (item.duration ?? 30);
}

function appendNote(item: RoutineScheduleItem, line: string): string {
  const base = item.notes?.trim() ?? "";
  if (!base) return line;
  if (base.includes(line.slice(0, 24))) return base;
  return `${base} ${line}`;
}

function isHeavyMealItem(item: RoutineScheduleItem): boolean {
  const text = `${item.activity} ${item.notes ?? ""} ${item.meal ?? ""}`;
  return HEAVY_FOOD_RE.test(text);
}

function isMealCategory(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  return cat === "meal" || cat === "tiffin";
}

function isStudyItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  return cat === "study" || cat === "homework" || STUDY_RE.test(item.activity);
}

function isChoreItem(item: RoutineScheduleItem): boolean {
  return CHORE_RE.test(item.activity) || CHORE_RE.test(item.notes ?? "");
}

function isOutdoorItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "outdoor" || cat === "exercise") return true;
  return OUTDOOR_RE.test(item.activity);
}

function isWindDownItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  return (
    cat === "wind-down" ||
    /\b(wind.?down|bedtime story|story time|lights out prep)\b/i.test(item.activity)
  );
}

function isHotOrLimited(opts: RoutineOptimizationOpts): boolean {
  if (opts.temperatureC != null && opts.temperatureC >= 32) return true;
  return opts.weatherOutdoor === "no" || opts.weatherOutdoor === "limited";
}

function resolveSchoolEndMins(
  items: RoutineScheduleItem[],
  opts: RoutineOptimizationOpts,
): number | null {
  if (opts.schoolEndMins != null && opts.schoolEndMins > 0) return opts.schoolEndMins;
  const school = items.find((it) => (it.category ?? "").toLowerCase() === "school");
  if (school) return itemEndMins(school);
  const ret = items.find((it) => /return home from school/i.test(it.activity));
  if (ret) return parseTimeToMins(ret.time);
  return null;
}

/** Rule 1 — wake-up nutrition light; heavy dishes belong in breakfast. */
export function fixMorningFlow(
  items: RoutineScheduleItem[],
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  const adaptations: string[] = [];
  const out = items.map((it) => ({ ...it }));

  const wakeIdx = out.findIndex(
    (it) => WAKE_NUTRITION_RE.test(it.activity) || /\bwake[- ]?up\b/i.test(it.activity) && isMealCategory(it),
  );
  const breakfastIdx = out.findIndex(
    (it) => /\bbreakfast\b/i.test(it.activity) && isMealCategory(it),
  );

  if (wakeIdx >= 0) {
    const wake = out[wakeIdx]!;
    if (isHeavyMealItem(wake)) {
      const heavyHint = wake.notes?.match(HEAVY_FOOD_RE)?.[0] ?? "heavier breakfast option";
      out[wakeIdx] = {
        ...wake,
        activity: "Wake-up Nutrition",
        notes: LIGHT_WAKE_NOTES,
      };
      adaptations.push("wake-up nutrition set to light fuel only");
      if (breakfastIdx >= 0) {
        const bf = out[breakfastIdx]!;
        out[breakfastIdx] = {
          ...bf,
          notes: appendNote(
            bf,
            `Includes a proper morning meal (e.g. ${heavyHint}) — not right at wake-up.`,
          ),
        };
      }
    } else if (!wake.notes || !/light only|fruit|milk|nuts/i.test(wake.notes)) {
      out[wakeIdx] = { ...wake, notes: LIGHT_WAKE_NOTES };
      adaptations.push("clarified wake-up nutrition as light starter");
    }
  }

  return { items: out, adaptations };
}

/** Rule 2 — after-school window: light refuel, not rajma/chole plates. */
export function fixAfterSchoolEnergy(
  items: RoutineScheduleItem[],
  opts: RoutineOptimizationOpts,
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  if (!opts.isSchoolDay) return { items, adaptations: [] };

  const schoolEnd = resolveSchoolEndMins(items, opts);
  if (schoolEnd == null) return { items, adaptations: [] };

  const adaptations: string[] = [];
  const windowEnd = schoolEnd + 150;
  let heavyRelocated = "";

  const out = items.map((it) => {
    if (!isMealCategory(it)) return it;
    const start = parseTimeToMins(it.time);
    if (start < schoolEnd || start > windowEnd) return it;

    if (!isHeavyMealItem(it) && !/\bafter[- ]?school snack\b/i.test(it.activity)) {
      if (isRefuelItem(it)) return it;
      return it;
    }

    const match = `${it.activity} ${it.notes ?? ""}`.match(HEAVY_FOOD_RE);
    if (match) heavyRelocated = match[0];

    adaptations.push(`after-school meal lightened: ${it.activity}`);
    return {
      ...it,
      activity: AFTER_SCHOOL_REFUEL_LABEL,
      category: "meal",
      duration: Math.min(it.duration ?? 15, 20),
      notes: LIGHT_REFUEL_NOTES,
    };
  });

  if (heavyRelocated) {
    const dinnerIdx = out.findIndex(
      (it) => classifyCanonicalMealKind(it) === "dinner" || /\bdinner\b/i.test(it.activity),
    );
    if (dinnerIdx >= 0) {
      const dinner = out[dinnerIdx]!;
      out[dinnerIdx] = {
        ...dinner,
        notes: appendNote(
          dinner,
          `Evening main can include ${heavyRelocated} — better after rest than right after school.`,
        ),
      };
    }
  }

  return { items: out, adaptations };
}

/** Rule 3 — school-day study caps + heatwave intensity reduction. */
export function optimizeStudyBlocks(
  items: RoutineScheduleItem[],
  opts: RoutineOptimizationOpts,
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  const adaptations: string[] = [];
  const hot = isHotOrLimited(opts);
  const maxStudy =
    opts.isSchoolDay && !opts.isWeekendDay
      ? hot
        ? 15
        : 25
      : hot
        ? 20
        : 35;

  const out = items.map((it) => {
    if (!isStudyItem(it) || isLockedScheduleItem(it)) return it;

    if (hot && !opts.isWeekendDay) {
      adaptations.push(`heat/low-energy: softened ${it.activity}`);
      return {
        ...it,
        activity: /homework|study/i.test(it.activity) ? "Quiet reading & worksheets" : it.activity,
        duration: Math.min(it.duration ?? 30, 15),
        category: it.category ?? "study",
        notes: appendNote(
          it,
          "Keep it low-intensity in this heat — short focus, no new topics. Screen-free.",
        ),
      };
    }

    const dur = Math.min(it.duration ?? 40, maxStudy);
    const focusNote =
      "Structure: ~20 min focused work, then a 5 min stretch/water break. Parent nearby, not doing it for them.";

    if (dur !== (it.duration ?? 40) || !it.notes?.includes("20 min")) {
      adaptations.push(`study block capped to ${dur} min with focus+break rhythm`);
    }

    return {
      ...it,
      duration: clampDurationForCategory(it.category ?? "study", dur),
      notes: appendNote(it, focusNote),
    };
  });

  return { items: out, adaptations };
}

/** Rule 4 — one chore, max ~20 minutes. */
export function limitChores(
  items: RoutineScheduleItem[],
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  const adaptations: string[] = [];
  let kept = 0;

  const out = items.filter((it) => {
    if (!isChoreItem(it) || isLockedScheduleItem(it)) return true;
    kept++;
    if (kept > 1) {
      adaptations.push(`removed extra chore: ${it.activity}`);
      return false;
    }
    return true;
  }).map((it) => {
    if (!isChoreItem(it)) return it;
    const dur = Math.min(it.duration ?? 20, 20);
    if (dur < (it.duration ?? 20)) {
      adaptations.push("chore capped to 20 minutes");
    }
    return {
      ...it,
      duration: dur,
      notes: appendNote(it, "One simple task only — praise effort, not perfection."),
    };
  });

  return { items: out, adaptations };
}

/** Rule 5 — avoid snack + heavy dinner stacked within 90 minutes. */
export function fixEveningFoodTiming(
  items: RoutineScheduleItem[],
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  const adaptations: string[] = [];
  const sorted = [...items].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );

  const dinnerIdx = sorted.findIndex(
    (it) => classifyCanonicalMealKind(it) === "dinner" || /\bdinner\b/i.test(it.activity),
  );
  const snackIdx = sorted.findIndex(
    (it) =>
      classifyCanonicalMealKind(it) === "snack" ||
      (/\bsnack|drunch\b/i.test(it.activity) && isMealCategory(it)),
  );

  if (dinnerIdx < 0 || snackIdx < 0) return { items, adaptations };

  const dinner = sorted[dinnerIdx]!;
  const snack = sorted[snackIdx]!;
  const gap = parseTimeToMins(dinner.time) - itemEndMins(snack);

  if (gap > 90 || gap < 0) return { items, adaptations };

  const out = items.map((it) => {
    if (it === snack || (it.time === snack.time && it.activity === snack.activity)) {
      if (isHeavyMealItem(snack)) {
        adaptations.push("evening snack lightened — dinner is the main meal");
        return { ...it, notes: LIGHT_SNACK_ONLY_NOTES, duration: Math.min(it.duration ?? 15, 15) };
      }
      adaptations.push("evening snack kept very light before dinner");
      return {
        ...it,
        notes: appendNote(it, LIGHT_SNACK_ONLY_NOTES),
        duration: Math.min(it.duration ?? 15, 15),
      };
    }
    return it;
  });

  return { items: out, adaptations };
}

/** Rule 6 — heatwave / limited outdoor: indoor movement, shorter blocks, hydration notes. */
export function applyHeatwaveAdaptation(
  items: RoutineScheduleItem[],
  opts: RoutineOptimizationOpts,
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  if (!isHotOrLimited(opts)) return { items, adaptations: [] };

  const adaptations: string[] = [];
  const out = items.map((it) => {
    if (!isOutdoorItem(it) || isLockedScheduleItem(it)) return it;

    const halfDur = Math.max(
      15,
      Math.floor((it.duration ?? 40) * 0.5),
    );
    adaptations.push(`heat adaptation: ${it.activity} → indoor movement`);
    return {
      ...it,
      activity: /sport|cricket|football/i.test(it.activity)
        ? "Indoor movement (yoga / dance / light games)"
        : "Indoor active play (cool room)",
      category: "play",
      duration: clampDurationForCategory("play", halfDur),
      notes: appendNote(
        it,
        "Hot day — stay indoors, sip water every 15–20 min, keep intensity about half of usual.",
      ),
    };
  });

  // Trim long high-energy play blocks
  const trimmed = out.map((it) => {
    const cat = (it.category ?? "").toLowerCase();
    if (cat !== "play" && cat !== "exercise") return it;
    if ((it.duration ?? 0) <= 45) return it;
    if (isLockedScheduleItem(it)) return it;
    adaptations.push(`shortened long play block in heat: ${it.activity}`);
    return {
      ...it,
      duration: 40,
      notes: appendNote(it, "Shorter block because of the heat — stop if child looks tired."),
    };
  });

  return { items: trimmed, adaptations };
}

/** Rule 7 — avoid study→study and chore→study back-to-back. */
export function smoothEnergyFlow(
  items: RoutineScheduleItem[],
  seed = 0,
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  const adaptations: string[] = [];
  const sorted = [...items].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );

  const out = [...sorted];
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1]!;
    const curr = out[i]!;
    if (isSleepItem(prev) || isLockedScheduleItem(curr)) continue;

    const prevStudy = isStudyItem(prev);
    const currStudy = isStudyItem(curr);
    const prevChore = isChoreItem(prev);
    const currStudyAfterChore = prevChore && currStudy;

    if (prevStudy && currStudy) {
      out[i] = {
        ...curr,
        activity: "Free play & reset",
        category: "play",
        duration: Math.min(curr.duration ?? 20, 20),
        notes: appendNote(curr, "Short movement break between study blocks — keeps energy natural."),
      };
      adaptations.push("inserted movement break between back-to-back study blocks");
    } else if (currStudyAfterChore) {
      out[i - 1] = {
        ...prev,
        notes: appendNote(prev, "After chores, offer water and a 10 min calm break before study."),
      };
      adaptations.push("buffered chore before study for smoother energy");
    }
  }

  return { items: out, adaptations };
}

/** Rule 8 — dinner as last major meal (~19:00–19:30). */
export function placeDinner(
  items: RoutineScheduleItem[],
  sleepMins: number,
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  const adaptations: string[] = [];
  const targetLo = 19 * 60;
  const targetHi = 19 * 60 + 30;

  const out = items.map((it) => {
    const kind = classifyCanonicalMealKind(it);
    if (kind !== "dinner" && !/\bdinner\b/i.test(it.activity)) return it;

    const t = parseTimeToMins(it.time);
    if (t >= targetLo && t <= targetHi) return it;
    if (t < 18 * 60) {
      const newT = Math.min(targetHi, sleepMins - 120);
      if (newT > t) {
        adaptations.push(`dinner moved toward evening main-meal window (${minsToTime24(newT)})`);
        return { ...it, time: minsToTime24(newT) };
      }
    }
    if (t > 20 * 60 + 15) {
      adaptations.push("dinner pulled earlier — last major meal before wind-down");
      return { ...it, time: minsToTime24(targetLo + 15) };
    }
    return it;
  });

  return { items: out, adaptations };
}

/** Rule 9 — wind-down ritual + screen-free guidance. */
export function improveWindDown(
  items: RoutineScheduleItem[],
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  const adaptations: string[] = [];
  const sorted = [...items].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );
  const sleepIdx = sorted.findIndex(isSleepItem);
  if (sleepIdx <= 0) return { items, adaptations };

  const windIdx = sorted.findIndex(isWindDownItem);
  const ritualNote =
    "Calm sleep ritual — short story, prayer, or quiet parent chat. Screens off 45 min before bed.";

  if (windIdx >= 0) {
    const out = items.map((it) => {
      if (!isWindDownItem(it)) return it;
      if (it.notes?.includes("Screens off")) return it;
      adaptations.push("wind-down notes enriched with sleep ritual");
      return {
        ...it,
        notes: appendNote(it, ritualNote),
        duration: Math.max(it.duration ?? 20, 20),
      };
    });
    return { items: out, adaptations };
  }

  // No explicit wind-down — soften last calm item before sleep
  const beforeSleep = sorted[sleepIdx - 1]!;
  if (isMealCategory(beforeSleep) || isStudyItem(beforeSleep)) return { items, adaptations };

  const out = items.map((it) => {
    if (it.time === beforeSleep.time && it.activity === beforeSleep.activity) {
      adaptations.push("added wind-down guidance before sleep");
      return {
        ...it,
        notes: appendNote(it, ritualNote),
      };
    }
    return it;
  });

  return { items: out, adaptations };
}

/** Rule 10 — drop low-value optional blocks when day is overloaded. */
export function realismFilter(
  items: RoutineScheduleItem[],
  opts: RoutineOptimizationOpts,
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  const maxItems = opts.isSchoolDay ? 16 : 14;
  if (items.length <= maxItems) return { items, adaptations: [] };

  const adaptations: string[] = [];
  const isEssential = (it: RoutineScheduleItem) =>
    isSleepItem(it) ||
    isLockedScheduleItem(it) ||
    isMealCategory(it) ||
    (it.category ?? "").toLowerCase() === "school" ||
    /travel|tiffin|wake|brush|bath/i.test(it.activity);

  const optional = items
    .map((it, idx) => ({ it, idx }))
    .filter(({ it }) => !isEssential(it))
    .sort((a, b) => {
      const score = (it: RoutineScheduleItem) => {
        if (isStudyItem(it)) return 3;
        if (isChoreItem(it)) return 2;
        return 1;
      };
      return score(a.it) - score(b.it);
    });

  let toRemove = items.length - maxItems;
  const removeIdx = new Set<number>();
  for (const { idx, it } of optional) {
    if (toRemove <= 0) break;
    removeIdx.add(idx);
    adaptations.push(`simplified overloaded day — removed ${it.activity}`);
    toRemove--;
  }

  return {
    items: items.filter((_, i) => !removeIdx.has(i)),
    adaptations,
  };
}

// ─── Decision-enforced layer (post-stress-test hard rules) ───────────────────
//
// These ten passes turn the content-aware optimizer into a decision-enforced
// one. Each function is deterministic, idempotent on repeat input, and never
// throws — invalid data degrades to a no-op. They keep the routine item shape
// untouched (same `RoutineScheduleItem` fields, no new keys).

const BRITISH_REGION_RE = /\b(british|uk|england|gb)\b/i;
const INDIAN_REGION_RE = /\b(indian|north_indian|south_indian|bengali|gujarati|maharashtrian|punjabi|pan_indian|in)\b/i;
const TEA_TIME_RE = /\btea[\s-]?time\b/i;
const DRUNCH_RE = /\bdrunch\b/i;
const QUICK_PRE_SCHOOL_RE = /\bquick meal before school\b/i;
const SCHOOL_LUNCH_MODES = new Set([
  "school_lunch",
  "cafeteria",
  "school_cafeteria",
  "school_meal",
  "school_canteen",
  "snack_only",
]);
const PACKED_LUNCH_MODES = new Set(["packed_lunch", "packed_lunch_only", "tiffin"]);
const HOME_LUNCH_MODES = new Set(["home_lunch", "lunch_at_home"]);

const VEG_DIET_RE = /^(veg|vegetarian|jain|plant)/i;
const MIXED_DIET_RE = /^(mixed|both|omni)/i;

const NON_VEG_HINT_RE = /\b(chicken|egg|fish|mutton|lamb|beef|pork|prawn|seafood|kheema|keema)\b/i;

const STUDY_BLOCK_NOTE = "Focus 20 min + 5 min break";

const FRIDGE_ARTIFACT_PATTERNS: RegExp[] = [
  // Lowercase-leading concatenations ending in "wrap" or "(quick plate)"
  /^[a-z][\w ]*\s&\s[a-z][\w ]*\s(wrap|plate|bowl|box|pot)\b/i,
  /\(quick plate\)$/i,
  // Raw fridge dump style: "x & y wrap"
  /^[a-z][\w ,]*\s(wrap|bowl)$/,
];

const PRIMARY_SLEEP_LEAD_MIN = 30;
const MIN_DINNER_DURATION = 25;
const MIN_STUDY_DURATION = 15;

function nowMins(item: RoutineScheduleItem): number {
  return parseTimeToMins(item.time);
}

function sortByTime(items: RoutineScheduleItem[]): RoutineScheduleItem[] {
  return [...items].sort((a, b) => nowMins(a) - nowMins(b));
}

function normalizeMealMode(mode?: string | null): string {
  return (mode ?? "").trim().toLowerCase();
}

function isBritishContext(opts: { region?: string | null; country?: string | null }): boolean {
  if (opts.region && BRITISH_REGION_RE.test(opts.region)) return true;
  if (opts.country && BRITISH_REGION_RE.test(opts.country)) return true;
  return false;
}

function isIndianContext(opts: { region?: string | null; country?: string | null }): boolean {
  if (opts.region && INDIAN_REGION_RE.test(opts.region)) return true;
  if (opts.country && /^(in|ind|india)$/i.test(opts.country)) return true;
  return false;
}

function isStudyCategoryItem(item: RoutineScheduleItem): boolean {
  return isStudyItem(item);
}

function isDinnerItem(item: RoutineScheduleItem): boolean {
  if (classifyCanonicalMealKind(item) === "dinner") return true;
  return /\bdinner\b/i.test(item.activity) && isMealCategory(item);
}

function isSnackItem(item: RoutineScheduleItem): boolean {
  const kind = classifyCanonicalMealKind(item);
  if (kind === "snack") return true;
  return /\bsnack\b/i.test(item.activity) && isMealCategory(item);
}

function isBreakfastItem(item: RoutineScheduleItem): boolean {
  const kind = classifyCanonicalMealKind(item);
  if (kind === "breakfast") return true;
  return /\bbreakfast\b/i.test(item.activity) && isMealCategory(item);
}

function isLunchItem(item: RoutineScheduleItem): boolean {
  if (classifyCanonicalMealKind(item) === "lunch") return true;
  return /\blunch\b/i.test(item.activity) && !isRefuelItem(item) && isMealCategory(item);
}

function clampMinsToWindow(t: number, win: readonly [number, number]): number {
  return Math.max(win[0], Math.min(win[1], t));
}

function dropById(
  items: RoutineScheduleItem[],
  drop: ReadonlySet<RoutineScheduleItem>,
): RoutineScheduleItem[] {
  return items.filter((it) => !drop.has(it));
}

/** Insert one item, preserving sort order by `time`. */
function insertSorted(
  items: RoutineScheduleItem[],
  newItem: RoutineScheduleItem,
): RoutineScheduleItem[] {
  const next = [...items, newItem];
  return sortByTime(next);
}

// ─── 1. enforceStudyBlock ───────────────────────────────────────────────────

const STUDY_DURATION_HIGH: Record<"young" | "mid" | "older", number> = {
  young: 30, mid: 60, older: 90,
};
const STUDY_DURATION_DEFAULT: Record<"young" | "mid" | "older", number> = {
  young: 20, mid: 40, older: 60,
};

function studyDurationFor(
  age: number,
  academicIntensity: "high" | "medium" | "low" | undefined,
): number {
  const table = academicIntensity === "high" ? STUDY_DURATION_HIGH : STUDY_DURATION_DEFAULT;
  if (age <= 6) return table.young;
  if (age <= 10) return table.mid;
  return table.older;
}

/**
 * Hard rule: school day + age >= 5 ⇒ exactly one study block of the correct
 * duration. Replaces an existing block's duration, else inserts a new one
 * after school + ~75 minutes (or after the last meal of the afternoon).
 */
export function enforceStudyBlock(
  items: RoutineScheduleItem[],
  age: number | undefined,
  academicIntensity: "high" | "medium" | "low" | undefined,
  isSchoolDay: boolean,
  opts: { schoolEndMins?: number; sleepMins?: number } = {},
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  if (!isSchoolDay || age == null || age < 5) {
    return { items, adaptations: [] };
  }

  const target = studyDurationFor(age, academicIntensity);
  const focusNote =
    `${STUDY_BLOCK_NOTE} — structured for age ${age} (${academicIntensity ?? "default"} intensity).`;
  const studyIdx = items.findIndex(isStudyCategoryItem);

  if (studyIdx >= 0) {
    const cur = items[studyIdx]!;
    if ((cur.duration ?? 0) === target && cur.notes?.includes(STUDY_BLOCK_NOTE)) {
      return { items, adaptations: [] };
    }
    const out = items.map((it, i) =>
      i === studyIdx
        ? {
            ...it,
            duration: clampDurationForCategory(it.category ?? "study", target),
            notes: appendNote(it, focusNote),
          }
        : it,
    );
    return {
      items: out,
      adaptations: [`study block set to ${target} min (age ${age})`],
    };
  }

  // No study block — insert after school + 75 min, but before any wind-down.
  const schoolEnd = opts.schoolEndMins ?? null;
  const sleepMins = opts.sleepMins ?? 21 * 60;
  let insertAt: number;
  if (schoolEnd != null) {
    insertAt = schoolEnd + 75;
  } else {
    const lastMealBeforeEvening = sortByTime(items)
      .filter((it) => isMealCategory(it) && nowMins(it) < 18 * 60)
      .pop();
    insertAt = lastMealBeforeEvening
      ? nowMins(lastMealBeforeEvening) + (lastMealBeforeEvening.duration ?? 20) + 20
      : 16 * 60 + 30;
  }
  // Keep at least 45 min before sleep
  insertAt = Math.min(insertAt, sleepMins - target - 45);
  insertAt = Math.max(insertAt, 15 * 60);

  const newItem: RoutineScheduleItem = {
    time: minsToTime24(insertAt),
    activity: "Homework & study",
    duration: clampDurationForCategory("study", target),
    category: "study",
    status: "pending",
    notes: focusNote,
  };

  return {
    items: insertSorted(items, newItem),
    adaptations: [`inserted ${target}-min study block for age ${age}`],
  };
}

// ─── 2. enforceDinner ───────────────────────────────────────────────────────

/**
 * Exactly one dinner block, clamped into `dinnerWindow`. Removes duplicates,
 * recovers dinner from social blocks that captured dinner dishes, and drops
 * any snack scheduled *after* dinner.
 */
export function enforceDinner(
  items: RoutineScheduleItem[],
  dinnerWindow: readonly [number, number] | undefined,
  sleepMins: number,
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  const adaptations: string[] = [];
  const window: readonly [number, number] =
    dinnerWindow ?? [19 * 60, Math.min(21 * 60, sleepMins - 60)];

  // (A) Recover dinner items hiding under a non-meal category that carry dishes.
  //     Triggers when a non-meal item with dishes is scheduled in the evening
  //     (or inside the country dinner window). Catches the AU-case-10 bug
  //     where dinner dishes landed on "Calm play together" (social).
  const recovered: RoutineScheduleItem[] = items.map((it) => {
    const cat = (it.category ?? "").toLowerCase();
    if (cat === "meal" || cat === "tiffin") return it;
    const dishes = (it as { dishes?: string[] }).dishes;
    if (!dishes || dishes.length === 0) return it;
    const t = nowMins(it);
    const looksDinnerLike =
      /dinner|tea\s?time/i.test(it.activity) ||
      t >= window[0] - 30 ||
      t >= 17 * 60;
    if (!looksDinnerLike) return it;
    adaptations.push(
      `dinner recovered from "${it.activity}" (was ${cat || "uncategorized"})`,
    );
    return {
      ...it,
      activity: "Dinner",
      category: "meal",
    };
  });

  // (B) Collect all dinner candidates after recovery.
  const dinners = recovered.filter(isDinnerItem);

  let out: RoutineScheduleItem[] = recovered;
  let dinner: RoutineScheduleItem | null = null;

  if (dinners.length === 0) {
    // No dinner found — synthesize one anchored at window midpoint.
    const anchor = Math.round((window[0] + window[1]) / 2);
    const newDinner: RoutineScheduleItem = {
      time: minsToTime24(anchor),
      activity: "Dinner",
      duration: clampDurationForCategory("meal", 30),
      category: "meal",
      status: "pending",
      notes: "Family dinner — main meal of the day.",
    };
    out = insertSorted(out, newDinner);
    dinner = newDinner;
    adaptations.push(`dinner missing — inserted at ${newDinner.time}`);
  } else {
    // Keep the dinner with most dishes (highest signal); drop the rest.
    const ranked = [...dinners].sort((a, b) => {
      const da = (a as { dishes?: string[] }).dishes?.length ?? 0;
      const db = (b as { dishes?: string[] }).dishes?.length ?? 0;
      if (db !== da) return db - da;
      const aIn = nowMins(a) >= window[0] && nowMins(a) <= window[1] ? 1 : 0;
      const bIn = nowMins(b) >= window[0] && nowMins(b) <= window[1] ? 1 : 0;
      return bIn - aIn;
    });
    const keep = ranked[0]!;
    const drop = new Set<RoutineScheduleItem>(ranked.slice(1));
    if (drop.size > 0) adaptations.push(`removed ${drop.size} duplicate dinner block(s)`);
    out = dropById(out, drop);
    dinner = keep;
  }

  // (C) Clamp dinner into the window if it drifted outside.
  const dinnerStart = nowMins(dinner);
  const clamped = clampMinsToWindow(dinnerStart, window);
  if (clamped !== dinnerStart) {
    out = out.map((it) =>
      it === dinner
        ? { ...it, time: minsToTime24(clamped) }
        : it,
    );
    adaptations.push(
      `dinner clamped to window (${minsToTime24(window[0])}–${minsToTime24(window[1])}): ${minsToTime24(clamped)}`,
    );
    dinner = out.find(isDinnerItem) ?? dinner;
  }

  // (D) Ensure dinner duration is reasonable.
  const dinnerEnd = dinner ? nowMins(dinner) + (dinner.duration ?? 30) : null;
  if (dinner && (dinner.duration ?? 0) < MIN_DINNER_DURATION) {
    out = out.map((it) =>
      it === dinner ? { ...it, duration: MIN_DINNER_DURATION } : it,
    );
  }

  // (E) Drop snack-category items that fall after dinner.
  if (dinnerEnd != null) {
    const finalDinnerEnd = dinnerEnd;
    const remove = new Set<RoutineScheduleItem>();
    for (const it of out) {
      if (!isSnackItem(it)) continue;
      if (nowMins(it) >= finalDinnerEnd) {
        remove.add(it);
        adaptations.push(`removed post-dinner snack "${it.activity}"`);
      }
    }
    if (remove.size > 0) out = dropById(out, remove);
  }

  return { items: out, adaptations };
}

// ─── 3. enforceOutdoor ──────────────────────────────────────────────────────

/**
 * weather=yes + temp<32 ⇒ ≥30 min outdoor block.
 * weather=limited/no or temp≥32 ⇒ convert outdoor → indoor, halve duration.
 * Fully deterministic (no random / seed inputs).
 */
export function enforceOutdoor(
  items: RoutineScheduleItem[],
  weatherOutdoor: WeatherOutdoor | undefined,
  temperatureC: number | null | undefined,
  opts: { schoolEndMins?: number; sleepMins?: number } = {},
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  const adaptations: string[] = [];
  const tooHot = temperatureC != null && temperatureC >= 32;
  const restricted = weatherOutdoor === "no" || weatherOutdoor === "limited" || tooHot;
  const outdoorOk = weatherOutdoor === "yes" && !tooHot;

  if (restricted) {
    const out = items.map((it) => {
      if (!isOutdoorItem(it) || isLockedScheduleItem(it)) return it;
      const halfDur = Math.max(15, Math.floor((it.duration ?? 40) * 0.5));
      adaptations.push(`outdoor → indoor (weather restricted): ${it.activity}`);
      return {
        ...it,
        activity: /sport|cricket|football|cycling/i.test(it.activity)
          ? "Indoor movement (yoga / dance / light games)"
          : "Indoor active play (cool room)",
        category: "play",
        duration: clampDurationForCategory("play", halfDur),
        notes: appendNote(
          it,
          tooHot
            ? "Hot day — stay indoors, sip water every 15–20 min."
            : "Limited outdoor today — keep movement indoors.",
        ),
      };
    });
    return { items: out, adaptations };
  }

  if (!outdoorOk) return { items, adaptations };

  // Outdoor allowed — ensure a deterministic ≥30 min outdoor block exists.
  const outdoorIdx = items.findIndex(isOutdoorItem);
  if (outdoorIdx >= 0) {
    const cur = items[outdoorIdx]!;
    if ((cur.duration ?? 0) >= 30) return { items, adaptations: [] };
    const out = items.map((it, i) =>
      i === outdoorIdx
        ? {
            ...it,
            duration: clampDurationForCategory(it.category ?? "outdoor", 30),
          }
        : it,
    );
    return {
      items: out,
      adaptations: [`outdoor block extended to 30 min (weather=yes, ${temperatureC ?? "?"}°C)`],
    };
  }

  // Insert a new outdoor block ~25 min after school end (or 16:30 if no school).
  const schoolEnd = opts.schoolEndMins ?? null;
  const sleepMins = opts.sleepMins ?? 21 * 60;
  let insertAt: number;
  if (schoolEnd != null) {
    insertAt = schoolEnd + 25;
  } else {
    insertAt = 16 * 60 + 30;
  }
  insertAt = Math.min(insertAt, sleepMins - 90);
  const newItem: RoutineScheduleItem = {
    time: minsToTime24(insertAt),
    activity: "Outdoor play",
    duration: 30,
    category: "outdoor",
    status: "pending",
    notes: "Active outdoor time — fresh air, free movement.",
  };
  return {
    items: insertSorted(items, newItem),
    adaptations: [`inserted 30-min outdoor block at ${newItem.time}`],
  };
}

// ─── 4. validateMealLabels ──────────────────────────────────────────────────

/**
 * Hard-relabel / reposition rules for meal blocks.
 * Removes "Drunch" placeholders and any pre-school morning meal label that
 * leaked past school start.
 */
export function validateMealLabels(
  items: RoutineScheduleItem[],
  schoolStartMins: number | undefined,
  schoolEndMins: number | undefined,
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  const adaptations: string[] = [];
  let out: RoutineScheduleItem[] = items;

  // 4.1 — Remove "Drunch" items (placeholder/legacy label).
  const drunch = out.filter((it) => DRUNCH_RE.test(it.activity));
  if (drunch.length > 0) {
    out = dropById(out, new Set(drunch));
    adaptations.push(`removed ${drunch.length} placeholder "Drunch" item(s)`);
  }

  // 4.2 — A "Quick Meal Before School" appearing after schoolStart is a mislabel.
  if (schoolStartMins != null) {
    const toFix: RoutineScheduleItem[] = [];
    for (const it of out) {
      if (!QUICK_PRE_SCHOOL_RE.test(it.activity)) continue;
      if (nowMins(it) <= schoolStartMins) continue;
      toFix.push(it);
    }
    if (toFix.length > 0) {
      const fixSet = new Set(toFix);
      out = out.map((it) => {
        if (!fixSet.has(it)) return it;
        const t = nowMins(it);
        if (schoolEndMins != null && t >= schoolEndMins) {
          adaptations.push(`relabeled mislabeled morning meal at ${it.time} → After-school refuel`);
          return { ...it, activity: AFTER_SCHOOL_REFUEL_LABEL };
        }
        adaptations.push(`relabeled mislabeled morning meal at ${it.time} → Snack`);
        return { ...it, activity: "Snack" };
      });
    }
  }

  // 4.3 — Any item labeled `Breakfast` that lands AFTER school start ⇒ relabel.
  if (schoolStartMins != null) {
    out = out.map((it) => {
      if (!isBreakfastItem(it)) return it;
      if (nowMins(it) <= schoolStartMins) return it;
      if (schoolEndMins != null && nowMins(it) >= schoolEndMins) {
        adaptations.push(`breakfast at ${it.time} after school → After-school refuel`);
        return { ...it, activity: AFTER_SCHOOL_REFUEL_LABEL };
      }
      adaptations.push(`breakfast at ${it.time} during school → Snack`);
      return { ...it, activity: "Snack" };
    });
  }

  // 4.4 — "After-school refuel" must be after schoolEnd. If found earlier, relabel.
  if (schoolEndMins != null) {
    out = out.map((it) => {
      if (!isRefuelItem(it)) return it;
      if (nowMins(it) >= schoolEndMins) return it;
      adaptations.push(`after-school refuel before school end at ${it.time} → Snack`);
      return { ...it, activity: "Snack" };
    });
  }

  // 4.5 — Dinner must be ≥ 17:00. Otherwise demote to lunch/snack.
  out = out.map((it) => {
    if (!isDinnerItem(it)) return it;
    if (nowMins(it) >= 17 * 60) return it;
    adaptations.push(`dinner at ${it.time} too early → demoted to Lunch`);
    return { ...it, activity: "Lunch" };
  });

  return { items: out, adaptations };
}

// ─── 5. applySchoolMealMode ─────────────────────────────────────────────────

/**
 * Honor the parent-supplied `schoolMealMode`:
 *   - school_lunch / cafeteria / school_canteen → note on school block,
 *     no extra lunch block.
 *   - packed_lunch → tiffin note on school block.
 *   - home_lunch → ensure a lunch block exists after school ends.
 */
export function applySchoolMealMode(
  items: RoutineScheduleItem[],
  schoolMealMode: string | null | undefined,
  opts: { schoolEndMins?: number; fridgeItems?: string } = {},
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  const mode = normalizeMealMode(schoolMealMode);
  if (!mode) return { items, adaptations: [] };
  const adaptations: string[] = [];
  let out = items;

  const schoolIdx = out.findIndex((it) => (it.category ?? "").toLowerCase() === "school");

  if (SCHOOL_LUNCH_MODES.has(mode)) {
    if (schoolIdx >= 0) {
      const note = "Lunch at school — provided by the school cafeteria.";
      const cur = out[schoolIdx]!;
      out = out.map((it, i) =>
        i === schoolIdx ? { ...it, notes: appendNote(cur, note) } : it,
      );
      adaptations.push("school meal mode: lunch at school");
    }
    // Remove any standalone lunch block on a school day — school provides lunch.
    const lunches = out.filter(isLunchItem);
    if (lunches.length > 0) {
      out = dropById(out, new Set(lunches));
      adaptations.push(`removed ${lunches.length} redundant lunch block(s) (school provides)`);
    }
    return { items: out, adaptations };
  }

  if (PACKED_LUNCH_MODES.has(mode)) {
    if (schoolIdx >= 0) {
      const fridgeHint = opts.fridgeItems ? ` (uses: ${opts.fridgeItems.slice(0, 80)})` : "";
      const note = `Packed tiffin lunch box${fridgeHint}.`;
      const cur = out[schoolIdx]!;
      out = out.map((it, i) =>
        i === schoolIdx ? { ...it, notes: appendNote(cur, note) } : it,
      );
      adaptations.push("school meal mode: packed lunch tiffin");
    }
    return { items: out, adaptations };
  }

  if (HOME_LUNCH_MODES.has(mode)) {
    // Ensure a lunch block exists after school.
    const existing = out.find(isLunchItem);
    if (existing) return { items: out, adaptations: [] };
    const schoolEnd = opts.schoolEndMins ?? (schoolIdx >= 0 ? itemEndMins(out[schoolIdx]!) : null);
    if (schoolEnd == null) return { items: out, adaptations };
    const insertAt = schoolEnd + 15;
    const newLunch: RoutineScheduleItem = {
      time: minsToTime24(insertAt),
      activity: "Lunch at home",
      duration: clampDurationForCategory("meal", 25),
      category: "meal",
      status: "pending",
      notes: "Home-cooked lunch after school.",
    };
    out = insertSorted(out, newLunch);
    adaptations.push(`school meal mode: inserted home lunch at ${newLunch.time}`);
    return { items: out, adaptations };
  }

  return { items: out, adaptations };
}

// ─── 6. enforceDiet ─────────────────────────────────────────────────────────

const MIXED_DINNER_HINTS: Record<"indian" | "western", string> = {
  indian: "Egg curry with roti | Chicken curry with rice (mixed-diet option)",
  western: "Grilled chicken with veg (mixed-diet option)",
};

/**
 * Honor diet preference. If `diet === "mixed"`, ensure at least one dinner
 * dish includes an animal-protein option (eggs/chicken/etc.) — fixes the
 * Indian-region veg-only bug seen in stress testing.
 */
export function enforceDiet(
  items: RoutineScheduleItem[],
  diet: string | null | undefined,
  region: string | null | undefined,
  country: string | null | undefined,
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  const adaptations: string[] = [];
  const d = (diet ?? "").trim().toLowerCase();
  if (!d) return { items, adaptations };

  // Keep vegetarian routines untouched.
  if (VEG_DIET_RE.test(d)) return { items, adaptations };

  if (!MIXED_DIET_RE.test(d)) return { items, adaptations };

  const indian = isIndianContext({ region, country });
  const hint = indian ? MIXED_DINNER_HINTS.indian : MIXED_DINNER_HINTS.western;

  const out = items.map((it) => {
    if (!isDinnerItem(it)) return it;
    const dishes = (it as { dishes?: string[] }).dishes ?? [];
    const hasNonVeg = dishes.some((d2) => NON_VEG_HINT_RE.test(d2));
    if (hasNonVeg) return it;
    adaptations.push(`mixed-diet: added non-veg option to dinner (${it.activity})`);
    return {
      ...it,
      dishes: [...dishes, hint],
    } as RoutineScheduleItem;
  });

  return { items: out, adaptations };
}

// ─── 7. applyIndependence ───────────────────────────────────────────────────

/**
 * Insert pack-bag + prepare-clothes tasks when the child is responsible for
 * their own routine (`caregiver === "self"`) or the country profile signals
 * high independence (`independenceLevel === "high"`).
 */
export function applyIndependence(
  items: RoutineScheduleItem[],
  caregiver: string | null | undefined,
  independenceLevel: "high" | "medium" | "low" | undefined,
  sleepMins: number,
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  const c = (caregiver ?? "").trim().toLowerCase();
  const isSelf = c === "self" || c === "child";
  const isHighIndep = independenceLevel === "high";
  if (!isSelf && !isHighIndep) return { items, adaptations: [] };

  const adaptations: string[] = [];
  let out = items;

  const hasPack = out.some((it) => /pack\s+(school\s+)?bag|backpack/i.test(it.activity));
  const hasClothes = out.some((it) => /(prepare|lay out|set out).*(clothes|uniform)/i.test(it.activity));

  const insertBaseMins = Math.max(17 * 60, sleepMins - 120);

  if (!hasPack) {
    const t = insertBaseMins;
    out = insertSorted(out, {
      time: minsToTime24(t),
      activity: "Pack school bag",
      duration: 15,
      category: "self_care",
      status: "pending",
      notes: "Independence task — verify books, water bottle, homework folder.",
    });
    adaptations.push(`independence: inserted Pack school bag at ${minsToTime24(t)}`);
  }

  if (!hasClothes) {
    const t = insertBaseMins + 20;
    out = insertSorted(out, {
      time: minsToTime24(t),
      activity: "Prepare clothes for tomorrow",
      duration: 10,
      category: "self_care",
      status: "pending",
      notes: "Lay out uniform, socks, shoes — saves 10 morning minutes.",
    });
    adaptations.push(`independence: inserted Prepare clothes for tomorrow at ${minsToTime24(t)}`);
  }

  return { items: out, adaptations };
}

// ─── 8. fixUKDinner ─────────────────────────────────────────────────────────

/**
 * UK region + age ≤ 10 historically generates *both* a "Tea time together"
 * social block and a separate "Dinner" meal — merge them into one tea/dinner.
 */
export function fixUKDinner(
  items: RoutineScheduleItem[],
  region: string | null | undefined,
  country: string | null | undefined,
  age: number | undefined,
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  if (!isBritishContext({ region, country })) return { items, adaptations: [] };
  if (age == null || age > 10) return { items, adaptations: [] };

  const teaIdx = items.findIndex((it) => TEA_TIME_RE.test(it.activity));
  const dinnerIdx = items.findIndex(isDinnerItem);
  if (teaIdx < 0 || dinnerIdx < 0) return { items, adaptations: [] };

  const dinner = items[dinnerIdx]!;
  const tea = items[teaIdx]!;

  // Keep the dinner row (it has dishes), drop the tea row.
  const teaTime = nowMins(tea);
  const dinnerTime = nowMins(dinner);
  const earliest = Math.min(teaTime, dinnerTime);

  const merged: RoutineScheduleItem = {
    ...dinner,
    activity: "Tea / Dinner",
    time: minsToTime24(earliest),
    duration: clampDurationForCategory("meal", Math.max(dinner.duration ?? 30, 30)),
    category: "meal",
    notes: appendNote(dinner, "UK 'tea' is the family dinner — single meal block."),
  };

  const out = items
    .filter((_, i) => i !== teaIdx && i !== dinnerIdx)
    .concat(merged);
  return {
    items: sortByTime(out),
    adaptations: [`UK age ${age}: merged Tea time + Dinner into one block at ${merged.time}`],
  };
}

// ─── 9. removeFridgeArtifacts ───────────────────────────────────────────────

function isFridgeArtifactDish(dish: string): boolean {
  const s = dish.trim();
  if (!s) return true;
  return FRIDGE_ARTIFACT_PATTERNS.some((re) => re.test(s));
}

/**
 * Drop auto-generated dish strings that are raw fridge-ingredient
 * concatenations ("milk & peanut butter wrap", "toast with chicken
 * (quick plate)", etc.).
 */
export function removeFridgeArtifacts(
  items: RoutineScheduleItem[],
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  let removed = 0;
  const out = items.map((it) => {
    const dishes = (it as { dishes?: string[] }).dishes;
    if (!Array.isArray(dishes) || dishes.length === 0) return it;
    const cleaned = dishes.filter((d) => {
      const bad = isFridgeArtifactDish(d);
      if (bad) removed++;
      return !bad;
    });
    if (cleaned.length === dishes.length) return it;
    return { ...it, dishes: cleaned } as RoutineScheduleItem;
  });
  const adaptations = removed > 0 ? [`removed ${removed} fridge-artifact dish name(s)`] : [];
  return { items: out, adaptations };
}

// ─── 10. validateRoutineStrict ──────────────────────────────────────────────

/**
 * Final safety net. Auto-fixes the must-not-happen states:
 *   - 0 dinner blocks
 *   - >1 dinner blocks
 *   - snack after dinner
 *   - breakfast after schoolStart
 *   - missing study on a school day (age >= 5)
 *   - meal label/timing violations
 *
 * Calls the same enforcement functions a second time so this validator
 * never returns a routine that violates its own rules.
 */
export function validateRoutineStrict(
  items: RoutineScheduleItem[],
  opts: {
    age?: number;
    isSchoolDay: boolean;
    schoolStartMins?: number;
    schoolEndMins?: number;
    sleepMins: number;
    dinnerWindow?: readonly [number, number];
    academicIntensity?: "high" | "medium" | "low";
  },
): { items: RoutineScheduleItem[]; adaptations: string[]; violations: string[] } {
  const violations: string[] = [];
  let working = items;

  // R1 — dinner present + unique.
  const dinners = working.filter(isDinnerItem);
  if (dinners.length === 0) violations.push("missing dinner");
  if (dinners.length > 1) violations.push(`${dinners.length} dinner blocks`);
  if (dinners.length !== 1) {
    const fix = enforceDinner(working, opts.dinnerWindow, opts.sleepMins);
    working = fix.items;
  }

  // R2 — snack-after-dinner.
  const dinnerAfter = working.find(isDinnerItem);
  if (dinnerAfter) {
    const dEnd = nowMins(dinnerAfter) + (dinnerAfter.duration ?? 30);
    const bad = working.filter((it) => isSnackItem(it) && nowMins(it) >= dEnd);
    if (bad.length > 0) {
      violations.push(`${bad.length} snack(s) after dinner`);
      working = dropById(working, new Set(bad));
    }
  }

  // R3 — breakfast after schoolStart.
  if (opts.schoolStartMins != null) {
    const lateBf = working.filter(
      (it) => isBreakfastItem(it) && nowMins(it) > opts.schoolStartMins!,
    );
    if (lateBf.length > 0) {
      violations.push(`${lateBf.length} breakfast block(s) after school start`);
      const fix = validateMealLabels(working, opts.schoolStartMins, opts.schoolEndMins);
      working = fix.items;
    }
  }

  // R4 — study missing on school day.
  if (opts.isSchoolDay && opts.age != null && opts.age >= 5) {
    if (!working.some(isStudyCategoryItem)) {
      violations.push("study block missing");
      const fix = enforceStudyBlock(
        working,
        opts.age,
        opts.academicIntensity,
        opts.isSchoolDay,
        { schoolEndMins: opts.schoolEndMins, sleepMins: opts.sleepMins },
      );
      working = fix.items;
    }
  }

  // R5 — Quick Meal Before School label past school start.
  if (opts.schoolStartMins != null) {
    const lateMorn = working.filter(
      (it) => QUICK_PRE_SCHOOL_RE.test(it.activity) && nowMins(it) > opts.schoolStartMins!,
    );
    if (lateMorn.length > 0) {
      violations.push("morning-meal label leaked past school start");
      const fix = validateMealLabels(working, opts.schoolStartMins, opts.schoolEndMins);
      working = fix.items;
    }
  }

  const adaptations =
    violations.length > 0
      ? [`strict validation auto-fixed: ${violations.join("; ")}`]
      : [];
  return { items: working, adaptations, violations };
}

// ─── Light final-pass enforcement (no time mutation) ──────────────────────

/**
 * Idempotent, time-preserving cleanup intended to run AFTER the full
 * pipeline (realism polish + energy curve + timeline integrity). Only:
 *   - relabels (`validateMealLabels`)
 *   - recovers dinner identity on social/play blocks carrying dishes
 *   - strips fridge-artifact dish names
 *   - ensures `diet=mixed` keeps a non-veg dinner option present
 *
 * Never inserts new items or moves existing time slots — so it cannot
 * introduce overlaps in a routine that was already overlap-free.
 */
export function applyDecisionEnforcedFinalPass(
  items: RoutineScheduleItem[],
  opts: RoutineOptimizationOpts,
): { items: RoutineScheduleItem[]; adaptations: string[] } {
  const adaptations: string[] = [];
  let working = items.map((it) => ({ ...it, time: normalizeTo24h(it.time) }));

  // 1. Strip fridge-string artifacts (e.g. "milk & peanut butter wrap").
  const a1 = removeFridgeArtifacts(working);
  working = a1.items;
  adaptations.push(...a1.adaptations);

  // 2. Relabel mis-positioned meals (Drunch, late breakfast, early dinner).
  const a2 = validateMealLabels(working, opts.schoolStartMins, opts.schoolEndMins);
  working = a2.items;
  adaptations.push(...a2.adaptations);

  // 3. Recover dinner identity for social/play blocks carrying dinner dishes.
  //    Time-preserving — only changes activity + category.
  const dinnerWindow: readonly [number, number] =
    opts.dinnerWindow ?? [19 * 60, Math.min(21 * 60, opts.sleepMins - 60)];
  working = working.map((it) => {
    const cat = (it.category ?? "").toLowerCase();
    if (cat === "meal" || cat === "tiffin") return it;
    const dishes = (it as { dishes?: string[] }).dishes;
    if (!dishes || dishes.length === 0) return it;
    const t = nowMins(it);
    const looksDinnerLike =
      /dinner|tea\s?time/i.test(it.activity) ||
      t >= dinnerWindow[0] - 30 ||
      t >= 17 * 60;
    if (!looksDinnerLike) return it;
    adaptations.push(
      `final pass: dinner recovered from "${it.activity}" (was ${cat || "uncategorized"})`,
    );
    return { ...it, activity: "Dinner", category: "meal" };
  });

  // 4. Mixed-diet — ensure dinner offers at least one non-veg option.
  const a4 = enforceDiet(working, opts.diet, opts.region, opts.country);
  working = a4.items;
  adaptations.push(...a4.adaptations);

  // 5. Deduplicate any dinners introduced by recovery: keep the one with the
  //    most dishes, drop the rest. Position is preserved.
  const dinners = working.filter(isDinnerItem);
  if (dinners.length > 1) {
    const keep = [...dinners].sort((a, b) => {
      const da = (a as { dishes?: string[] }).dishes?.length ?? 0;
      const db = (b as { dishes?: string[] }).dishes?.length ?? 0;
      return db - da;
    })[0]!;
    const drop = new Set(dinners.filter((d) => d !== keep));
    working = working.filter((it) => !drop.has(it));
    adaptations.push(`final pass: removed ${drop.size} duplicate dinner block(s)`);
  }

  return { items: working, adaptations };
}

// ─── Engine wiring (insert decision-enforced layer after content-aware pass) ─

/**
 * Full optimization pass — call after meal finalize, before realism gap-fill.
 *
 * Order:
 *   1. Content-aware rule runners (heatwave, wake flow, study soft-cap, …).
 *   2. Decision-enforced layer (10 hard rules below).
 *   3. Final overlap resolution.
 */
export function applyRoutineOptimizationEngine(
  items: RoutineScheduleItem[],
  opts: RoutineOptimizationOpts,
): RoutineOptimizationResult {
  const adaptations: string[] = [];
  let working = items.map((it) => ({
    ...it,
    time: normalizeTo24h(it.time),
  }));

  const runners: Array<
    (items: RoutineScheduleItem[]) => { items: RoutineScheduleItem[]; adaptations: string[] }
  > = [
    fixMorningFlow,
    (w) => fixAfterSchoolEnergy(w, opts),
    (w) => optimizeStudyBlocks(w, opts),
    limitChores,
    fixEveningFoodTiming,
    (w) => applyHeatwaveAdaptation(w, opts),
    (w) => smoothEnergyFlow(w, opts.sleepMins),
    (w) => placeDinner(w, opts.sleepMins),
    improveWindDown,
    (w) => realismFilter(w, opts),
  ];

  for (const run of runners) {
    const result = run(working);
    working = result.items;
    adaptations.push(...result.adaptations);
  }

  // ── Decision-enforced layer ──────────────────────────────────────────────
  const enforcement: Array<
    () => { items: RoutineScheduleItem[]; adaptations: string[] }
  > = [
    // 1. enforceStudyBlock
    () =>
      enforceStudyBlock(
        working,
        opts.age,
        opts.academicIntensity,
        opts.isSchoolDay,
        { schoolEndMins: opts.schoolEndMins, sleepMins: opts.sleepMins },
      ),
    // 2. enforceDinner
    () => enforceDinner(working, opts.dinnerWindow, opts.sleepMins),
    // 3. enforceOutdoor
    () =>
      enforceOutdoor(working, opts.weatherOutdoor, opts.temperatureC, {
        schoolEndMins: opts.schoolEndMins,
        sleepMins: opts.sleepMins,
      }),
    // 4. validateMealLabels
    () => validateMealLabels(working, opts.schoolStartMins, opts.schoolEndMins),
    // 5. applySchoolMealMode
    () =>
      applySchoolMealMode(working, opts.schoolMealMode, {
        schoolEndMins: opts.schoolEndMins,
      }),
    // 6. enforceDiet
    () => enforceDiet(working, opts.diet, opts.region, opts.country),
    // 7. applyIndependence
    () =>
      applyIndependence(
        working,
        opts.caregiver,
        opts.independenceLevel,
        opts.sleepMins,
      ),
    // 8. fixUKDinner
    () => fixUKDinner(working, opts.region, opts.country, opts.age),
    // 9. removeFridgeArtifacts
    () => removeFridgeArtifacts(working),
    // 10. validateRoutineStrict
    () => {
      const r = validateRoutineStrict(working, {
        age: opts.age,
        isSchoolDay: opts.isSchoolDay,
        schoolStartMins: opts.schoolStartMins,
        schoolEndMins: opts.schoolEndMins,
        sleepMins: opts.sleepMins,
        dinnerWindow: opts.dinnerWindow,
        academicIntensity: opts.academicIntensity,
      });
      return { items: r.items, adaptations: r.adaptations };
    },
  ];

  for (const step of enforcement) {
    const result = step();
    working = result.items;
    adaptations.push(...result.adaptations);
  }

  working = resolveTimelineOverlaps(working, opts.wakeMins, opts.sleepMins);

  // Lead-in: prevent dinner running into wind-down (>= PRIMARY_SLEEP_LEAD_MIN
  // before sleep). This is a safety bumper for the enforce-dinner clamp.
  const dinner = working.find(isDinnerItem);
  if (dinner) {
    const dEnd = nowMins(dinner) + (dinner.duration ?? 30);
    if (dEnd > opts.sleepMins - PRIMARY_SLEEP_LEAD_MIN) {
      const newStart = Math.max(
        17 * 60,
        opts.sleepMins - PRIMARY_SLEEP_LEAD_MIN - (dinner.duration ?? 30),
      );
      working = working.map((it) =>
        it === dinner ? { ...it, time: minsToTime24(newStart) } : it,
      );
      adaptations.push("dinner pulled earlier to keep wind-down buffer");
    }
  }

  // Promise: at least one rolled-up summary line in adaptations.
  if (adaptations.length === 0) {
    adaptations.push(
      "Routine optimized for meal timing, study balance, and weather conditions",
    );
  } else {
    adaptations.push(
      "Routine optimized for meal timing, study balance, and weather conditions",
    );
  }

  // Ensure MIN_STUDY_DURATION rule respected (downstream `clampDurationForCategory`
  // already enforces a 30-min floor for `study` category, but study items added
  // via this pass may land on `homework` or others — keep this defensive).
  working = working.map((it) =>
    isStudyCategoryItem(it) && (it.duration ?? 0) < MIN_STUDY_DURATION
      ? { ...it, duration: MIN_STUDY_DURATION }
      : it,
  );

  return { items: working, adaptations };
}
