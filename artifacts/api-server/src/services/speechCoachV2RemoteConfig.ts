/**
 * Server-side Speech Coach V2 remote config.
 * Toggle via SPEECH_COACH_V2_ENABLED env (no deploy required for API-only flips).
 */
export interface SpeechCoachV2RemoteConfigPayload {
  speechCoachV2Enabled: boolean;
  speechCoachLegacyVisible: boolean;
}

function envBool(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key]?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return defaultValue;
}

export function getSpeechCoachV2RemoteConfig(): SpeechCoachV2RemoteConfigPayload {
  return {
    speechCoachV2Enabled: envBool("SPEECH_COACH_V2_ENABLED", false),
    speechCoachLegacyVisible: envBool("SPEECH_COACH_LEGACY_VISIBLE", false),
  };
}
