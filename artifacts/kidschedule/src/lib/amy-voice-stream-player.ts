import {
  canUseStreaming,
  assertStreamingAllowed,
  type PlaybackMode,
} from "@/lib/amy-voice-playback-contract";
import { audioManager } from "@/lib/audio-manager";
import { configureMobileAudioElement } from "@/lib/tts-guard";
import type { AuthFetchFn } from "@/lib/poll-result";
import { getTtsRequestTimeoutMs } from "@/lib/tts-guard";
import { isCapacitorIosShell } from "@/lib/device-lite";
import {
  buildUserTtsTiming,
  recordUserTtsTiming,
  type UserTtsTimingSample,
} from "@/lib/tts-user-perceived-metrics";
import { getAdminAudioOps, isAdminMseStreamingDisabled } from "@/lib/admin-audio-ops";

export const STREAM_MIN_START_BYTES = 1536;
export const STREAM_PREFETCH_BYTES = 6144;
export const TTFA_TARGET_MS = 300;

export type StreamPlayMetrics = {
  ttfaMs: number;
  bufferingEvents: number;
  streamingUsed: boolean;
  bytesReceived: number;
  firstNetworkByteMs: number;
  firstPlayableByteMs: number;
  downloadCompleteMs: number;
  userPlaybackStartMs: number;
  userFirstAudioHeardMs: number;
  playbackStartedBeforeDownloadComplete: boolean;
};

export type StreamPlayResult =
  | {
      ok: true;
      audio: HTMLAudioElement;
      metrics: StreamPlayMetrics;
      cacheKey?: string;
      objectUrl: string;
      userTiming: UserTtsTimingSample;
    }
  | { ok: false; error: string; metrics?: Partial<StreamPlayMetrics> };

type PrefetchEntry = { blob: Blob; complete: boolean };
const partialChunkCache = new Map<string, PrefetchEntry>();
const streamPenalties = new Map<string, number>();

export function supportsStreamingPlayback(): boolean {
  if (typeof window === "undefined") return false;
  if (isCapacitorIosShell()) return true;
  return typeof ReadableStream !== "undefined";
}

export function supportsMediaSourceMpeg(): boolean {
  if (typeof MediaSource === "undefined") return false;
  try {
    return MediaSource.isTypeSupported("audio/mpeg");
  } catch {
    return false;
  }
}

/** Phase-2 MSE opt-in — default OFF (Phase-1 blob playback) for outage safety. */
export function isMseStreamingEnabled(): boolean {
  if (!supportsMediaSourceMpeg()) return false;
  if (isAdminMseStreamingDisabled()) return false;
  if (getAdminAudioOps().mseStreamingEnabled) return true;
  const envFlag = import.meta.env.VITE_ENABLE_MSE_STREAMING;
  if (envFlag === "false" || envFlag === "0") return false;
  if (envFlag === "true" || envFlag === "1") return true;
  return false;
}

type MseTransition =
  | "mse_skipped"
  | "sourceopen"
  | "sourcebuffer_created"
  | "append_ok"
  | "updateend"
  | "playback_start"
  | "end_of_stream"
  | "mse_failed"
  | "mse_silent"
  | "blob_fallback";

function logMseTransition(step: MseTransition, detail?: Record<string, unknown>): void {
  if (import.meta.env.DEV || (typeof window !== "undefined" && localStorage.getItem("MSE_STREAM_DIAG") === "1")) {
    console.info("[TTS/MSE]", step, detail ?? "");
  }
}

export function isStreamingLayerPenalized(cacheKey: string): boolean {
  const until = streamPenalties.get(cacheKey);
  if (!until) return false;
  if (Date.now() > until) {
    streamPenalties.delete(cacheKey);
    return false;
  }
  return true;
}

export function penalizeStreamingLayer(cacheKey: string, ms = 30_000): void {
  streamPenalties.set(cacheKey, Date.now() + ms);
}

/** Network warm chunk — must not be played (truncates mid-phrase). */
export function storePartialPrefetch(cacheKey: string, blob: Blob): void {
  if (blob.size >= STREAM_MIN_START_BYTES) {
    partialChunkCache.set(cacheKey, { blob, complete: false });
  }
}

/** Full MP3 after drain — safe for instant replay on repeat taps. */
export function storeCompletePrefetch(cacheKey: string, blob: Blob): void {
  if (blob.size >= STREAM_MIN_START_BYTES) {
    partialChunkCache.set(cacheKey, { blob, complete: true });
  }
}

