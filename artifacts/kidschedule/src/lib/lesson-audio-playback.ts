/**
 * Amy Audio Lessons — static GCS playback (same path as spelling / catalog).
 * Bypasses the full Amy voice pipeline so lesson paragraphs never fall through
 * to instant emergency-tone or premature onFinished callbacks.
 *
 * Mobile WebViews cannot reliably stream cross-origin MP3s (Range/206 decode
 * bugs) AND cannot call audio.play() after an await (gesture token lost).
 * Solution: warm a blob URL before Play, and on pointerdown start playback on
 * a keepPlaying gesture-primed element so play() after await reuses that element.
 */

import { resolveApiMediaUrl } from "@/lib/api";
import { amyVoiceController, type SpeakResult } from "@/lib/amy-voice-controller";
import { audioManager } from "@/lib/audio-manager";
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
/** URL that pointerdown primed — must match playPreparedUrl lookup key. */
const primedUrlByHash = new Map<string, string>();

// Eager-load the catalog as soon as this module is imported (audio-lessons route)
// so Play never awaits a 400KB+ chunk inside the user-gesture stack.
void ensureStaticAudioMapLoaded().catch(() => {});

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

/**
 * Synchronous gesture entry — must run inside pointerdown/click with no await.
 * Starts HTMLAudioElement.play() on the lesson URL while the user activation
 * is still valid (Android WebView requirement).
 */
export function primeLessonParagraphInUserGesture(identity: AudioIdentity): string | null {
  if (!isStaticAudioMapReady()) {
    void ensureStaticAudioMapLoaded().catch(() => {});
    return null;
  }
  const proxyUrl = lookupStaticAudioUrlStrict(identity.text, "default");
  if (!proxyUrl) return null;
  // Stick to one concrete URL for the whole gesture→play handoff. Switching to a
  // blob URL after warm completes would miss takeGesturePrimedElement(httpsUrl).
  const playUrl = resolveApiMediaUrl(proxyUrl);
  primedUrlByHash.set(lessonWarmKey(identity), playUrl);
  audioManager.unlockFromUserGesture();
  audioManager.primeSpeechUrlInUserGesture(playUrl, { keepPlaying: true, volume: 1 });
  return playUrl;
}

/** Play one lesson paragraph from the pre-generated static catalog (GCS via /api/static-audio). */
export async function playLessonParagraphStatic(
  identity: AudioIdentity,
  opts: PlayLessonParagraphOptions = {},
): Promise<SpeakResult> {
  await ensureStaticAudioMapLoaded().catch((err) => {
    console.error("[LessonPlayback] static-audio map load failed", err);
  });

  if (!isStaticAudioMapReady()) {
    logAudioPipeline("static_map_not_ready", {
      paragraphIdx: identity.paragraphIdx,
      lessonId: identity.lessonId,
    });
    console.warn("[LessonPlayback] static map not ready — not a catalog miss", {
      lessonId: identity.lessonId,
      paragraphIdx: identity.paragraphIdx,
    });
    return { success: false, error: "map_not_ready", layer: "static" };
  }

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

  // Prefer the URL that pointerdown already primed (same HTMLAudioElement).
  // Only fall back to warmed blob when no gesture prime exists for this paragraph.
  const primedUrl = primedUrlByHash.get(lessonWarmKey(identity));
  if (primedUrl) primedUrlByHash.delete(lessonWarmKey(identity));
  const playUrl = primedUrl ?? resolvePlayUrl(identity, proxyUrl);
  const warmed = playUrl.startsWith("blob:");
  if (!warmed && !primedUrl) {
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
  primedUrlByHash.clear();
}
