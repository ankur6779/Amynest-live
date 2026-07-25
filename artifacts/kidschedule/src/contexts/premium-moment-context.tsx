import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SubscriptionMomentSheet } from "@/components/subscription-moment-sheet";
import { hasFirstRoutineActivationProgress } from "@/lib/activation-gate";
import {
  canShowPremiumPrompt,
  markPremiumPromptShown,
  shouldLogRoutineLimitReached,
  type PremiumPromptTrigger,
} from "@/lib/premium-prompt";
import {
  trackFirstRoutineValueMomentCompleted,
  trackPremiumPromptEvent,
} from "@/lib/premium-prompt-analytics";
import { shouldSuppressPremiumMonetization } from "@/lib/premium-entitlement-guard";
import {
  isMonetizationSurfaceBlocked,
  releaseMonetizationSurface,
  tryClaimMonetizationSurface,
} from "@/lib/monetization-coordinator";
import { FF_PREMIUM_MOMENT_SHEETS } from "@/lib/mrr-experiment-flags";
import { useSubscription } from "@/hooks/use-subscription";

type PremiumMomentState = {
  open: boolean;
  trigger: PremiumPromptTrigger;
  source?: string;
};

type PremiumMomentContextValue = {
  showPremiumMoment: (
    trigger: PremiumPromptTrigger,
    meta?: { source?: string; routineCount?: number },
  ) => boolean;
  dismissPremiumMoment: () => void;
};

const noopValue: PremiumMomentContextValue = {
  showPremiumMoment: () => false,
  dismissPremiumMoment: () => {},
};

const PremiumMomentContext = createContext<PremiumMomentContextValue | null>(null);

export function PremiumMomentProvider({ children }: { children: ReactNode }) {
  const { entitlements, entitlementsResolved } = useSubscription();
  const [state, setState] = useState<PremiumMomentState>({
    open: false,
    trigger: "first_routine",
  });
  const shownAtRef = useRef(0);
  const promptShownRef = useRef(false);

  const showPremiumMoment = useCallback(
    (
      trigger: PremiumPromptTrigger,
      meta?: { source?: string; routineCount?: number },
    ): boolean => {
      if (!FF_PREMIUM_MOMENT_SHEETS) return false;
      if (state.open || promptShownRef.current) return false;
      if (isMonetizationSurfaceBlocked("value_sheet")) return false;
      if (
        shouldSuppressPremiumMonetization({
          entitlements,
          entitlementsResolved,
        })
      ) {
        return false;
      }

      const routineCount = meta?.routineCount ?? 0;
      const hasFirstRoutine = hasFirstRoutineActivationProgress(routineCount);

      if (!canShowPremiumPrompt(trigger, hasFirstRoutine)) return false;
      if (!tryClaimMonetizationSurface("value_sheet")) return false;

      markPremiumPromptShown();
      promptShownRef.current = true;
      shownAtRef.current = Date.now();

      if (trigger === "routine_limit" && shouldLogRoutineLimitReached()) {
        trackPremiumPromptEvent("routine_limit_reached", trigger, {
          source: meta?.source,
          routine_count: routineCount,
        });
      }

      trackPremiumPromptEvent("premium_prompt_shown", trigger, {
        source: meta?.source,
      });

      if (trigger === "first_routine") {
        trackFirstRoutineValueMomentCompleted({
          source: meta?.source,
          routine_id: routineCount,
        });
      }

      setState({ open: true, trigger, source: meta?.source });
      return true;
    },
    [entitlements, entitlementsResolved, state.open],
  );

  const dismissPremiumMoment = useCallback(() => {
    const dwellMs = shownAtRef.current ? Date.now() - shownAtRef.current : 0;
    trackPremiumPromptEvent("premium_prompt_dismissed", state.trigger, {
      source: state.source,
      dwell_ms: dwellMs,
    });
    releaseMonetizationSurface("value_sheet");
    setState((prev) => ({ ...prev, open: false }));
  }, [state.trigger, state.source]);

  const onCtaClick = useCallback(() => {
    trackPremiumPromptEvent("premium_prompt_clicked", state.trigger, {
      source: state.source,
    });
    releaseMonetizationSurface("value_sheet");
    setState((prev) => ({ ...prev, open: false }));
    window.dispatchEvent(
      new CustomEvent("amynest:open-paywall", {
        detail: {
          reason:
            state.trigger === "routine_limit"
              ? "routines_limit"
              : state.trigger === "speech_complete"
                ? "speech_coach"
                : "feature",
          source: `premium_moment:${state.trigger}`,
        },
      }),
    );
  }, [state.trigger, state.source]);

  const value = useMemo(
    () => ({ showPremiumMoment, dismissPremiumMoment }),
    [showPremiumMoment, dismissPremiumMoment],
  );

  if (!FF_PREMIUM_MOMENT_SHEETS) {
    return (
      <PremiumMomentContext.Provider value={noopValue}>
        {children}
      </PremiumMomentContext.Provider>
    );
  }

  return (
    <PremiumMomentContext.Provider value={value}>
      {children}
      <SubscriptionMomentSheet
        open={state.open}
        trigger={state.trigger}
        onDismiss={dismissPremiumMoment}
        onContinuePremium={onCtaClick}
      />
    </PremiumMomentContext.Provider>
  );
}

export function usePremiumMoment(): PremiumMomentContextValue {
  const ctx = useContext(PremiumMomentContext);
  if (!ctx) {
    throw new Error("usePremiumMoment must be used within PremiumMomentProvider");
  }
  return ctx;
}

export function usePremiumMomentOptional(): PremiumMomentContextValue | null {
  return useContext(PremiumMomentContext);
}
