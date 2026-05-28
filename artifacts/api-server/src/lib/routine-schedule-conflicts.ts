/**
 * Schedule conflict resolution — metadata-aware final pass before integrity asserts.
 * Complements `resolveTimelineOverlaps` / `resolveOverlapsByPriority` with dinner
 * boundary protection, evening stack collapse, gap-aware transitions, and filler decompression.
 */
import { getActivityMetadata, type ActivityMetadata } from "./routine-activity-metadata.js";
import {
  isLockedScheduleItem,
  isSleepItem,
  minsToTime24,
  normalizeTo24h,
  parseTimeToMins,
  type RoutineScheduleItem,
} from "./routine-scheduler.js";

const MIN_ACTIVITY_MINS = 10;
const MIN_GAP_DEFAULT = 10;
const MIN_GAP_MEAL = 15;
const MIN_GAP_HIGH_ENERGY = 15;
const MIN_FILLER_MINS = 15;
const EVENING_START_MINS = 17 * 60;
const PRE_DINNER_BUFFER_MINS = 12;
const EVENING_STACK_WINDOW_MINS = 100;
const EVENING_STACK_MAX_BLOCKS = 2;
const WIND_DOWN_SLEEP_GAP_MIN = 20;

export type ScheduleConflictOpts = {
  wakeMins: number;
  sleepMins: number;
  country?: string;
  eventStartMins?: number[];
};

export type ScheduleConflictKind =
  | "overlap"
  | "insufficient_gap"
  | "meal_intrusion"
  | "evening_stack"
  | "compressed_filler"
  | "awkward_transition";

export type ScheduleConflict = {
  kind: ScheduleConflictKind;
  indexA: number;
  indexB: number;
  message: string;
};

export type ScheduleConflictResult = {
  items: RoutineScheduleItem[];
  resolutions: string[];
  warnings: string[];
  conflictsDetected: number;
};

function itemEndMins(item: RoutineScheduleItem): number {
  return parseTimeToMins(item.time) + (item.duration ?? 30);
}

function isMealAnchor(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "meal" || cat === "tiffin") return true;
  return /\b(breakfast|lunch|dinner|drunch|refuel|snack|tiffin)\b/i.test(item.activity);
}

function isDinnerAnchor(item: RoutineScheduleItem): boolean {
  return isMealAnchor(item) && /\bdinner\b/i.test(item.activity);
}

function isWindDownItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  return (
    cat === "wind-down" ||
    /\b(wind.?down|story time|bedtime story|quiet wind-down)\b/i.test(item.activity)
  );
}

function isSpecialOrFixed(item: RoutineScheduleItem): boolean {
  return (
    item.culturalTag === "special_event" ||
    item.culturalTag === "fixed_recurring" ||
    item.activitySource === "special" ||
    item.activitySource === "fixed" ||
    (item as { structureKind?: string }).structureKind === "special_event"
  );
}

/** Lower = higher retention priority (aligned with finalItemPriority tiers). */
function conflictRetentionPriority(item: RoutineScheduleItem): number {
  if (isSpecialOrFixed(item)) return 1;
  if (isLockedScheduleItem(item)) return 2;
  if (isSleepItem(item)) return 3;
  if (isMealAnchor(item)) return 4;
  if (isWindDownItem(item)) return 5;
  if (/wake up|freshen up/i.test(item.activity)) return 6;
  const meta = getActivityMetadata(item);
  if (meta.category === "study") return 7;
  if (meta.intensity === "high") return 8;
  return 9;
}

function isFlexibleBlock(item: RoutineScheduleItem): boolean {
  if (isSleepItem(item) || isLockedScheduleItem(item)) return false;
  if (isMealAnchor(item) || isWindDownItem(item)) return false;
  if (isSpecialOrFixed(item)) return false;
  if (/wake up|freshen up/i.test(item.activity)) return false;
  return conflictRetentionPriority(item) >= 7;
}

