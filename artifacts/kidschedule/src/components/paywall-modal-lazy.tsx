import { lazy, Suspense } from "react";
import { usePaywall } from "@/contexts/paywall-context";

const PaywallModal = lazy(() =>
  import("@/components/paywall-modal").then((m) => ({
    default: m.PaywallModal,
  })),
);

/** Loads billing / paywall code only when the user opens the paywall. */
export function PaywallModalLazy() {
  const { state } = usePaywall();
  if (!state.open) return null;
  return (
    <Suspense fallback={null}>
      <PaywallModal />
    </Suspense>
  );
}
