/**
 * Adaptive Family Intelligence — Phase 4 productive nudges.
 *
 * Synthesizes the Phase 2 risk windows + Phase 3 learning weights + the
 * weekly report deltas + parent goals into a small ranked list of actionable
 * nudges. The pure helper is the only place that decides priority + which
 * dimensions matter — it's deterministic for tests + reusable from both the
 * notification builder and the REST endpoint.
 *
 * Each nudge carries:
 *   - `id`              — stable identifier (kind + dimension), used for
 *                         dedup + analytics.
 *   - `kind`            — bucket the UI maps to icon / chip color / i18n key.
 *   - `priority`        — 0–100, higher wins. Risk windows > goals slipping
 *                         > demote > weak slot > boost > streak > goal up.
 *   - `suggestionCode`  — machine-readable code so the i18n layer can render
 *                         a localized body without us shipping English here.
 *   - `category|hour|goal|direction|value` — render parameters.
 *
 * Threshold rules (kept conservative — match the rest of the engine):
 *   • risk window:    riskWindow.negativeCount ≥ 2 (already enforced upstream)
 *   • goal slipping:  goalProgress.direction === "down"
 *   • demote/boost:   |categoryWeight| ≥ 0.3 AND learning sample ≥ 5
 *   • weak slot:      slotSuccess.completionRate ≤ 40 AND sample ≥ 3
 *   • streak:         weekly.streakDays ≥ 7
 *   • goal up:        goalProgress.direction === "up"
 */

import { loadOwnedChild } from "./childIntelligenceService.js";
import { computeWeeklyReport, computeRiskWindows } from "./intelligenceAnalytics.js";
import { computeLearningWeights, LEARNING_MIN_SAMPLE } from "./learningWeights.js";
import type { WeeklyReport, RiskWindow } from "./intelligenceAnalytics.js";
import type { LearningWeights } from "./learningWeights.js";

export type NudgeKind =
  | "risk_window"
  | "goal_slipping"
  | "demote"
  | "weak_slot"
  | "boost"
  | "streak"
  | "goal_up";

export type Nudge = {
  id: string;
  kind: NudgeKind;
  priority: number;
  suggestionCode: string;
  category?: string;
  hour?: number;
  goal?: string;
  direction?: "up" | "down" | "flat" | "unknown";
  value?: number;
};

export type ProductiveNudgesInput = {
  weekly: WeeklyReport | null;
  risks: readonly RiskWindow[];
  learning: LearningWeights | null;
};

const MAX_NUDGES = 5;

/**
 * Pure ranker — deterministic, no DB, no i18n. Safe to call with any subset
 * of inputs being null/empty.
 */