function isStackableEveningBlock(item: RoutineScheduleItem): boolean {
  if (!isFlexibleBlock(item)) return false;
  const meta = getActivityMetadata(item);
  return (
    meta.category === "play" ||
    meta.category === "creative" ||
    meta.category === "movement" ||
    meta.category === "social"
  );
}

function requiredGapBetween(
  prev: RoutineScheduleItem,
  curr: RoutineScheduleItem,
): number {
  const prevMeta = getActivityMetadata(prev);
  const currMeta = getActivityMetadata(curr);

  if (isMealAnchor(prev) || isMealAnchor(curr)) return MIN_GAP_MEAL;
  if (prevMeta.intensity === "high" && currMeta.intensity === "high") {
    return MIN_GAP_HIGH_ENERGY;
  }
  if (prevMeta.intensity === "high" || currMeta.intensity === "high") {
    return MIN_GAP_HIGH_ENERGY;
  }
  if (
    prevMeta.category === "movement" ||
    currMeta.category === "movement"
  ) {
    return MIN_GAP_HIGH_ENERGY;
  }
  return MIN_GAP_DEFAULT;
}

function sameTransitionGroup(a: ActivityMetadata, b: ActivityMetadata): boolean {
  return a.category === b.category && a.intensity === b.intensity;
}

function cloneSorted(items: RoutineScheduleItem[]): RoutineScheduleItem[] {
  return [...items]
    .filter((it) => !/^\s*free\s*time\s*$/i.test(it.activity))
    .map((it) => ({ ...it, time: normalizeTo24h(it.time) }))
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
}

/** Detect timeline issues that downstream overlap passes may miss (gaps, meals, stacks). */
export function detectScheduleConflicts(
  items: RoutineScheduleItem[],
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const sorted = cloneSorted(items);

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (isSleepItem(prev)) continue;

    const prevEnd = itemEndMins(prev);
    const currStart = parseTimeToMins(curr.time);
    const gapNeeded = requiredGapBetween(prev, curr);

    if (currStart < prevEnd) {
      conflicts.push({
        kind: "overlap",
        indexA: i - 1,
        indexB: i,
        message: `overlap: "${prev.activity}" ∩ "${curr.activity}"`,
      });
    } else if (currStart < prevEnd + gapNeeded) {
      conflicts.push({
        kind: "insufficient_gap",
        indexA: i - 1,
        indexB: i,
        message: `tight gap (${currStart - prevEnd}min) between "${prev.activity}" and "${curr.activity}"`,
      });
    }

    const prevMeta = getActivityMetadata(prev);
    const currMeta = getActivityMetadata(curr);
    if (
      prevMeta.intensity === "high" &&
      currMeta.intensity === "high" &&
      sameTransitionGroup(prevMeta, currMeta) &&
      currStart - prevEnd < MIN_GAP_HIGH_ENERGY
    ) {
      conflicts.push({
        kind: "awkward_transition",
        indexA: i - 1,
        indexB: i,
        message: `back-to-back high-energy ${prevMeta.category} blocks`,
      });
    }
  }

  const dinner = sorted.find(isDinnerAnchor);
  if (dinner) {
    const dStart = parseTimeToMins(dinner.time);
    const dEnd = itemEndMins(dinner);
    for (let i = 0; i < sorted.length; i++) {
      const it = sorted[i]!;
      if (it === dinner || isSleepItem(it)) continue;
      const start = parseTimeToMins(it.time);
      const end = itemEndMins(it);
      if (start < dEnd && end > dStart && !isDinnerAnchor(it)) {
        conflicts.push({
          kind: "meal_intrusion",
          indexA: i,
          indexB: sorted.indexOf(dinner),
          message: `meal intrusion: "${it.activity}" overlaps dinner`,
        });
      }
    }
  }

  const eveningEnd = Math.max(
    EVENING_START_MINS,
    (sorted.find(isSleepItem)
      ? parseTimeToMins(sorted.find(isSleepItem)!.time)
      : 22 * 60) - 60,
  );
  const eveningBlocks = sorted.filter((it) => {
    const start = parseTimeToMins(it.time);
    return (
      isStackableEveningBlock(it) &&
      start >= EVENING_START_MINS &&
      start < eveningEnd
    );
  });
  if (eveningBlocks.length >= 3) {
    const windowStart = parseTimeToMins(eveningBlocks[0]!.time);
    const windowEnd = itemEndMins(eveningBlocks[eveningBlocks.length - 1]!);
    if (windowEnd - windowStart <= EVENING_STACK_WINDOW_MINS) {
      conflicts.push({
        kind: "evening_stack",
        indexA: sorted.indexOf(eveningBlocks[0]!),
        indexB: sorted.indexOf(eveningBlocks[eveningBlocks.length - 1]!),
        message: `${eveningBlocks.length} stacked evening activity blocks in ${windowEnd - windowStart}min`,
      });
    }
  }

  for (let i = 0; i < sorted.length; i++) {
    const it = sorted[i]!;
    if (!isFlexibleBlock(it)) continue;
    if ((it.duration ?? 30) >= MIN_FILLER_MINS) continue;
    const prev = sorted[i - 1];
    const next = sorted[i + 1];
    if (prev && next && itemEndMins(prev) > parseTimeToMins(it.time)) {
      conflicts.push({
        kind: "compressed_filler",
        indexA: i - 1,
        indexB: i,
        message: `compressed filler "${it.activity}" (${it.duration ?? 0}min) under overlap pressure`,
      });
    }
  }

  return conflicts;
}

