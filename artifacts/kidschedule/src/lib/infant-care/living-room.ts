/**
 * Infant Care Phase 2 — living room hierarchy helpers.
 * Presentation only. No API / entitlement changes.
 */

export type InfantCarePrimaryId =
  | "infant-cry"
  | "infant-sleep"
  | "infant-feeding";

export type InfantCareRecommend = {
  sectionId: InfantCarePrimaryId;
  /** Quiet recommend cue */
  label: string;
  /** Button / path title */
  title: string;
  purpose: string;
};

/** Primary quiet destinations — Framework Phase 2 target set. */
export const INFANT_CARE_QUIET_DESTINATIONS = [
  "infant-sleep",
  "infant-feeding",
  "infant-growth",
  "infant-health",
  "infant-milestones",
] as const;

export type InfantCareQuietId = (typeof INFANT_CARE_QUIET_DESTINATIONS)[number];

/**
 * One recommended care action for exhausted parents.
 * Time-aware when possible; never scores the parent.
 */
export function recommendInfantCareAction(
  ageMonths: number,
  hour: number = new Date().getHours(),
): InfantCareRecommend {
  if (ageMonths < 3) {
    return {
      sectionId: "infant-cry",
      label: "Start here",
      title: "Cry & comfort",
      purpose: "Help soothe what's hard right now",
    };
  }
  if (hour >= 18 || hour < 7) {
    return {
      sectionId: "infant-sleep",
      label: "Tonight's care",
      title: "Sleep",
      purpose: "Settle the night gently",
    };
  }
  if (ageMonths >= 6) {
    return {
      sectionId: "infant-feeding",
      label: "Today's care",
      title: "Feeding",
      purpose: "Meals and comfort for this body",
    };
  }
  return {
    sectionId: "infant-sleep",
    label: "Today's care",
    title: "Sleep",
    purpose: "Wake windows and rest for today",
  };
}

/** Flag — Infant Care living room manufacturing. Default ON. */
export function isInfantCareLivingV1Enabled(): boolean {
  const raw = import.meta.env.VITE_FF_INFANT_CARE_LIVING_V1;
  if (raw === undefined || raw === "") return true;
  return raw === "true" || raw === "1";
}
