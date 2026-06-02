/**
 * Audio recovery reset — local bundled playback only for child-facing phonics/spelling/coach static lines.
 * Freeze: do not extend network/GCS/TTS/proxy/retry paths for these surfaces.
 *
 * Disable only for debugging: VITE_LOCAL_AUDIO_RECOVERY=0
 */

import packManifest from "../../public/audio-pack/manifest.json";

type PackManifestShape = {
  tier?: string;
  entries?: Record<string, string>;
};

const manifest = packManifest as PackManifestShape;

/**
 * Local recovery requires a REAL bundled pack. A stub pack (one placeholder clip
 * per key) or an empty manifest has no playable assets, so recovery must
 * auto-disable — otherwise Speech Coach and Spelling are routed into a dead-end
 * local-pack path and go silent.
 */
function hasUsableLocalPack(): boolean {
  if (manifest.tier === "stub") return false;
  return Boolean(manifest.entries && Object.keys(manifest.entries).length > 0);
}

export function isLocalAudioRecoveryEnabled(): boolean {
  if (import.meta.env.VITE_LOCAL_AUDIO_RECOVERY === "0") return false;
  if (!hasUsableLocalPack()) return false;
  return true;
}
