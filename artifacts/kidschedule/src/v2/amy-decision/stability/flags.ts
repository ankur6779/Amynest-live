import { isV2FlagEnabled } from "@/lib/feature-flags";

/** Decision Stability kill switch — default OFF. */
export function isAmyDecisionStabilityEnabled(): boolean {
  return isV2FlagEnabled("amy_decision_stability_v2");
}