/** Only returns fully-drained prefetches — partial warm chunks are ignored. */
export function takePartialPrefetch(cacheKey: string): Blob | null {
  const entry = partialChunkCache.get(cacheKey);
  if (!entry?.complete) return null;
  partialChunkCache.delete(cacheKey);
  return entry.blob;
}

function attachBufferMonitor(audio: HTMLAudioElement): { getCount: () => number } {
  let bufferingEvents = 0;
  const onWaiting = () => {
    bufferingEvents += 1;
  };
  audio.addEventListener("waiting", onWaiting);
  return { getCount: () => bufferingEvents };
}

function waitForAudibleStart(audio: HTMLAudioElement, timeoutMs = 8_000): Promise<number | null> {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const done = (ms: number | null) => {
      cleanup();
      resolve(ms);
    };
    const onPlaying = () => done(Math.round(performance.now() - startedAt));
    const onTimeUpdate = () => {
      if (audio.currentTime > 0.01 && !audio.paused) {
        done(Math.round(performance.now() - startedAt));
      }
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("timeupdate", onTimeUpdate);
    };
    audio.addEventListener("playing", onPlaying, { once: true });
    audio.addEventListener("timeupdate", onTimeUpdate);
  });
}

type ProgressiveCtx = {
  startedAt: number;
  firstNetworkByteMs: number | null;
  firstPlayableByteMs: number | null;
  downloadCompleteMs: number | null;
  userPlaybackStartMs: number | null;
  totalBytes: number;
};

function markFirstByte(ctx: ProgressiveCtx): void {
  if (ctx.firstNetworkByteMs == null) {
    ctx.firstNetworkByteMs = Date.now() - ctx.startedAt;
    ctx.firstPlayableByteMs = ctx.firstNetworkByteMs;
  }
}

async function playViaMediaSource(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  ctx: ProgressiveCtx,
  signal?: AbortSignal,
): Promise<{ audio: HTMLAudioElement; objectUrl: string; monitor: ReturnType<typeof attachBufferMonitor> }> {
  const mediaSource = new MediaSource();
  const objectUrl = URL.createObjectURL(mediaSource);
  const audio = audioManager.create(objectUrl);
  configureMobileAudioElement(audio);
  const monitor = attachBufferMonitor(audio);

  await new Promise<void>((resolve, reject) => {
    const sourceOpenTimer = setTimeout(() => {
      logMseTransition("mse_failed", { reason: "sourceopen_timeout" });
      reject(new Error("mse_sourceopen_timeout"));
    }, 12_000);

    const onOpen = () => {
      clearTimeout(sourceOpenTimer);
      logMseTransition("sourceopen", { readyState: mediaSource.readyState });
      try {
        const sb = mediaSource.addSourceBuffer("audio/mpeg");
        logMseTransition("sourcebuffer_created");
        const queue: Uint8Array[] = [];
        let appending = false;
        let playbackStarted = false;
        let streamDone = false;

        const pump = () => {
          if (appending || queue.length === 0) return;
          appending = true;
          const chunk = queue.shift()!;
          try {
            sb.appendBuffer(new Uint8Array(chunk));
            logMseTransition("append_ok", { bytes: chunk.byteLength });
          } catch (err) {
            logMseTransition("mse_failed", {
              reason: "appendBuffer",
              error: err instanceof Error ? err.message : String(err),
            });
            reject(err);
          }
        };

        sb.addEventListener("updateend", () => {
          logMseTransition("updateend", {
            buffered: sb.buffered.length > 0 ? sb.buffered.end(0) : 0,
          });
          appending = false;
          if (
            !playbackStarted &&
            sb.buffered.length > 0 &&
            sb.buffered.end(0) > 0.05
          ) {
            playbackStarted = true;
            logMseTransition("playback_start");
            void audioManager
              .play(
                audio,
                { source: "tts_stream_mse", proxyUrl: objectUrl, srcType: "tts" },
                { channel: "speech", interrupt: true, maxRetries: 1 },
              )
              .then((played) => {
                if (played && ctx.userPlaybackStartMs == null) {
                  ctx.userPlaybackStartMs = Date.now() - ctx.startedAt;
                }
              });
          }
          pump();
          if (streamDone && queue.length === 0 && !appending && mediaSource.readyState === "open") {
            try {
              mediaSource.endOfStream();
              logMseTransition("end_of_stream");
            } catch {
              /* already ended */
            }
          }
        });

        sb.addEventListener("error", () => {
          logMseTransition("mse_failed", { reason: "sourcebuffer_error" });
          reject(new Error("mse_sourcebuffer_error"));
        });

        void (async () => {
          try {
            while (true) {
              if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
              const { done, value } = await reader.read();
              if (done) {
                ctx.downloadCompleteMs = Date.now() - ctx.startedAt;
                streamDone = true;
                pump();
                resolve();
                break;
              }
              if (value?.length) {
                markFirstByte(ctx);
                ctx.totalBytes += value.length;
                queue.push(value);
                pump();
              }
            }
          } catch (err) {
            logMseTransition("mse_failed", {
              reason: "reader",
              error: err instanceof Error ? err.message : String(err),
            });
            reject(err);
          }
        })();
      } catch (err) {
        logMseTransition("mse_failed", {
          reason: "sourceopen_handler",
          error: err instanceof Error ? err.message : String(err),
        });
        reject(err);
      }
    };
    mediaSource.addEventListener("sourceopen", onOpen, { once: true });
    mediaSource.addEventListener("error", () => {
      clearTimeout(sourceOpenTimer);
      logMseTransition("mse_failed", { reason: "mediasource_error" });
      reject(new Error("mse_mediasource_error"));
    }, { once: true });
  });

  return { audio, objectUrl, monitor };
}