function resolvePairOverlap(
  sorted: RoutineScheduleItem[],
  i: number,
  sleepMins: number,
  resolutions: string[],
): boolean {
  const prev = sorted[i - 1]!;
  const curr = sorted[i]!;
  if (isSleepItem(prev)) return false;

  const prevStart = parseTimeToMins(prev.time);
  const prevEnd = itemEndMins(prev);
  let currStart = parseTimeToMins(curr.time);
  const gap = requiredGapBetween(prev, curr);
  const requiredStart = prevEnd + gap;

  if (currStart >= requiredStart) return false;

  if (isSleepItem(curr) && prevEnd > sleepMins - WIND_DOWN_SLEEP_GAP_MIN) {
    const maxDur = sleepMins - WIND_DOWN_SLEEP_GAP_MIN - prevStart;
    if (isWindDownItem(prev) && maxDur >= MIN_ACTIVITY_MINS) {
      prev.duration = maxDur;
      resolutions.push(`conflict: trimmed wind-down before sleep`);
      return true;
    }
    if (isFlexibleBlock(prev) && maxDur >= MIN_ACTIVITY_MINS) {
      prev.duration = maxDur;
      resolutions.push(`conflict: trimmed "${prev.activity}" before sleep`);
      return true;
    }
    return false;
  }

  const prevPri = conflictRetentionPriority(prev);
  const currPri = conflictRetentionPriority(curr);

  if (currPri < prevPri) {
    const maxPrevDur = Math.max(MIN_ACTIVITY_MINS, currStart - prevStart);
    if ((prev.duration ?? 30) > maxPrevDur) {
      prev.duration = maxPrevDur;
      resolutions.push(
        `conflict: shortened "${prev.activity}" before "${curr.activity}"`,
      );
      return true;
    }
    if (isFlexibleBlock(prev) && maxPrevDur < MIN_ACTIVITY_MINS) {
      sorted.splice(i - 1, 1);
      resolutions.push(`conflict: dropped "${prev.activity}" (no room before pinned block)`);
      return true;
    }
    return false;
  }

  if (prevPri < currPri) {
    currStart = requiredStart;
    if (currStart !== parseTimeToMins(curr.time)) {
      curr.time = minsToTime24(currStart);
      resolutions.push(`conflict: shifted "${curr.activity}" after "${prev.activity}"`);
      return true;
    }
    return false;
  }

  if (isFlexibleBlock(curr) && !isFlexibleBlock(prev)) {
    currStart = requiredStart;
    curr.time = minsToTime24(currStart);
    resolutions.push(`conflict: shifted flexible "${curr.activity}"`);
    return true;
  }

  if (isFlexibleBlock(prev)) {
    const maxPrevDur = Math.max(
      MIN_ACTIVITY_MINS,
      requiredStart - gap - prevStart,
    );
    if ((prev.duration ?? 30) > maxPrevDur) {
      prev.duration = maxPrevDur;
      resolutions.push(`conflict: shortened "${prev.activity}" (same-tier overlap)`);
      return true;
    }
  }

  currStart = requiredStart;
  curr.time = minsToTime24(currStart);
  resolutions.push(`conflict: shifted "${curr.activity}" after "${prev.activity}"`);
  return true;
}

