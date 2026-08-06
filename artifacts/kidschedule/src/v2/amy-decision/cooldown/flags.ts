import { isV2FlagEnabled } from "@/lib/feature-flags";

/** Decision Cooldown kill switch — default OFF. */
export function isAmyDecisionCooldownEnabled(): boolean {
  return isV2FlagEnabled("amy_decision_cooldown_v2");
}
