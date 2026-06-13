// Parent Hub tile visibility — band + month gates for infants; all modules
// unlocked at 24+ months except Infant Hub (infants only).

import { AGE_BANDS, type AgeBand } from "@/lib/age-bands";

export type HubSectionVisibilityInput = {
  id: string;
  alwaysCurrent?: boolean;
  bands?: AgeBand[];
};

/** Amy Health Lab™ — full access from 23 months; preview below. */
export const HEALTH_LAB_MIN_AGE_MONTHS = 23;
export const HEALTH_LAB_MAX_AGE_MONTHS = 156;

export function isHealthLabPreviewAge(childAgeMonths: number): boolean {
  return childAgeMonths < HEALTH_LAB_MIN_AGE_MONTHS;
}

export function isHealthLabEligibleAge(childAgeMonths: number): boolean {
  return (
    childAgeMonths >= HEALTH_LAB_MIN_AGE_MONTHS &&
    childAgeMonths < HEALTH_LAB_MAX_AGE_MONTHS
  );
}

/** Parent Hub feature ids grouped under Health Zone. */
export const HEALTH_ZONE_FEATURE_IDS = ["hub_nutrition", "hub_health_lab"] as const;

export type HealthZoneFeatureId = (typeof HEALTH_ZONE_FEATURE_IDS)[number];

export function isHealthZoneFeature(featureId: string): featureId is HealthZoneFeatureId {
  return (HEALTH_ZONE_FEATURE_IDS as readonly string[]).includes(featureId);
}

/** Health Zone tiles follow the 3-day journey paywall from 23+ months only. */
export function isHealthZoneJourneyEligible(childAgeMonths: number): boolean {
  return childAgeMonths >= HEALTH_LAB_MIN_AGE_MONTHS;
}

export function shouldApplyHealthZoneJourneyLock(
  featureId: string,
  childAgeMonths: number,
): boolean {
  return isHealthZoneFeature(featureId) && isHealthZoneJourneyEligible(childAgeMonths);
}

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

/** Section 2 early-access tiles — 2+ modules shown to 0–24 month infants for discovery preview. */
export const SECTION_2_EARLY_ACCESS_TILE_IDS = [
  "life-skills",
  "olympiad",
  "event-prep",
  "smart-math-tricks",
  "abacus",
  "smart-study",
  "ptm-prep",
  "phonics",
  "coloring-books",
  "fun-sheets",
] as const;

export type Section2EarlyAccessTileId =
  (typeof SECTION_2_EARLY_ACCESS_TILE_IDS)[number];

/** Hub feature IDs for Explore What's Next tiles — mirrors api-server registry. */
export const EXPLORE_NEXT_STAGE_HUB_FEATURES = [
  "hub_life_skills",
  "hub_olympiad",
  "hub_event_prep",
  "hub_smart_math_tricks",
  "hub_abacus",
  "hub_health_lab",
  "hub_smart_study",
  "hub_ptm_prep",
  "hub_phonics",
  "hub_coloring_books",
  "hub_fun_sheets",
] as const;

export function isExploreNextStageHubFeature(featureId: string): boolean {
  return (EXPLORE_NEXT_STAGE_HUB_FEATURES as readonly string[]).includes(featureId);
}

/** Section 2 ("Explore What's Next") — infants in band 0-2 only; disabled at 24+ months. */
export function shouldShowExploreSection(
  childAgeMonths: number,
  currentBand: AgeBand | null,
  nextBand: AgeBand | null,
): boolean {
  if (childAgeMonths >= 24) return false;
  return currentBand === "0-2" && nextBand !== null;
}

/** Bypass month gates for Section 2 interactive early-access tiles. */
export function shouldBypassHubMonthGates(
  childAgeMonths: number,
  currentBand: AgeBand | null,
  nextBand: AgeBand | null,
): boolean {
  return shouldShowExploreSection(childAgeMonths, currentBand, nextBand);
}

/** Whether a tile's render() should run (month gates bypassed at 24+ months). */
export function shouldRenderHubTileContent(
  sectionId: string,
  childAgeMonths: number,
  isTwoPlus: boolean,
): boolean {
  return checkMonthRules(sectionId, childAgeMonths, isTwoPlus);
}

/** Infant-stage tiles surfaced in "Previous Stage Features" for 2+ parents. */
export const PREVIOUS_STAGE_INFANT_TILE_IDS = [
  "infant-hub",
  "new-parent-tips",
] as const;

export type PreviousStageInfantTileId =
  (typeof PREVIOUS_STAGE_INFANT_TILE_IDS)[number];

/** Previous Stage section — 2+ year parents only (not infants in band 0-2). */
export function shouldShowPreviousStageSection(
  childAgeMonths: number,
  currentBand: AgeBand | null,
): boolean {
  if (childAgeMonths < 24) return false;
  return currentBand !== null && currentBand !== "0-2";
}

/**
 * Tile IDs for the Previous Stage section: infant-only modules plus any
 * band-restricted tiles whose bands are entirely before the child's band.
 */
export function getPreviousStageTileIds(
  sections: readonly HubSectionVisibilityInput[],
  currentBand: AgeBand | null,
  childAgeMonths: number,
): string[] {
  if (!shouldShowPreviousStageSection(childAgeMonths, currentBand)) return [];

  const ids = new Set<string>(PREVIOUS_STAGE_INFANT_TILE_IDS);
  const currentIdx = AGE_BANDS.indexOf(currentBand!);

  for (const s of sections) {
    if (s.alwaysCurrent || !s.bands?.length) continue;
    if (s.bands.every(b => AGE_BANDS.indexOf(b) < currentIdx)) {
      ids.add(s.id);
    }
  }

  return [...ids];
}
