/**
 * Final timeline integrity pass — runs after all pipeline transforms.
 * Guarantees non-overlapping, sleep-consistent, production-safe output.
 */
import {
  aqiCultureProfile,
  attachAqiAdvisory,
  deriveAqiOutdoorPolicy,
  enforceOutdoorDurationLimits,
  isOutdoorActivityItem,
  lightOutdoorWalkLabel,
} from "./routine-aqi.js";
import {
  createLowEnergyBlock,
  createLowEnergyIndoorAlternative,
  getScheduleCategory,
  isOutdoorPhysicalBlock,
  isProtectedScheduleBlock,
  normalizeScheduleCategories,
  pickDistantCategoryReplacement,
  type ScheduleCategory,
} from "./routine-category-taxonomy.js";
import { GAP_FILL_BEFORE_EVENT_MINS } from "./routine-special-event.js";
import {
  MAX_IDLE_GAP_MINS,
  WIND_DOWN_SLEEP_GAP_MAX,
  WIND_DOWN_SLEEP_GAP_MIN,
} from "./routine-realism-polish.js";
import { enforceSleepIsLast } from "./routine-weather-planning.js";
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

const MIN_ACTIVITY_MINS = 10;

export type FinalIntegrityOpts = {
  wakeMins: number;
  sleepMins: number;
  aqi?: number | null;
  condition?: string | null;
  hasSchool?: boolean;
  isWeekendDay?: boolean;
  country?: string;
  /** Locked special-event start times (minutes) for gap-fill and adjacency. */
  eventStartMins?: number[];
  /** Rain / indoor-only day — prefer cognitive_light and social fillers. */
  rainMode?: boolean;
};

const POST_DINNER_MAX_IDLE_MINS = 45;
const POST_DINNER_LARGE_GAP_MINS = 90;
const POST_DINNER_OUTDOOR_MAX_DISTANCE_MINS = 60;

const EARLY_SLEEP_MAX_MINS = 21 * 60;
const EARLY_WIND_DOWN_LEAD_MINS = 40;
const EARLY_DINNER_BEFORE_WD_MINS = 10;

const CATEGORY_ALTERNATIVES: Record<
  string,
  Array<{ activity: string; category: string }>
> = {
  family: [
    { activity: "Creative activity", category: "creative" },
    { activity: "Quiet indoor play", category: "play" },
  ],
  play: [
    { activity: "Creative activity", category: "creative" },
    { activity: "Family time together", category: "family" },
  ],
  learning: [
    { activity: "Creative project", category: "creative" },
    { activity: "Relaxed play", category: "play" },
  ],
  creative: [
    { activity: "Relaxed play", category: "play" },
    { activity: "Family time together", category: "family" },
  ],
};

function pickCategoryAlternative(
  bucket: string,
  usedActivities: Set<string>,
): { activity: string; category: string } | null {
  const options = CATEGORY_ALTERNATIVES[bucket] ?? [
    { activity: "Quiet indoor time", category: "rest" },
  ];
  for (const opt of options) {
    if (!usedActivities.has(opt.activity.toLowerCase())) return opt;
  }
  return options[0] ?? null;
}

function nextEventStartAfter(mins: number, eventStarts?: number[]): number | null {
  if (!eventStarts?.length) return null;
  const upcoming = eventStarts.filter((e) => e > mins).sort((a, b) => a - b);
  return upcoming[0] ?? null;
}

export type FinalIntegrityResult = {
  items: RoutineScheduleItem[];
  adjustments: string[];
  warnings: string[];
  repaired: boolean;
  assertionsPassed: boolean;
};

function itemEndMins(item: RoutineScheduleItem): number {
  return parseTimeToMins(item.time) + (item.duration ?? 30);
}

function isSpecialEventItem(item: RoutineScheduleItem): boolean {
  return (
    item.culturalTag === "special_event" ||
    item.activitySource === "special" ||
    (item as { structureKind?: string }).structureKind === "special_event"
  );
}

function isFixedRecurringItem(item: RoutineScheduleItem): boolean {
  return item.culturalTag === "fixed_recurring" || item.activitySource === "fixed";
}

function isMealAnchor(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "meal" || cat === "tiffin") return true;
  return /\b(breakfast|lunch|dinner|drunch|refuel|snack|tiffin)\b/i.test(item.activity);
}

function isSchoolAnchor(item: RoutineScheduleItem): boolean {
  return (item.category ?? "").toLowerCase() === "school" || /\bat school\b/i.test(item.activity);
}

function isWindDownItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  return (
    cat === "wind-down" ||
    /\b(wind.?down|story time|bedtime story|quiet wind-down)\b/i.test(item.activity)
  );
}

function isFillerItem(item: RoutineScheduleItem): boolean {
  if (isSleepItem(item) || isSpecialEventItem(item) || isFixedRecurringItem(item)) {
    return false;
  }
  if (isMealAnchor(item) || isSchoolAnchor(item)) return false;
  if (/wake up|freshen up/i.test(item.activity)) return false;
  return true;
}

/** Lower number = higher priority. special > fixed > meals > core > filler */
export function finalItemPriority(item: RoutineScheduleItem): number {
  if (isSpecialEventItem(item)) return 1;
  if (isFixedRecurringItem(item)) return 2;
  if (isSleepItem(item)) return 3;
  if (isSchoolAnchor(item)) return 4;
  if (isMealAnchor(item)) return 5;
  if (isWindDownItem(item)) return 6;
  if (/wake up|freshen up/i.test(item.activity)) return 7;
  return 8;
}

function periodLabel(startMins: number): "Morning" | "Afternoon" | "Evening" | "Night" {
  if (startMins >= 21 * 60 || startMins < 6 * 60) return "Night";
  if (startMins >= 17 * 60) return "Evening";
  if (startMins >= 12 * 60) return "Afternoon";
  return "Morning";
}

const PERIOD_PREFIX_RE = /^(morning|afternoon|evening|night)\s+/i;

/** Rename activity period words to match clock time. */
export function fixTimeBasedLabels(items: RoutineScheduleItem[]): {
  items: RoutineScheduleItem[];
  adjustments: string[];
} {
  const adjustments: string[] = [];
  const out = items.map((item) => {
    const start = parseTimeToMins(item.time);
    const correct = periodLabel(start);
    const match = item.activity.match(PERIOD_PREFIX_RE);
    if (!match) return item;
    const current = match[1]!;
    const currentNorm =
      current.charAt(0).toUpperCase() + current.slice(1).toLowerCase();
    if (currentNorm === correct) return item;
    if (currentNorm === "Morning" && start >= 12 * 60) {
      const activity = item.activity.replace(PERIOD_PREFIX_RE, `${correct} `);
      adjustments.push(`renamed "${item.activity}" → "${activity}"`);
      return { ...item, activity };
    }
    if (
      (currentNorm === "Afternoon" && start < 12 * 60) ||
      (currentNorm === "Evening" && start < 17 * 60)
    ) {
      const activity = item.activity.replace(PERIOD_PREFIX_RE, `${correct} `);
      adjustments.push(`renamed "${item.activity}" → "${activity}"`);
      return { ...item, activity };
    }
    return item;
  });
  return { items: out, adjustments };
}

