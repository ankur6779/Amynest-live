/**
 * Amy Audio Lessons — static GCS playback (same path as spelling / catalog).
 * Bypasses the full Amy voice pipeline so lesson paragraphs never fall through
 * to instant emergency-tone or premature onFinished callbacks.
 *
 * Mobile WebViews cannot decode HTTPS /api/static-audio MP3s: HTMLAudioElement
 * always sends Range, and Cloudflare CDN answers with a cached 200 (no
 * Content-Range). Never attach that HTTPS URL to audio.src.
 *
 * Play path: warm a blob: URL (full GET, no Range). If the blob is not ready
 * at pointerdown, keep the gesture on a silent data: WAV, then retarget that
 * same element onto the blob after fetch.
 */

import { resolveApiMediaUrl } from "@/lib/api";
import { amyVoiceController, type SpeakResult } from "@/lib/amy-voice-controller";
import { audioManager } from "@/lib/audio-manager";
import type { AudioIdentity } from "@/lib/lesson-audio-identity";
import { isMobileStaticAudioDevice } from "@/lib/static-audio-edge";
import {
  lookupStaticAudioUrlStrict,
  fetchStaticAudioObjectUrl,
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

/** Sentinel stored when Play primed a keep-alive element instead of a blob. */
export const LESSON_PLAY_KEEPALIVE = "__lesson_keepalive__";

const BLOB_WARM_TIMEOUT_MS = 8_000;

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

function isLessonBlobUrl(url: string | null | undefined): url is string {
  return Boolean(url && url.startsWith("blob:"));
}

function rememberBlob(key: string, src: string): void {
  const prev = readyBlobByHash.get(key);
  if (prev && prev !== src && prev.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(prev);
    } catch {
      /* ignore */
    }
  }
  readyBlobByHash.set(key, src);
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
  const promise = fetchStaticAudioObjectUrl(abs)
    .then((src) => {
      if (isLessonBlobUrl(src)) {
        rememberBlob(key, src);
        return src;
      }
      return null;
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
  timeoutMs = BLOB_WARM_TIMEOUT_MS,
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

/**
 * Synchronous gesture entry — must run inside pointerdown/click with no await.
 * Never primes an HTTPS static-audio URL (Range + cached 200 is inaudible).
 */
export function primeLessonParagraphInUserGesture(identity: AudioIdentity): string | null {
  audioManager.unlockFromUserGesture();

  if (!isStaticAudioMapReady()) {
    void ensureStaticAudioMapLoaded()
      .catch(() => {})
      .finally(() => startWarm(identity));
    primedUrlByHash.set(lessonWarmKey(identity), LESSON_PLAY_KEEPALIVE);
    audioManager.primeLessonKeepAliveInUserGesture();
    return LESSON_PLAY_KEEPALIVE;
  }

  const proxyUrl = lookupStaticAudioUrlStrict(identity.text, "default");
  if (!proxyUrl) return null;

  const warmed = readyBlobByHash.get(lessonWarmKey(identity));
  if (isLessonBlobUrl(warmed)) {
    audioManager.adoptLessonKeepAliveForBlob(warmed);
    primedUrlByHash.set(lessonWarmKey(identity), warmed);
    audioManager.primeSpeechUrlInUserGesture(warmed, { keepPlaying: true, volume: 1 });
    return warmed;
  }

  primedUrlByHash.set(lessonWarmKey(identity), LESSON_PLAY_KEEPALIVE);
  audioManager.primeLessonKeepAliveInUserGesture();
  void startWarm(identity);
  return LESSON_PLAY_KEEPALIVE;
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

  // Never play HTTPS static-audio through HTMLAudioElement. Wait for the blob.
  const primedUrl = primedUrlByHash.get(lessonWarmKey(identity));
  if (primedUrl) primedUrlByHash.delete(lessonWarmKey(identity));

  let playUrl = isLessonBlobUrl(primedUrl)
    ? primedUrl
    : readyBlobByHash.get(lessonWarmKey(identity)) ?? null;
  if (!isLessonBlobUrl(playUrl)) {
    playUrl = await ensureLessonParagraphWarmed(identity, BLOB_WARM_TIMEOUT_MS);
  }
  if (!isLessonBlobUrl(playUrl)) {
    logAudioPipeline("static_blob_unavailable", {
      paragraphIdx: identity.paragraphIdx,
      lessonId: identity.lessonId,
      detail: { primedUrl: primedUrl ?? null },
    });
    return { success: false, error: "static_blob_unavailable", layer: "static" };
  }

  if (opts.isCancelled?.()) {
    return { success: false, error: "cancelled", layer: "static" };
  }

  if (primedUrl === LESSON_PLAY_KEEPALIVE) {
    audioManager.adoptLessonKeepAliveForBlob(playUrl);
  }

  setAudioPipelineContext({
    audioUrl: `blob:warmed(${identity.hash})`,
    paragraphIdx: identity.paragraphIdx,
    lessonId: identity.lessonId,
  });
  setAudioPipelineMachineState("static_play", { warmed: true, proxyUrl });
  logAudioPipeline("static_play_start", {
    paragraphIdx: identity.paragraphIdx,
    lessonId: identity.lessonId,
    audioUrl: "blob:warmed",
    detail: { mobile: isMobileStaticAudioDevice(), warmed: true },
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
  for (const url of readyBlobByHash.values()) {
    if (url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    }
  }
  readyBlobByHash.clear();
  warmInFlight.clear();
  primedUrlByHash.clear();
}
