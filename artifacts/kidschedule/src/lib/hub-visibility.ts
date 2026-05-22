// Parent Hub tile visibility — band + month gates for infants; all modules
// unlocked at 24+ months except Infant Hub (infants only).

import type { AgeBand } from "@/lib/age-bands";

export type HubSectionVisibilityInput = {
  id: string;
  alwaysCurrent?: boolean;
  bands?: AgeBand[];
};

/** Per-tile month bounds for infants (<24m). Inclusive min, exclusive max. */
export const HUB_TILE_MONTH_GATES: Record<string, { min?: number; max?: number }> = {
  phonics: { min: 12, max: 72 },
  "ptm-prep": { min: 36, max: 216 },
  "smart-study": { min: 36, max: 204 },
  "spelling-mastery": { min: 24 },
  "event-prep": { min: 36, max: 180 },
  olympiad: { min: 36, max: 192 },
  "life-skills": { min: 24, max: 192 },
  "coloring-books": { min: 24 },
  "fun-sheets": { min: 24 },
  "speech-coach": { max: 132 },
};

export function checkBandMatch(
  section: HubSectionVisibilityInput,
  currentBand: AgeBand | null,
): boolean {
  if (section.alwaysCurrent) return true;
  if (!currentBand || !section.bands) return false;
  return section.bands.includes(currentBand);
}

export function checkMonthRules(
  sectionId: string,
  childAgeMonths: number,
  bypass = false,
): boolean {
  if (bypass) return true;
  const gate = HUB_TILE_MONTH_GATES[sectionId];
  if (!gate) return true;
  if (gate.min != null && childAgeMonths < gate.min) return false;
  if (gate.max != null && childAgeMonths >= gate.max) return false;
  return true;
}

/**
 * Whether a hub section belongs in "For You" for the selected child.
 * - infant-hub: only when childAgeMonths < 24
 * - all other tiles: visible when childAgeMonths >= 24
 * - infants: legacy band + month rules
 */
export function isHubSectionVisible(
  section: HubSectionVisibilityInput,
  currentBand: AgeBand | null,
  childAgeMonths: number,
): boolean {
  if (section.id === "infant-hub") return childAgeMonths < 24;
  if (childAgeMonths >= 24) return true;
  return (
    checkBandMatch(section, currentBand) &&
    checkMonthRules(section.id, childAgeMonths)
  );
}

/** Section 2 ("Explore Next") — infants in band 0-2 only; disabled at 24+ months. */
export function shouldShowExploreSection(
  childAgeMonths: number,
  currentBand: AgeBand | null,
  nextBand: AgeBand | null,
): boolean {
  if (childAgeMonths >= 24) return false;
  return currentBand === "0-2" && nextBand !== null;
}

/** Whether a tile's render() should run (month gates bypassed at 24+ months). */
export function shouldRenderHubTileContent(
  sectionId: string,
  childAgeMonths: number,
  isTwoPlus: boolean,
): boolean {
  return checkMonthRules(sectionId, childAgeMonths, isTwoPlus);
}
