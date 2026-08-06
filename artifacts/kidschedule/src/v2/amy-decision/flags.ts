/**
 * Amy Decision Engine kill switch — default OFF.
 * Engine pure functions remain unit-testable; production must not bind shells while off.
 */

import { isV2FlagEnabled } from "@/lib/feature-flags";

export function isAmyDecisionEngineEnabled(): boolean {
  return isV2FlagEnabled("amy_decision_engine_v2");
}
