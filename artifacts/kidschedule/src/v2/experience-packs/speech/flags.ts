import { isV2FlagEnabled } from "@/lib/feature-flags";

/** Speech Experience Pack kill switch — default OFF. */
export function isAmySpeechExperiencePackEnabled(): boolean {
  return isV2FlagEnabled("amy_speech_experience_pack_v2");
}
