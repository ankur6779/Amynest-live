/**
 * Parent feedback → deterministic adaptation weights.
 */

import { sanitizeTypeTag } from "./privacy.js";
import type { ParentFeedbackItem, ParentFeedbackSignal } from "./types.js";

export type FeedbackWeights = {
  difficulty: number; // negative = too hard, positive = too easy
  enjoyment: number; // positive = enjoyed, negative = ignored
  helpfulness: number;
  /** Per activity-type weight deltas. */
  byType: Map<string, { difficulty: number; enjoyment: number }>;
};

const SIGNAL_MAP: Record<
  ParentFeedbackSignal,
  { difficulty: number; enjoyment: number; helpfulness: number }
> = {
  helpful: { difficulty: 0, enjoyment: 0.1, helpfulness: 0.2 },
  too_difficult: { difficulty: -0.25, enjoyment: -0.05, helpfulness: 0 },
  too_easy: { difficulty: 0.2, enjoyment: 0, helpfulness: 0 },
  child_enjoyed: { difficulty: 0, enjoyment: 0.3, helpfulness: 0.05 },
  child_ignored: { difficulty: 0, enjoyment: -0.3, helpfulness: -0.1 },
};

function normalizeSignal(raw: string): ParentFeedbackSignal | null {
  const k = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (k in SIGNAL_MAP) return k as ParentFeedbackSignal;
  const aliases: Record<string, ParentFeedbackSignal> = {
    enjoyed: "child_enjoyed",
    ignored: "child_ignored",
    hard: "too_difficult",
    difficult: "too_difficult",
    easy: "too_easy",
    useful: "helpful",
  };
  return aliases[k] ?? null;
}

export function accumulateFeedbackWeights(
  items: ParentFeedbackItem[] | undefined,
): FeedbackWeights {
  const out: FeedbackWeights = {
    difficulty: 0,
    enjoyment: 0,
    helpfulness: 0,
    byType: new Map(),
  };

  for (const item of items ?? []) {
    const signal = normalizeSignal(String(item.signal ?? ""));
    if (!signal) continue;
    const n = Math.max(1, Math.min(20, item.count ?? 1));
    const delta = SIGNAL_MAP[signal];
    out.difficulty += delta.difficulty * n;
    out.enjoyment += delta.enjoyment * n;
    out.helpfulness += delta.helpfulness * n;

    const type = sanitizeTypeTag(item.targetType);
    if (type) {
      const prev = out.byType.get(type) ?? { difficulty: 0, enjoyment: 0 };
      prev.difficulty += delta.difficulty * n;
      prev.enjoyment += delta.enjoyment * n;
      out.byType.set(type, prev);
    }
  }

  return out;
}
