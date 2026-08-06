import { isV2FlagEnabled } from "@/lib/feature-flags";

/** Sleep Experience Pack kill switch — default OFF. */
export function isAmySleepExperiencePackEnabled(): boolean {
  return isV2FlagEnabled("amy_sleep_experience_pack_v2");
}
