/**
 * Spelling word playback — bundled pack only (recovery path).
 */

import { isLocalAudioRecoveryEnabled } from "@/lib/local-audio-recovery";
import { playLocalAudio, stopLocalAudio } from "@/lib/local-audio-playback";
import { resolveLocalSpellingUrl } from "@/lib/local-audio-pack";

export async function playLocalSpellingWord(
  word: string,
  opts?: { slow?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  if (!isLocalAudioRecoveryEnabled()) {
    return { ok: false, error: "local_recovery_disabled" };
  }
  const url = resolveLocalSpellingUrl(word);
  if (!url) return { ok: false, error: "local_asset_missing" };
  stopLocalAudio();
  const result = await playLocalAudio(url, { playbackRate: opts?.slow ? 0.65 : 1 });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
