/**
 * Human-realism polish — gap filling, anti-repetition, sleep timing, weekend tone.
 * Runs at end of intelligence pipeline without replacing core scheduling.
 */
import type { AgeGroup } from "./routine-templates.js";
import { classifyStructureBlock } from "./routine-country-structure.js";
import { isRefuelItem, isWeekdayLunchItem } from "./routine-meal-day-type.js";
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

function isDinnerItem(item: RoutineScheduleItem): boolean {
  return (
    (item.category ?? "").toLowerCase() === "meal" && /\bdinner\b/i.test(item.activity)
  );
}

function isWindDownItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  return (
    cat === "wind-down" ||
    /\b(wind.?down|story time|bedtime story|lights out prep)\b/i.test(item.activity)
  );
}

export const MAX_IDLE_GAP_MINS = 120;
export const WIND_DOWN_SLEEP_GAP_MIN = 20;
export const WIND_DOWN_SLEEP_GAP_MAX = 45;

const STUDY_RE =
  /\b(homework|study|tuition|revision|learning block|hausaufgaben)\b/i;
const HANDLER_RE =
  /\btoday is being handled by\s+(\w+)/i;
const FREE_TIME_RE = /^\s*free\s*time\s*$/i;

type DiversityGroup = "physical" | "cognitive" | "social" | "creative" | "rest" | "meal" | "other";

export type RealismPolishOpts = {
  wakeMins: number;
  sleepMins: number;
  isSchoolDay: boolean;
  isWeekendDay: boolean;
  ageGroup?: AgeGroup;
  seed?: number;
};

export type RealismPolishResult = {
  items: RoutineScheduleItem[];
  adjustments: string[];
  warnings: string[];
};

function itemEndMins(item: RoutineScheduleItem): number {
  return parseTimeToMins(item.time) + (item.duration ?? 30);
}

function isMealOrAnchor(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "meal" || cat === "tiffin" || cat === "school" || cat === "sleep") return true;
  if (isSleepItem(item) || isLockedScheduleItem(item)) return true;
  if (/\b(school|wake|breakfast|dinner|lunch|refuel|snack|lights out)\b/i.test(item.activity)) {
    return true;
  }
  return false;
}

function diversityGroup(item: RoutineScheduleItem): DiversityGroup {
  const cat = (item.category ?? "").toLowerCase();
  const act = item.activity;
  if (cat === "meal" || cat === "tiffin" || /\b(breakfast|lunch|dinner|snack|refuel)\b/i.test(act)) {
    return "meal";
  }
  if (cat === "study" || STUDY_RE.test(act)) return "cognitive";
  if (cat === "family" || cat === "bonding" || /\bfamily\b/i.test(act)) return "social";
  if (cat === "creative" || /\b(creative|crafts|drawing|building)\b/i.test(act)) return "creative";
  if (cat === "outdoor" || cat === "exercise" || /\b(outdoor|park|walk|sport)\b/i.test(act)) {
    return "physical";
  }
  if (cat === "play") return "creative";
  if (cat === "rest" || isWindDownItem(item)) return "rest";
  return "other";
}

function pickFrom<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]!;
}

const MORNING_GAP_BLOCKS: Array<{ activity: string; category: string; duration: number }> = [
  { activity: "Morning outdoor play", category: "outdoor", duration: 40 },
  { activity: "Family walk in the neighborhood", category: "family", duration: 45 },
  { activity: "Hobby time (music, LEGO, or puzzles)", category: "creative", duration: 35 },
];

const AFTERNOON_GAP_BLOCKS: Array<{ activity: string; category: string; duration: number }> = [
  { activity: "Creative play & crafts", category: "creative", duration: 40 },
  { activity: "Board games or building play", category: "play", duration: 35 },
  { activity: "Quiet reading corner", category: "study", duration: 30 },
  { activity: "Backyard or park play", category: "outdoor", duration: 45 },
];

const EVENING_GAP_BLOCKS: Array<{ activity: string; category: string; duration: number }> = [
  { activity: "Family chat & unwind", category: "family", duration: 30 },
  { activity: "Calm play together", category: "play", duration: 35 },
  { activity: "Evening hobby time", category: "creative", duration: 40 },
];

const WEEKEND_GAP_BLOCKS: Array<{ activity: string; category: string; duration: number }> = [
  { activity: "Family outing or park time", category: "family", duration: 50 },
  { activity: "Outdoor games together", category: "outdoor", duration: 45 },
  { activity: "Creative project at home", category: "creative", duration: 40 },
];