function mealKindKey(activity: string): string | null {
  const a = activity.toLowerCase();
  if (/\bbreakfast\b/i.test(a)) return "breakfast";
  if (/\blunch\b/i.test(a) && !/tiffin/i.test(a)) return "lunch";
  if (/\bdinner\b/i.test(a)) return "dinner";
  if (/\bdrunch\b/i.test(a)) return "drunch";
  if (/\brefuel\b/i.test(a)) return "refuel";
  if (/\btiffin\b/i.test(a)) return "tiffin";
  return null;
}

export function deduplicateMeals(items: RoutineScheduleItem[]): {
  items: RoutineScheduleItem[];
  adjustments: string[];
} {
  const adjustments: string[] = [];
  const seen = new Set<string>();
  const out: RoutineScheduleItem[] = [];

  for (const item of [...items].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  )) {
    const kind = mealKindKey(item.activity);
    if (!kind || !isMealAnchor(item)) {
      out.push(item);
      continue;
    }
    if (seen.has(kind)) {
      adjustments.push(`removed duplicate ${kind}: "${item.activity}"`);
      continue;
    }
    seen.add(kind);
    out.push(item);
  }

  return { items: out, adjustments };
}

function categoryKey(item: RoutineScheduleItem): string {
  return (item.category ?? "general").toLowerCase();
}

function varietyBucket(item: RoutineScheduleItem): string {
  return getScheduleCategory(item);
}

function isFillerLikeBlock(item: RoutineScheduleItem): boolean {
  return !isProtectedScheduleBlock(item) && finalItemPriority(item) >= 8;
}

export function deduplicateAdjacentCategories(
  items: RoutineScheduleItem[],
  opts: { rainMode?: boolean } = {},
): {
  items: RoutineScheduleItem[];
  adjustments: string[];
} {
  const adjustments: string[] = [];
  const sorted = [...items].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );
  const out: RoutineScheduleItem[] = [];

  for (const item of sorted) {
    if (isSleepItem(item)) {
      out.push(item);
      continue;
    }
    const prev = out[out.length - 1];
    if (
      prev &&
      /\bcreative\b/i.test(prev.activity) &&
      /\bcreative\b/i.test(item.activity) &&
      parseTimeToMins(item.time) <= itemEndMins(prev) + 5
    ) {
      adjustments.push(`dropped redundant "${item.activity}" after "${prev.activity}"`);
      continue;
    }
    if (
      prev &&
      isWindDownItem(prev) &&
      !isWindDownItem(item) &&
      !isSleepItem(item) &&
      !isMealAnchor(item) &&
      !isSchoolAnchor(item)
    ) {
      adjustments.push(`dropped "${item.activity}" after wind-down`);
      continue;
    }
    if (
      prev &&
      isFixedRecurringItem(item) &&
      varietyBucket(prev) === varietyBucket(item) &&
      !isFixedRecurringItem(prev)
    ) {
      adjustments.push(`dropped "${prev.activity}" before fixed "${item.activity}"`);
      out.pop();
    }
    if (
      prev &&
      isWindDownItem(item) &&
      !isWindDownItem(prev) &&
      /\brelax|unwind\b/i.test(prev.activity)
    ) {
      adjustments.push(`dropped "${prev.activity}" before wind-down`);
      out.pop();
    } else if (
      prev &&
      (isFixedRecurringItem(prev) || isSpecialEventItem(prev)) &&
      varietyBucket(item) === varietyBucket(prev) &&
      !isFixedRecurringItem(item) &&
      !isSpecialEventItem(item)
    ) {
      adjustments.push(`dropped "${item.activity}" after locked "${prev.activity}"`);
      continue;
    } else if (
      prev &&
      isMealAnchor(prev) &&
      isMealAnchor(item) &&
      /\b(snack|refuel)\b/i.test(item.activity) &&
      /\bdinner\b/i.test(prev.activity)
    ) {
      adjustments.push(`dropped "${item.activity}" after dinner`);
      continue;
    } else if (
      prev &&
      isSpecialEventItem(item) &&
      /\bfamily\b/i.test(prev.activity) &&
      !isFixedRecurringItem(prev)
    ) {
      adjustments.push(`dropped "${prev.activity}" before special event "${item.activity}"`);
      out.pop();
    } else if (
      prev &&
      !isSleepItem(prev) &&
      !isSchoolAnchor(prev) &&
      !isSchoolAnchor(item) &&
      !isSpecialEventItem(prev) &&
      !isSpecialEventItem(item) &&
      !isFixedRecurringItem(prev) &&
      !isFixedRecurringItem(item) &&
      varietyBucket(prev) === varietyBucket(item) &&
      finalItemPriority(item) >= finalItemPriority(prev)
    ) {
      const prevCat = getScheduleCategory(prev);
      const itemCat = getScheduleCategory(item);
      const bucket = itemCat;
      const alt = pickDistantCategoryReplacement(bucket, {
        rainMode: opts.rainMode,
        avoidCategories: [prevCat],
        usedActivities: new Set(out.map((x) => x.activity.toLowerCase())),
      });
      if (alt) {
        const replaced = {
          ...item,
          activity: alt.activity,
          category: alt.category,
          ...(alt.energyImpact ? { energyImpact: alt.energyImpact } : {}),
        };
        adjustments.push(
          `replaced adjacent ${bucket} "${prev.activity}" → "${replaced.activity}" (${alt.category})`,
        );
        out.push(replaced);
      } else {
        adjustments.push(
          `dropped adjacent duplicate ${bucket}: "${item.activity}"`,
        );
      }
      continue;
    }
    out.push(item);
  }

  return { items: out, adjustments };
}

