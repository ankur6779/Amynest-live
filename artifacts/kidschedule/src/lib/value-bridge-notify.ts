import {
  isValidValueBridgeMoment,
  momentToSource,
  type ValueBridgeMoment,
} from "@/lib/value-bridge";
import { trackValueBridgeNotShown } from "@/lib/value-bridge-analytics";

type ValueBridgeListener = (moment: ValueBridgeMoment) => void;

let listener: ValueBridgeListener | null = null;

export function registerValueBridgeListener(next: ValueBridgeListener | null): void {
  listener = next;
}

function routeForSuppression(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`.slice(0, 120);
}

/** Phase 1 moments only: routine_completion | weekly_summary */
export function notifyValueBridgeMoment(moment: ValueBridgeMoment | string): void {
  if (!isValidValueBridgeMoment(moment)) {
    trackValueBridgeNotShown(
      "missing_value_moment",
      "routine_completion",
      { route: routeForSuppression() },
      { moment: String(moment).slice(0, 64) },
    );
    return;
  }
  listener?.(moment);
}
