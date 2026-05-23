/**
 * Streaming-first TTS playback — start on first chunk, fallback to full download.
 */

import { audioManager } from "@/lib/audio-manager";
import { configureMobileAudioElement } from "@/lib/tts-guard";
import type { AuthFetchFn } from "@/lib/poll-result";
import { getTtsRequestTimeoutMs } from "@/lib/tts-guard";
import { isCapacitorIosShell } from "@/lib/device-lite";

export const STREAM_MIN_START_BYTES = 4096;
export const STREAM_PREFETCH_BYTES = 8192;
export const TTFA_TARGET_MS = 300;

export type StreamPlayMetrics = {
  ttfaMs: number;
  bufferingEvents: number;
  streamingUsed: boolean;
  bytesReceived: number;
};

export type StreamPlayResult =
  | {
      ok: true;
      audio: HTMLAudioElement;
      metrics: StreamPlayMetrics;
      cacheKey?: string;
      objectUrl: string;
    }
  | { ok: false; error: string; metrics?: Partial<StreamPlayMetrics> };

const partialChunkCache = new Map<string, Blob>();
const streamPenalties = new Map<string, number>();

export function supportsStreamingPlayback(): boolean {
  if (typeof window === "undefined") return false;
  if (isCapacitorIosShell()) return true;
  return typeof ReadableStream !== "undefined";
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

async function readStreamPrefix(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  minBytes: number,
  signal?: AbortSignal,
): Promise<{ chunks: Uint8Array[]; total: number; reader: ReadableStreamDefaultReader<Uint8Array> }> {
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (total < minBytes) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { done, value } = await reader.read();
    if (done) break;
    if (value?.length) {
      chunks.push(value);
      total += value.length;
    }
  }

  return { chunks, total, reader };
}

async function drainReader(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  chunks: Uint8Array[],
  signal?: AbortSignal,
): Promise<Blob> {
  while (true) {
    if (signal?.aborted) break;
    const { done, value } = await reader.read();
    if (done) break;
    if (value?.length) chunks.push(value);
  }
  return new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
}

function attachBufferMonitor(audio: HTMLAudioElement): { getCount: () => number } {
  let bufferingEvents = 0;
  const onWaiting = () => {
    bufferingEvents += 1;
  };
  audio.addEventListener("waiting", onWaiting);
  return {
    getCount: () => bufferingEvents,
  };
}

/**
 * Stream POST /api/tts/stream — play as soon as prefix bytes arrive.
 */
export async function playStreamingTts(
  authFetch: AuthFetchFn,
  body: Record<string, unknown>,
  opts?: { signal?: AbortSignal; cacheKeyHint?: string; prefetchOnly?: boolean },
): Promise<StreamPlayResult> {
  const startedAt = Date.now();

  if (!supportsStreamingPlayback()) {
    return { ok: false, error: "streaming_unsupported" };
  }

  const prefetched = opts?.cacheKeyHint
    ? takePartialPrefetch(opts.cacheKeyHint)
    : null;
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
      return {
        ok: true,
        audio,
        objectUrl,
        cacheKey: opts?.cacheKeyHint,
        metrics: {
          ttfaMs: Date.now() - startedAt,
          bufferingEvents: monitor.getCount(),
          streamingUsed: true,
          bytesReceived: prefetched.size,
        },
      };
    }
    URL.revokeObjectURL(objectUrl);
  }

  if (opts?.prefetchOnly) {
    return { ok: false, error: "prefetch_only" };
  }

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
    const { chunks, total, reader: activeReader } = await readStreamPrefix(
      reader,
      STREAM_MIN_START_BYTES,
      opts?.signal,
    );

    if (total < 256) {
      return { ok: false, error: "stream_too_short" };
    }

    const initialBlob = new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
    const objectUrl = URL.createObjectURL(initialBlob);
    const audio = audioManager.create(objectUrl);
    configureMobileAudioElement(audio);
    const monitor = attachBufferMonitor(audio);

    const played = await audioManager.play(
      audio,
      { source: "tts_stream", proxyUrl: objectUrl, srcType: "tts" },
      { channel: "speech", interrupt: true, maxRetries: 1 },
    );

    const ttfaMs = Date.now() - startedAt;

    if (!played) {
      URL.revokeObjectURL(objectUrl);
      return {
        ok: false,
        error: "stream_play_blocked",
        metrics: { ttfaMs, bufferingEvents: 0, streamingUsed: true, bytesReceived: total },
      };
    }

    void (async () => {
      try {
        const fullBlob = await drainReader(activeReader, chunks, opts?.signal);
        if (cacheKey && fullBlob.size > initialBlob.size) {
          storePartialPrefetch(cacheKey, fullBlob);
        }
      } catch {
        /* partial playback continues with buffered audio */
      }
    })();

    return {
      ok: true,
      audio,
      objectUrl,
      cacheKey,
      metrics: {
        ttfaMs,
        bufferingEvents: monitor.getCount(),
        streamingUsed: true,
        bytesReceived: total,
      },
    };
  } catch (err) {
    const errName = (err as { name?: string })?.name;
    if (errName === "AbortError") return { ok: false, error: "tts_cancelled" };
    return { ok: false, error: err instanceof Error ? err.message : "stream_error" };
  }
}

/** Low-priority first-chunk prefetch for next paragraph. */
export function prefetchStreamingChunk(
  authFetch: AuthFetchFn,
  body: Record<string, unknown>,
  cacheKeyHint: string,
): void {
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
      const { chunks, total } = await readStreamPrefix(reader, STREAM_PREFETCH_BYTES);
      if (total >= STREAM_MIN_START_BYTES) {
        storePartialPrefetch(cacheKeyHint, new Blob(chunks as BlobPart[], { type: "audio/mpeg" }));
      }
      controller.abort();
    } catch {
      /* best-effort prefetch */
    }
  })();
}

export function resolveAdaptiveTtsSpeed(networkSlow: boolean): number {
  return networkSlow ? 1.05 : 0.92;
}