/** Trim or remove blocks that start at/after sleep or extend past sleep anchor. */
export function enforceSleepBoundary(
  items: RoutineScheduleItem[],
  sleepMins: number,
  wakeMins = 0,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  const kept: RoutineScheduleItem[] = [];
  let sleepItem: RoutineScheduleItem | undefined;

  for (const it of items) {
    if (isSleepItem(it)) {
      sleepItem = { ...it, time: minsToTime24(sleepMins) };
      continue;
    }
    const start = parseTimeToMins(it.time);
    const dur = it.duration ?? 30;

    if (start >= sleepMins) {
      adjustments.push(`removed "${it.activity}" (starts after lights-out)`);
      continue;
    }

    const end = start + dur;
    const sleepBuffer = isWindDownItem(it) ? 10 : 5;
    const latestEnd = sleepMins - sleepBuffer;

    if (end > latestEnd) {
      let newDur = latestEnd - start;
      let newStart = start;
      if (newDur < MIN_ACTIVITY_MINS && isWindDownItem(it)) {
        newDur = clampDurationForCategory(it.category ?? "rest", 25);
        newStart = Math.max(wakeMins, sleepMins - newDur - sleepBuffer);
        adjustments.push(`moved wind-down earlier to fit before lights-out`);
        kept.push({ ...it, time: minsToTime24(newStart), duration: newDur });
        continue;
      }
      if (newDur < MIN_ACTIVITY_MINS) {
        adjustments.push(`removed "${it.activity}" (could not fit before sleep)`);
        continue;
      }
      adjustments.push(`trimmed "${it.activity}" to end before lights-out`);
      kept.push({ ...it, duration: newDur });
      continue;
    }
    kept.push(it);
  }

  if (!sleepItem) {
    sleepItem = {
      time: minsToTime24(sleepMins),
      activity: "Lights out",
      duration: 30,
      category: "sleep",
      status: "pending",
    };
    adjustments.push("inserted missing Lights out block");
  }

  kept.sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
  kept.push(sleepItem);
  return { items: kept, adjustments };
}

export function resolveOverlapsByPriority(
  items: RoutineScheduleItem[],
  sleepMins: number,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  const sorted = [...items]
    .filter((it) => !/^\s*free\s*time\s*$/i.test(it.activity))
    .map((it) => ({ ...it, time: normalizeTo24h(it.time) }))
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));

  for (let pass = 0; pass < 6; pass++) {
    let changed = false;

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;
      if (isSleepItem(prev)) continue;

      const prevStart = parseTimeToMins(prev.time);
      const prevEnd = itemEndMins(prev);
      let currStart = parseTimeToMins(curr.time);

      if (isSleepItem(curr) && itemEndMins(prev) > sleepMins - WIND_DOWN_SLEEP_GAP_MIN) {
        const latestEnd = sleepMins - WIND_DOWN_SLEEP_GAP_MIN;
        const maxDur = latestEnd - prevStart;
        if (isWindDownItem(prev)) {
          if (maxDur < MIN_ACTIVITY_MINS) {
            prev.time = minsToTime24(
              Math.max(sleepMins - 25 - WIND_DOWN_SLEEP_GAP_MIN, prevStart - 60),
            );
            prev.duration = 25;
          } else {
            prev.duration = maxDur;
          }
          adjustments.push(`trimmed "${prev.activity}" before lights-out`);
          changed = true;
        } else if (!isFixedRecurringItem(prev) && !isSpecialEventItem(prev)) {
          prev.duration = Math.max(MIN_ACTIVITY_MINS, maxDur);
          adjustments.push(`trimmed "${prev.activity}" before lights-out`);
          changed = true;
        }
        continue;
      }

      if (currStart >= prevEnd && currStart !== prevStart) continue;

      const prevPri = finalItemPriority(prev);
      const currPri = finalItemPriority(curr);

      if (currPri < prevPri) {
        const maxPrevDur = Math.max(MIN_ACTIVITY_MINS, currStart - prevStart);
        if ((prev.duration ?? 30) > maxPrevDur) {
          prev.duration = maxPrevDur;
          adjustments.push(`shortened "${prev.activity}" before higher-priority "${curr.activity}"`);
          changed = true;
        }
        continue;
      }

      if (prevPri < currPri) {
        currStart = prevEnd;
        if (currStart !== parseTimeToMins(curr.time)) {
          curr.time = minsToTime24(currStart);
          adjustments.push(`shifted "${curr.activity}" after "${prev.activity}"`);
          changed = true;
        }
      } else {
        currStart = prevEnd;
        curr.time = minsToTime24(currStart);
        adjustments.push(`shifted same-priority "${curr.activity}" after "${prev.activity}"`);
        changed = true;
      }

      const currEnd = itemEndMins(curr);
      if (currEnd > sleepMins && !isSleepItem(curr)) {
        const maxDur = sleepMins - parseTimeToMins(curr.time) - 5;
        if (maxDur < MIN_ACTIVITY_MINS && isFillerItem(curr)) {
          sorted.splice(i, 1);
          adjustments.push(`dropped filler "${curr.activity}" (no room before sleep)`);
          changed = true;
          i--;
        } else if (maxDur >= MIN_ACTIVITY_MINS) {
          curr.duration = maxDur;
          adjustments.push(`shortened "${curr.activity}" to fit before sleep`);
          changed = true;
        }
      }
    }

    const sleep = sorted.find(isSleepItem);
    if (sleep) sleep.time = minsToTime24(sleepMins);

    if (!changed) break;
  }

  return { items: sorted, adjustments };
}

