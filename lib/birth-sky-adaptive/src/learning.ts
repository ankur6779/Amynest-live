/**
 * Deterministic learning preferences from anonymized activity history.
 */

import type { DevelopmentSnapshot } from "@workspace/birth-sky-development";
import { accumulateFeedbackWeights } from "./feedback.js";
import { sanitizeTypeTag } from "./privacy.js";
import type {
  AdaptiveHistoryInput,
  LearningPreferences,
} from "./types.js";

function clampCount(n: number | undefined): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(500, Math.floor(n)));
}

export function buildLearningPreferences(input: {
  history?: AdaptiveHistoryInput | null;
  development: DevelopmentSnapshot;
}): LearningPreferences {
  const completed = new Map<string, number>();
  const skipped = new Map<string, number>();
  const repeated = new Map<string, number>();

  for (const a of input.history?.activities ?? []) {
    const type = sanitizeTypeTag(a.type);
    if (!type) continue;
    completed.set(type, (completed.get(type) ?? 0) + clampCount(a.completed));
    skipped.set(type, (skipped.get(type) ?? 0) + clampCount(a.skipped));
    repeated.set(type, (repeated.get(type) ?? 0) + clampCount(a.repeated));
  }

  // Fold routine completions into learning signals by kind
  for (const r of input.history?.completedRoutines ?? []) {
    const type = sanitizeTypeTag(r.kind);
    if (!type) continue;
    completed.set(type, (completed.get(type) ?? 0) + clampCount(r.count ?? 1));
  }
  for (const r of input.history?.skippedRoutines ?? []) {
    const type = sanitizeTypeTag(r.kind);
    if (!type) continue;
    skipped.set(type, (skipped.get(type) ?? 0) + clampCount(r.count ?? 1));
  }

  const feedback = accumulateFeedbackWeights(input.history?.parentFeedback);
  for (const [type, w] of feedback.byType) {
    if (w.enjoyment > 0.15) {
      repeated.set(type, (repeated.get(type) ?? 0) + 1);
    }
    if (w.enjoyment < -0.15) {
      skipped.set(type, (skipped.get(type) ?? 0) + 1);
    }
  }

  const rank = (m: Map<string, number>, min = 1) =>
    [...m.entries()]
      .filter(([, c]) => c >= min)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([t]) => t);

  const completedActivities = rank(completed, 1).slice(0, 8);
  const repeatedInterests = rank(repeated, 2).slice(0, 6);
  const avoidedActivities = rank(skipped, 1)
    .filter((t) => (skipped.get(t) ?? 0) > (completed.get(t) ?? 0))
    .slice(0, 6);

  // Preferred = completed or repeated, minus avoided; seed from development activities if empty
  const preferredSet: string[] = [];
  for (const t of [...repeatedInterests, ...completedActivities]) {
    if (avoidedActivities.includes(t)) continue;
    if (!preferredSet.includes(t)) preferredSet.push(t);
  }
  if (preferredSet.length === 0) {
    for (const a of input.development.recommendedActivities.slice(0, 4)) {
      const tag = sanitizeTypeTag(a.domain ?? a.id);
      if (tag && !preferredSet.includes(tag)) preferredSet.push(tag);
    }
  }

  const totalC = [...completed.values()].reduce((a, b) => a + b, 0);
  const totalS = [...skipped.values()].reduce((a, b) => a + b, 0);
  let engagementTrend: LearningPreferences["engagementTrend"] = "unknown";
  if (totalC + totalS >= 3) {
    const ratio = totalC / Math.max(1, totalC + totalS);
    if (ratio >= 0.7) engagementTrend = "rising";
    else if (ratio >= 0.4) engagementTrend = "stable";
    else engagementTrend = "falling";
  }

  return {
    preferredActivities: preferredSet.slice(0, 6),
    completedActivities,
    repeatedInterests,
    avoidedActivities,
    engagementTrend,
  };
}
