/**
 * Phonics playback via bundled pack only (recovery path).
 */

import { isLocalAudioRecoveryEnabled } from "@/lib/local-audio-recovery";
import { playLocalAudio, stopLocalAudio } from "@/lib/local-audio-playback";
import {
  hasLocalPackAsset,
  resolveLocalPhonicsLetterUrl,
  resolveLocalPhonicsWordUrl,
} from "@/lib/local-audio-pack";

export { stopLocalAudio as stopPhonicsLocalAudio };

export function isPhonicsLocalPlaybackAvailable(wordOrKey: string, kind: "word" | "letter"): boolean {
  if (!isLocalAudioRecoveryEnabled()) return false;
  if (kind === "word") return hasLocalPackAsset("phonics-word", wordOrKey);
  return (
    hasLocalPackAsset("phonics-letter", wordOrKey) ||
    hasLocalPackAsset("phonics-phoneme", wordOrKey)
  );
}

export async function playLocalPhonicsWord(
  word: string,
  opts?: { isCancelled?: () => boolean },
): Promise<{ ok: boolean; error?: string }> {
  if (opts?.isCancelled?.()) return { ok: false, error: "phonics_cancelled" };
  const url = resolveLocalPhonicsWordUrl(word);
  if (!url) return { ok: false, error: "local_asset_missing" };
  const result = await playLocalAudio(url);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

export async function playLocalPhonicsLetter(
  audioKey: string,
  opts?: { isCancelled?: () => boolean },
): Promise<{ ok: boolean; error?: string }> {
  if (opts?.isCancelled?.()) return { ok: false, error: "phonics_cancelled" };
  const url = resolveLocalPhonicsLetterUrl(audioKey);
  if (!url) return { ok: false, error: "local_asset_missing" };
  const result = await playLocalAudio(url);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