function ensureWindDownBeforeSleep(
  items: RoutineScheduleItem[],
  sleepMins: number,
  wakeMins: number,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  const sleep = items.find(isSleepItem);
  if (!sleep) return { items, adjustments };

  sleep.time = minsToTime24(sleepMins);
  const targetGap = 30;
  const wdDuration = 25;
  const wdStart = sleepMins - wdDuration - targetGap;

  let nonSleep = items.filter((it) => !isSleepItem(it));
  const windDowns = nonSleep.filter(isWindDownItem);

  if (windDowns.length === 0) {
    const lastEnd = nonSleep.reduce((max, it) => Math.max(max, itemEndMins(it)), wakeMins);
    const start = Math.max(lastEnd + 5, wdStart, wakeMins);
    if (start + wdDuration + WIND_DOWN_SLEEP_GAP_MIN > sleepMins) {
      return { items, adjustments };
    }
    const block: RoutineScheduleItem = {
      time: minsToTime24(start),
      activity: "Wind-down & story",
      duration: wdDuration,
      category: "wind-down",
      status: "pending",
    };
    adjustments.push("inserted wind-down before lights-out");
    nonSleep = [...nonSleep, block];
  } else {
    const lastWd = windDowns[windDowns.length - 1]!;
    const latestWdStart = sleepMins - wdDuration - WIND_DOWN_SLEEP_GAP_MIN;
    const idealStart = Math.min(Math.max(wakeMins, wdStart), latestWdStart);
    if (parseTimeToMins(lastWd.time) !== idealStart) {
      lastWd.time = minsToTime24(idealStart);
      lastWd.duration = wdDuration;
      adjustments.push("repositioned wind-down before lights-out");
    }
    if (itemEndMins(lastWd) > sleepMins - WIND_DOWN_SLEEP_GAP_MIN) {
      lastWd.duration = Math.max(
        MIN_ACTIVITY_MINS,
        sleepMins - WIND_DOWN_SLEEP_GAP_MIN - parseTimeToMins(lastWd.time),
      );
      adjustments.push("trimmed wind-down to end before lights-out");
    }
    const gap = sleepMins - itemEndMins(lastWd);
    if (gap > WIND_DOWN_SLEEP_GAP_MAX) {
      lastWd.time = minsToTime24(Math.max(wakeMins, sleepMins - wdDuration - targetGap));
      lastWd.duration = wdDuration;
      adjustments.push(`closed wind-down gap (${gap}min → ~${targetGap}min)`);
    } else if (gap < WIND_DOWN_SLEEP_GAP_MIN) {
      const maxDur = sleepMins - WIND_DOWN_SLEEP_GAP_MIN - parseTimeToMins(lastWd.time);
      if (maxDur < MIN_ACTIVITY_MINS) {
        lastWd.time = minsToTime24(Math.max(wakeMins, sleepMins - wdDuration - WIND_DOWN_SLEEP_GAP_MIN));
        lastWd.duration = wdDuration;
        adjustments.push("moved wind-down earlier (was overlapping lights-out)");
      } else {
        lastWd.duration = clampDurationForCategory(
          lastWd.category ?? "rest",
          Math.min(wdDuration, maxDur),
        );
        adjustments.push("adjusted wind-down to fit before lights out");
      }
    }
    nonSleep = nonSleep.filter((it) => !isWindDownItem(it));
    nonSleep.push(lastWd);
  }

  const merged = [...nonSleep, sleep].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );
  return { items: merged, adjustments };
}

export type IntegrityAssertionResult = {
  passed: boolean;
  failures: string[];
};

export function assertFinalTimelineIntegrity(
  items: RoutineScheduleItem[],
  opts: FinalIntegrityOpts,
): IntegrityAssertionResult {
  const failures: string[] = [];
  const sorted = [...items].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );

  if (!sorted.length) {
    failures.push("empty routine");
    return { passed: false, failures };
  }

  const last = sorted[sorted.length - 1]!;
  if (!isSleepItem(last)) {
    failures.push("last block is not sleep");
  }

  const sleep = sorted.find(isSleepItem);
  const sleepStart = sleep ? parseTimeToMins(sleep.time) : opts.sleepMins;

  for (const it of sorted) {
    if (isSleepItem(it)) continue;
    if (parseTimeToMins(it.time) >= sleepStart) {
      failures.push(`"${it.activity}" starts at/after lights-out`);
    }
    if (itemEndMins(it) > sleepStart + 2) {
      failures.push(`"${it.activity}" ends after lights-out`);
    }
  }

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (isSleepItem(prev)) continue;
    if (itemEndMins(prev) > parseTimeToMins(curr.time) + 1) {
      failures.push(
        `overlap: "${prev.activity}" ends after "${curr.activity}" starts`,
      );
    }
  }

  const mealKinds = new Set<string>();
  for (const it of sorted) {
    const kind = mealKindKey(it.activity);
    if (kind && isMealAnchor(it)) {
      if (mealKinds.has(kind)) failures.push(`duplicate meal: ${kind}`);
      mealKinds.add(kind);
    }
  }

  const wd = sorted.filter(isWindDownItem).pop();
  if (wd) {
    const gap = sleepStart - itemEndMins(wd);
    if (gap > WIND_DOWN_SLEEP_GAP_MAX + 5) {
      failures.push(`wind-down to sleep gap ${gap}min (max ${WIND_DOWN_SLEEP_GAP_MAX})`);
    }
    if (gap < 0) {
      failures.push("wind-down overlaps lights-out");
    }
  }

  for (const it of sorted) {
    const start = parseTimeToMins(it.time);
    const m = it.activity.match(PERIOD_PREFIX_RE);
    if (m && m[1]!.toLowerCase() === "morning" && start >= 12 * 60) {
      failures.push(`morning label after noon: "${it.activity}"`);
    }
  }

  return { passed: failures.length === 0, failures };
}

/** Hard sequential pass — next block always starts when previous ends. */
export function forceSequentialTimeline(
  items: RoutineScheduleItem[],
  sleepMins: number,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  const sorted = [...items]
    .map((it) => ({ ...it, time: normalizeTo24h(it.time) }))
    .sort((a, b) => {
      if (isSleepItem(a)) return 1;
      if (isSleepItem(b)) return -1;
      return parseTimeToMins(a.time) - parseTimeToMins(b.time);
    });

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (isSleepItem(curr)) continue;
    if (isSleepItem(prev)) continue;

    const prevEnd = itemEndMins(prev);
    let currStart = parseTimeToMins(curr.time);
    if (currStart < prevEnd) {
      if (isWindDownItem(curr)) {
        const maxPrevDur = Math.max(MIN_ACTIVITY_MINS, currStart - parseTimeToMins(prev.time));
        if ((prev.duration ?? 30) > maxPrevDur) {
          prev.duration = maxPrevDur;
          adjustments.push(`shortened "${prev.activity}" before wind-down`);
        }
        continue;
      }
      if (isSpecialEventItem(curr) || isFixedRecurringItem(curr)) {
        const maxPrevDur = Math.max(MIN_ACTIVITY_MINS, currStart - parseTimeToMins(prev.time));
        if ((prev.duration ?? 30) > maxPrevDur) {
          prev.duration = maxPrevDur;
          adjustments.push(`shortened "${prev.activity}" before locked "${curr.activity}"`);
        }
      } else {
        currStart = prevEnd;
        curr.time = minsToTime24(currStart);
        adjustments.push(`sequenced "${curr.activity}" after "${prev.activity}"`);
      }
      if (itemEndMins(curr) > sleepMins && !isSleepItem(curr)) {
        const maxDur = Math.max(MIN_ACTIVITY_MINS, sleepMins - currStart - 5);
        curr.duration = maxDur;
      }
    }
  }

  const sleep = sorted.find(isSleepItem);
  if (sleep) sleep.time = minsToTime24(sleepMins);

  return { items: sorted, adjustments };
}

const WEEKEND_GAP_FILLERS: Array<{
  activity: string;
  category: string;
  duration: number;
}> = [
  { activity: "Family time together", category: "social", duration: 40 },
  { activity: "Creative activity", category: "creative", duration: 35 },
  { activity: "Quiet indoor play", category: "cognitive_light", duration: 35 },
];

