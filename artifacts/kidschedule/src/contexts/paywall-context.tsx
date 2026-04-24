import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

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
  | "behavior_locked"
  | "child_locked";

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
