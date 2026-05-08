/**
 * Adaptive Family Intelligence — Phase 3 closed-loop learning weights.
 *
 * Turns historical behaviors + per-item completion status into deterministic
 * per-child weights:
 *   - categoryWeights: ranked categories in [-1, +1] derived from behavior
 *     correlation. Positive = activity tends to precede positive behaviors,
 *     negative = activity tends to precede negative behaviors.
 *   - slotSuccess: per-hour completion rate over the last 14 days.
 *
 * Pure helpers are exported so the AI prompt builder, the rule-based
 * generator, and tests can all consume them without touching the DB. The
 * `compute*Async` wrappers do the DB load.
 */

import { and, eq, gte } from "drizzle-orm";
import {
  db,
  behaviorsTable,
  routinesTable,
} from "@workspace/db";
import {
  correlateBehaviorsWithItems,
  type AnalyticsRoutineItem,
  type BehaviorCorrelation,
} from "./intelligenceAnalytics.js";

export type CategoryWeight = {
  category: string;
  weight: number; // [-1, +1]
  positive: number;
  negative: number;
};

export type SlotSuccess = {
  hour: number; // 0-23
  completionRate: number; // 0-100
  sample: number; // # of items observed in this slot
};

export type LearningWeights = {
  childId: number;
  categoryWeights: CategoryWeight[];
  slotSuccess: SlotSuccess[];
  lastComputedAt: string; // ISO timestamp
  sample: number; // total routine items considered
};

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize behavior↔activity correlation rows into bounded weights.
 * weight = net / (positive + negative + 1) clamped to [-1, +1] and rounded
 * to 2 decimals. The +1 in the denominator dampens single-event categories.
 */
export function computeCategoryWeights(
  correlations: readonly BehaviorCorrelation[],
): CategoryWeight[] {
  const out: CategoryWeight[] = correlations.map((c) => {
    const denom = c.positive + c.negative + 1;
    const raw = c.net / denom;
    const clamped = Math.max(-1, Math.min(1, raw));
    return {
      category: c.category,
      positive: c.positive,
      negative: c.negative,
      weight: Math.round(clamped * 100) / 100,
    };
  });
  out.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  return out;
}

/**
 * For each hour 0–23, compute the completion rate of routine items whose
 * `time` falls in that hour. Items with `status === "complete"` count as
 * done. Slots with no observed items are omitted from the result.
 */
export function computeSlotSuccessRates(
  routines: readonly { items: unknown }[],
): SlotSuccess[] {
  const tally = new Map<number, { done: number; total: number }>();
  for (const r of routines) {
    const items = Array.isArray(r.items) ? (r.items as AnalyticsRoutineItem[]) : [];
    for (const it of items) {
      if (typeof it.time !== "string") continue;
      const [hStr] = it.time.split(":");
      const h = Number(hStr);
      if (!Number.isInteger(h) || h < 0 || h > 23) continue;
      const slot = tally.get(h) ?? { done: 0, total: 0 };
      slot.total++;
      if ((it.status ?? "").toLowerCase() === "complete") slot.done++;
      tally.set(h, slot);
    }
  }
  const out: SlotSuccess[] = [];
  for (const [hour, v] of tally.entries()) {
    out.push({
      hour,
      completionRate: v.total === 0 ? 0 : Math.round((v.done / v.total) * 100),
      sample: v.total,
    });
  }
  out.sort((a, b) => a.hour - b.hour);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// DB layer
// ─────────────────────────────────────────────────────────────────────────────

function dateNDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export async function computeLearningWeights(childId: number): Promise<LearningWeights> {
  const since30 = dateNDaysAgo(30);
  const since14 = dateNDaysAgo(14);

  const [behaviors, routines30, routines14] = await Promise.all([
    db
      .select({
        type: behaviorsTable.type,
        date: behaviorsTable.date,
        createdAt: behaviorsTable.createdAt,
      })
      .from(behaviorsTable)
      .where(and(eq(behaviorsTable.childId, childId), gte(behaviorsTable.date, since30))),
    db
      .select({ date: routinesTable.date, items: routinesTable.items })
      .from(routinesTable)
      .where(and(eq(routinesTable.childId, childId), gte(routinesTable.date, since30))),
    db
      .select({ items: routinesTable.items })
      .from(routinesTable)
      .where(and(eq(routinesTable.childId, childId), gte(routinesTable.date, since14))),
  ]);

  const byDate = new Map<string, AnalyticsRoutineItem[]>();
  for (const r of routines30) {
    const items = Array.isArray(r.items) ? (r.items as AnalyticsRoutineItem[]) : [];
    byDate.set(r.date, items);
  }
  const correlations = correlateBehaviorsWithItems(behaviors, byDate);
  const categoryWeights = computeCategoryWeights(correlations);
  const slotSuccess = computeSlotSuccessRates(routines14);
  const sample = slotSuccess.reduce((a, b) => a + b.sample, 0);

  return {
    childId,
    categoryWeights,
    slotSuccess,
    lastComputedAt: new Date().toISOString(),
    sample,
  };
}

/**
 * Render a short human-readable summary block for inclusion in the AI
 * prompt. Only emits when there are strongly weighted categories or
 * meaningful slot success data — otherwise returns an empty string so the
 * prompt stays compact.
 */
/**
 * Minimum evidence required before learning weights are allowed to influence
 * generation or surface in the UI. Matches the UI hide-when-empty threshold
 * so the "what the AI used" matches "what the parent sees".
 */
export const LEARNING_MIN_SAMPLE = 5;

export function renderLearningWeightsForPrompt(w: LearningWeights | null): string {
  if (!w) return "";
  if (w.sample < LEARNING_MIN_SAMPLE) return "";
  const strong = w.categoryWeights.filter((c) => Math.abs(c.weight) >= 0.3).slice(0, 4);
  const weakSlots = w.slotSuccess.filter((s) => s.sample >= 3 && s.completionRate <= 40);
  if (strong.length === 0 && weakSlots.length === 0) return "";

  const lines: string[] = [
    "Closed-loop learning weights for this child (use as soft guidance, not hard rules):",
  ];
  for (const c of strong) {
    if (c.weight >= 0.3) {
      lines.push(`- BOOST "${c.category}" activities — they precede positive behaviors (+${c.positive}/-${c.negative}).`);
    } else if (c.weight <= -0.3) {
      lines.push(`- REDUCE / replace "${c.category}" activities — they precede negative behaviors (+${c.positive}/-${c.negative}).`);
    }
  }
  for (const s of weakSlots.slice(0, 3)) {
    lines.push(
      `- The ${String(s.hour).padStart(2, "0")}:00 slot has only ${s.completionRate}% completion historically — keep this slot light or skip it.`,
    );
  }
  return lines.join("\n");
}

/**
 * Derive adaptation tags ("learning:boost:meal", "learning:demote:learning",
 * "learning:weak_slot:14") for the routine `adaptations[]` array. Returns
 * an empty array when no tags qualify.
 */
export function deriveLearningAdaptationTags(w: LearningWeights | null): string[] {
  if (!w) return [];
  if (w.sample < LEARNING_MIN_SAMPLE) return [];
  const tags: string[] = [];
  for (const c of w.categoryWeights) {
    if (c.weight >= 0.3) tags.push(`learning:boost:${c.category}`);
    else if (c.weight <= -0.3) tags.push(`learning:demote:${c.category}`);
  }
  for (const s of w.slotSuccess) {
    if (s.sample >= 3 && s.completionRate <= 40) {
      tags.push(`learning:weak_slot:${s.hour}`);
    }
  }
  return tags;
}
