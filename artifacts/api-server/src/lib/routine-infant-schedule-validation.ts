/**
 * Infant pipeline schedule validation — safety net after enforceSleepBoundary.
 * Does not replace hardValidateSchedule; adds nap/wake-window/bedtime checks.
 */
import { getNapsPerDayForAge } from "./sleepPredict.js";
import {
  isBedtimeSleepItem,
  isNapItem,
  parseTimeToMins,
  type RoutineScheduleItem,
} from "./routine-scheduler.js";

const MAX_INFANT_FEED_MINS = 45;
const MAX_WAKE_WINDOW_MINS = 180;

export type InfantScheduleValidationResult = {
  valid: boolean;
  errors: string[];
};

function isFeedingItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  return cat === "feeding" || cat === "feed" || /\b(feed|milk|breast|formula|solid)\b/i.test(item.activity);
}

/**
 * Validate 6–11 month (and general infant) schedules post-pipeline.
 */
export function validateInfantPipelineSchedule(
  items: RoutineScheduleItem[],
  opts: {
    ageMonths: number;
    wakeMins: number;
    sleepMins: number;
  },
): InfantScheduleValidationResult {
  const errors: string[] = [];
  const { ageMonths, wakeMins, sleepMins } = opts;

  const naps = items.filter(isNapItem);
  const bedtimeItems = items.filter(isBedtimeSleepItem);

  if (ageMonths >= 6 && ageMonths < 12) {
    const band = getNapsPerDayForAge(ageMonths);
    if (naps.length < band.min) {
      errors.push(
        `infant safety: expected at least ${band.min} nap(s), found ${naps.length}`,
      );
    }
  }

  for (const feed of items.filter(isFeedingItem)) {
    const dur = feed.duration ?? 0;
    if (dur > MAX_INFANT_FEED_MINS) {
      errors.push(
        `infant safety: feed "${feed.activity}" duration ${dur}min exceeds ${MAX_INFANT_FEED_MINS}min cap`,
      );
    }
  }

  if (bedtimeItems.length !== 1) {
    errors.push(
      `infant safety: expected exactly 1 bedtime block, found ${bedtimeItems.length}`,
    );
  } else {
    const bedStart = parseTimeToMins(bedtimeItems[0]!.time);
    if (Math.abs(bedStart - sleepMins) > 5) {
      errors.push(
        `infant safety: bedtime at ${bedtimeItems[0]!.time} does not match sleep anchor`,
      );
    }
  }

  for (const it of items) {
    if (isBedtimeSleepItem(it)) continue;
    const start = parseTimeToMins(it.time);
    if (start >= sleepMins) {
      errors.push(
        `infant safety: "${it.activity}" starts at/after bedtime (${it.time})`,
      );
    }
  }

  const timed = [...items]
    .filter((it) => !isBedtimeSleepItem(it))
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));

  for (let i = 1; i < timed.length; i++) {
    const prev = timed[i - 1]!;
    const curr = timed[i]!;
    const prevEnd = parseTimeToMins(prev.time) + (prev.duration ?? 0);
    const gap = parseTimeToMins(curr.time) - prevEnd;
    if (gap > MAX_WAKE_WINDOW_MINS) {
      errors.push(
        `infant safety: ${gap}min idle gap between "${prev.activity}" and "${curr.activity}" (max ${MAX_WAKE_WINDOW_MINS})`,
      );
    }
  }

  if (parseTimeToMins(timed[0]?.time ?? "99:99") > wakeMins + 15) {
    errors.push("infant safety: first activity starts too late after wake");
  }

  return { valid: errors.length === 0, errors };
}
