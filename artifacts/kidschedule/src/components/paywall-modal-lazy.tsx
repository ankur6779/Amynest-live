import { Suspense, useEffect, useState } from "react";
import { usePaywall } from "@/contexts/paywall-context";
import { useUser } from "@/lib/firebase-auth-hooks";
import { lazyPage } from "@/lib/safe-import";
import {
  canPresentNativeRCPaywall,
  presentNativeRCPaywall,
} from "@/lib/native-rc-paywall";

const PaywallModal = lazyPage(() =>
  import("@/components/paywall-modal").then((m) => ({
    default: m.PaywallModal,
  })),
);

/**
 * Loads billing / paywall code only when needed.
 * Native iOS/Android shells get RevenueCat's dashboard paywall first;
 * web and failed native attempts fall back to the custom React modal.
 */
export function PaywallModalLazy() {
  const { state, closePaywall } = usePaywall();
  const { user } = useUser();
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
        closePaywall();
        if (outcome.purchased || outcome.restored) {
          window.dispatchEvent(new Event("amynest:refresh-subscription"));
        }
        return;
      }

      setShowCustom(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [state.open, user?.id, closePaywall]);

  if (!state.open || !showCustom) return null;

  return (
    <Suspense fallback={null}>
      <PaywallModal />
    </Suspense>
  );
}
