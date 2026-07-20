import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  ensureFirstOpenTimestamp,
  incrementPaywallDeferCount,
  incrementPaywallVisitCount,
} from "@/lib/subscription-funnel-storage";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import { track } from "@/lib/analytics";
import {
  ACTIVATION_ROUTINE_GENERATE_HREF,
  shouldDeferPaywallForActivation,
} from "@/lib/activation-gate";
import { logSubscriptionDebug } from "@/lib/subscription-debug";

export type PaywallReason =
  | "ai_quota"
  | "infant_ai_quota"
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
  | "learning_locked"
  | "infant_sleep_coach"
  | "infant_feeding_plan";

type PaywallState = {
  open: boolean;
  reason: PaywallReason;
  module?: string;
  action?: string;
  source?: string;
  entitlementState?: "free" | "premium" | "trial" | "unknown";
};

export type OpenPaywallMeta = Omit<PaywallState, "open" | "reason"> & {
  /** When known, ends activation defer without relying only on local milestones. */
  routineCount?: number;
};

type PaywallContextValue = {
  state: PaywallState;
  openPaywall: (reason?: PaywallReason, meta?: OpenPaywallMeta) => void;
  closePaywall: () => void;
};

const PaywallContext = createContext<PaywallContextValue | null>(null);

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PaywallState>({ open: false, reason: "feature" });

  const openPaywall = useCallback((reason: PaywallReason = "feature", meta?: OpenPaywallMeta) => {
    ensureFirstOpenTimestamp();
    const routineCount = Number(meta?.routineCount ?? 0);
    if (shouldDeferPaywallForActivation(reason, routineCount)) {
      const deferCount = incrementPaywallDeferCount();
      trackSubscriptionEvent({
        event: "paywall_deferred_activation",
        reason,
        source: meta?.source ?? "open_paywall",
        extra: { defer_count: deferCount },
      });
      logSubscriptionDebug({
        phase: "paywall_deferred_activation",
        reason,
        source: meta?.source ?? "open_paywall",
        extra: { defer_count: deferCount, routine_count: routineCount },
      });
      track("navigation", {
        from_route: "paywall_deferred",
        to_route: ACTIVATION_ROUTINE_GENERATE_HREF,
        trigger: "programmatic",
        feature: reason,
      });
      window.dispatchEvent(
        new CustomEvent("amynest:activation-redirect", {
          detail: { href: ACTIVATION_ROUTINE_GENERATE_HREF, reason },
        }),
      );
      return;
    }
    incrementPaywallVisitCount();
    trackSubscriptionEvent({
      event: "paywall_opened",
      reason,
      source: meta?.source ?? "open_paywall",
    });
    track("premium_paywall_viewed", { source: reason });
    logSubscriptionDebug({
      phase: "paywall_opened",
      reason,
      source: meta?.source ?? "open_paywall",
      extra: { routine_count: routineCount },
    });
    const { routineCount: _routineCount, ...rest } = meta ?? {};
    setState({ open: true, reason, ...rest });
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
