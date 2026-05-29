import { useEffect, useRef } from "react";
import { useIntentMutations } from "@/hooks/use-intent-recovery";
import { queueClientLog } from "@/lib/client-logs";

const ACTIVE_INTENT_KEY = "amynest_active_intent_id";

export function getActiveIntentId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACTIVE_INTENT_KEY);
}

export function setActiveIntentId(intentId: string | null): void {
  if (typeof window === "undefined") return;
  if (intentId) sessionStorage.setItem(ACTIVE_INTENT_KEY, intentId);
  else sessionStorage.removeItem(ACTIVE_INTENT_KEY);
}

/**
 * Detects app background, tab hide, and page unload — persists in-progress intents server-side.
 */
export function useIntentInterruptionTracker(enabled = true): void {
  const { interrupt } = useIntentMutations();
  const interrupting = useRef(false);

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const persistInterruption = () => {
      const intentId = getActiveIntentId();
      if (!intentId || interrupting.current) return;
      interrupting.current = true;
      queueClientLog({
        type: "info",
        message: "intent:interrupted",
        context: "intent_recovery",
        meta: { intentId },
      });
      void interrupt.mutateAsync(intentId).finally(() => {
        interrupting.current = false;
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") persistInterruption();
    };

    const onPageHide = () => persistInterruption();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [enabled, interrupt]);
}