const RAIN_GAP_FILLERS: Array<{
  activity: string;
  category: string;
  duration: number;
}> = [
  { activity: "Family chat time", category: "social", duration: 30 },
  { activity: "Quiet indoor play", category: "cognitive_light", duration: 35 },
  { activity: "Calm play together", category: "social", duration: 30 },
];

/** Split long dinner blocks into dinner + family time. */
export function splitLongMealBlocks(items: RoutineScheduleItem[]): {
  items: RoutineScheduleItem[];
  adjustments: string[];
} {
  const adjustments: string[] = [];
  const out: RoutineScheduleItem[] = [];

  for (const item of items) {
    const isDinner =
      (item.category ?? "").toLowerCase() === "meal" && /\bdinner\b/i.test(item.activity);
    const dur = item.duration ?? 30;

    if (isDinner && dur > 60) {
      const dinnerDur = Math.min(40, Math.max(30, Math.floor(dur * 0.45)));
      const familyDur = dur - dinnerDur;
      if (familyDur >= 15) {
        const start = parseTimeToMins(item.time);
        out.push({ ...item, duration: dinnerDur });
        out.push({
          time: minsToTime24(start + dinnerDur),
          activity: "Family time together",
          duration: familyDur,
          category: "family",
          status: item.status ?? "pending",
          notes: "Unhurried family connection after dinner.",
        });
        adjustments.push(
          `split long dinner (${dur}min) → dinner ${dinnerDur}min + family ${familyDur}min`,
        );
        continue;
      }
    }
    out.push(item);
  }

  return {
    items: out.sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time)),
    adjustments,
  };
}

/** Keep evening flow continuous after dinner; tame distant outdoor blocks. */
export function enforcePostDinnerContinuity(
  items: RoutineScheduleItem[],
  opts: FinalIntegrityOpts,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  const rainMode = opts.rainMode === true;

  let working = items.map((it) => ({ ...it }));
  const sorted = [...working]
    .filter((it) => !isSleepItem(it))
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));

  const dinnerIdx = sorted.findIndex(
    (it) => isMealAnchor(it) && /\bdinner\b/i.test(it.activity),
  );
  if (dinnerIdx === -1) return { items, adjustments };

  const dinner = sorted[dinnerIdx]!;
  const dinnerEnd = itemEndMins(dinner);
  const next = sorted[dinnerIdx + 1];

  if (next) {
    const gap = parseTimeToMins(next.time) - dinnerEnd;
    const nextIsWindDown = isWindDownItem(next);
    const canBridge =
      nextIsWindDown ||
      (!isProtectedScheduleBlock(next) && !isSleepItem(next));

    if (gap > POST_DINNER_MAX_IDLE_MINS && canBridge) {
      const fillerStart = dinnerEnd + 5;
      const fillerEnd = nextIsWindDown
        ? Math.min(dinnerEnd + 45, parseTimeToMins(next.time) - 10)
        : Math.min(dinnerEnd + 30, parseTimeToMins(next.time) - 5);
      if (fillerEnd - fillerStart >= MIN_ACTIVITY_MINS) {
        const filler = createLowEnergyBlock(fillerStart, fillerEnd, rainMode);
        const insertIdx =
          working.findIndex(
            (it) =>
              parseTimeToMins(it.time) === parseTimeToMins(dinner.time) &&
              it.activity === dinner.activity,
          ) + 1;
        if (insertIdx > 0) {
          working.splice(insertIdx, 0, filler);
          adjustments.push(
            `post-dinner continuity (${gap}min gap) → "${filler.activity}"`,
          );
        }
      }
    }
  }

  const dinnerKey = parseTimeToMins(dinner.time);
  const dinnerBlock = working.find(
    (it) => parseTimeToMins(it.time) === dinnerKey && /\bdinner\b/i.test(it.activity),
  );
  const dinnerEndFresh = dinnerBlock ? itemEndMins(dinnerBlock) : dinnerEnd;

  for (let i = 0; i < working.length; i++) {
    const b = working[i]!;
    if (!isOutdoorPhysicalBlock(b) || isProtectedScheduleBlock(b)) continue;
    const distance = parseTimeToMins(b.time) - dinnerEndFresh;
    if (distance > POST_DINNER_OUTDOOR_MAX_DISTANCE_MINS) {
      working[i] = createLowEnergyIndoorAlternative(b, rainMode);
      adjustments.push(
        `replaced distant outdoor "${b.activity}" (${distance}min after dinner)`,
      );
      break;
    }
  }

  const resorted = [...working]
    .filter((it) => !isSleepItem(it))
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
  const dinnerAgain = resorted.find(
    (it) => isMealAnchor(it) && /\bdinner\b/i.test(it.activity),
  );
  if (dinnerAgain) {
    const dEnd = itemEndMins(dinnerAgain);
    const farBlock = resorted.find((b) => {
      if (parseTimeToMins(b.time) <= dEnd) return false;
      if (isMealAnchor(b) || isWindDownItem(b) || isSleepItem(b)) return false;
      return parseTimeToMins(b.time) - dEnd > POST_DINNER_LARGE_GAP_MINS;
    });
    if (farBlock) {
      const gap = parseTimeToMins(farBlock.time) - dEnd;
      const fillerStart = dEnd + 5;
      const fillerEnd = Math.min(dEnd + 40, parseTimeToMins(farBlock.time) - 5);
      if (fillerEnd - fillerStart >= MIN_ACTIVITY_MINS) {
        const already = working.some(
          (it) =>
            parseTimeToMins(it.time) >= fillerStart &&
            parseTimeToMins(it.time) < fillerEnd + 5 &&
            getScheduleCategory(it) === "social",
        );
        if (!already) {
          const filler = createLowEnergyBlock(fillerStart, fillerEnd, rainMode);
          const dIdx = working.findIndex(
            (it) =>
              parseTimeToMins(it.time) === parseTimeToMins(dinnerAgain.time) &&
              /\bdinner\b/i.test(it.activity),
          );
          if (dIdx >= 0) {
            working.splice(dIdx + 1, 0, filler);
            adjustments.push(
              `post-dinner large gap (${gap}min before "${farBlock.activity}")`,
            );
          }
        }
      }
    }
  }

  return { items: working, adjustments };
}

