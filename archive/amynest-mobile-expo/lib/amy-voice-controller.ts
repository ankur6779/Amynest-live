import { resolveMediaUrl } from "@/constants/api";
import { getPhonicsAudioText } from "@workspace/phonics-sounds";
import { buildTtsCacheKeyPayload } from "@workspace/phonics-sounds/tts-cache-key";
import { createRunLatest } from "@workspace/phonics-sounds/run-latest";
import * as Crypto from "expo-crypto";
import type { AuthFetchFn } from "@/lib/poll-result";
import { readResolvedApiJson } from "@/lib/poll-result";
import {
  deleteLocalTts,
  getLocalTtsUri,
  saveLocalTtsFromUrl,
} from "@/lib/local-tts-cache";
import { flashTtsToast } from "@/lib/tts-toast";
import {
  logTts,
  type TtsAudioSource,
  type TtsDeviceInfo,
} from "@/lib/amy-voice-telemetry";
import {
  abortSignalWithTimeout,
  delay,
} from "@/lib/fetch-with-timeout";
import {
  adaptiveTimeoutMs,
  getNetworkLabel,
} from "@/lib/network-adaptive-timeout";
import { Platform } from "react-native";

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
  /** Resolves true when native player reports audible playback started. */
  waitUntilPlaying?: (timeoutMs: number) => Promise<boolean>;
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

export type PlaybackState = "idle" | "loading" | "playing";

const SYNTH_TIMEOUT_FAST_MS = 8_000;
const SYNTH_TIMEOUT_SLOW_MS = 20_000;
const DOWNLOAD_TIMEOUT_FAST_MS = 10_000;
const DOWNLOAD_TIMEOUT_SLOW_MS = 20_000;
const PLAYBACK_WATCHDOG_MS = 4_000;
const RETRY_DELAY_MS = 300;

const DEFAULT_VOICE_ID = "nova";
const DEFAULT_MODEL_ID = "tts-1";

const speakRunner = createRunLatest();

/** Monotonic request version — stale async work bails when id !== current. */
let currentRequestId = 0;
/** Double-play guard — only the latest token may call play(). */
let activePlayToken: symbol | null = null;
let abortController: AbortController | null = null;
let playbackState: PlaybackState = "idle";

export function getAmyVoiceGlobalReqId(): number {
  return currentRequestId;
}

export function getAmyVoicePlaybackState(): PlaybackState {
  return playbackState;
}

function setPlaybackState(next: PlaybackState): void {
  playbackState = next;
}

function deviceInfo(): TtsDeviceInfo {
  return Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "other";
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

async function computeExpectedCacheKey(
  text: string,
  voiceId: string,
  modelId: string,
  mode: AmyVoiceMode,
): Promise<string> {
  const payload = buildTtsCacheKeyPayload(text, voiceId, modelId, mode);
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload);
}

/** Cancel in-flight network + invalidate play token (preemptive stop on tap). */
export function stopAllAmyVoice(player: AmyVoicePlayer | null): void {
  currentRequestId += 1;
  activePlayToken = null;
  setPlaybackState("idle");
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

async function resolveStaticFallbackUrlAsync(
  text: string,
  mode: AmyVoiceMode,
): Promise<string> {
  const staticMode = mode === "phonics" ? "phonics" : "default";
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.MD5,
    `${staticMode}\0${text}`,
  );
  return resolveMediaUrl(`/api/static-audio/${hash}.mp3`);
}

/** Latest-wins — superseded queued speaks reject immediately. */
function withSpeakMutex<T>(fn: () => Promise<T>): Promise<T> {
  return speakRunner.runLatest(async () => {
    if (playbackState === "playing") {
      /* Force stop before loading next utterance. */
    }
    setPlaybackState("loading");
    try {
      return await fn();
    } catch (err) {
      if ((err as { code?: string })?.code !== "tts_superseded") {
        setPlaybackState("idle");
      }
      throw err;
    }
  });
}

