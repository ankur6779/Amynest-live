/**
 * Premium V2 journey hook — wires existing subscription + RC billing.
 * No analytics. No second entitlement store.
 */

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useSubscription, type Plan } from "@/hooks/use-subscription";
import { useNativeBilling } from "@/hooks/use-native-billing";
import { isBrowserOnline } from "./network";
import {
  createInitialPremiumJourneyState,
  reducePremiumJourney,
} from "./purchase-flow";
import { createPremiumBillingPorts } from "./rc-bridge";
import { isPremiumUnlocked, resolvePremiumSurfaceState } from "./unlock";
import type { PremiumPurchasePlan } from "./types";

export function usePremiumJourney() {
  const { userId } = useAuth();
  const {
    entitlements,
    plans,
    loading: subscriptionLoading,
    entitlementsResolved,
    refresh,
    checkoutRazorpay,
  } = useSubscription();
  const native = useNativeBilling();

  const [state, dispatch] = useReducer(
    reducePremiumJourney,
    undefined,
    createInitialPremiumJourneyState,
  );
  const [selectedPlan, setSelectedPlan] = useState<PremiumPurchasePlan>("yearly");

  const ports = useMemo(
    () =>
      createPremiumBillingPorts({
        native,
        web: { checkoutRazorpay },
        userId,
      }),
    [native, checkoutRazorpay, userId],
  );

  const surface = resolvePremiumSurfaceState(entitlements);
  const unlocked = isPremiumUnlocked(entitlements);

  useEffect(() => {
    if (subscriptionLoading && !entitlementsResolved) {
      return;
    }
    dispatch({
      type: "HYDRATE",
      isPremium: unlocked,
      online: isBrowserOnline(),
    });
  }, [unlocked, subscriptionLoading, entitlementsResolved]);

  useEffect(() => {
    const onOffline = () => dispatch({ type: "GO_OFFLINE" });
    const onOnline = () => dispatch({ type: "GO_ONLINE" });
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  useEffect(() => {
    if (plans.length > 0) {
      const preferred =
        (plans.find((p) => p.id === "yearly")?.id as PremiumPurchasePlan | undefined) ??
        (plans[0]?.id as PremiumPurchasePlan | undefined);
      if (preferred) setSelectedPlan(preferred);
      dispatch({ type: "PLANS_READY" });
    }
  }, [plans]);

  const purchase = useCallback(async () => {
    if (!isBrowserOnline()) {
      dispatch({ type: "GO_OFFLINE", context: "purchase" });
      return;
    }
    // Idempotent: already unlocked — do not call store again.
    if (unlocked || state.isPremium) {
      dispatch({
        type: "HYDRATE",
        isPremium: true,
        online: true,
      });
      return;
    }
    dispatch({ type: "PURCHASE_START" });

    // Prefer RC native paywall when the existing bridge handles it.
    if (ports.presentNativePaywall) {
      const nativeUi = await ports.presentNativePaywall();
      if (nativeUi.handled) {
        if (nativeUi.purchased || nativeUi.restored) {
          refresh();
          dispatch({ type: "PURCHASE_SUCCESS" });
          return;
        }
        if (nativeUi.cancelled) {
          dispatch({ type: "PURCHASE_CANCEL" });
          return;
        }
        if (nativeUi.error) {
          dispatch({
            type: "PURCHASE_FAIL",
            error: nativeUi.reason ?? "Purchase failed. Please try again.",
          });
          return;
        }
      }
    }

    const result = await ports.purchase(selectedPlan);
    if (result.ok) {
      refresh();
      dispatch({ type: "PURCHASE_SUCCESS" });
      return;
    }
    if (result.userCancelled) {
      dispatch({ type: "PURCHASE_CANCEL" });
      return;
    }
    dispatch({
      type: "PURCHASE_FAIL",
      error: result.reason ?? "Purchase failed. Please try again.",
    });
  }, [ports, selectedPlan, refresh, unlocked, state.isPremium]);

  const restore = useCallback(async () => {
    if (!isBrowserOnline()) {
      dispatch({ type: "GO_OFFLINE", context: "restore" });
      return;
    }
    if (unlocked || state.isPremium) {
      dispatch({
        type: "HYDRATE",
        isPremium: true,
        online: true,
      });
      return;
    }
    dispatch({ type: "RESTORE_START" });
    const result = await ports.restore();
    if (result.ok) {
      refresh();
      dispatch({ type: "RESTORE_SUCCESS" });
      return;
    }
    dispatch({
      type: "RESTORE_FAIL",
      error: result.reason ?? "No purchases found to restore.",
    });
  }, [ports, refresh, unlocked, state.isPremium]);

  const retry = useCallback(() => {
    dispatch({ type: "RETRY", online: isBrowserOnline() });
  }, []);
  const dismissCancel = useCallback(
    () => dispatch({ type: "DISMISS_CANCEL" }),
    [],
  );

  const selectPlan = useCallback((plan: Plan) => {
    if (plan === "free") return;
    setSelectedPlan(plan);
  }, []);

  return {
    state,
    surface,
    unlocked,
    plans,
    selectedPlan,
    selectPlan,
    purchase,
    restore,
    retry,
    dismissCancel,
    refresh,
    subscriptionLoading,
    entitlementsResolved,
    nativePurchasing: native.purchasing,
  };
}
