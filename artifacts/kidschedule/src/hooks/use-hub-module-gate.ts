import { useCallback, useRef } from "react";
import { useFeatureUsage } from "@/hooks/use-feature-usage";

/**
 * Activity-gated freemium for full-screen Parent Hub modules.
 *
 * Opening a module route does NOT consume a free use — only the first
 * deliberate interaction inside the module (tap / click / key) does.
 * Browsing in and pressing Back keeps the Try Free badge available.
 */
export function useHubModuleGate(featureId: string) {
  const usage = useFeatureUsage();
  const engagedRef = useRef(false);

  const locked = usage.isFeatureLocked(featureId);
  const tryFree = usage.tryFreeFor(featureId);

  const onEngage = useCallback(() => {
    if (engagedRef.current) return;
    if (locked) return;
    engagedRef.current = true;
    usage.markFeatureUsed(featureId);
  }, [locked, usage, featureId]);

  return {
    locked,
    tryFree,
    onEngage,
    isPremium: usage.isPremium,
  };
}