const ALT_BY_GROUP: Record<DiversityGroup, Array<{ activity: string; category: string }>> = {
  physical: [
    { activity: "Family walk", category: "family" },
    { activity: "Indoor movement games", category: "play" },
  ],
  cognitive: [
    { activity: "Story time & reading", category: "study" },
    { activity: "Light learning game", category: "play" },
  ],
  social: [
    { activity: "Family board game", category: "family" },
    { activity: "Cooking together", category: "family" },
  ],
  creative: [
    { activity: "Drawing or crafts", category: "creative" },
    { activity: "Building blocks play", category: "play" },
  ],
  rest: [
    { activity: "Quiet play", category: "play" },
    { activity: "Listening to music", category: "rest" },
  ],
  meal: [{ activity: "Snack break", category: "meal" }],
  other: [{ activity: "Play time", category: "play" }],
};

function gapFillPool(clockMins: number, isWeekend: boolean): typeof MORNING_GAP_BLOCKS {
  if (isWeekend) return WEEKEND_GAP_BLOCKS;
  if (clockMins < 12 * 60) return MORNING_GAP_BLOCKS;
  if (clockMins < 17 * 60) return AFTERNOON_GAP_BLOCKS;
  return EVENING_GAP_BLOCKS;
}

function planGapInserts(
  gapMins: number,
  startMins: number,
  opts: RealismPolishOpts,
  seed: number,
): RoutineScheduleItem[] {
  if (gapMins <= MAX_IDLE_GAP_MINS) return [];

  const pool = gapFillPool(startMins, opts.isWeekendDay);
  const inserts: RoutineScheduleItem[] = [];
  let cursor = startMins + 5;
  let remaining = gapMins - 10;
  let s = seed;

  const maxBlocks = gapMins > 180 ? 4 : 3;
  while (remaining > MAX_IDLE_GAP_MINS && inserts.length < maxBlocks) {
    const template = pickFrom(pool, s++);
    const slotsLeft = maxBlocks - inserts.length;
    const dur = clampDurationForCategory(
      template.category,
      Math.min(
        Math.max(30, Math.ceil(remaining / slotsLeft)),
        70,
      ),
    );
    if (cursor + dur >= opts.sleepMins - WIND_DOWN_SLEEP_GAP_MAX - 20) break;
    inserts.push({
      time: minsToTime24(cursor),
      activity: template.activity,
      duration: dur,
      category: template.category,
      status: "pending",
      notes: "Added to keep the day flowing naturally.",
    });
    cursor += dur + 5;
    remaining -= dur + 5;
  }

  return inserts;
}

/** Remove generic free-time placeholders; fill with contextual activities. */
export function fillIdleGaps(
  items: RoutineScheduleItem[],
  opts: RealismPolishOpts,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  const withoutFree = items.filter((it) => !FREE_TIME_RE.test(it.activity));
  const sorted = [...withoutFree].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );

  const out: RoutineScheduleItem[] = [];
  let seed = opts.seed ?? sorted.length;

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i]!;
    out.push(curr);

    const next = sorted[i + 1];
    if (!next || isSleepItem(curr)) continue;

    const gapStart = itemEndMins(curr);
    const gapEnd = parseTimeToMins(next.time);
    const gap = gapEnd - gapStart;
    if (gap <= MAX_IDLE_GAP_MINS) continue;
    if (isMealOrAnchor(curr) && isMealOrAnchor(next) && gap < 180) continue;

    const inserts = planGapInserts(gap, gapStart, opts, seed++);
    if (inserts.length) {
      adjustments.push(
        `filled ${gap}min gap after "${curr.activity}" with ${inserts.map((x) => x.activity).join(", ")}`,
      );
      out.push(...inserts);
    }
  }

  const resolved = resolveTimelineOverlaps(out, opts.wakeMins, opts.sleepMins);
  return { items: resolved, adjustments };
}

function categoryKey(item: RoutineScheduleItem): string {
  const g = diversityGroup(item);
  const kind = classifyStructureBlock(item);
  return `${g}:${kind}`;
}

