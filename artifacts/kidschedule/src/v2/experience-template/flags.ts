import { isV2FlagEnabled } from "@/lib/feature-flags";

/** Experience Template Engine kill switch — default OFF. */
export function isAmyExperienceTemplateEngineEnabled(): boolean {
  return isV2FlagEnabled("amy_experience_template_engine_v2");
}