export function computeProductiveNudges(input: ProductiveNudgesInput): Nudge[] {
  const out: Nudge[] = [];

  // 1. Risk windows (highest priority — repeated negative behaviors clustered
  //    in a known window). Already pre-filtered upstream.
  for (const r of input.risks) {
    out.push({
      id: `risk:${r.startHour}`,
      kind: "risk_window",
      priority: 90 + Math.min(5, r.negativeCount), // 92–95
      suggestionCode: r.suggestion,
      hour: r.startHour,
      value: r.negativeCount,
    });
  }

  // 2. Goal slipping — any parent goal trending the wrong direction.
  const goals = input.weekly?.goalProgress ?? [];
  for (const g of goals) {
    if (g.direction === "down") {
      out.push({
        id: `goal_down:${g.goal}`,
        kind: "goal_slipping",
        priority: 80,
        suggestionCode: `nudge:goal_down:${g.goal}`,
        goal: g.goal,
        direction: "down",
      });
    }
  }

  // 3. Demote — strongly negative learning weight (only with enough sample).
  const lw = input.learning;
  const learningOk = !!lw && lw.sample >= LEARNING_MIN_SAMPLE;
  if (lw && learningOk) {
    for (const c of lw.categoryWeights) {
      if (c.weight <= -0.3) {
        out.push({
          id: `demote:${c.category}`,
          kind: "demote",
          priority: 70,
          suggestionCode: `nudge:demote:${c.category}`,
          category: c.category,
          value: c.weight,
        });
      }
    }
  }

  // 4. Weak slot — hour with low historical completion + enough samples.
  if (lw && learningOk) {
    for (const s of lw.slotSuccess) {
      if (s.completionRate <= 40 && s.sample >= 3) {
        out.push({
          id: `weak_slot:${s.hour}`,
          kind: "weak_slot",
          priority: 60,
          suggestionCode: `nudge:weak_slot:${s.hour}`,
          hour: s.hour,
          value: s.completionRate,
        });
      }
    }
  }

  // 5. Boost — strongly positive learning weight.
  if (lw && learningOk) {
    for (const c of lw.categoryWeights) {
      if (c.weight >= 0.3) {
        out.push({
          id: `boost:${c.category}`,
          kind: "boost",
          priority: 50,
          suggestionCode: `nudge:boost:${c.category}`,
          category: c.category,
          value: c.weight,
        });
      }
    }
  }

  // 6. Streak — celebrate consistency.
  const streakDays = input.weekly?.streakDays ?? 0;
  if (streakDays >= 7) {
    out.push({
      id: `streak:${streakDays}`,
      kind: "streak",
      priority: 40,
      suggestionCode: `nudge:streak`,
      value: streakDays,
    });
  }

  // 7. Goal up — celebrate goals trending the right way (lowest priority).
  for (const g of goals) {
    if (g.direction === "up") {
      out.push({
        id: `goal_up:${g.goal}`,
        kind: "goal_up",
        priority: 30,
        suggestionCode: `nudge:goal_up:${g.goal}`,
        goal: g.goal,
        direction: "up",
      });
    }
  }

  // Dedup by id — defensive against future overlapping signal sources or
  // upstream repeats. Keep the highest-priority entry; on tie, keep first.
  const byId = new Map<string, Nudge>();
  for (const n of out) {
    const prev = byId.get(n.id);
    if (!prev || n.priority > prev.priority) byId.set(n.id, n);
  }
  const deduped = Array.from(byId.values());

  // Stable sort: priority desc, then id asc for determinism.
  deduped.sort((a, b) => (b.priority - a.priority) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return deduped.slice(0, MAX_NUDGES);
}

/**
 * Render a notification-safe English body for a nudge. This is a *server-only*
 * fallback used by `buildAmyInsight` when the localized client copy isn't in
 * scope (push notifications go through FCM/Expo, not React). Keeps each line
 * ≤ 110 chars to render fully on iOS/Android lock screens.
 */
export function renderNudgeBodyForPush(nudge: Nudge, childName: string): string {
  const name = childName || "your child";
  switch (nudge.kind) {
    case "risk_window": {
      const h = String(nudge.hour ?? 0).padStart(2, "0");
      return `${name} tends to struggle around ${h}:00 — try a calm reset 30 min before.`;
    }
    case "goal_slipping":
      return `Your "${nudge.goal}" goal is slipping this week — pick one small step to shift it.`;
    case "demote":
      return `"${nudge.category}" activities have preceded tough moments — swap one out tomorrow.`;
    case "weak_slot": {
      const h = String(nudge.hour ?? 0).padStart(2, "0");
      return `The ${h}:00 slot has been low-completion (${nudge.value ?? 0}%) — keep it light.`;
    }
    case "boost":
      return `"${nudge.category}" activities work well for ${name} — add one more tomorrow.`;
    case "streak":
      return `${nudge.value ?? 0} days of logging in a row — pick one win to repeat tomorrow.`;
    case "goal_up":
      return `Your "${nudge.goal}" goal is improving — name what changed so it sticks.`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DB-backed entry point
// ─────────────────────────────────────────────────────────────────────────────

export type ProductiveNudgesResult = {
  childId: number;
  nudges: Nudge[];
  computedAt: string; // ISO
};

/**
 * Fan out to weekly report + risk windows + learning weights, run the pure
 * ranker, return the result. Caller is responsible for ownership checks
 * (mirror of the learning-weights endpoint pattern).
 */
export async function computeProductiveNudgesForChild(
  childId: number,
): Promise<ProductiveNudgesResult> {
  const [weekly, risks, learning] = await Promise.all([
    computeWeeklyReport(childId).catch(() => null),
    computeRiskWindows(childId).catch(() => [] as RiskWindow[]),
    computeLearningWeights(childId).catch(() => null),
  ]);
  const nudges = computeProductiveNudges({ weekly, risks, learning });
  return {
    childId,
    nudges,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Exposed so the notification layer can also gate on owned-child without
 * replicating logic. Returns `null` if the child isn't owned by the user.
 */
export async function computeProductiveNudgesForOwnedChild(
  childId: number,
  userId: string,
): Promise<ProductiveNudgesResult | null> {
  const child = await loadOwnedChild(childId, userId);
  if (!child) return null;
  return computeProductiveNudgesForChild(childId);
}
