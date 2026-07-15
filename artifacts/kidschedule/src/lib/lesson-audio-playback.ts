/**
 * Amy Audio Lessons — static GCS playback (same path as spelling / catalog).
 * Bypasses the full Amy voice pipeline so lesson paragraphs never fall through
 * to instant emergency-tone or premature onFinished callbacks.
 */

import { amyVoiceController, type SpeakResult } from "@/lib/amy-voice-controller";
import type { AudioIdentity } from "@/lib/lesson-audio-identity";
import { lookupStaticAudioUrlStrict } from "@/lib/static-audio";

export type PlayLessonParagraphOptions = {
  playbackRate?: number;
  isCancelled?: () => boolean;
};

/** Play one lesson paragraph from the pre-generated static catalog (GCS via /api/static-audio). */
export async function playLessonParagraphStatic(
  identity: AudioIdentity,
  opts: PlayLessonParagraphOptions = {},
): Promise<SpeakResult> {
  const url = lookupStaticAudioUrlStrict(identity.text, "default");
  if (!url) {
    return { success: false, error: "static_failed", layer: "static" };
  }

  return amyVoiceController.playPreparedUrl(url, {
    source: "lesson",
    phrase: identity.text,
    srcType: "static",
    playbackRate: opts.playbackRate ?? 1,
    isCancelled: opts.isCancelled,
    waitUntilEnd: true,
  });
}