async function synthesizeOnce(
  authFetch: AuthFetchFn,
  text: string,
  opts: AmyVoiceSpeakOptions,
  parentSignal?: AbortSignal,
): Promise<SynthesizeResponse> {
  const timeoutMs = adaptiveTimeoutMs(SYNTH_TIMEOUT_FAST_MS, SYNTH_TIMEOUT_SLOW_MS);
  const { signal, clear } = abortSignalWithTimeout(timeoutMs, parentSignal);
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

async function guardedPlay(
  player: AmyVoicePlayer,
  requestId: number,
  playToken: symbol,
): Promise<void> {
  if (!isRequestCurrent(requestId) || !isPlayTokenActive(playToken)) {
    throw new Error("tts_stale_play");
  }

  const playStartedAt = Date.now();
  player.play();

  const started = await player.waitUntilPlaying?.(PLAYBACK_WATCHDOG_MS);
  const playStartDelayMs = Date.now() - playStartedAt;

  if (started === false) {
    logTts({
      module: "amy-voice-controller",
      source: "unknown",
      latencyMs: playStartDelayMs,
      success: false,
      errorType: "playback_stuck",
      requestId,
      playStartDelayMs,
      device: deviceInfo(),
      network: getNetworkLabel(),
    });
    stopAllAmyVoice(player);
    throw new Error("playback_stuck");
  }

  setPlaybackState("playing");
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

  await guardedPlay(player, requestId, playToken);
}

async function tryStaticFallbackPlay(
  player: AmyVoicePlayer,
  text: string,
  mode: AmyVoiceMode,
  requestId: number,
  playToken: symbol,
  playbackRate: number,
): Promise<boolean> {
  if (mode !== "phonics" && mode !== "default") return false;
  try {
    const uri = await resolveStaticFallbackUrlAsync(text, mode);
    await playResolvedUri(player, uri, requestId, playToken, playbackRate);
    return true;
  } catch {
    setPlaybackState("idle");
    return false;
  }
}

async function amyVoiceSpeakInternal(
  authFetch: AuthFetchFn,
  player: AmyVoicePlayer,
  rawText: string,
  opts: AmyVoiceSpeakOptions = {},
): Promise<SpeakResult> {
  const startedAt = Date.now();
  const queueWaitMs = speakRunner.getPendingQueueWaitMs();
  const text = normalizeAmyVoiceText(rawText, opts.mode);
  const moduleName = opts.module ?? "unknown";
  const mode = opts.mode ?? "default";
  const voiceId = opts.voiceId?.trim() || DEFAULT_VOICE_ID;
  const modelId = opts.modelId?.trim() || DEFAULT_MODEL_ID;

  if (!text) {
    logTts({
      module: moduleName,
      source: "unknown",
      latencyMs: 0,
      success: false,
      errorType: "tts_empty_text",
      device: deviceInfo(),
      network: getNetworkLabel(),
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
    extra?: { playStartDelayMs?: number },
  ) => {
    logTts({
      module: moduleName,
      cacheKey,
      source,
      latencyMs: Date.now() - startedAt,
      success,
      errorType,
      requestId,
      queueWaitMs,
      device: deviceInfo(),
      network: getNetworkLabel(),
      ...extra,
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

    if (cacheKey) {
      const expected = await computeExpectedCacheKey(text, voiceId, modelId, mode);
      if (expected !== cacheKey) {
        await deleteLocalTts(cacheKey);
        finishLog(false, "unknown", cacheKey, "cache_key_mismatch");
        return { ok: false, error: "cache_key_mismatch" };
      }
    }

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
      if (msg === "tts_stale_play" || msg === "tts_cancelled") {
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
      const staticOk = await tryStaticFallbackPlay(
        player,
        text,
        mode,
        requestId,
        playToken,
        opts.playbackRate ?? 1,
      );
      if (staticOk) {
        finishLog(true, "static", undefined);
        return { ok: true };
      }
      flashTtsToast("Could not play audio. Tap again.");
      setPlaybackState("idle");
    }

    if (!result.ok) {
      setPlaybackState("idle");
    }

    return result;
  } catch (err) {
    if ((err as { code?: string })?.code === "tts_superseded") {
      return { ok: false, error: "tts_cancelled" };
    }
    const msg = err instanceof Error ? err.message : "tts_failed";
    finishLog(false, "unknown", undefined, msg);
    setPlaybackState("idle");
    if (isRequestCurrent(requestId)) {
      flashTtsToast("Could not play audio. Tap again.");
    }
    return { ok: false, error: msg };
  } finally {
    if (abortController === outerController) abortController = null;
  }
}

/**
 * Global Amy voice — latest-wins mutex, request versioning, play token, timeout, one retry.
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
      device: deviceInfo(),
      network: getNetworkLabel(),
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
      queueWaitMs: speakRunner.getPendingQueueWaitMs(),
      device: deviceInfo(),
      network: getNetworkLabel(),
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
      device: deviceInfo(),
      network: getNetworkLabel(),
    });
    setPlaybackState("idle");
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
  return speakRunner.isRunning() || playbackState === "playing";
}
