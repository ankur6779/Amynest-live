import type { AuthFetchFn } from "@/lib/poll-result";
import { readResolvedApiJson } from "@/lib/poll-result";
import { resolveMediaUrl } from "@/constants/api";
import { getPhonicsAudioText } from "@workspace/phonics-sounds";
import {
  deleteLocalTts,
  getLocalTtsUri,
  saveLocalTtsFromUrl,
} from "@/lib/local-tts-cache";
import { flashTtsToast } from "@/lib/tts-toast";
import { logTts, type TtsAudioSource } from "@/lib/amy-voice-telemetry";
import {
  abortSignalWithTimeout,
  delay,
} from "@/lib/fetch-with-timeout";

export type AmyVoiceMode = "default" | "phonics";

export type AmyVoiceSpeakOptions = {
  mode?: AmyVoiceMode;
  voiceId?: string;
  modelId?: string;
  playbackRate?: number;
  module?: string;
  onFinished?: () => void;
};

export type AmyVoicePlayer = {
  replace: (source: { uri: string }) => void;
  play: () => void;
  pause: () => void;
  setPlaybackRate?: (rate: number) => void;
};

type SynthesizeResponse = {
  ok?: boolean;
  success?: boolean;
  cacheKey?: string;
  audioUrl?: string;
  cached?: boolean;
  error?: string;
};

type SpeakResult = { ok: true } | { ok: false; error: string };

const SYNTH_TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 300;

/** Monotonic request version — stale async work bails when id !== current. */
let currentRequestId = 0;
/** Strict mutex — only one speak pipeline at a time. */
let isBusy = false;
let speakMutexTail: Promise<void> = Promise.resolve();
/** Double-play guard — only the latest token may call play(). */
let activePlayToken: symbol | null = null;
let abortController: AbortController | null = null;

export function getAmyVoiceGlobalReqId(): number {
  return currentRequestId;
}

function isRequestCurrent(requestId: number): boolean {
  return requestId === currentRequestId;
}

function beginPlayToken(): symbol {
  const token = Symbol("amy_voice_play");
  activePlayToken = token;
  return token;
}

function isPlayTokenActive(token: symbol): boolean {
  return activePlayToken === token;
}

/** Cancel in-flight network + invalidate play token (preemptive stop on tap). */
export function stopAllAmyVoice(player: AmyVoicePlayer | null): void {
  currentRequestId += 1;
  activePlayToken = null;
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  if (player) {
    try {
      player.pause();
    } catch {
      /* ignore */
    }
  }
}

/** Normalize raw UI text before TTS / cache lookup. */
export function normalizeAmyVoiceText(rawText: string, mode?: AmyVoiceMode): string {
  const trimmed = (rawText ?? "").trim();
  if (!trimmed) return "";
  return mode === "phonics" ? getPhonicsAudioText(trimmed) : trimmed;
}

/** Serialize speak/playUrl — no parallel pipelines. */
function withSpeakMutex<T>(fn: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    if (isBusy) {
      /* Preempt: latest tap wins — prior pipeline will see stale requestId. */
    }
    isBusy = true;
    try {
      return await fn();
    } finally {
      isBusy = false;
    }
  };
  const next = speakMutexTail.then(run, run);
  speakMutexTail = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function synthesizeOnce(
  authFetch: AuthFetchFn,
  text: string,
  opts: AmyVoiceSpeakOptions,
  parentSignal?: AbortSignal,
): Promise<SynthesizeResponse> {
  const { signal, clear } = abortSignalWithTimeout(SYNTH_TIMEOUT_MS, parentSignal);
  try {
    const res = await authFetch("/api/tts/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voiceId: opts.voiceId,
        modelId: opts.modelId,
        mode: opts.mode,
      }),
      signal,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `synthesize_failed_${res.status}`);
    }
    return readResolvedApiJson<SynthesizeResponse>(res, authFetch);
  } finally {
    clear();
  }
}

