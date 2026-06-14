import { useCallback } from "react";
import { getListChildrenQueryKey, useListChildren } from "@workspace/api-client-react";
import { usePaywall } from "@/contexts/paywall-context";
import { useSubscription } from "@/hooks/use-subscription";
import { trackAddSecondChildIntent } from "@/lib/onboarding-analytics";
import { isAddChildBlocked, FREE_CHILD_LIMIT } from "@/lib/add-child-gate";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export function useAddChildGate() {
  const { isPremium, entitlements, loading: subscriptionLoading } = useSubscription();
  const { openPaywall } = usePaywall();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { data: children, isLoading, isPlaceholderData } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });
  const existingCount = isPlaceholderData ? 0 : (children?.length ?? 0);
  const childrenMax = entitlements?.limits.childrenMax ?? FREE_CHILD_LIMIT;
  const gateReady = !isLoading && !subscriptionLoading;
  const blocked = gateReady && isAddChildBlocked(childrenMax, existingCount);

  const tryAddChild = useCallback(
    (source?: string): boolean => {
      if (!gateReady) return true;
      if (isAddChildBlocked(childrenMax, existingCount)) {
        if (isPremium) {
          toast({
            title: t("toasts.children.child_limit_reached_title"),
            description: t("toasts.children.child_limit_reached_premium"),
          });
        } else {
          openPaywall("child_limit");
          trackAddSecondChildIntent(source ?? "add-child-gate", existingCount);
        }
        return false;
      }
      return true;
    },
    [childrenMax, existingCount, gateReady, isPremium, openPaywall, t, toast],
  );

  return {
    blocked,
    existingCount,
    childrenMax,
    isPremium,
    isLoading: isLoading || subscriptionLoading,
    tryAddChild,
  };
}