/** Compress dinner + wind-down when bedtime is early (≤ 21:00). */
export function enforceEarlySleepCompression(
  items: RoutineScheduleItem[],
  sleepMins: number,
  wakeMins: number,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  if (sleepMins > EARLY_SLEEP_MAX_MINS) return { items, adjustments };

  const wdStart = sleepMins - EARLY_WIND_DOWN_LEAD_MINS;
  const wdDuration = 25;
  const dinnerLatestEnd = wdStart - EARLY_DINNER_BEFORE_WD_MINS;

  let working = items.map((it) => ({ ...it }));

  let wd = working.find(isWindDownItem);
  if (!wd) {
    wd = {
      time: minsToTime24(wdStart),
      activity: "Wind-down & story",
      duration: wdDuration,
      category: "wind-down",
      status: "pending",
    };
    working.push(wd);
    adjustments.push("inserted wind-down for early bedtime");
  } else {
    wd.time = minsToTime24(Math.max(wakeMins, wdStart));
    wd.duration = wdDuration;
    adjustments.push("anchored wind-down at sleep − 40min");
  }

  const dinners = working.filter(
    (it) => isMealAnchor(it) && /\bdinner\b/i.test(it.activity),
  );
  for (const dinner of dinners) {
    const start = parseTimeToMins(dinner.time);
    let end = start + (dinner.duration ?? 35);
    if (end > dinnerLatestEnd) {
      const newDur = Math.max(MIN_ACTIVITY_MINS, dinnerLatestEnd - start);
      if (newDur < (dinner.duration ?? 35)) {
        dinner.duration = newDur;
        adjustments.push(
          `shortened dinner to end before wind-down (${EARLY_DINNER_BEFORE_WD_MINS}min gap)`,
        );
        end = start + newDur;
      }
      if (end > dinnerLatestEnd && start > dinnerLatestEnd - MIN_ACTIVITY_MINS) {
        dinner.time = minsToTime24(Math.max(wakeMins, dinnerLatestEnd - MIN_ACTIVITY_MINS));
        dinner.duration = MIN_ACTIVITY_MINS;
        adjustments.push("shifted dinner earlier for early bedtime");
      }
    }
  }

  const sleep = working.find(isSleepItem);
  if (sleep) sleep.time = minsToTime24(sleepMins);

  return { items: working, adjustments };
}

/** Replace adjacent same-category filler pairs (creative / cognitive_light / social stacking). */
export function dropRedundantCreativePairs(
  items: RoutineScheduleItem[],
  opts: { rainMode?: boolean } = {},
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  const out = [...items];
  const sorted = [...out].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (isSleepItem(curr) || isSleepItem(prev) || isLockedScheduleItem(curr)) continue;
    if (isProtectedScheduleBlock(prev) || isProtectedScheduleBlock(curr)) continue;

    const prevCat = getScheduleCategory(prev);
    const currCat = getScheduleCategory(curr);
    const adjacent = parseTimeToMins(curr.time) <= itemEndMins(prev) + 5;

    if (
      !adjacent ||
      prevCat !== currCat ||
      (prevCat !== "creative" &&
        prevCat !== "cognitive_light" &&
        prevCat !== "social")
    ) {
      continue;
    }

    const alt = pickDistantCategoryReplacement(currCat, {
      rainMode: opts.rainMode,
      avoidCategories: [prevCat],
      usedActivities: new Set(out.map((x) => x.activity.toLowerCase())),
    });
    if (!alt) continue;

    const idx = out.indexOf(curr);
    if (idx < 0) continue;
    out[idx] = {
      ...curr,
      activity: alt.activity,
      category: alt.category,
      ...(alt.energyImpact ? { energyImpact: alt.energyImpact } : {}),
    };
    adjustments.push(
      `replaced adjacent ${currCat} "${curr.activity}" → "${alt.activity}" after "${prev.activity}"`,
    );
  }

  return { items: out, adjustments };
}

/** Insert light filler blocks when any idle gap exceeds MAX_IDLE_GAP_MINS. */
export function fillWeekendIdleGaps(
  items: RoutineScheduleItem[],
  opts: FinalIntegrityOpts,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];

  const sorted = [...items]
    .filter((it) => !isSleepItem(it))
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
  const sleep = items.find(isSleepItem);
  const inserts: RoutineScheduleItem[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const prev = sorted[i]!;
    const next = sorted[i + 1]!;
    if (isMealAnchor(prev) && isMealAnchor(next)) continue;
    if (isSchoolAnchor(prev) || isSchoolAnchor(next)) continue;

    const gap = parseTimeToMins(next.time) - itemEndMins(prev);
    if (gap <= MAX_IDLE_GAP_MINS) continue;

    if (
      (isWindDownItem(next) || /\bwind.?down\b/i.test(next.activity)) &&
      gap <= MAX_IDLE_GAP_MINS
    ) {
      continue;
    }

    if (
      /\b(quiet creative indoor|indoor creative)\b/i.test(prev.activity) &&
      /\bcreative\b/i.test(prev.activity)
    ) {
      continue;
    }

    const nextStart = parseTimeToMins(next.time);
    const gapEnd = nextStart;
    let cursor = itemEndMins(prev) + 5;
    let remaining = gapEnd - cursor;
    const maxBlocks = gap > 180 ? 3 : 2;
    let blockCount = 0;
    const gapLabels: string[] = [];

    while (remaining > MAX_IDLE_GAP_MINS && blockCount < maxBlocks) {
      if (cursor >= opts.sleepMins - 50) break;

      const anchor = blockCount === 0 ? prev : inserts[inserts.length - 1]!;
      const prevBucket = getScheduleCategory(anchor);
      const nextBucket = getScheduleCategory(next);
      const basePool = opts.rainMode ? RAIN_GAP_FILLERS : WEEKEND_GAP_FILLERS;
      const pool = basePool.filter(
        (t) => t.category !== prevBucket && t.category !== nextBucket,
      );
      const template = (pool.length ? pool : basePool)[
        (inserts.length + blockCount) % (pool.length || basePool.length)
      ]!;

      const minDurToCloseGap = Math.max(
        MIN_ACTIVITY_MINS,
        remaining - MAX_IDLE_GAP_MINS - 5,
      );
      let duration = Math.min(
        remaining,
        50,
        Math.max(template.duration, minDurToCloseGap),
      );
      const nextEvent = nextEventStartAfter(cursor, opts.eventStartMins);
      if (nextEvent != null && cursor + duration > nextEvent - GAP_FILL_BEFORE_EVENT_MINS) {
        duration = Math.min(
          duration,
          Math.max(0, nextEvent - GAP_FILL_BEFORE_EVENT_MINS - cursor),
        );
      }
      if (
        nextEvent != null &&
        nextStart <= nextEvent &&
        nextStart - cursor < GAP_FILL_BEFORE_EVENT_MINS + MIN_ACTIVITY_MINS
      ) {
        break;
      }
      if (duration < MIN_ACTIVITY_MINS || cursor + duration > nextStart - 5) {
        break;
      }

      inserts.push({
        time: minsToTime24(cursor),
        activity: template.activity,
        duration,
        category: template.category,
        status: "pending",
        notes: "Light weekend activity to balance the day.",
      });
      gapLabels.push(template.activity);
      cursor += duration + 5;
      remaining = gapEnd - cursor;
      blockCount++;
    }

    if (gapLabels.length) {
      adjustments.push(
        `filled ${gap}min weekend gap with ${gapLabels.join(", ")} after "${prev.activity}"`,
      );
    }
  }

  if (!inserts.length) {
    return { items, adjustments };
  }

  const merged = [...items, ...inserts].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );
  if (sleep) {
    const withoutSleep = merged.filter((it) => !isSleepItem(it));
    withoutSleep.push(sleep);
    return { items: withoutSleep, adjustments };
  }
  return { items: merged, adjustments };
}