async function playViaFullBlob(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  ctx: ProgressiveCtx,
  signal?: AbortSignal,
  earlyPlayback = false,
): Promise<{
  audio: HTMLAudioElement;
  objectUrl: string;
  monitor: ReturnType<typeof attachBufferMonitor>;
  blob: Blob;
}> {
  logMseTransition("blob_fallback", { path: earlyPlayback ? "progressive_blob" : "full_blob" });
  const chunks: Uint8Array[] = [];
  let total = 0;
  let audio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;
  let monitor: ReturnType<typeof attachBufferMonitor> = { getCount: () => 0 };
  let playbackStarted = false;

  while (true) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { done, value } = await reader.read();
    if (done) {
      ctx.downloadCompleteMs = Date.now() - ctx.startedAt;
      break;
    }
    if (value?.length) {
      markFirstByte(ctx);
      chunks.push(value);
      total += value.length;
      ctx.totalBytes += value.length;

      if (
        earlyPlayback &&
        !playbackStarted &&
        total >= STREAM_MIN_START_BYTES
      ) {
        const partial = new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
        objectUrl = URL.createObjectURL(partial);
        audio = audioManager.create(objectUrl);
        configureMobileAudioElement(audio);
        monitor = attachBufferMonitor(audio);
        void audioManager
          .play(
            audio,
            { source: "tts_stream_blob_early", proxyUrl: objectUrl, srcType: "tts" },
            { channel: "speech", interrupt: true, maxRetries: 1 },
          )
          .then((played) => {
            if (played && ctx.userPlaybackStartMs == null) {
              ctx.userPlaybackStartMs = Date.now() - ctx.startedAt;
            }
          });
        playbackStarted = true;
      }
    }
  }

  const blob = new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
  if (total < 256) throw new Error("stream_too_short");

  if (playbackStarted && audio && objectUrl) {
    const fullUrl = URL.createObjectURL(blob);
    audio.src = fullUrl;
    URL.revokeObjectURL(objectUrl);
    objectUrl = fullUrl;
    return { audio, objectUrl, monitor, blob };
  }

  objectUrl = URL.createObjectURL(blob);
  audio = audioManager.create(objectUrl);
  configureMobileAudioElement(audio);
  monitor = attachBufferMonitor(audio);
  const played = await audioManager.play(
    audio,
    { source: "tts_stream_blob", proxyUrl: objectUrl, srcType: "tts" },
    { channel: "speech", interrupt: true, maxRetries: 1 },
  );
  if (played && ctx.userPlaybackStartMs == null) {
    ctx.userPlaybackStartMs = Date.now() - ctx.startedAt;
  }
  return { audio, objectUrl, monitor, blob };
}

async function drainReaderToBlob(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  ctx: ProgressiveCtx,
  signal?: AbortSignal,
): Promise<Blob> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { done, value } = await reader.read();
    if (done) {
      ctx.downloadCompleteMs = Date.now() - ctx.startedAt;
      break;
    }
    if (value?.length) {
      markFirstByte(ctx);
      chunks.push(value);
      total += value.length;
      ctx.totalBytes += value.length;
    }
  }
  if (total < 256) throw new Error("stream_too_short");
  return new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
}

type StreamFetchResult = {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  cacheKey?: string;
};

async function fetchTtsStream(
  authFetch: AuthFetchFn,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<StreamFetchResult> {
  const res = await authFetch(
    "/api/tts/stream",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify(body),
      signal,
    },
    getTtsRequestTimeoutMs(),
  );
  if (!res.ok || !res.body) {
    throw new Error(`stream_failed_${res.status}`);
  }
  return {
    reader: res.body.getReader(),
    cacheKey: res.headers.get("X-TTS-Cache-Key") ?? undefined,
  };
}

