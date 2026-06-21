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
import { PURCHASE_SCREEN } from "@workspace/subscription-marketing";

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
      const outcome = await presentNativeRCPaywall({ userId: user?.id });
      if (cancelled) return;

      if (outcome.handled) {
        if (outcome.purchased || outcome.restored) {
          const finalized = outcome.restored
            ? await finalizeNativeRestore(authFetch, qc)
            : await finalizeNativePurchase(authFetch, qc);
          closePaywall();
          trackSubscriptionEvent({
            event: "purchase_success",
            reason: paywallReason,
            source: "native_rc_paywall",
          });
          if (finalized.isPremium) {
            toast({
              title: PURCHASE_SCREEN.successTitle,
              description: PURCHASE_SCREEN.successBody,
            });
          } else {
            toast({
              title: PURCHASE_SCREEN.verifyTitle,
              description: PURCHASE_SCREEN.verifySubtitle,
            });
          }
        } else {
          closePaywall();
        }
        return;
      }

      setShowCustom(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [state.open, user?.id, closePaywall, authFetch, qc, toast]);

  if (!state.open || !showCustom) return null;

  return (
    <Suspense fallback={null}>
      <PaywallModal />
    </Suspense>
  );
}
