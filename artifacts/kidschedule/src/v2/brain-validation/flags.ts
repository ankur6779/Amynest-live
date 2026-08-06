import { isV2FlagEnabled } from "@/lib/feature-flags";

/** Shadow Validation kill switch — default OFF. */
export function isAmyBrainShadowValidationEnabled(): boolean {
  return isV2FlagEnabled("amy_brain_shadow_validation_v2");
}
