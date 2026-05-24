// ─────────────────────────────────────────────────────────────
// Routine voice preferences — playback uses useAmyVoice (OpenAI TTS).
// ─────────────────────────────────────────────────────────────

const KEY_ENABLED = "amynest_voice_enabled";
const KEY_GENDER  = "amynest_voice_gender"; // "female" | "male"

export type VoiceLang   = "en";
export type VoiceGender = "female" | "male";

export interface VoiceSettings {
  enabled: boolean;
  lang: VoiceLang;
  gender: VoiceGender;
  voiceName: string | null;
}

/** OpenAI TTS voice for routine narration (server applies Indian-English instructions). */
export function openAiVoiceForGender(gender: VoiceGender): string | undefined {
  return gender === "male" ? "onyx" : undefined;
}

// ─── Settings ────────────────────────────────────────────────

export function getVoiceSettings(): VoiceSettings {
  return {
    enabled:   localStorage.getItem(KEY_ENABLED) === "true",
    lang:      "en",
    gender:    (localStorage.getItem(KEY_GENDER) as VoiceGender) ?? "female",
    voiceName: null,
  };
}

export function saveVoiceSettings(patch: Partial<VoiceSettings>): void {
  if (patch.enabled !== undefined) localStorage.setItem(KEY_ENABLED, patch.enabled ? "true" : "false");
  if (patch.gender  !== undefined) localStorage.setItem(KEY_GENDER, patch.gender);
}

export function isVoiceEnabled(): boolean           { return getVoiceSettings().enabled; }
export function setVoiceEnabled(val: boolean): void { saveVoiceSettings({ enabled: val }); }
export function getSavedVoiceName(): string | null  { return null; }
export function saveVoiceName(_name: string): void  { /* no-op */ }

/** Copy for routine task announcements (OpenAI TTS via useAmyVoice). */
export const ROUTINE_TASK_ANNOUNCE_MSGS = [
  (n: string, t: string) => `Hey ${n}! Time for ${t}. You've got this!`,
  (n: string, t: string) => `${n}, it's ${t} time! Let's go!`,
  (n: string, t: string) => `Hi ${n}! Your next activity is ${t}. Ready?`,
] as const;
