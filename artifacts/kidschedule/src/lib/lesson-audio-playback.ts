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
    console.warn("[LessonPlayback] static URL miss", {
      lessonId: identity.lessonId,
      paragraphIdx: identity.paragraphIdx,
      textPreview: identity.text.slice(0, 100),
      hash: identity.hash,
    });
    return { success: false, error: "static_failed", layer: "static" };
  }

  console.info("[LessonPlayback] static play start", {
    lessonId: identity.lessonId,
    paragraphIdx: identity.paragraphIdx,
    url,
    textPreview: identity.text.slice(0, 80),
  });

  const result = await amyVoiceController.playPreparedUrl(url, {
    source: "lesson",
    phrase: identity.text,
    srcType: "static",
    playbackRate: opts.playbackRate ?? 1,
    isCancelled: opts.isCancelled,
    waitUntilEnd: true,
    preferDirectStream: true,
  });

  if (!result.success) {
    console.warn("[LessonPlayback] static play failed", {
      lessonId: identity.lessonId,
      paragraphIdx: identity.paragraphIdx,
      url,
      error: result.error,
    });
  } else {
    console.info("[LessonPlayback] static play ended", {
      lessonId: identity.lessonId,
      paragraphIdx: identity.paragraphIdx,
    });
  }

  return result;
}
