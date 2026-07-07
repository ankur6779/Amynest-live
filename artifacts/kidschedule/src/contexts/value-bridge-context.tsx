import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useSubscription } from "@/hooks/use-subscription";
import { useTrialState } from "@/hooks/use-trial-state";
import {
  compareValueBridgePriority,
  setSessionBridgeMoment,
  shouldTriggerValueBridge,
  type ValueBridgeInvite,
  type ValueBridgeMoment,
} from "@/lib/value-bridge";
import { registerValueBridgeListener } from "@/lib/value-bridge-notify";

type ValueBridgeContextValue = {
  active: ValueBridgeInvite | null;
  triggerValueBridge: (moment: ValueBridgeMoment) => void;
  dismissValueBridge: () => void;
  clearValueBridge: () => void;
  commitShown: (invite: ValueBridgeInvite) => void;
  analyticsMeta: {
    route: string;
    trialState: string;
    subscriptionState: string;
    userId: string | null;
  };
};

const ValueBridgeContext = createContext<ValueBridgeContextValue | null>(null);

export function ValueBridgeProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { userId } = useAuth();
  const { entitlements } = useSubscription();
  const { isTrialing } = useTrialState();
  const [active, setActive] = useState<ValueBridgeInvite | null>(null);

  const analyticsMeta = useMemo(
    () => ({
      route: location,
      trialState: isTrialing ? "trialing" : "not_trialing",
      subscriptionState: entitlements?.subscriptionState ?? "unknown",
      userId: userId ?? null,
    }),
    [location, isTrialing, entitlements?.subscriptionState, userId],
  );

  const triggerValueBridge = useCallback(
    (moment: ValueBridgeMoment) => {
      if (!shouldTriggerValueBridge(moment, entitlements)) return;

      setActive((current) => {
        if (
          current &&
          compareValueBridgePriority(current.moment, moment) >= 0
        ) {
          return current;
        }
        setSessionBridgeMoment(moment);
        return { moment };
      });
    },
    [entitlements],
  );

  useEffect(() => {
    registerValueBridgeListener(triggerValueBridge);
    return () => registerValueBridgeListener(null);
  }, [triggerValueBridge]);

  const commitShown = useCallback((_invite: ValueBridgeInvite) => {
    /* Analytics fired from banner once per render cycle. */
  }, []);

  const dismissValueBridge = useCallback(() => {
    setActive(null);
  }, []);

  const clearValueBridge = useCallback(() => {
    setActive(null);
  }, []);

  const value = useMemo(
    () => ({
      active,
      triggerValueBridge,
      dismissValueBridge,
      clearValueBridge,
      commitShown,
      analyticsMeta,
    }),
    [
      active,
      triggerValueBridge,
      dismissValueBridge,
      clearValueBridge,
      commitShown,
      analyticsMeta,
    ],
  );

  return (
    <ValueBridgeContext.Provider value={value}>
      {children}
    </ValueBridgeContext.Provider>
  );
}

export function useValueBridge(): ValueBridgeContextValue {
  const ctx = useContext(ValueBridgeContext);
  if (!ctx) {
    throw new Error("useValueBridge must be used within ValueBridgeProvider");
  }
  return ctx;
}