function resolveMealBoundaryConflicts(
  sorted: RoutineScheduleItem[],
  resolutions: string[],
): boolean {
  const dinner = sorted.find(isDinnerAnchor);
  if (!dinner) return false;

  const dStart = parseTimeToMins(dinner.time);
  const dEnd = itemEndMins(dinner);
  let changed = false;

  for (const it of sorted) {
    if (it === dinner || isSleepItem(it) || isDinnerAnchor(it)) continue;
    const start = parseTimeToMins(it.time);
    const end = itemEndMins(it);
    if (start >= dEnd || end <= dStart) continue;

    if (isFlexibleBlock(it)) {
      if (end > dStart && start < dStart) {
        const maxDur = Math.max(MIN_ACTIVITY_MINS, dStart - PRE_DINNER_BUFFER_MINS - start);
        if ((it.duration ?? 30) > maxDur) {
          it.duration = maxDur;
          resolutions.push(
            `conflict: shortened pre-dinner "${it.activity}" (${PRE_DINNER_BUFFER_MINS}min buffer)`,
          );
          changed = true;
        }
        if (itemEndMins(it) > dStart - PRE_DINNER_BUFFER_MINS) {
          it.time = minsToTime24(Math.max(dStart - PRE_DINNER_BUFFER_MINS - (it.duration ?? 30), sorted[0] ? parseTimeToMins(sorted[0].time) : 0));
          resolutions.push(`conflict: moved "${it.activity}" clear of dinner window`);
          changed = true;
        }
      } else if (start < dEnd && start >= dStart) {
        it.time = minsToTime24(dEnd + MIN_GAP_MEAL);
        resolutions.push(`conflict: shifted "${it.activity}" after dinner`);
        changed = true;
      } else if (start < dEnd) {
        const maxDur = Math.max(MIN_ACTIVITY_MINS, dStart - start - PRE_DINNER_BUFFER_MINS);
        if ((it.duration ?? 30) > maxDur) {
          it.duration = maxDur;
          resolutions.push(`conflict: trimmed "${it.activity}" overlapping dinner end`);
          changed = true;
        }
      }
    }
  }

  return changed;
}

function collapseStackedEveningBlocks(
  sorted: RoutineScheduleItem[],
  sleepMins: number,
  resolutions: string[],
): boolean {
  const eveningEnd = Math.max(EVENING_START_MINS, sleepMins - 75);
  const candidates = sorted
    .map((it, idx) => ({ it, idx }))
    .filter(
      ({ it }) =>
        isStackableEveningBlock(it) &&
        parseTimeToMins(it.time) >= EVENING_START_MINS &&
        parseTimeToMins(it.time) < eveningEnd,
    );

  if (candidates.length < 3) return false;

  const windowStart = parseTimeToMins(candidates[0]!.it.time);
  const windowEnd = itemEndMins(candidates[candidates.length - 1]!.it);
  if (windowEnd - windowStart > EVENING_STACK_WINDOW_MINS) return false;

  const ranked = [...candidates].sort(
    (a, b) =>
      conflictRetentionPriority(a.it) - conflictRetentionPriority(b.it) ||
      parseTimeToMins(a.it.time) - parseTimeToMins(b.it.time),
  );

  let changed = false;
  const keep = new Set(ranked.slice(0, EVENING_STACK_MAX_BLOCKS).map((r) => r.it));

  for (const { it } of ranked) {
    if (keep.has(it)) continue;
    const idx = sorted.indexOf(it);
    if (idx < 0) continue;
    sorted.splice(idx, 1);
    resolutions.push(`conflict: dropped stacked evening block "${it.activity}"`);
    changed = true;
  }

  return changed;
}

