/**
 * Speech Coach static lines — local pack only. Dynamic coach copy stays on TTS.
 */

import {
  getCoachDialogueExtraAudioTexts,
  getCoachDialogueWarmupPhrases,
  substituteCoachNameForStatic,
  replaceCoachPersonalNameWithFriend,
} from "@workspace/speech-coach";
import { isLocalAudioRecoveryEnabled } from "@/lib/local-audio-recovery";
import { playLocalAudio, stopLocalAudio } from "@/lib/local-audio-playback";
import { hasLocalPackAsset, resolveLocalCoachUrl } from "@/lib/local-audio-pack";

const STATIC_COACH_LINES = new Set(
  [
    ...getCoachDialogueWarmupPhrases(),
    ...getCoachDialogueExtraAudioTexts(),
  ].map((t) => substituteCoachNameForStatic(t).trim().toLowerCase()),
);

function normalizeCoachStaticLine(text: string): string {
  return replaceCoachPersonalNameWithFriend(text).trim().toLowerCase();
}

export function isCoachStaticPackLine(text: string): boolean {
  const normalized = normalizeCoachStaticLine(text);
  if (!normalized) return false;
  if (STATIC_COACH_LINES.has(normalized)) return true;
  return hasLocalPackAsset("coach", normalized) || hasLocalPackAsset("coach", text.trim());
}

/** Play a fixed coach line from the bundle. No TTS fallback. */
export async function playCoachStaticLine(text: string): Promise<{ ok: boolean; error?: string }> {
  if (!isLocalAudioRecoveryEnabled()) {
    return { ok: false, error: "local_recovery_disabled" };
  }
  const phrase = replaceCoachPersonalNameWithFriend(text).trim();
  const url = resolveLocalCoachUrl(phrase);
  if (!url) return { ok: false, error: "local_asset_missing" };
  stopLocalAudio();
  const result = await playLocalAudio(url);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
