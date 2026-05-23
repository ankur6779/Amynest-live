import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePaywall } from "@/contexts/paywall-context";
import { useSubscription } from "@/hooks/use-subscription";

/**
 * Bridges global window events ("amynest:open-paywall",
 * "amynest:refresh-subscription") to the React contexts. Call sites that
 * cannot use hooks (deeply nested fetch helpers) dispatch these events.
 */
export function SubscriptionEventBridge() {
  const { openPaywall } = usePaywall();
  const { refresh } = useSubscription();
  const qc = useQueryClient();

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { reason?: string } | undefined;
      const reason = detail?.reason as Parameters<typeof openPaywall>[0];
      openPaywall(reason ?? "feature");
    };
    const onRefresh = () => {
      refresh();
      // Re-sync feature-usage counts after purchase/restore/expiry so
      // freemium locks reflect the latest subscription state.
      void qc.invalidateQueries({ queryKey: ["feature-usage"] });
    };
    window.addEventListener("amynest:open-paywall", onOpen);
    window.addEventListener("amynest:refresh-subscription", onRefresh);
    return () => {
      window.removeEventListener("amynest:open-paywall", onOpen);
      window.removeEventListener("amynest:refresh-subscription", onRefresh);
    };
  }, [openPaywall, refresh, qc]);

  return null;
}