/** Tolerant regions at very high AQI need at least one brief limited outdoor block with advisory. */
export function ensureTolerantHighAqiOutdoor(
  items: RoutineScheduleItem[],
  opts: FinalIntegrityOpts,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  const aqi = opts.aqi;
  const country = opts.country ?? "IN";
  if (aqi == null || !Number.isFinite(aqi) || aqi <= 200) {
    return { items, adjustments };
  }
  if (aqiCultureProfile(country) !== "tolerant") {
    return { items, adjustments };
  }

  const policy = deriveAqiOutdoorPolicy(aqi, country);
  if (
    !policy.allowOutdoor ||
    policy.exposureMode === "indoor_only" ||
    policy.optionalOutdoor
  ) {
    return { items, adjustments };
  }

  const hasOutdoor = items.some(
    (it) =>
      isOutdoorActivityItem(it) || /\blight outdoor walk\b/i.test(it.activity),
  );
  if (hasOutdoor) return { items, adjustments };

  const cap = Math.min(policy.maxOutdoorDurationMins ?? 15, 15);
  const startMins = Math.max(
    opts.wakeMins + 45,
    opts.hasSchool && !opts.isWeekendDay ? 15 * 60 + 20 : 8 * 60,
  );
  const walk = attachAqiAdvisory(
    {
      time: minsToTime24(startMins),
      activity: lightOutdoorWalkLabel(),
      duration: Math.max(MIN_ACTIVITY_MINS, cap),
      category: "outdoor",
      status: "pending",
      notes: "Brief protected outdoor window for air-quality balance.",
    },
    aqi,
    country,
    policy.exposureMode,
  );

  adjustments.push("injected tolerant-region limited outdoor walk");
  const merged = [...items, walk].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );
  return { items: merged, adjustments };
}

/** Hard cap: wind-down must end before lights-out with minimum gap. */
function clampWindDownBeforeSleep(
  items: RoutineScheduleItem[],
  sleepMins: number,
  wakeMins: number,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  const wd = [...items].filter(isWindDownItem).pop();
  if (!wd) return { items, adjustments };

  const maxEnd = sleepMins - WIND_DOWN_SLEEP_GAP_MIN;
  let start = parseTimeToMins(wd.time);
  let dur = wd.duration ?? 25;

  if (start + dur > maxEnd) {
    dur = Math.min(dur, maxEnd - start);
    if (dur < MIN_ACTIVITY_MINS) {
      dur = Math.min(25, maxEnd - wakeMins);
      start = Math.max(wakeMins, maxEnd - dur);
    }
    wd.time = minsToTime24(start);
    wd.duration = Math.max(MIN_ACTIVITY_MINS, dur);
    adjustments.push("clamped wind-down to fit before lights-out");
  }

  return { items, adjustments };
}

function runIntegrityRepairPass(
  items: RoutineScheduleItem[],
  opts: FinalIntegrityOpts,
): RoutineScheduleItem[] {
  let working = items;
  working = resolveOverlapsByPriority(working, opts.sleepMins).items;
  working = resolveTimelineOverlaps(working, opts.wakeMins, opts.sleepMins);
  working = enforceSleepBoundary(working, opts.sleepMins, opts.wakeMins).items;
  working = ensureWindDownBeforeSleep(working, opts.sleepMins, opts.wakeMins).items;
  working = resolveTimelineOverlaps(working, opts.wakeMins, opts.sleepMins);
  working = enforceSleepIsLast(working);
  return working;
}

/**
 * Final enforcement pass — must run after realism polish, events, meals, fixed activities.
 */
