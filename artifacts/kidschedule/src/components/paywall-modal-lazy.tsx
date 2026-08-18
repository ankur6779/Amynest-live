import { Suspense, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePaywall } from "@/contexts/paywall-context";
import { useUser } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useToast } from "@/hooks/use-toast";
import { lazyPage } from "@/lib/safe-import";
import {
  canPresentNativeRCPaywall,
  presentNativeRCPaywall,
} from "@/lib/native-rc-paywall";
import { finalizeNativePurchase, finalizeNativeRestore } from "@/lib/native-purchase-finalize";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import { track } from "@/lib/analytics";
import { logSubscriptionDebug } from "@/lib/subscription-debug";
import { PURCHASE_SCREEN } from "@workspace/subscription-marketing";
import { requestPremiumWelcome } from "@/lib/premium-welcome-controller";

const PaywallModal = lazyPage(() =>
  import("@/components/paywall-modal").then((m) => ({
    default: m.PaywallModal,
  })),
);

/**
 * Loads billing / paywall code only when needed.
 * Default: custom React paywall on all shells (iOS + Android Play).
 * Optional VITE_FF_SUB_NATIVE_RC_PAYWALL=true shows RevenueCat UI first on Android.
 */
export function PaywallModalLazy() {
  const { state, closePaywall } = usePaywall();
  const paywallReason = state.reason;
  const { user } = useUser();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (!state.open) {
      setShowCustom(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const canNative = await canPresentNativeRCPaywall();
      if (cancelled) return;

      if (!canNative) {
        setShowCustom(true);
        return;
      }

      setShowCustom(false);
      track("upgrade_started", {
        module: state.module,
        action: state.action ?? "checkout",
        source: state.source ?? "native_rc_paywall",
        entitlement_state: state.entitlementState ?? "free",
      });
      const outcome = await presentNativeRCPaywall({ userId: user?.id });
      if (cancelled) return;

      if (outcome.handled) {
        if (outcome.purchased || outcome.restored) {
          const finalized = outcome.restored
            ? await finalizeNativeRestore(authFetch, qc)
            : await finalizeNativePurchase(authFetch, qc);
          closePaywall();
          if (outcome.restored) {
            trackSubscriptionEvent({
              event: finalized.isPremium ? "restore_success" : "restore_purchase_failed",
              reason: paywallReason,
              source: "native_rc_paywall",
            });
          } else if (finalized.isPremiumSubscriber) {
            logSubscriptionDebug({
              phase: "native_rc_paywall_purchase_no_txn",
              source: "native_rc_paywall",
              reason: paywallReason,
              extra: {
                note: "RC dashboard paywall lacks store transaction id — purchase conversion relies on hook path or webhook",
              },
            });
          }
          if (finalized.isPremium) {
            requestPremiumWelcome();
          } else {
            toast({
              title: PURCHASE_SCREEN.verifyTitle,
              description: PURCHASE_SCREEN.verifySubtitle,
            });
          }
        } else {
          trackSubscriptionEvent({
            event: "paywall_close",
            reason: paywallReason,
            source: "native_rc_paywall",
          });
          trackSubscriptionEvent({
            event: "checkout_cancelled",
            reason: paywallReason,
            source: "native_rc_paywall",
          });
          closePaywall();
        }
        return;
      }

      setShowCustom(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [state, user?.id, closePaywall, authFetch, qc, toast]);

  if (!state.open || !showCustom) return null;

  return (
    <Suspense fallback={null}>
      <PaywallModal />
    </Suspense>
  );
}