/** Avoid back-to-back same diversity group / study-creative repetition. */
export function preventConsecutiveRepetition(
  items: RoutineScheduleItem[],
  seed = 0,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  const sorted = [...items].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );

  let prevKey: string | null = null;
  let s = seed;

  const out = sorted.map((item) => {
    if (isMealOrAnchor(item) || isSleepItem(item)) {
      prevKey = categoryKey(item);
      return item;
    }

    const key = categoryKey(item);
    if (prevKey && prevKey === key) {
      const group = diversityGroup(item);
      const alt = pickFrom(ALT_BY_GROUP[group] ?? ALT_BY_GROUP.other, s++);
      adjustments.push(
        `varied "${item.activity}" → "${alt.activity}" (avoided back-to-back ${group})`,
      );
      prevKey = `${diversityGroup({ ...item, category: alt.category })}:${classifyStructureBlock(item)}`;
      return {
        ...item,
        activity: alt.activity,
        category: alt.category,
      };
    }
    prevKey = key;
    return item;
  });

  return { items: out, adjustments };
}

export function enforceWindDownSleepConsistency(
  items: RoutineScheduleItem[],
  sleepMins: number,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  const out = items.map((it) => ({ ...it }));

  const sleepIdx = out.findIndex(isSleepItem);
  if (sleepIdx < 0) return { items: out, adjustments };

  const sleep = out[sleepIdx]!;
  const windIndices = out
    .map((it, i) => (isWindDownItem(it) ? i : -1))
    .filter((i) => i >= 0);
  if (windIndices.length === 0) return { items: out, adjustments };

  const lastWdIdx = windIndices[windIndices.length - 1]!;
  const lastWd = out[lastWdIdx]!;
  const wdStart = parseTimeToMins(lastWd.time);
  const wdDur = lastWd.duration ?? 25;
  const wdEnd = wdStart + wdDur;
  const targetSleep = parseTimeToMins(sleep.time);

  const gap = targetSleep - wdEnd;

  if (gap > WIND_DOWN_SLEEP_GAP_MAX) {
    const newSleep = wdEnd + 30;
    if (newSleep < sleepMins + 15) {
      sleep.time = minsToTime24(newSleep);
      adjustments.push(
        `moved lights-out closer to wind-down (${gap}min gap → ~30min)`,
      );
    } else {
      lastWd.duration = Math.min(
        wdDur + Math.min(gap - 30, 20),
        clampDurationForCategory(lastWd.category ?? "rest", wdDur + 15),
      );
      adjustments.push("extended wind-down to reduce gap before sleep");
    }
  } else if (gap > 0 && gap < WIND_DOWN_SLEEP_GAP_MIN) {
    lastWd.duration = clampDurationForCategory(
      lastWd.category ?? "rest",
      wdDur + (WIND_DOWN_SLEEP_GAP_MIN - gap),
    );
    adjustments.push("extended wind-down slightly before lights out");
  } else if (gap < 0) {
    lastWd.duration = Math.max(
      15,
      targetSleep - wdStart - WIND_DOWN_SLEEP_GAP_MIN,
    );
    adjustments.push("compressed wind-down that ran past lights-out");
  }

  return { items: out, adjustments };
}

function isAcademicBlock(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "study" || cat === "homework") return true;
  if (STUDY_RE.test(item.activity)) return true;
  const kind = (item as { structureKind?: string }).structureKind;
  return kind === "post_dinner_study" || kind === "study_optional";
}

/** Weekend / no-school: lighter academics, more family & leisure. */
export function applyWeekendRealism(
  items: RoutineScheduleItem[],
  opts: Pick<RealismPolishOpts, "isWeekendDay" | "isSchoolDay">,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  if (opts.isSchoolDay && !opts.isWeekendDay) {
    return { items, adjustments: [] };
  }

  const adjustments: string[] = [];
  let studyKept = 0;

  const filtered = items.filter((item) => {
    const kind = (item as { structureKind?: string }).structureKind;
    if (kind === "post_dinner_study") {
      adjustments.push(`removed weekend post-dinner revision: ${item.activity}`);
      return false;
    }
    if (/\b(optional revision|late revision|tuition & study)\b/i.test(item.activity)) {
      adjustments.push(`removed heavy academic block: ${item.activity}`);
      return false;
    }
    if (isAcademicBlock(item)) {
      studyKept++;
      if (studyKept > 1) {
        adjustments.push(`weekend: kept only one learning block (dropped ${item.activity})`);
        return false;
      }
    }
    return true;
  });

  const out = filtered.map((item) => {
    if (!isAcademicBlock(item)) return item;
    let activity = item.activity;
    if (/\btuition\s*&\s*study\b/i.test(activity)) {
      activity = "Light learning";
    } else if (/\b(homework|study|tuition|revision)\b/i.test(activity)) {
      activity = activity.replace(/\b(homework|study session|tuition)\b/i, "Light learning");
      if (!/light learning/i.test(activity)) activity = "Light learning";
    }
    if (activity !== item.activity) {
      adjustments.push(`weekend label: ${item.activity} → ${activity}`);
    }
    return activity === item.activity
      ? item
      : { ...item, activity, category: item.category ?? "study" };
  });

  return { items: out, adjustments };
}

