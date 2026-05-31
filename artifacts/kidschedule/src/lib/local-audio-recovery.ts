/**
 * Audio recovery reset — local bundled playback only for child-facing phonics/spelling/coach static lines.
 * Freeze: do not extend network/GCS/TTS/proxy/retry paths for these surfaces.
 *
 * Disable only for debugging: VITE_LOCAL_AUDIO_RECOVERY=0
 */

export function isLocalAudioRecoveryEnabled(): boolean {
  if (import.meta.env.VITE_LOCAL_AUDIO_RECOVERY === "0") return false;
  return true;
}
