import { useCallback, useRef } from "react";
import { useFeatureUsage } from "@/hooks/use-feature-usage";
import { useHubJourney } from "@/hooks/use-hub-journey";

const HUB_CHILD_KEY = "amynest:hub:activeChildId";

function readActiveHubChildId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(HUB_CHILD_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Activity-gated freemium for full-screen Parent Hub modules.
 * Uses 3-day Hub Journey model when available; falls back to legacy per-tile quota.
 */
export function useHubModuleGate(featureId: string, childId?: number | null) {
  const usage = useFeatureUsage();
  const resolvedChildId = childId ?? readActiveHubChildId();
  const hubJourney = useHubJourney(resolvedChildId);
  const engagedRef = useRef(false);

  const journeyLocked =
    !!hubJourney.access && hubJourney.isHubFeatureLocked(featureId);
  const legacyLocked = usage.isFeatureLocked(featureId);
  const locked = hubJourney.access ? journeyLocked : legacyLocked;

  const tryFree =
    hubJourney.isFreeJourneyPeriod ||
    (hubJourney.access ? !journeyLocked : usage.tryFreeFor(featureId));

  const journeySoft =
    !!hubJourney.access && hubJourney.isJourneyLocked && journeyLocked;

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
  };
}