export function humanizeRoboticPhrasing(
  items: RoutineScheduleItem[],
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  const out = items.map((item) => {
    let activity = item.activity;
    let notes = item.notes;

    const handler = activity.match(HANDLER_RE);
    if (handler) {
      const who = handler[1]!.charAt(0).toUpperCase() + handler[1]!.slice(1).toLowerCase();
      activity = activity.replace(
        HANDLER_RE,
        `${who} time — bonding & learning together`,
      );
      adjustments.push("humanized caregiver phrasing in activity");
    }

    if (notes && HANDLER_RE.test(notes)) {
      notes = notes.replace(
        HANDLER_RE,
        (_, who: string) =>
          `${who.charAt(0).toUpperCase() + who.slice(1).toLowerCase()} time — bonding & learning together`,
      );
    }
    if (notes && /include bonding.*handled by/i.test(notes)) {
      notes = notes.replace(
        /today is being handled by (\w+)[^.]*\./i,
        (_, who: string) =>
          `${who.charAt(0).toUpperCase() + who.slice(1).toLowerCase()} time — enjoy connection and calm activities together.`,
      );
    }

    if (activity === item.activity && notes === item.notes) return item;
    return { ...item, activity, notes };
  });
  return { items: out, adjustments };
}

/** Ensure lunch blocks read as real meals (not snack-only labels). */
export function improveLunchMealLabels(
  items: RoutineScheduleItem[],
  isSchoolDay: boolean,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  const out = items.map((item) => {
    if (isSchoolDay) return item;
    if (isRefuelItem(item)) return item;
    const isLunch =
      isWeekdayLunchItem(item) ||
      (/\blunch\b/i.test(item.activity) &&
        (item.category ?? "").toLowerCase() === "meal");
    if (!isLunch) return item;
    if ((item.dishes?.length ?? 0) >= 2) return item;
    if (!/^lunch\b/i.test(item.activity.trim())) {
      adjustments.push(`labeled midday meal as Lunch (${item.activity})`);
      return {
        ...item,
        activity: "Lunch",
        category: "meal",
      };
    }
    return item;
  });
  return { items: out, adjustments };
}

function presentGroups(items: RoutineScheduleItem[]): Set<DiversityGroup> {
  const set = new Set<DiversityGroup>();
  for (const it of items) {
    if (isSleepItem(it)) continue;
    set.add(diversityGroup(it));
  }
  return set;
}

/** Light nudge: if day lacks physical or social play, notes only (gaps handled elsewhere). */
export function ensureActivityVarietyBalance(
  items: RoutineScheduleItem[],
  opts: RealismPolishOpts,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const groups = presentGroups(items);
  const adjustments: string[] = [];
  const needed: DiversityGroup[] = [];
  if (!groups.has("physical") && !opts.isWeekendDay) needed.push("physical");
  if (!groups.has("social")) needed.push("social");
  if (!groups.has("creative")) needed.push("creative");

  if (needed.length === 0) return { items, adjustments };

  const sorted = [...items].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );
  const dinner = sorted.find(isDinnerItem);
  const insertBefore = dinner
    ? parseTimeToMins(dinner.time) - 50
    : opts.sleepMins - 90;

  if (insertBefore <= opts.wakeMins + 60) return { items, adjustments };

  const group = needed[0]!;
  const alt = pickFrom(ALT_BY_GROUP[group], opts.seed ?? 0);
  const block: RoutineScheduleItem = {
    time: minsToTime24(insertBefore),
    activity:
      group === "social"
        ? "Family time together"
        : group === "physical"
          ? "Outdoor play or walk"
          : "Creative play",
    duration: 35,
    category: alt.category,
    status: "pending",
    notes: "Balances the day with varied activity types.",
  };

  adjustments.push(`added ${group} variety block: ${block.activity}`);
  const merged = [...sorted, block].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );
  return {
    items: resolveTimelineOverlaps(merged, opts.wakeMins, opts.sleepMins),
    adjustments,
  };
}

