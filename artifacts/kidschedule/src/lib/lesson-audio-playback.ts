/**
 * Amy Audio Lessons — static GCS playback (same path as spelling / catalog).
 * Bypasses the full Amy voice pipeline so lesson paragraphs never fall through
 * to instant emergency-tone or premature onFinished callbacks.
 *
 * Mobile WebViews cannot reliably stream cross-origin MP3s (Range/206 decode
 * bugs) AND cannot call audio.play() after an await (gesture token lost).
 * Solution: warm a blob URL before Play, then play that blob synchronously.
 */

import { resolveApiMediaUrl } from "@/lib/api";
import { amyVoiceController, type SpeakResult } from "@/lib/amy-voice-controller";
import type { AudioIdentity } from "@/lib/lesson-audio-identity";
import { isMobileStaticAudioDevice } from "@/lib/static-audio-edge";
import {
  lookupStaticAudioUrlStrict,
  prepareRemotePlaybackAudio,
  isStaticAudioMapReady,
  ensureStaticAudioMapLoaded,
  getLoadedStaticAudioCatalog,
} from "@/lib/static-audio";
import { buildStaticAudioLookupMissReport } from "@/lib/static-audio-lookup-diag";
import {
  logAudioPipeline,
  setAudioPipelineContext,
  setAudioPipelineMachineState,
} from "@/lib/debug-audio-pipeline";

export type PlayLessonParagraphOptions = {
  playbackRate?: number;
  isCancelled?: () => boolean;
};

const readyBlobByHash = new Map<string, string>();
const warmInFlight = new Map<string, Promise<string | null>>();

function lessonWarmKey(identity: AudioIdentity): string {
  return identity.hash;
}