async function resolvePlaybackUri(
  cacheKey: string,
  audioUrl: string,
  requestId: number,
): Promise<{ uri: string; source: TtsAudioSource } | null> {
  if (!isRequestCurrent(requestId)) return null;

  let source: TtsAudioSource = "remote";

  if (cacheKey) {
    const local = await getLocalTtsUri(cacheKey);
    if (!isRequestCurrent(requestId)) return null;
    if (local) return { uri: local, source: "local" };
  }

  if (cacheKey) {
    const saved = await saveLocalTtsFromUrl(cacheKey, audioUrl);
    if (!isRequestCurrent(requestId)) return null;
    if (saved) return { uri: saved, source: "gcs" };
    await deleteLocalTts(cacheKey);
  }

  return { uri: resolveMediaUrl(audioUrl), source: "remote" };
}

async function playResolvedUri(
  player: AmyVoicePlayer,
  uri: string,
  requestId: number,
  playToken: symbol,
  playbackRate: number,
): Promise<void> {
  if (!isRequestCurrent(requestId) || !isPlayTokenActive(playToken)) {
    throw new Error("tts_stale_play");
  }

  player.replace({ uri });

  if (!isRequestCurrent(requestId) || !isPlayTokenActive(playToken)) {
    throw new Error("tts_stale_play");
  }

  if (playbackRate !== 1) {
    try {
      player.setPlaybackRate?.(playbackRate);
    } catch {
      /* ignore */
    }
  }

  if (!isRequestCurrent(requestId) || !isPlayTokenActive(playToken)) {
    throw new Error("tts_stale_play");
  }

  player.play();
}

async function amyVoiceSpeakInternal(
  authFetch: AuthFetchFn,
  player: AmyVoicePlayer,
  rawText: string,
  opts: AmyVoiceSpeakOptions = {},
): Promise<SpeakResult> {
  const startedAt = Date.now();
  const text = normalizeAmyVoiceText(rawText, opts.mode);
  const moduleName = opts.module ?? "unknown";

  if (!text) {
    logTts({
      module: moduleName,
      source: "unknown",
      latencyMs: 0,
      success: false,
      errorType: "tts_empty_text",
    });
    return { ok: false, error: "tts_empty_text" };
  }

  stopAllAmyVoice(player);
  const requestId = currentRequestId;
  const playToken = beginPlayToken();

  const outerController = new AbortController();
  abortController = outerController;

  const finishLog = (
    success: boolean,
    source: TtsAudioSource,
    cacheKey?: string,
    errorType?: string,
  ) => {
    logTts({
      module: moduleName,
      cacheKey,
      source,
      latencyMs: Date.now() - startedAt,
      success,
      errorType,
      requestId,
    });
  };

  const attempt = async (isRetry: boolean): Promise<SpeakResult> => {
    if (!isRequestCurrent(requestId)) {
      return { ok: false, error: "tts_cancelled" };
    }

    let data: SynthesizeResponse;
    try {
      data = await synthesizeOnce(authFetch, text, opts, outerController.signal);
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") {
        return { ok: false, error: "tts_cancelled" };
      }
      const msg = err instanceof Error ? err.message : "synthesize_failed";
      finishLog(false, "unknown", undefined, msg);
      return { ok: false, error: msg };
    }

    if (!isRequestCurrent(requestId)) {
      return { ok: false, error: "tts_cancelled" };
    }

    if (
      data?.success === false ||
      !data?.audioUrl?.trim() ||
      data.audioUrl.includes("undefined")
    ) {
      const err = data?.error ?? "tts_no_audio_url";
      finishLog(false, "unknown", data?.cacheKey, err);
      return { ok: false, error: err };
    }

    const cacheKey = data.cacheKey ?? "";
    const audioUrl = data.audioUrl.trim();
    const resolved = await resolvePlaybackUri(cacheKey, audioUrl, requestId);

    if (!isRequestCurrent(requestId)) {
      return { ok: false, error: "tts_cancelled" };
    }

    if (!resolved) {
      finishLog(false, "remote", cacheKey, "tts_resolve_uri_failed");
      return { ok: false, error: "tts_resolve_uri_failed" };
    }

    try {
      await playResolvedUri(
        player,
        resolved.uri,
        requestId,
        playToken,
        opts.playbackRate ?? 1,
      );
      finishLog(true, resolved.source, cacheKey || undefined);
      return { ok: true };
    } catch (playErr) {
      const msg = playErr instanceof Error ? playErr.message : "playback_failed";
      if (msg === "tts_stale_play") {
        return { ok: false, error: "tts_cancelled" };
      }
      finishLog(false, resolved.source, cacheKey, msg);
      return { ok: false, error: msg };
    }
  };

  try {
    let result = await attempt(false);

    if (
      !result.ok &&
      result.error !== "tts_cancelled" &&
      isRequestCurrent(requestId)
    ) {
      flashTtsToast("Audio failed, retrying…");
      await delay(RETRY_DELAY_MS);
      if (!isRequestCurrent(requestId)) {
        return { ok: false, error: "tts_cancelled" };
      }
      result = await attempt(true);
    }

    if (
      !result.ok &&
      result.error !== "tts_cancelled" &&
      isRequestCurrent(requestId)
    ) {
      flashTtsToast("Could not play audio. Tap again.");
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "tts_failed";
    finishLog(false, "unknown", undefined, msg);
    if (isRequestCurrent(requestId)) {
      flashTtsToast("Could not play audio. Tap again.");
    }
    return { ok: false, error: msg };
  } finally {
    if (abortController === outerController) abortController = null;
  }
}