async function finalizeStreamPlayback(
  audio: HTMLAudioElement,
  objectUrl: string,
  monitor: ReturnType<typeof attachBufferMonitor>,
  ctx: ProgressiveCtx,
  startedAt: number,
  cacheKey: string | undefined,
  streamingUsed: boolean,
  feature?: string,
): Promise<StreamPlayResult> {
  const heardMs = await waitForAudibleStart(audio);
  if (heardMs != null && ctx.userPlaybackStartMs == null) {
    ctx.userPlaybackStartMs = heardMs;
  }
  const metrics = buildMetrics(ctx, monitor, streamingUsed);
  const userTiming = buildUserTtsTiming(startedAt, {
    route: "tts/stream",
    feature,
    ...metrics,
    cacheKey,
  });
  recordUserTtsTiming(userTiming);
  return { ok: true, audio, objectUrl, cacheKey, metrics, userTiming };
}

function buildMetrics(ctx: ProgressiveCtx, monitor: ReturnType<typeof attachBufferMonitor>, streamingUsed: boolean): StreamPlayMetrics {
  const userPlaybackStartMs = ctx.userPlaybackStartMs ?? ctx.firstPlayableByteMs ?? ctx.firstNetworkByteMs ?? 0;
  const downloadCompleteMs = ctx.downloadCompleteMs ?? userPlaybackStartMs;
  return {
    ttfaMs: userPlaybackStartMs,
    bufferingEvents: monitor.getCount(),
    streamingUsed,
    bytesReceived: ctx.totalBytes,
    firstNetworkByteMs: ctx.firstNetworkByteMs ?? userPlaybackStartMs,
    firstPlayableByteMs: ctx.firstPlayableByteMs ?? userPlaybackStartMs,
    downloadCompleteMs,
    userPlaybackStartMs,
    userFirstAudioHeardMs: userPlaybackStartMs,
    playbackStartedBeforeDownloadComplete:
      ctx.userPlaybackStartMs != null &&
      ctx.downloadCompleteMs != null &&
      ctx.userPlaybackStartMs < ctx.downloadCompleteMs,
  };
}

/**
 * Stream POST /api/tts/stream — progressive playback while download continues.
 */
