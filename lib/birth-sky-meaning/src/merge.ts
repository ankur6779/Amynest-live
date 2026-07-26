/**
 * Merge rule hits → ranked MeaningTags + conflict notes.
 * Never silently drops conflicting information.
 */

import { CONFLICT_PAIRS } from "./rules.js";
import type {
  MeaningCategory,
  MeaningConflict,
  MeaningTag,
  RuleHit,
} from "./types.js";
import { MEANING_CATEGORIES } from "./types.js";

const MAX_PER_CATEGORY = 8;

export function mergeRuleHits(hits: RuleHit[]): {
  categories: Record<MeaningCategory, MeaningTag[]>;
  conflicts: MeaningConflict[];
} {
  const buckets = new Map<
    string,
    { category: MeaningCategory; label: string; confidence: number; sources: string[] }
  >();

  for (const h of hits) {
    const key = `${h.category}::${h.conceptId}`;
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        category: h.category,
        label: h.label,
        confidence: h.confidence,
        sources: [h.ruleId],
      });
    } else {
      existing.confidence = Math.min(
        1,
        Math.max(existing.confidence, h.confidence) + 0.03,
      );
      if (!existing.sources.includes(h.ruleId)) {
        existing.sources.push(h.ruleId);
      }
    }
  }

  const byCategory: Record<MeaningCategory, MeaningTag[]> = {
    strengths: [],
    learningStyle: [],
    communicationStyle: [],
    socialStyle: [],
    comfortNeeds: [],
    motivationStyle: [],
    creativeStyle: [],
    emotionalPattern: [],
    attentionPattern: [],
    curiosityPattern: [],
  };

  for (const [key, v] of buckets) {
    const conceptId = key.split("::")[1] ?? v.label;
    byCategory[v.category].push({
      id: conceptId,
      label: v.label,
      confidence: round2(v.confidence),
      sources: v.sources.slice(0, 8),
    });
  }

  const conflicts: MeaningConflict[] = [];

  for (const cat of MEANING_CATEGORIES) {
    const tags = byCategory[cat];
    tags.sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id));

    for (const [aId, bId] of CONFLICT_PAIRS) {
      const a = tags.find((t) => t.id === aId);
      const b = tags.find((t) => t.id === bId);
      if (!a || !b) continue;

      if (Math.abs(a.confidence - b.confidence) < 0.08) {
        conflicts.push({
          category: cat,
          a: aId,
          b: bId,
          resolution: "coexist",
          kept: [aId, bId],
          note: "both retained — complementary tension",
        });
      } else {
        const winner = a.confidence >= b.confidence ? aId : bId;
        const loser = winner === aId ? bId : aId;
        conflicts.push({
          category: cat,
          a: aId,
          b: bId,
          resolution: "prefer_higher_confidence",
          kept: [winner, loser],
          note: `${winner} ranked higher; ${loser} retained at lower rank`,
        });
        // Re-sort already done; both kept — never delete silently
      }
    }

    byCategory[cat] = tags.slice(0, MAX_PER_CATEGORY);
  }

  return { categories: byCategory, conflicts };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
