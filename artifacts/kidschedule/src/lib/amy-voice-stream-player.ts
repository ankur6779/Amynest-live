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

export const STREAM_MIN_START_BYTES = 2048;
export const STREAM_PREFETCH_BYTES = 8192;
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

const partialChunkCache = new Map<string, Blob>();
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

export function storePartialPrefetch(cacheKey: string, blob: Blob): void {
  if (blob.size >= STREAM_MIN_START_BYTES) {
    partialChunkCache.set(cacheKey, blob);
  }
}

export function takePartialPrefetch(cacheKey: string): Blob | null {
  const blob = partialChunkCache.get(cacheKey);
  if (blob) partialChunkCache.delete(cacheKey);
  return blob ?? null;
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
    const onOpen = () => {
      try {
        const sb = mediaSource.addSourceBuffer("audio/mpeg");
        const queue: Uint8Array[] = [];
        let appending = false;
        let playbackStarted = false;
        let streamDone = false;

        const pump = () => {
          if (appending || queue.length === 0) return;
          appending = true;
          const chunk = queue.shift()!;
          sb.appendBuffer(new Uint8Array(chunk));
        };

        sb.addEventListener("updateend", () => {
          appending = false;
          if (
            !playbackStarted &&
            sb.buffered.length > 0 &&
            sb.buffered.end(0) > 0.05
          ) {
            playbackStarted = true;
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
            } catch {
              /* already ended */
            }
          }
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
            reject(err);
          }
        })();
      } catch (err) {
        reject(err);
      }
    };
    mediaSource.addEventListener("sourceopen", onOpen, { once: true });
  });

  return { audio, objectUrl, monitor };
}

async function playViaPrefixBlob(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  ctx: ProgressiveCtx,
  signal?: AbortSignal,
): Promise<{
  audio: HTMLAudioElement;
  objectUrl: string;
  monitor: ReturnType<typeof attachBufferMonitor>;
  activeReader: ReadableStreamDefaultReader<Uint8Array>;
  prefixChunks: Uint8Array[];
}> {
  const prefixChunks: Uint8Array[] = [];
  let total = 0;
  while (total < STREAM_MIN_START_BYTES) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { done, value } = await reader.read();
    if (done) break;
    if (value?.length) {
      markFirstByte(ctx);
      prefixChunks.push(value);
      total += value.length;
      ctx.totalBytes += value.length;
    }
  }
  if (total < 256) throw new Error("stream_too_short");

  const initialBlob = new Blob(prefixChunks as BlobPart[], { type: "audio/mpeg" });
  const objectUrl = URL.createObjectURL(initialBlob);
  const audio = audioManager.create(objectUrl);
  configureMobileAudioElement(audio);
  const monitor = attachBufferMonitor(audio);

  const played = await audioManager.play(
    audio,
    { source: "tts_stream", proxyUrl: objectUrl, srcType: "tts" },
    { channel: "speech", interrupt: true, maxRetries: 1 },
  );
  if (played && ctx.userPlaybackStartMs == null) {
    ctx.userPlaybackStartMs = Date.now() - ctx.startedAt;
  }

  return { audio, objectUrl, monitor, activeReader: reader, prefixChunks };
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
        true,
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
    const res = await authFetch(
      "/api/tts/stream",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify(body),
        signal: opts?.signal,
      },
      getTtsRequestTimeoutMs(),
    );

    if (!res.ok || !res.body) {
      return { ok: false, error: `stream_failed_${res.status}` };
    }

    const cacheKey = res.headers.get("X-TTS-Cache-Key") ?? undefined;
    const reader = res.body.getReader();

    if (supportsMediaSourceMpeg()) {
      const { audio, objectUrl, monitor } = await playViaMediaSource(reader, ctx, opts?.signal);
      const heardMs = await waitForAudibleStart(audio);
      if (heardMs != null && ctx.userPlaybackStartMs == null) {
        ctx.userPlaybackStartMs = heardMs;
      }
      const metrics = buildMetrics(ctx, monitor, true);
      const userTiming = buildUserTtsTiming(startedAt, {
        route: "tts/stream",
        feature: opts?.feature,
        ...metrics,
        cacheKey,
      });
      recordUserTtsTiming(userTiming);
      void authFetch;
      return { ok: true, audio, objectUrl, cacheKey, metrics, userTiming };
    }

    const { audio, objectUrl, monitor, activeReader, prefixChunks } = await playViaPrefixBlob(
      reader,
      ctx,
      opts?.signal,
    );

    void (async () => {
      try {
        const chunks = [...prefixChunks];
        while (true) {
          const { done, value } = await activeReader.read();
          if (done) {
            ctx.downloadCompleteMs = Date.now() - ctx.startedAt;
            break;
          }
          if (value?.length) {
            chunks.push(value);
            ctx.totalBytes += value.length;
          }
        }
        if (cacheKey) {
          storePartialPrefetch(cacheKey, new Blob(chunks as BlobPart[], { type: "audio/mpeg" }));
        }
      } catch {
        /* partial playback continues */
      }
    })();

    const heardMs = await waitForAudibleStart(audio);
    if (heardMs != null && ctx.userPlaybackStartMs == null) {
      ctx.userPlaybackStartMs = heardMs;
    }
    const metrics = buildMetrics(ctx, monitor, true);
    const userTiming = buildUserTtsTiming(startedAt, {
      route: "tts/stream",
      feature: opts?.feature,
      ...metrics,
      cacheKey,
    });
    recordUserTtsTiming(userTiming);
    return { ok: true, audio, objectUrl, cacheKey, metrics, userTiming };
  } catch (err) {
    const errName = (err as { name?: string })?.name;
    if (errName === "AbortError") return { ok: false, error: "tts_cancelled" };
    return { ok: false, error: err instanceof Error ? err.message : "stream_error" };
  }
}

/** Drain /api/tts/stream and return a blob object URL (legacy URL-based callers). */
export async function streamTtsToObjectUrl(
  authFetch: AuthFetchFn,
  body: Record<string, unknown>,
  init?: { signal?: AbortSignal; feature?: string },
): Promise<{ ok: true; url: string; cacheKey?: string; cached?: boolean } | { ok: false; error: string }> {
  const play = await playStreamingTts(authFetch, body, {
    signal: init?.signal,
    playbackMode: "partial-ok",
    feature: init?.feature,
  });
  if (!play.ok) return { ok: false, error: play.error };
  return { ok: true, url: play.objectUrl, cacheKey: play.cacheKey };
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