/**
 * Global Amy voice — mutex, request versioning, play token, timeout, one retry.
 */
export function amyVoiceSpeak(
  authFetch: AuthFetchFn,
  player: AmyVoicePlayer,
  rawText: string,
  opts: AmyVoiceSpeakOptions = {},
): Promise<SpeakResult> {
  return withSpeakMutex(() => amyVoiceSpeakInternal(authFetch, player, rawText, opts));
}

async function amyVoicePlayUrlInternal(
  player: AmyVoicePlayer,
  audioUrl: string,
  opts: { module?: string; playbackRate?: number } = {},
): Promise<SpeakResult> {
  const startedAt = Date.now();
  const moduleName = opts.module ?? "unknown";
  const trimmed = (audioUrl ?? "").trim();

  if (!trimmed || trimmed.includes("undefined")) {
    logTts({
      module: moduleName,
      source: "remote",
      latencyMs: 0,
      success: false,
      errorType: "tts_invalid_url",
    });
    return { ok: false, error: "tts_invalid_url" };
  }

  stopAllAmyVoice(player);
  const requestId = currentRequestId;
  const playToken = beginPlayToken();

  try {
    const uri = resolveMediaUrl(trimmed);
    await playResolvedUri(player, uri, requestId, playToken, opts.playbackRate ?? 1);
    logTts({
      module: moduleName,
      source: "remote",
      latencyMs: Date.now() - startedAt,
      success: true,
      requestId,
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "playback_failed";
    if (msg === "tts_stale_play") {
      return { ok: false, error: "tts_cancelled" };
    }
    logTts({
      module: moduleName,
      source: "remote",
      latencyMs: Date.now() - startedAt,
      success: false,
      errorType: msg,
      requestId,
    });
    if (isRequestCurrent(requestId)) {
      flashTtsToast("Could not play audio. Tap again.");
    }
    return { ok: false, error: msg };
  }
}

/** Pre-generated session URL on the global stream (spelling). */
export function amyVoicePlayUrl(
  player: AmyVoicePlayer,
  audioUrl: string,
  opts: { module?: string; playbackRate?: number } = {},
): Promise<SpeakResult> {
  return withSpeakMutex(() => amyVoicePlayUrlInternal(player, audioUrl, opts));
}

export function isAmyVoicePlayingGlobal(): boolean {
  return isBusy;
}
