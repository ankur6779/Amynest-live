import { useCallback, useRef } from "react";
import { useFeatureUsage } from "@/hooks/use-feature-usage";
import { useHubJourney } from "@/hooks/use-hub-journey";
import { readStoredActiveChildId } from "@/lib/coach-age-nav";
import { isHealthZoneFeature, isHealthZoneJourneyEligible } from "@/lib/hub-visibility";

/**
 * Activity-gated freemium for full-screen Parent Hub modules.
 * Uses 3-day Hub Journey model when available; falls back to legacy per-tile quota.
 */
export function useHubModuleGate(featureId: string, childId?: number | null) {
  const usage = useFeatureUsage();
  const resolvedChildId = childId ?? readStoredActiveChildId();
  const hubJourney = useHubJourney(resolvedChildId);
  const engagedRef = useRef(false);

  const childAgeMonths = hubJourney.status?.child
    ? hubJourney.status.child.age * 12 + hubJourney.status.child.ageMonths
    : null;

  const journeyApplies =
    childAgeMonths == null ||
    !isHealthZoneFeature(featureId) ||
    isHealthZoneJourneyEligible(childAgeMonths);

  const journeyLocked =
    journeyApplies &&
    !!hubJourney.access &&
    hubJourney.isHubFeatureLocked(featureId);
  const legacyLocked = usage.isFeatureLocked(featureId);
  const locked = hubJourney.access ? journeyLocked : legacyLocked;

  const tryFree =
    hubJourney.isFreeJourneyPeriod ||
    (hubJourney.access ? !journeyLocked : usage.tryFreeFor(featureId));

  const journeySoft =
    journeyApplies &&
    !!hubJourney.access &&
    hubJourney.isJourneyLocked &&
    journeyLocked;

  const onEngage = useCallback(() => {
    if (engagedRef.current) return;
    if (locked) return;
    engagedRef.current = true;
    if (!hubJourney.access) {
      usage.markFeatureUsed(featureId);
    }
  }, [locked, usage, featureId, hubJourney.access]);

  return {
    locked,
    journeySoft,
    tryFree,
    onEngage,
    isPremium: usage.isPremium,
    childAgeMonths,
    childName: hubJourney.status?.child.name,
  };
}