function startWarm(identity: AudioIdentity): Promise<string | null> {
  const key = lessonWarmKey(identity);
  const existingReady = readyBlobByHash.get(key);
  if (existingReady) return Promise.resolve(existingReady);

  const existing = warmInFlight.get(key);
  if (existing) return existing;

  const proxyUrl = lookupStaticAudioUrlStrict(identity.text, "default");
  if (!proxyUrl) return Promise.resolve(null);

  const abs = resolveApiMediaUrl(proxyUrl);
  const promise = prepareRemotePlaybackAudio(abs)
    .then((el) => {
      const src = el?.src?.trim() || null;
      if (src) readyBlobByHash.set(key, src);
      return src;
    })
    .catch((err) => {
      console.warn("[LessonPlayback] warm failed", {
        lessonId: identity.lessonId,
        paragraphIdx: identity.paragraphIdx,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    })
    .finally(() => {
      warmInFlight.delete(key);
    });

  warmInFlight.set(key, promise);
  return promise;
}

/** Prefetch paragraph MP3 into a blob: URL so Play can start without awaiting fetch. */
export function warmLessonParagraphStatic(identity: AudioIdentity): void {
  void ensureStaticAudioMapLoaded()
    .catch(() => {})
    .finally(() => startWarm(identity));
}

/**
 * Await blob warm (call from lesson-card click while the user gesture is still
 * alive). Returns the blob URL or null on timeout/failure.
 */
export async function ensureLessonParagraphWarmed(
  identity: AudioIdentity,
  timeoutMs = 4_000,
): Promise<string | null> {
  const key = lessonWarmKey(identity);
  if (readyBlobByHash.has(key)) return readyBlobByHash.get(key) ?? null;

  const warmPromise = startWarm(identity);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      warmPromise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function resolvePlayUrl(identity: AudioIdentity, proxyUrl: string): string {
  const warmed = readyBlobByHash.get(lessonWarmKey(identity));
  if (warmed) return warmed;
  return resolveApiMediaUrl(proxyUrl);
}

/** Play one lesson paragraph from the pre-generated static catalog (GCS via /api/static-audio). */
export async function playLessonParagraphStatic(
  identity: AudioIdentity,
  opts: PlayLessonParagraphOptions = {},
): Promise<SpeakResult> {
  await ensureStaticAudioMapLoaded().catch((err) => {
    console.error("[LessonPlayback] static-audio map load failed", err);
  });

  const proxyUrl = lookupStaticAudioUrlStrict(identity.text, "default");
  setAudioPipelineMachineState("static_lookup", {
    mapReady: isStaticAudioMapReady(),
    paragraphIdx: identity.paragraphIdx,
  });
  if (!proxyUrl) {
    const missReport = buildStaticAudioLookupMissReport(
      identity.text,
      getLoadedStaticAudioCatalog("default"),
      { mapReady: isStaticAudioMapReady(), lessonIdentityHash: identity.hash },
    );
    logAudioPipeline("static_url_miss", {
      paragraphIdx: identity.paragraphIdx,
      lessonId: identity.lessonId,
      detail: {
        mapReady: missReport.mapReady,
        lessonIdentityHash: identity.hash,
        normalizedKey: missReport.normalizedKey,
        closestCatalogKeys: missReport.closestCatalogKeys,
        note: "lessonIdentityHash ≠ static MP3 hash (4df9e01b… is catalog file hash)",
      },
    });
    console.warn("[LessonPlayback] static URL miss", {
      lessonId: identity.lessonId,
      paragraphIdx: identity.paragraphIdx,
      lessonIdentityHash: identity.hash,
      mapReady: missReport.mapReady,
      normalizedKey: missReport.normalizedKey,
      lookupVariants: missReport.lookupVariants,
      closestCatalogKeys: missReport.closestCatalogKeys,
      canonicalText: missReport.canonicalText,
      codepoints: missReport.codepoints,
    });
    return { success: false, error: "static_failed", layer: "static" };
  }

  // Prefer already-warmed blob (mobile-safe). Never await fetch here — that drops
  // the user-gesture token and causes NotAllowedError / play_failed on WebViews.
  const playUrl = resolvePlayUrl(identity, proxyUrl);
  const warmed = playUrl.startsWith("blob:");
  if (!warmed) {
    warmLessonParagraphStatic(identity);
  }

  setAudioPipelineContext({
    audioUrl: warmed ? `blob:warmed(${identity.hash})` : playUrl,
    paragraphIdx: identity.paragraphIdx,
    lessonId: identity.lessonId,
  });
  setAudioPipelineMachineState("static_play", { warmed, proxyUrl });
  logAudioPipeline("static_play_start", {
    paragraphIdx: identity.paragraphIdx,
    lessonId: identity.lessonId,
    audioUrl: warmed ? "blob:warmed" : playUrl,
    detail: { mobile: isMobileStaticAudioDevice(), warmed },
  });

  const result = await amyVoiceController.playPreparedUrl(playUrl, {
    source: "lesson",
    phrase: identity.text,
    srcType: "static",
    playbackRate: opts.playbackRate ?? 1,
    isCancelled: opts.isCancelled,
    waitUntilEnd: true,
    preferDirectStream: true,
  });

  if (!result.success) {
    logAudioPipeline("static_play_failed", {
      paragraphIdx: identity.paragraphIdx,
      lessonId: identity.lessonId,
      detail: { error: result.error },
    });
    console.warn("[LessonPlayback] static play failed", {
      lessonId: identity.lessonId,
      paragraphIdx: identity.paragraphIdx,
      url: playUrl.startsWith("blob:") ? "blob:warmed" : playUrl,
      error: result.error,
    });
  } else {
    logAudioPipeline("static_play_ended", {
      paragraphIdx: identity.paragraphIdx,
      lessonId: identity.lessonId,
    });
    setAudioPipelineMachineState("wait_until_end", { success: true });
  }

  return result;
}

/** @internal test helper */
export function __resetLessonAudioWarmCacheForTests(): void {
  readyBlobByHash.clear();
  warmInFlight.clear();
}
