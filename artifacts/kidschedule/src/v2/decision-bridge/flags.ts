import { isV2FlagEnabled } from "@/lib/feature-flags";

/** Decision Bridge kill switch — default OFF. */
export function isAmyDecisionBridgeEnabled(): boolean {
  return isV2FlagEnabled("amy_decision_bridge_v2");
}