function decompressCompressedFillers(
  sorted: RoutineScheduleItem[],
  sleepMins: number,
  resolutions: string[],
): boolean {
  let changed = false;
  for (let i = 0; i < sorted.length; i++) {
    const it = sorted[i]!;
    if (!isFlexibleBlock(it) || (it.duration ?? 30) >= MIN_FILLER_MINS) continue;

    const prev = sorted[i - 1];
    const next = sorted[i + 1];
    if (!prev || !next || isSleepItem(next)) continue;

    const prevEnd = itemEndMins(prev);
    const nextStart = parseTimeToMins(next.time);
    const slot = nextStart - prevEnd - requiredGapBetween(prev, next);

    if (slot < MIN_FILLER_MINS) {
      sorted.splice(i, 1);
      resolutions.push(`conflict: removed compressed filler "${it.activity}" (${it.duration ?? 0}min)`);
      changed = true;
      i--;
      continue;
    }

    if ((it.duration ?? 0) < MIN_FILLER_MINS && slot >= MIN_FILLER_MINS) {
      const newStart = prevEnd + requiredGapBetween(prev, it);
      const newDur = Math.min(slot, 25);
      if (newDur >= MIN_FILLER_MINS && newStart + newDur <= nextStart) {
        it.time = minsToTime24(newStart);
        it.duration = newDur;
        resolutions.push(`conflict: expanded filler "${it.activity}" to ${newDur}min`);
        changed = true;
      }
    }

    if (itemEndMins(it) > sleepMins - WIND_DOWN_SLEEP_GAP_MIN && isFlexibleBlock(it)) {
      sorted.splice(i, 1);
      resolutions.push(`conflict: dropped "${it.activity}" (no evening room before sleep)`);
      changed = true;
      i--;
    }
  }
  return changed;
}

function resolveMetadataAwareOverlaps(
  items: RoutineScheduleItem[],
  sleepMins: number,
  resolutions: string[],
): RoutineScheduleItem[] {
  const sorted = cloneSorted(items);

  for (let pass = 0; pass < 8; pass++) {
    let changed = false;

    if (resolveMealBoundaryConflicts(sorted, resolutions)) changed = true;

    for (let i = 1; i < sorted.length; i++) {
      if (resolvePairOverlap(sorted, i, sleepMins, resolutions)) changed = true;
    }

    if (collapseStackedEveningBlocks(sorted, sleepMins, resolutions)) changed = true;
    if (decompressCompressedFillers(sorted, sleepMins, resolutions)) changed = true;

    const sleep = sorted.find(isSleepItem);
    if (sleep) sleep.time = minsToTime24(sleepMins);

    if (!changed) break;
  }

  return sorted;
}

/**
 * Final intelligent conflict-resolution pass — deterministic, metadata-first.
 * Run before `resolveOverlapsByPriority` / `enforceFinalTimelineIntegrity` overlap loops.
 */
export function resolveScheduleConflicts(
  items: RoutineScheduleItem[],
  opts: ScheduleConflictOpts,
): ScheduleConflictResult {
  const resolutions: string[] = [];
  const warnings: string[] = [];

  if (!items.length) {
    return { items, resolutions, warnings, conflictsDetected: 0 };
  }

  const detected = detectScheduleConflicts(items);
  if (detected.length) {
    warnings.push(...detected.map((c) => c.message));
  }

  let working = resolveMetadataAwareOverlaps(items, opts.sleepMins, resolutions);

  const postDetect = detectScheduleConflicts(working);
  if (postDetect.length) {
    working = resolveMetadataAwareOverlaps(working, opts.sleepMins, resolutions);
    const remaining = detectScheduleConflicts(working);
    for (const c of remaining) {
      warnings.push(`unresolved: ${c.message}`);
    }
  }

  void opts.wakeMins;
  void opts.country;
  void opts.eventStartMins;

  return {
    items: working,
    resolutions,
    warnings,
    conflictsDetected: detected.length,
  };
}