export function enforceFinalTimelineIntegrity(
  items: RoutineScheduleItem[],
  opts: FinalIntegrityOpts,
): FinalIntegrityResult {
  const allAdjustments: string[] = [];
  const warnings: string[] = [];
  let working = items.map((it) => ({
    ...it,
    time: normalizeTo24h(it.time),
  }));

  const rainMode =
    opts.rainMode === true ||
    /rain|drizzle|storm/i.test(opts.condition ?? "") ||
    opts.condition === "rain";

  const normalized = normalizeScheduleCategories(working);
  working = normalized.items;
  allAdjustments.push(...normalized.adjustments);

  const labelPass = fixTimeBasedLabels(working);
  working = labelPass.items;
  allAdjustments.push(...labelPass.adjustments);

  const mealDedup = deduplicateMeals(working);
  working = mealDedup.items;
  allAdjustments.push(...mealDedup.adjustments);

  const catDedup = deduplicateAdjacentCategories(working, { rainMode });
  working = catDedup.items;
  allAdjustments.push(...catDedup.adjustments);

  const sleepBoundary = enforceSleepBoundary(working, opts.sleepMins, opts.wakeMins);
  working = sleepBoundary.items;
  allAdjustments.push(...sleepBoundary.adjustments);

  const overlapPass = resolveOverlapsByPriority(working, opts.sleepMins);
  working = overlapPass.items;
  allAdjustments.push(...overlapPass.adjustments);

  working = resolveTimelineOverlaps(working, opts.wakeMins, opts.sleepMins, warnings);

  const windDown = ensureWindDownBeforeSleep(working, opts.sleepMins, opts.wakeMins);
  working = windDown.items;
  allAdjustments.push(...windDown.adjustments);

  working = resolveTimelineOverlaps(working, opts.wakeMins, opts.sleepMins, warnings);
  working = enforceSleepIsLast(working);

  const overlapPass2 = resolveOverlapsByPriority(working, opts.sleepMins);
  working = overlapPass2.items;
  allAdjustments.push(...overlapPass2.adjustments);

  const sleepBoundary2 = enforceSleepBoundary(working, opts.sleepMins, opts.wakeMins);
  working = sleepBoundary2.items;
  allAdjustments.push(...sleepBoundary2.adjustments);

  const windDown2 = ensureWindDownBeforeSleep(working, opts.sleepMins, opts.wakeMins);
  working = windDown2.items;
  allAdjustments.push(...windDown2.adjustments);

  working = resolveTimelineOverlaps(working, opts.wakeMins, opts.sleepMins, warnings);
  working = enforceSleepIsLast(working);

  const finalOverlap = resolveOverlapsByPriority(working, opts.sleepMins);
  working = finalOverlap.items;
  allAdjustments.push(...finalOverlap.adjustments);
  working = resolveTimelineOverlaps(working, opts.wakeMins, opts.sleepMins, warnings);

  const sequential = forceSequentialTimeline(working, opts.sleepMins);
  working = sequential.items;
  allAdjustments.push(...sequential.adjustments);
  working = ensureWindDownBeforeSleep(working, opts.sleepMins, opts.wakeMins).items;
  working = enforceSleepIsLast(working);

  const lateDedup = deduplicateAdjacentCategories(working, { rainMode });
  working = lateDedup.items;
  allAdjustments.push(...lateDedup.adjustments);
  working = enforceSleepBoundary(working, opts.sleepMins, opts.wakeMins).items;
  working = enforceSleepIsLast(working);

  const outdoorClamp = enforceOutdoorDurationLimits(working, {
    aqi: opts.aqi,
    country: opts.country,
    condition: opts.condition,
    rainyDayMaxMins: 10,
  });
  working = outdoorClamp.items;
  allAdjustments.push(...outdoorClamp.adjustments);

  const aqiOutdoor = ensureTolerantHighAqiOutdoor(working, opts);
  working = aqiOutdoor.items;
  allAdjustments.push(...aqiOutdoor.adjustments);

  const mealSplit = splitLongMealBlocks(working);
  working = mealSplit.items;
  allAdjustments.push(...mealSplit.adjustments);

  const postEnvDedup = deduplicateAdjacentCategories(working, { rainMode });
  working = postEnvDedup.items;
  allAdjustments.push(...postEnvDedup.adjustments);

  working = resolveOverlapsByPriority(working, opts.sleepMins).items;
  working = resolveTimelineOverlaps(working, opts.wakeMins, opts.sleepMins, warnings);
  working = forceSequentialTimeline(working, opts.sleepMins).items;

  for (let gapPass = 0; gapPass < 3; gapPass++) {
    const gapFill = fillWeekendIdleGaps(working, opts);
    working = gapFill.items;
    allAdjustments.push(...gapFill.adjustments);
    if (!gapFill.adjustments.length) break;
    working = forceSequentialTimeline(working, opts.sleepMins).items;
  }

  const postGapDedup = deduplicateAdjacentCategories(working, { rainMode });
  working = postGapDedup.items;
  allAdjustments.push(...postGapDedup.adjustments);

  const creativeDedup = dropRedundantCreativePairs(working, { rainMode });
  working = creativeDedup.items;
  allAdjustments.push(...creativeDedup.adjustments);

  const earlySleep = enforceEarlySleepCompression(working, opts.sleepMins, opts.wakeMins);
  working = earlySleep.items;
  allAdjustments.push(...earlySleep.adjustments);

  const postDinner = enforcePostDinnerContinuity(working, { ...opts, rainMode });
  working = postDinner.items;
  allAdjustments.push(...postDinner.adjustments);

  working = resolveOverlapsByPriority(working, opts.sleepMins).items;
  working = resolveTimelineOverlaps(working, opts.wakeMins, opts.sleepMins, warnings);

  working = ensureWindDownBeforeSleep(working, opts.sleepMins, opts.wakeMins).items;
  working = enforceSleepBoundary(working, opts.sleepMins, opts.wakeMins).items;
  const wdClamp = clampWindDownBeforeSleep(working, opts.sleepMins, opts.wakeMins);
  working = wdClamp.items;
  allAdjustments.push(...wdClamp.adjustments);
  working = enforceSleepIsLast(working);

  let assertions = assertFinalTimelineIntegrity(working, opts);
  let repaired = false;

  if (!assertions.passed) {
    repaired = true;
    allAdjustments.push(`assertion repair: ${assertions.failures.join("; ")}`);
    const beforeRepair = working;
    for (let attempt = 0; attempt < 3; attempt++) {
      working = runIntegrityRepairPass(working, opts);
      assertions = assertFinalTimelineIntegrity(working, opts);
      if (assertions.passed) break;
    }
    if (!assertions.passed && beforeRepair.length > working.length) {
      working = runIntegrityRepairPass(beforeRepair, opts);
      assertions = assertFinalTimelineIntegrity(working, opts);
    }
    if (!assertions.passed) {
      warnings.push(...assertions.failures.map((f) => `final-integrity: ${f}`));
    }
  }

  working = ensureWindDownBeforeSleep(working, opts.sleepMins, opts.wakeMins).items;
  const wd = working.filter(isWindDownItem).pop();
  if (wd) {
    const wdStart = parseTimeToMins(wd.time);
    for (const it of working) {
      if (it === wd || isSleepItem(it) || isWindDownItem(it)) continue;
      const start = parseTimeToMins(it.time);
      const end = itemEndMins(it);
      if (end > wdStart && start < wdStart && isMealAnchor(it)) {
        const maxDur = Math.max(MIN_ACTIVITY_MINS, wdStart - start - 5);
        if ((it.duration ?? 30) > maxDur) {
          it.duration = maxDur;
          allAdjustments.push(`shortened "${it.activity}" before wind-down`);
        }
      }
    }
  }
  const finalEarly = enforceEarlySleepCompression(working, opts.sleepMins, opts.wakeMins);
  working = finalEarly.items;
  allAdjustments.push(...finalEarly.adjustments);

  for (let lateGapPass = 0; lateGapPass < 2; lateGapPass++) {
    const lateGap = fillWeekendIdleGaps(working, opts);
    working = lateGap.items;
    allAdjustments.push(...lateGap.adjustments);
    if (!lateGap.adjustments.length) break;
    working = resolveOverlapsByPriority(working, opts.sleepMins).items;
    working = forceSequentialTimeline(working, opts.sleepMins).items;
  }

  const finalWd = clampWindDownBeforeSleep(working, opts.sleepMins, opts.wakeMins);
  working = enforceSleepBoundary(finalWd.items, opts.sleepMins, opts.wakeMins).items;
  working = resolveOverlapsByPriority(working, opts.sleepMins).items;
  working = resolveTimelineOverlaps(working, opts.wakeMins, opts.sleepMins, warnings);
  working = enforceSleepIsLast(working);
  assertions = assertFinalTimelineIntegrity(working, opts);

  return {
    items: working,
    adjustments: allAdjustments,
    warnings,
    repaired,
    assertionsPassed: assertions.passed,
  };
}
