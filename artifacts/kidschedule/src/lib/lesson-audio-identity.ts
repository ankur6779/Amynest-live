/**
 * Lesson audio identity — single source of truth for paragraph playback.
 * Safety contract: UI text === Cache === Playback (verbatim raw paragraph only).
 */

import { hashCacheKeySync } from "@/lib/amy-voice-pipeline-server-sync";
import type { StaticAudioMode } from "@workspace/static-audio/browser";

export type AudioIdentity = {
  lessonId: string;
  paragraphIdx: number;
  text: string;
  hash: string;
};

const IS_DEV = import.meta.env.DEV;

function canonicalPayload(
  identity: Pick<AudioIdentity, "lessonId" | "paragraphIdx" | "text">,
): string {
  return JSON.stringify({
    lessonId: identity.lessonId,
    paragraphIdx: identity.paragraphIdx,
    text: identity.text.trim(),
  });
}

/** Deterministic hash over { lessonId, paragraphIdx, text } — no truncation. */
export function computeAudioIdentityHash(
  identity: Pick<AudioIdentity, "lessonId" | "paragraphIdx" | "text">,
): string {
  return hashCacheKeySync(canonicalPayload(identity));
}

/** Build canonical identity from raw lesson paragraph text (UI source of truth). */
export function createAudioIdentity(
  lessonId: string,
  paragraphIdx: number,
  rawParagraphText: string,
): AudioIdentity {
  const text = (rawParagraphText ?? "").trim();
  if (!lessonId.trim()) {
    throw new Error("AudioIdentity requires lessonId");
  }
  if (!Number.isFinite(paragraphIdx) || paragraphIdx < 0) {
    throw new Error("AudioIdentity requires non-negative paragraphIdx");
  }
  if (!text) {
    throw new Error("AudioIdentity requires non-empty paragraph text");
  }
  const hash = computeAudioIdentityHash({ lessonId, paragraphIdx, text });
  return { lessonId, paragraphIdx, text, hash };
}

/** Pipeline / learning cache key — MUST NOT use substrings or normalized text. */
export function lessonPipelineCacheKey(
  identity: AudioIdentity,
  mode: StaticAudioMode = "default",
): string {
  return `lesson:${mode}:${identity.lessonId}:${identity.paragraphIdx}:${identity.hash}`;
}

/** IndexedDB warm-cache key scoped to lesson paragraph identity. */
export function lessonLocalCacheKey(
  identity: AudioIdentity,
  mode: StaticAudioMode = "default",
): string {
  return `lesson-audio:${lessonPipelineCacheKey(identity, mode)}`;
}

export function assertVerbatimLessonText(
  inputText: string,
  rawParagraphText: string,
): void {
  const input = (inputText ?? "").trim();
  const raw = (rawParagraphText ?? "").trim();
  if (input === raw) return;

  const msg = "Non-verbatim text used for audio identity";
  if (IS_DEV) {
    console.warn(`[LessonAudioIdentity] ${msg}`, {
      inputPreview: input.slice(0, 120),
      rawPreview: raw.slice(0, 120),
    });
    throw new Error(msg);
  }
  console.warn(`[LessonAudioIdentity] ${msg}`);
}

export function assertPlaybackMatchesUi(
  uiIdentity: AudioIdentity,
  playbackIdentity: AudioIdentity,
): void {
  if (uiIdentity.text !== playbackIdentity.text) {
    const err = new Error("Audio/UI text mismatch detected");
    if (IS_DEV) throw err;
    console.error("[LessonAudioIdentity]", err.message, { uiIdentity, playbackIdentity });
    return;
  }
  if (uiIdentity.lessonId !== playbackIdentity.lessonId) {
    const err = new Error("Audio/UI lessonId mismatch detected");
    if (IS_DEV) throw err;
    console.error("[LessonAudioIdentity]", err.message, { uiIdentity, playbackIdentity });
    return;
  }
  if (uiIdentity.paragraphIdx !== playbackIdentity.paragraphIdx) {
    const err = new Error("Audio/UI paragraphIdx mismatch detected");
    if (IS_DEV) throw err;
    console.error("[LessonAudioIdentity]", err.message, { uiIdentity, playbackIdentity });
  }
}

export function assertLessonSpeakConsistency(
  uiIdentity: AudioIdentity,
  speakText: string,
  speakOpts?: { lessonId?: string; lessonParagraphIndex?: number; audioIdentity?: AudioIdentity },
): void {
  assertVerbatimLessonText(speakText, uiIdentity.text);
  if (speakOpts?.audioIdentity) {
    assertPlaybackMatchesUi(uiIdentity, speakOpts.audioIdentity);
  }
  if (speakOpts?.lessonId != null && speakOpts.lessonId !== uiIdentity.lessonId) {
    const err = new Error("Lesson speak lessonId mismatch");
    if (IS_DEV) throw err;
    console.error("[LessonAudioIdentity]", err.message);
  }
  if (
    speakOpts?.lessonParagraphIndex != null &&
    speakOpts.lessonParagraphIndex !== uiIdentity.paragraphIdx
  ) {
    const err = new Error("Lesson speak paragraphIdx mismatch");
    if (IS_DEV) throw err;
    console.error("[LessonAudioIdentity]", err.message);
  }
}

export function assertPrefetchCacheKey(
  prefetchKey: string,
  playbackKey: string,
): void {
  if (prefetchKey === playbackKey) return;
  const err = new Error("Prefetch key mismatch");
  if (IS_DEV) throw err;
  console.error("[LessonAudioIdentity]", err.message, { prefetchKey, playbackKey });
}

export function resolveLessonPlaybackCacheKey(
  identity: AudioIdentity,
  mode: StaticAudioMode = "default",
): string {
  return lessonPipelineCacheKey(identity, mode);
}

export function logLessonAudioIdentity(
  identity: AudioIdentity,
  extra?: Record<string, unknown>,
): void {
  const line = {
    evt: "tts.playback",
    event: "audio_identity",
    lessonId: identity.lessonId,
    paragraphIdx: identity.paragraphIdx,
    hash: identity.hash,
    textLength: identity.text.length,
    ...extra,
  };
  if (IS_DEV) console.info("[TTS]", line);
}
