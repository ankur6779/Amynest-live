/**
 * Routine adaptation — completion rate, drop-offs, streaks, continue/reduce/increase/rotate.
 */

import { accumulateFeedbackWeights } from "./feedback.js";
import { sanitizeTypeTag } from "./privacy.js";
import type {
  AdaptationAction,
  AdaptationRecommendation,
  AdaptiveHistoryInput,
  RoutineHealth,
} from "./types.js";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function buildRoutineHealth(
  history?: AdaptiveHistoryInput | null,
): RoutineHealth {
  const completedBy = new Map<string, number>();
  const skippedBy = new Map<string, number>();
  const dropOffCounts = new Map<string, number>();

  for (const r of history?.completedRoutines ?? []) {
    const kind = sanitizeTypeTag(r.kind);
    if (!kind) continue;
    completedBy.set(kind, (completedBy.get(kind) ?? 0) + (r.count ?? 1));
  }
  for (const r of history?.skippedRoutines ?? []) {
    const kind = sanitizeTypeTag(r.kind);
    if (!kind) continue;
    skippedBy.set(kind, (skippedBy.get(kind) ?? 0) + (r.count ?? 1));
    const step = sanitizeTypeTag(r.dropOffStep);
    if (step) {
      dropOffCounts.set(step, (dropOffCounts.get(step) ?? 0) + (r.count ?? 1));
    }
  }

  const totalC = [...completedBy.values()].reduce((a, b) => a + b, 0);
  const totalS = [...skippedBy.values()].reduce((a, b) => a + b, 0);
  const completionRate =
    totalC + totalS === 0
      ? 0.5
      : Math.round((totalC / (totalC + totalS)) * 100) / 100;

  const dropOffPoints = [...dropOffCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([k]) => k)
    .slice(0, 6);

  // Streak proxies from counts (deterministic, not calendar-based)
  const successfulStreaks = Math.min(
    30,
    [...completedBy.values()].filter((c) => c >= 3).length,
  );
  const missedStreaks = Math.min(
    30,
    [...skippedBy.values()].filter((c) => c >= 2).length,
  );

  const feedback = accumulateFeedbackWeights(history?.parentFeedback);
  const kinds = new Set([...completedBy.keys(), ...skippedBy.keys()]);
  const recommendations: RoutineHealth["recommendations"] = [];

  for (const kind of [...kinds].sort()) {
    const c = completedBy.get(kind) ?? 0;
    const s = skippedBy.get(kind) ?? 0;
    const rate = c + s === 0 ? 0.5 : c / (c + s);
    const typeFb = feedback.byType.get(kind);
    let action: AdaptationAction = "continue";
    let reason = "stable_completion";

    if (rate >= 0.75 && c >= 3) {
      action = "increase";
      reason = "high_completion";
    } else if (rate < 0.35 || s >= c + 2) {
      action = "reduce";
      reason = "high_skip_rate";
    } else if (typeFb && typeFb.enjoyment < -0.2) {
      action = "rotate";
      reason = "feedback_ignored";
    } else if (typeFb && typeFb.difficulty < -0.2) {
      action = "reduce";
      reason = "feedback_too_difficult";
    } else if (typeFb && typeFb.difficulty > 0.15 && rate >= 0.5) {
      action = "increase";
      reason = "feedback_too_easy";
    } else if (dropOffPoints.includes(kind)) {
      action = "rotate";
      reason = "drop_off_point";
    }

    recommendations.push({ kind, action, reason });
  }

  // Sort: reduce/rotate first (need attention), then increase, then continue
  const order: Record<AdaptationAction, number> = {
    reduce: 0,
    rotate: 1,
    increase: 2,
    continue: 3,
  };
  recommendations.sort(
    (a, b) =>
      order[a.action] - order[b.action] || a.kind.localeCompare(b.kind),
  );

  return {
    completionRate: clamp01(completionRate),
    dropOffPoints,
    missedStreaks,
    successfulStreaks,
    recommendations: recommendations.slice(0, 10),
  };
}

export function buildAdaptationRecommendations(input: {
  routineHealth: RoutineHealth;
  preferred: string[];
  avoided: string[];
}): AdaptationRecommendation[] {
  const out: AdaptationRecommendation[] = [];
  let pri = 1;

  for (const r of input.routineHealth.recommendations.slice(0, 6)) {
    out.push({
      id: `routine_${r.kind}_${r.action}`,
      action: r.action,
      priority: pri++,
      target: r.kind,
      reason: r.reason,
    });
  }

  for (const a of input.avoided.slice(0, 2)) {
    if (out.some((x) => x.target === a)) continue;
    out.push({
      id: `avoid_${a}_rotate`,
      action: "rotate",
      priority: pri++,
      target: a,
      reason: "avoided_activity",
    });
  }

  for (const p of input.preferred.slice(0, 2)) {
    if (out.some((x) => x.target === p)) continue;
    out.push({
      id: `prefer_${p}_continue`,
      action: "continue",
      priority: pri++,
      target: p,
      reason: "preferred_activity",
    });
  }

  return out.slice(0, 8);
}

export function routineHealthLabel(health: RoutineHealth): string {
  if (health.completionRate >= 0.75 && health.missedStreaks === 0) {
    return "strong";
  }
  if (health.completionRate >= 0.5) return "steady";
  if (health.completionRate >= 0.3) return "fragile";
  return "needs_support";
}
