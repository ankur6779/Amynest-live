/**
 * Child-development guidance layer — deterministic concept → tip mapping.
 */

import { PARENTING_MAP } from "./catalog.js";
import type { MeaningCategory, MeaningTag, ParentingGuidance } from "./types.js";

export function buildParentingGuidance(
  categories: Record<MeaningCategory, MeaningTag[]>,
): ParentingGuidance[] {
  const out: ParentingGuidance[] = [];
  const seen = new Set<string>();

  const ordered = Object.values(categories)
    .flat()
    .sort((a, b) => b.confidence - a.confidence);

  for (const tag of ordered) {
    const tip = PARENTING_MAP[tag.id];
    if (!tip) continue;
    if (seen.has(tip.guidanceId)) continue;
    seen.add(tip.guidanceId);
    out.push({
      conceptId: tag.id,
      guidanceId: tip.guidanceId,
      label: tip.label,
      confidence: tag.confidence,
    });
    if (out.length >= 10) break;
  }

  return out;
}
