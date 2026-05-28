/**
 * Multi-day continuity — avoids repeating skipped/yesterday-heavy blocks; prefers completed patterns.
 */
import {
  attachActivityMetadata,
  getActivityMetadata,
  normalizeActivityKey,
  pickDeterministicFreshLabel,
} from "./routine-activity-metadata.js";
import type { PersonalizationMemory } from "./routine-personalization-memory.js";
import {
  isLockedScheduleItem,
  isSleepItem,
  type RoutineScheduleItem,
  type ScheduleDecisionMeta,
} from "./routine-scheduler.js";
import { isProtectedScheduleBlock } from "./routine-category-taxonomy.js";

const MIN_ACTIVITY_MINS = 10;

export type ContinuityContext = {
  memory: PersonalizationMemory;
  seed: number;
  routineDate?: string;
};

export type ContinuityAdjustment = {
  activity: string;
  change: string;
};

function isFlexible(item: RoutineScheduleItem): boolean {
  return !isProtectedScheduleBlock(item) && !isLockedScheduleItem(item) && !isSleepItem(item);
}

function tag(item: RoutineScheduleItem, reason: string, original?: string): RoutineScheduleItem {
  const decision: ScheduleDecisionMeta = {
    reason,
    source: "preference",
    originalActivity: original ?? item.activity,
  };
  return { ...item, scheduleDecision: decision };
}

function recentKeys(memory: PersonalizationMemory): Set<string> {
  const keys = new Set<string>();
  for (const day of memory.recentDayKeys) {
    for (const k of day) keys.add(k);
  }
  return keys;
}

/**
 * Apply multi-day continuity — swap repeats/skips with deterministic alternates.
 */
export function applyMultiDayContinuity(
  items: RoutineScheduleItem[],
  ctx: ContinuityContext,
): { items: RoutineScheduleItem[]; adjustments: ContinuityAdjustment[] } {
  const adjustments: ContinuityAdjustment[] = [];
  const yesterday = ctx.memory.recentDayKeys[ctx.memory.recentDayKeys.length - 1] ?? [];
  const yesterdaySet = new Set(yesterday);
  const recent = recentKeys(ctx.memory);
  const skipped = new Set(ctx.memory.skippedActivityKeys);
  const avoid = new Set([...recent, ...skipped]);

  const working = items.map((item, index) => {
    if (!isFlexible(item)) return item;

    const key = normalizeActivityKey(item.activity);
    const onYesterday = yesterdaySet.has(key);
    const wasSkipped = skipped.has(key);

    if (!onYesterday && !wasSkipped) return item;

    const fresh = pickDeterministicFreshLabel(
      item.activity,
      ctx.seed + index * 13,
      avoid,
    );

    if (fresh) {
      adjustments.push({
        activity: item.activity,
        change: wasSkipped
          ? `continuity: avoided skipped repeat → "${fresh}"`
          : `continuity: rotated yesterday repeat → "${fresh}"`,
      });
      avoid.add(normalizeActivityKey(fresh));
      return attachActivityMetadata(
        tag(
          { ...item, activity: fresh },
          wasSkipped
            ? "Continuity: replaced frequently skipped activity"
            : "Continuity: fresh variant after yesterday repeat",
          item.activity,
        ),
      );
    }

    if (wasSkipped) {
      const shortened = {
        ...item,
        duration: Math.max(MIN_ACTIVITY_MINS, Math.round((item.duration ?? 30) * 0.75)),
        notes: "Shorter retry — prior skip pattern detected.",
      };
      adjustments.push({
        activity: item.activity,
        change: "continuity: shortened previously skipped block",
      });
      return tag(shortened, "Continuity: shortened after prior skip", item.activity);
    }

    return item;
  });

  return { items: working, adjustments };
}
