import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { incrementPaywallVisitCount } from "@/lib/subscription-funnel-storage";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import { track } from "@/lib/analytics";

export type PaywallReason =
  | "ai_quota"
  | "personalized_coaching"
  | "premium_insight"
  | "child_limit"
  | "feature"
  | "section_locked"
  | "audio_lessons"
  | "routines_limit"
  | "coach_locked"
  | "hub_locked"
  | "hub_journey"
  | "behavior_locked"
  | "child_locked"
  | "phonics_workbook"
  | "hub_nutrition"
  | "nutrition_library"
  | "speech_coach"
  | "learning_locked";

type PaywallState = {
  open: boolean;
  reason: PaywallReason;
};

type PaywallContextValue = {
  state: PaywallState;
  openPaywall: (reason?: PaywallReason) => void;
  closePaywall: () => void;
};

const PaywallContext = createContext<PaywallContextValue | null>(null);

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PaywallState>({ open: false, reason: "feature" });

  const openPaywall = useCallback((reason: PaywallReason = "feature") => {
    incrementPaywallVisitCount();
    trackSubscriptionEvent({
      event: "paywall_opened",
      reason,
      source: "open_paywall",
    });
    track("premium_paywall_viewed", { source: reason });
    setState({ open: true, reason });
  }, []);
  const closePaywall = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  const value = useMemo(
    () => ({ state, openPaywall, closePaywall }),
    [state, openPaywall, closePaywall],
  );

  return <PaywallContext.Provider value={value}>{children}</PaywallContext.Provider>;
}

export function usePaywall(): PaywallContextValue {
  const ctx = useContext(PaywallContext);
  if (!ctx) throw new Error("usePaywall must be used within PaywallProvider");
  return ctx;
}
