import { useCallback } from "react";
import { getListChildrenQueryKey, useListChildren } from "@workspace/api-client-react";
import { usePaywall } from "@/contexts/paywall-context";
import { useSubscription } from "@/hooks/use-subscription";
import { trackAddSecondChildIntent } from "@/lib/onboarding-analytics";
import { isAddChildBlocked } from "@/lib/add-child-gate";

export function useAddChildGate() {
  const { isPremium } = useSubscription();
  const { openPaywall } = usePaywall();
  const { data: children, isLoading } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });
  const existingCount = children?.length ?? 0;
  const blocked = !isLoading && isAddChildBlocked(isPremium, existingCount);

  const tryAddChild = useCallback(
    (source?: string): boolean => {
      if (!isLoading && isAddChildBlocked(isPremium, existingCount)) {
        openPaywall("child_limit");
        trackAddSecondChildIntent(source ?? "add-child-gate", existingCount);
        return false;
      }
      return true;
    },
    [existingCount, isLoading, isPremium, openPaywall],
  );

  return { blocked, existingCount, isPremium, isLoading, tryAddChild };
}
