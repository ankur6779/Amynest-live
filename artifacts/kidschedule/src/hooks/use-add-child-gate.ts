import { useCallback } from "react";
import { getListChildrenQueryKey, useListChildren } from "@workspace/api-client-react";
import { usePaywall } from "@/contexts/paywall-context";
import { useSubscription } from "@/hooks/use-subscription";
import { trackAddSecondChildIntent } from "@/lib/onboarding-analytics";
import { isAddChildBlocked } from "@/lib/add-child-gate";

export function useAddChildGate() {
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const { openPaywall } = usePaywall();
  const { data: children, isLoading, isPlaceholderData } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });
  const existingCount = isPlaceholderData ? 0 : (children?.length ?? 0);
  const gateReady = !isLoading && !subscriptionLoading;
  const blocked = gateReady && isAddChildBlocked(isPremium, existingCount);

  const tryAddChild = useCallback(
    (source?: string): boolean => {
      if (!gateReady) return true;
      if (isAddChildBlocked(isPremium, existingCount)) {
        openPaywall("child_limit");
        trackAddSecondChildIntent(source ?? "add-child-gate", existingCount);
        return false;
      }
      return true;
    },
    [existingCount, gateReady, isPremium, openPaywall],
  );

  return {
    blocked,
    existingCount,
    isPremium,
    isLoading: isLoading || subscriptionLoading,
    tryAddChild,
  };
}
