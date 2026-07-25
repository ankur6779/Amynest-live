import { useEffect } from "react";
import type { PremiumPromptTrigger } from "@/lib/premium-prompt";
import { FF_PREMIUM_MOMENT_SHEETS } from "@/lib/mrr-experiment-flags";
import { usePremiumMomentOptional } from "@/contexts/premium-moment-context";

type PremiumMomentListener = (
  trigger: PremiumPromptTrigger,
  meta?: { source?: string; routineCount?: number },
) => boolean;

let listener: PremiumMomentListener | null = null;

export function registerPremiumMomentListener(next: PremiumMomentListener | null): void {
  listener = next;
}

/** Dispatch from non-React call sites (fetch handlers, deep components). */
export function notifyPremiumMoment(
  trigger: PremiumPromptTrigger,
  meta?: { source?: string; routineCount?: number },
): boolean {
  if (!FF_PREMIUM_MOMENT_SHEETS) return false;
  if (!listener) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("amynest:open-premium-moment", {
          detail: { trigger, ...meta },
        }),
      );
    }
    return false;
  }
  return listener(trigger, meta);
}

/** Bridges window events to PremiumMomentProvider. */
export function PremiumMomentEventBridge() {
  const premiumMoment = usePremiumMomentOptional();

  useEffect(() => {
    if (!premiumMoment) return;

    registerPremiumMomentListener((trigger, meta) =>
      premiumMoment.showPremiumMoment(trigger, meta),
    );

    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        trigger?: PremiumPromptTrigger;
        source?: string;
        routineCount?: number;
      };
      if (!detail?.trigger) return;
      premiumMoment.showPremiumMoment(detail.trigger, {
        source: detail.source,
        routineCount: detail.routineCount,
      });
    };

    window.addEventListener("amynest:open-premium-moment", onEvent);
    return () => {
      registerPremiumMomentListener(null);
      window.removeEventListener("amynest:open-premium-moment", onEvent);
    };
  }, [premiumMoment]);

  return null;
}
