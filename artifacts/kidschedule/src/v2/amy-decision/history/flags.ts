import { isV2FlagEnabled } from "@/lib/feature-flags";

/** Decision History kill switch — default OFF. */
export function isAmyDecisionHistoryEnabled(): boolean {
  return isV2FlagEnabled("amy_decision_history_v2");
}