export function validateRoutineRealism(
  items: RoutineScheduleItem[],
  opts: RealismPolishOpts,
): string[] {
  const warnings: string[] = [];
  const sorted = [...items].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (isSleepItem(a)) continue;
    const gap = parseTimeToMins(b.time) - itemEndMins(a);
    if (gap > MAX_IDLE_GAP_MINS) {
      warnings.push(`realism: ${gap}min gap after "${a.activity}"`);
    }
    if (!isMealOrAnchor(a) && !isMealOrAnchor(b) && categoryKey(a) === categoryKey(b)) {
      warnings.push(`realism: repeated ${categoryKey(a)} back-to-back`);
    }
  }

  const sleep = sorted.find(isSleepItem);
  if (sleep) {
    const sleepStart = parseTimeToMins(sleep.time);
    for (const it of sorted) {
      if (isSleepItem(it)) continue;
      if (itemEndMins(it) > sleepStart + 2) {
        warnings.push(`realism: "${it.activity}" ends after lights out`);
      }
    }
    const wd = sorted.filter(isWindDownItem).pop();
    if (wd) {
      const g = sleepStart - itemEndMins(wd);
      if (g > WIND_DOWN_SLEEP_GAP_MAX + 5) {
        warnings.push(`realism: wind-down to sleep gap ${g}min (max ${WIND_DOWN_SLEEP_GAP_MAX})`);
      }
    }
  }

  if (opts.isWeekendDay || !opts.isSchoolDay) {
    const studyN = sorted.filter(isAcademicBlock).length;
    if (studyN > 1) {
      warnings.push(`realism: ${studyN} academic blocks on non-school day`);
    }
    if (sorted.some(isRefuelItem)) {
      warnings.push("realism: after-school refuel on non-school day");
    }
  }

  const mealActs = sorted
    .filter((i) => (i.category ?? "").toLowerCase() === "meal")
    .map((i) => i.activity.toLowerCase());
  const dupMeals = mealActs.filter(
    (a, idx) => mealActs.indexOf(a) !== idx,
  );
  if (dupMeals.length) {
    warnings.push(`realism: duplicate meal labels (${dupMeals[0]})`);
  }

  return warnings;
}

/** Full realism pass — call once before returning routine items. */
export function applyRoutineRealismPolish(
  items: RoutineScheduleItem[],
  opts: RealismPolishOpts,
): RealismPolishResult {
  const allAdjustments: string[] = [];
  let working = items.map((it) => ({
    ...it,
    time: normalizeTo24h(it.time),
  }));

  const human = humanizeRoboticPhrasing(working);
  working = human.items;
  allAdjustments.push(...human.adjustments);

  const weekend = applyWeekendRealism(working, opts);
  working = weekend.items;
  allAdjustments.push(...weekend.adjustments);

  const lunch = improveLunchMealLabels(working, opts.isSchoolDay);
  working = lunch.items;
  allAdjustments.push(...lunch.adjustments);

  const gaps = fillIdleGaps(working, opts);
  working = gaps.items;
  allAdjustments.push(...gaps.adjustments);

  const variety = ensureActivityVarietyBalance(working, opts);
  working = variety.items;
  allAdjustments.push(...variety.adjustments);

  const antiRep = preventConsecutiveRepetition(working, opts.seed ?? 0);
  working = antiRep.items;
  allAdjustments.push(...antiRep.adjustments);

  const sleepGap = enforceWindDownSleepConsistency(working, opts.sleepMins);
  working = sleepGap.items;
  allAdjustments.push(...sleepGap.adjustments);

  working = resolveTimelineOverlaps(working, opts.wakeMins, opts.sleepMins);

  for (let pass = 0; pass < 4; pass++) {
    const gapPass = fillIdleGaps(working, { ...opts, seed: (opts.seed ?? 0) + pass * 17 });
    working = gapPass.items;
    allAdjustments.push(...gapPass.adjustments);
    const hasLargeGap = validateRoutineRealism(working, opts).some((w) =>
      w.includes("gap"),
    );
    if (!hasLargeGap) break;
  }

  const antiRep2 = preventConsecutiveRepetition(working, (opts.seed ?? 0) + 11);
  working = antiRep2.items;
  allAdjustments.push(...antiRep2.adjustments);

  working = resolveTimelineOverlaps(working, opts.wakeMins, opts.sleepMins);

  const warnings = validateRoutineRealism(working, opts);

  return { items: working, adjustments: allAdjustments, warnings };
}
