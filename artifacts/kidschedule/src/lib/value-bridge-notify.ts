import type { ValueBridgeMoment } from "@/lib/value-bridge";

type ValueBridgeListener = (moment: ValueBridgeMoment) => void;

let listener: ValueBridgeListener | null = null;

export function registerValueBridgeListener(next: ValueBridgeListener | null): void {
  listener = next;
}

/** Phase 1 moments only: routine_completion | weekly_summary */
export function notifyValueBridgeMoment(moment: ValueBridgeMoment): void {
  if (moment !== "routine_completion" && moment !== "weekly_summary") return;
  listener?.(moment);
}
