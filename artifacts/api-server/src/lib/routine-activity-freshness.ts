/**
 * Deterministic entropy freshness — rotates catalog labels without unstable randomness.
 */
import {
  attachActivityMetadata,
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

export type FreshnessContext = {
  memory: PersonalizationMemory;
  seed: number;
  /** Minimum repeats in current routine before rotating. */
  repeatThreshold?: number;
};

export type FreshnessAdjustment = {
  activity: string;
  change: string;
};

function isFlexible(item: RoutineScheduleItem): boolean {
  return !isProtectedScheduleBlock(item) && !isLockedScheduleItem(item) && !isSleepItem(item);
}

function tag(item: RoutineScheduleItem, reason: string, original: string): RoutineScheduleItem {
  const decision: ScheduleDecisionMeta = {
    reason,
    source: "preference",
    originalActivity: original,
  };
  return { ...item, scheduleDecision: decision };
}

/**
 * Rotate duplicate activity labels within the day and against recent memory.
 */
export function applyDeterministicActivityFreshness(
  items: RoutineScheduleItem[],
  ctx: FreshnessContext,
): { items: RoutineScheduleItem[]; adjustments: FreshnessAdjustment[] } {
  const adjustments: FreshnessAdjustment[] = [];
  const threshold = ctx.repeatThreshold ?? 2;
  const seenToday = new Map<string, number>();
  const recent = new Set(ctx.memory.recentDayKeys.flat());

  const working = [...items];

  for (let i = 0; i < working.length; i++) {
    const item = working[i]!;
    if (!isFlexible(item)) continue;

    const key = normalizeActivityKey(item.activity);
    const count = (seenToday.get(key) ?? 0) + 1;
    seenToday.set(key, count);

    const staleInMemory = recent.has(key);
    const duplicateToday = count >= threshold;

    if (!staleInMemory && !duplicateToday) continue;

    const avoid = new Set([...seenToday.keys(), ...recent]);
    const fresh = pickDeterministicFreshLabel(
      item.activity,
      ctx.seed + i * 31 + key.length,
      avoid,
    );

    if (!fresh) continue;

    working[i] = attachActivityMetadata(
      tag(
        { ...item, activity: fresh },
        "Freshness: deterministic label rotation for variety",
        item.activity,
      ),
    );
    seenToday.set(normalizeActivityKey(fresh), 1);
    adjustments.push({
      activity: item.activity,
      change: `freshness: "${item.activity}" → "${fresh}"`,
    });
  }

  return { items: working, adjustments };
}