export async function playStreamingTts(
  authFetch: AuthFetchFn,
  body: Record<string, unknown>,
  opts?: {
    signal?: AbortSignal;
    cacheKeyHint?: string;
    prefetchOnly?: boolean;
    playbackMode?: PlaybackMode;
    feature?: string;
    /** Talk with Amy — try MSE / progressive blob for lower TTFA. */
    earlyPlayback?: boolean;
  },
): Promise<StreamPlayResult> {
  const startedAt = Date.now();
  const playbackMode = opts?.playbackMode ?? "partial-ok";

  if (!canUseStreaming(playbackMode)) {
    assertStreamingAllowed(playbackMode, true);
    return { ok: false, error: "streaming_blocked_full_required" };
  }

  if (!supportsStreamingPlayback()) {
    return { ok: false, error: "streaming_unsupported" };
  }

  const prefetched = opts?.cacheKeyHint ? takePartialPrefetch(opts.cacheKeyHint) : null;
  if (prefetched && !opts?.prefetchOnly) {
    const objectUrl = URL.createObjectURL(prefetched);
    const audio = audioManager.create(objectUrl);
    configureMobileAudioElement(audio);
    const monitor = attachBufferMonitor(audio);
    const played = await audioManager.play(
      audio,
      { source: "tts_stream_prefetch", proxyUrl: objectUrl, srcType: "tts" },
      { channel: "speech", interrupt: true, maxRetries: 1 },
    );
    if (played) {
      const userPlaybackStartMs = Date.now() - startedAt;
      const metrics = buildMetrics(
        {
          startedAt,
          firstNetworkByteMs: 0,
          firstPlayableByteMs: 0,
          downloadCompleteMs: userPlaybackStartMs,
          userPlaybackStartMs,
          totalBytes: prefetched.size,
        },
        monitor,
        false,
      );
      const userTiming = buildUserTtsTiming(startedAt, {
        route: "tts/stream",
        feature: opts?.feature,
        ...metrics,
        cacheKey: opts?.cacheKeyHint,
      });
      recordUserTtsTiming(userTiming);
      return { ok: true, audio, objectUrl, cacheKey: opts?.cacheKeyHint, metrics, userTiming };
    }
    URL.revokeObjectURL(objectUrl);
  }

  if (opts?.prefetchOnly) {
    return { ok: false, error: "prefetch_only" };
  }

  const ctx: ProgressiveCtx = {
    startedAt,
    firstNetworkByteMs: null,
    firstPlayableByteMs: null,
    downloadCompleteMs: null,
    userPlaybackStartMs: null,
    totalBytes: 0,
  };

  try {
    let { reader, cacheKey } = await fetchTtsStream(authFetch, body, opts?.signal);

    if (isMseStreamingEnabled() || opts?.earlyPlayback) {
      try {
        const { audio, objectUrl, monitor } = await playViaMediaSource(reader, ctx, opts?.signal);
        const heardMs = await waitForAudibleStart(audio);
        if (heardMs != null) {
          return finalizeStreamPlayback(
            audio,
            objectUrl,
            monitor,
            ctx,
            startedAt,
            cacheKey,
            true,
            opts?.feature,
          );
        }
        logMseTransition("mse_silent", { heardMs });
        audio.pause();
        URL.revokeObjectURL(objectUrl);
      } catch (mseErr) {
        const mseMsg = mseErr instanceof Error ? mseErr.message : String(mseErr);
        logMseTransition("mse_failed", { error: mseMsg });
        if (opts?.cacheKeyHint) penalizeStreamingLayer(opts.cacheKeyHint);
      }
      ({ reader, cacheKey } = await fetchTtsStream(authFetch, body, opts?.signal));
    } else {
      logMseTransition("mse_skipped", { reason: "phase1_full_blob" });
    }

    const { audio, objectUrl, monitor, blob } = await playViaFullBlob(
      reader,
      ctx,
      opts?.signal,
      opts?.earlyPlayback === true,
    );
    if (cacheKey) {
      storeCompletePrefetch(cacheKey, blob);
    }
    return finalizeStreamPlayback(
      audio,
      objectUrl,
      monitor,
      ctx,
      startedAt,
      cacheKey,
      false,
      opts?.feature,
    );
  } catch (err) {
    const errName = (err as { name?: string })?.name;
    if (errName === "AbortError") return { ok: false, error: "tts_cancelled" };
    return { ok: false, error: err instanceof Error ? err.message : "stream_error" };
  }
}

/** Drain /api/tts/stream and return a blob object URL (Phase-1 — no MSE playback). */
export async function streamTtsToObjectUrl(
  authFetch: AuthFetchFn,
  body: Record<string, unknown>,
  init?: { signal?: AbortSignal; feature?: string },
): Promise<{ ok: true; url: string; cacheKey?: string; cached?: boolean } | { ok: false; error: string }> {
  const startedAt = Date.now();
  const ctx: ProgressiveCtx = {
    startedAt,
    firstNetworkByteMs: null,
    firstPlayableByteMs: null,
    downloadCompleteMs: null,
    userPlaybackStartMs: null,
    totalBytes: 0,
  };
  try {
    const { reader, cacheKey } = await fetchTtsStream(authFetch, body, init?.signal);
    const blob = await drainReaderToBlob(reader, ctx, init?.signal);
    const objectUrl = URL.createObjectURL(blob);
    void init?.feature;
    return { ok: true, url: objectUrl, cacheKey, cached: false };
  } catch (err) {
    const errName = (err as { name?: string })?.name;
    if (errName === "AbortError") return { ok: false, error: "tts_cancelled" };
    return { ok: false, error: err instanceof Error ? err.message : "stream_error" };
  }
}

export function prefetchStreamingChunk(
  authFetch: AuthFetchFn,
  body: Record<string, unknown>,
  cacheKeyHint: string,
  playbackMode: PlaybackMode = "partial-ok",
): void {
  if (!canUseStreaming(playbackMode)) return;
  void (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      const res = await authFetch(
        "/api/tts/stream",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
          body: JSON.stringify({ ...body, prefetch: true }),
          signal: controller.signal,
        },
        8_000,
      ).finally(() => clearTimeout(timer));

      if (!res.ok || !res.body) return;
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (total < STREAM_PREFETCH_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value?.length) {
          chunks.push(value);
          total += value.length;
        }
      }
      controller.abort();
      if (total >= STREAM_MIN_START_BYTES) {
        storePartialPrefetch(cacheKeyHint, new Blob(chunks as BlobPart[], { type: "audio/mpeg" }));
      }
    } catch {
      /* best-effort prefetch */
    }
  })();
}

export function resolveAdaptiveTtsSpeed(networkSlow: boolean): number {
  return networkSlow ? 1.05 : 0.92;
}
