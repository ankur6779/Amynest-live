/**
 * Amy voice fail-safe pipeline — strict multi-layer fallback, never silent.
 *
 * Order: static → local cache → live TTS → phonics sequence → speech-coach split
 *        → emergency local → text/visual UX
 */

import type { AuthFetchFn } from "@/lib/poll-result";
import { audioManager, AUDIO_ERROR } from "@/lib/audio-manager";
import {
  isTtsPlaybackAllowed,
  recordTtsUserGesture,
} from "@/lib/tts-guard";
import {
  generateTts,
  isValidAudioUrl,
  logTtsClient,
  playAudio,
  resolveClientPlaybackUrl,
} from "@/lib/tts-playback";
import {
  lookupStaticAudioUrl,
  prepareStaticPlaybackAudio,
  primeStaticAudioInUserGesture,
  safePlayAudio,
} from "@/lib/static-audio";
import { isAndroidAmyNestAudioClient } from "@/lib/device-lite";
import {
  emitAmyVoiceTextFallback,
} from "@/lib/amy-voice-visual-fallback";
import { resetClientStaticAudioCircuit } from "@/lib/static-audio-telemetry";
import {
  isAmyVoiceOffline,
  recordTtsApiFailure,
  recordTtsApiSuccess,
  shouldSkipLiveTtsApi,
} from "@/lib/amy-voice-circuit";
import {
  getLocalCachedAudioUrl,
  localCacheKeyForPhrase,
  localCacheKeyForTts,
  warmLocalCacheFromUrl,
} from "@/lib/local-tts-cache";
import { playEmergencyPhrase } from "@/lib/emergency-audio";
import {
  getPhonicsAudioText,
  normalizePhonicsLetterKey,
} from "@workspace/phonics-sounds";
import { isStaticTtsText, type StaticAudioMode } from "@workspace/static-audio/browser";
import type { SpeakOptions, SpeakResult } from "@/hooks/use-amy-voice";
import {
  recordAmyVoiceFailureChain,
  recordAmyVoiceFallbackUsed,
  recordAmyVoiceLayerFailed,
  recordAmyVoiceLayerSuccess,
  resetAmyVoiceTelemetry,
  type AmyVoiceLayer,
  type FailureChainEntry,
} from "@/lib/amy-voice-telemetry";

const NEVER_SILENT_MS = 1500;
const PHONICS_GAP_MS = 280;
const WORD_GAP_MS = 380;

export type AmyVoicePipelineContext = {
  authFetch: AuthFetchFn;
  voiceId?: string;
  modelId?: string;
  playbackRate: number;
  isCancelled: () => boolean;
  onFinished?: () => void;
  /** Nested part playback (phonics sequence / word split) — skips heavy layers. */
  depth?: number;
};

type PlayAttemptResult = { ok: true; layer: AmyVoiceLayer } | { ok: false; error: string };

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function splitWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/^[^\w]+|[^\w]+$/g, ""))
    .filter((w) => w.length > 0);
}

function decomposePhonicsLetters(text: string): string[] {
  const trimmed = text.trim();
  const key = normalizePhonicsLetterKey(trimmed);
  if (key) return [getPhonicsAudioText(key)];
  const letters = trimmed.toLowerCase().split("").filter((c) => /[a-z]/.test(c));
  if (letters.length === 0) return [];
  return letters.map((c) => getPhonicsAudioText(c));
}

function staticModesToTry(primary: StaticAudioMode): StaticAudioMode[] {
  const alt: StaticAudioMode = primary === "phonics" ? "default" : "phonics";
  return [primary, alt];
}

async function waitForAudible(audio: HTMLAudioElement, maxMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (audio.ended) return true;
    if (!audio.paused && audio.currentTime > 0.02) return true;
    if (audio.readyState >= 3 && !audio.paused) return true;
    await delay(40);
  }
  return audio.currentTime > 0.02 || audio.ended;
}

async function playElementWithNeverSilentWatchdog(
  audio: HTMLAudioElement,
  ctx: AmyVoicePipelineContext,
  meta: {
    proxyUrl: string;
    phrase: string;
    mode?: StaticAudioMode;
    source: "static" | "tts" | "cache";
    waitUntilEnd: boolean;
  },
): Promise<boolean> {
  audio.playbackRate = ctx.playbackRate;
  const played =
    meta.source === "static"
      ? await safePlayAudio(audio, {
          proxyUrl: meta.proxyUrl,
          phrase: meta.phrase,
          mode: meta.mode,
          quiet: true,
        })
      : await audioManager.play(
          audio,
          {
            proxyUrl: meta.proxyUrl,
            phrase: meta.phrase,
            mode: meta.mode,
            source: meta.source === "cache" ? "static" : "tts",
            channel: "speech",
            interrupt: true,
            srcType: meta.source === "cache" ? "static" : "tts",
          },
          { channel: "speech", interrupt: true, maxRetries: 2 },
        );

  if (!played) return false;

  // Static/cache: AudioManager already ran the playback watchdog — do not re-check at 1.5s
  // (mobile decode often needs >1.5s and falsely failed every module).
  if (meta.source === "static" || meta.source === "cache") {
    if (meta.waitUntilEnd) {
      const end = await audioManager.waitUntilEnd(audio, ctx.isCancelled);
      return end.ok;
    }
    return true;
  }

  const audible = await Promise.race([
    waitForAudible(audio, NEVER_SILENT_MS),
    delay(NEVER_SILENT_MS).then(() => false),
  ]);

  if (!audible) {
    audio.pause();
    return false;
  }

  if (meta.waitUntilEnd) {
    const end = await audioManager.waitUntilEnd(audio, ctx.isCancelled);
    return end.ok;
  }
  return true;
}

async function tryStaticLayer(
  text: string,
  mode: StaticAudioMode,
  ctx: AmyVoicePipelineContext,
  waitUntilEnd: boolean,
): Promise<PlayAttemptResult> {
  for (const tryMode of staticModesToTry(mode)) {
    const proxyUrl = lookupStaticAudioUrl(text, tryMode);
    if (!proxyUrl) {
      if (tryMode === mode) {
        recordAmyVoiceLayerFailed("static", "no_map_url", { text: text.slice(0, 80), mode: tryMode });
      }
      continue;
    }
    const audio = await prepareStaticPlaybackAudio(text, tryMode);
    if (!audio) {
      recordAmyVoiceLayerFailed(
        tryMode === mode ? "static" : "static_alt_mode",
        "prepare_failed",
        { mode: tryMode },
      );
      continue;
    }
    const ok = await playElementWithNeverSilentWatchdog(audio, ctx, {
      proxyUrl,
      phrase: text,
      mode: tryMode,
      source: "static",
      waitUntilEnd,
    });
    if (ctx.isCancelled()) return { ok: false, error: "tts_cancelled" };
    if (ok) {
      void warmLocalCacheFromUrl(localCacheKeyForPhrase(text, tryMode), proxyUrl);
      recordAmyVoiceLayerSuccess("static_success", { mode: tryMode });
      return { ok: true, layer: "static" };
    }
    recordAmyVoiceLayerFailed(
      tryMode === mode ? "static" : "static_alt_mode",
      "play_failed_or_silent",
      { mode: tryMode },
    );
    if (tryMode === mode && isStaticTtsText(text, tryMode === "phonics" ? "default" : "phonics")) {
      recordAmyVoiceFallbackUsed("static", "static");
    }
  }
  return { ok: false, error: "static_failed" };
}

async function tryLocalCacheLayer(
  text: string,
  mode: StaticAudioMode,
  ctx: AmyVoicePipelineContext,
  waitUntilEnd: boolean,
): Promise<PlayAttemptResult> {
  for (const tryMode of staticModesToTry(mode)) {
    const key = localCacheKeyForPhrase(text, tryMode);
    const objectUrl = await getLocalCachedAudioUrl(key);
    if (!objectUrl) continue;
    const audio = playAudio(objectUrl);
    if (!audio) {
      URL.revokeObjectURL(objectUrl);
      continue;
    }
    const ok = await playElementWithNeverSilentWatchdog(audio, ctx, {
      proxyUrl: objectUrl,
      phrase: text,
      mode: tryMode,
      source: "cache",
      waitUntilEnd,
    });
    URL.revokeObjectURL(objectUrl);
    if (ctx.isCancelled()) return { ok: false, error: "tts_cancelled" };
    if (ok) {
      recordAmyVoiceLayerSuccess("cache_success", { mode: tryMode });
      return { ok: true, layer: "cache" };
    }
  }
  recordAmyVoiceLayerFailed("cache", "cache_miss");
  return { ok: false, error: "cache_miss" };
}

async function tryLiveTtsLayer(
  text: string,
  opts: SpeakOptions | undefined,
  ctx: AmyVoicePipelineContext,
  waitUntilEnd: boolean,
): Promise<PlayAttemptResult> {
  if (shouldSkipLiveTtsApi()) {
    recordAmyVoiceLayerFailed("api", isAmyVoiceOffline() ? "offline" : "api_circuit_open");
    return { ok: false, error: "api_skipped" };
  }

  logTtsClient("Pipeline API attempt", { chars: text.length, mode: opts?.mode });
  const data = await generateTts(
    ctx.authFetch,
    {
      text,
      voiceId: ctx.voiceId,
      modelId: ctx.modelId,
      mode: opts?.mode,
      phoneme: opts?.phoneme,
      word: opts?.word,
    },
    {},
  );

  if (ctx.isCancelled()) return { ok: false, error: "tts_cancelled" };

  if (!data?.success || !isValidAudioUrl(data.audioUrl)) {
    recordTtsApiFailure();
    recordAmyVoiceLayerFailed("api", data?.error ?? "tts_failed");
    return { ok: false, error: data?.error ?? "tts_failed" };
  }

  recordTtsApiSuccess();
  const playbackUrl = resolveClientPlaybackUrl(data.audioUrl, data.cacheKey);
  if (!playbackUrl) {
    recordAmyVoiceLayerFailed("api", "invalid_playback_url");
    return { ok: false, error: "tts_invalid_audio_url" };
  }

  if (data.cacheKey) {
    void warmLocalCacheFromUrl(localCacheKeyForTts(data.cacheKey), playbackUrl);
  }
  void warmLocalCacheFromUrl(
    localCacheKeyForPhrase(text, opts?.mode === "phonics" ? "phonics" : "default"),
    playbackUrl,
  );

  const audio = playAudio(playbackUrl);
  if (!audio) {
    recordAmyVoiceLayerFailed("api", "audio_element_failed");
    return { ok: false, error: "tts_invalid_audio_url" };
  }

  const ok = await playElementWithNeverSilentWatchdog(audio, ctx, {
    proxyUrl: playbackUrl,
    phrase: text,
    mode: opts?.mode === "phonics" ? "phonics" : "default",
    source: "tts",
    waitUntilEnd,
  });

  if (ctx.isCancelled()) return { ok: false, error: "tts_cancelled" };
  if (ok) {
    recordAmyVoiceLayerSuccess("api_success", { cacheKey: data.cacheKey });
    return { ok: true, layer: "api" };
  }
  recordAmyVoiceLayerFailed("api", "play_failed_or_silent");
  return { ok: false, error: "api_play_failed" };
}

async function tryPhonicsSequenceLayer(
  text: string,
  mode: StaticAudioMode,
  ctx: AmyVoicePipelineContext,
): Promise<PlayAttemptResult> {
  const parts = decomposePhonicsLetters(text);
  if (parts.length === 0 || (parts.length === 1 && parts[0] === text)) {
    recordAmyVoiceLayerFailed("phonics_sequence", "not_decomposable");
    return { ok: false, error: "phonics_sequence_skip" };
  }

  recordAmyVoiceFallbackUsed("api", "phonics_sequence");
  const subCtx: AmyVoicePipelineContext = { ...ctx, depth: (ctx.depth ?? 0) + 1 };
  for (let i = 0; i < parts.length; i++) {
    if (ctx.isCancelled()) return { ok: false, error: "tts_cancelled" };
    const part = parts[i]!;
    const sub = await speakAmyVoice(part, { mode: "phonics", waitUntilEnd: true }, subCtx);
    if (!sub.success) {
      const emergency = await playEmergencyPhrase(part);
      if (!emergency) {
        recordAmyVoiceLayerFailed("phonics_sequence", `part_failed:${part}`);
        return { ok: false, error: "phonics_sequence_failed" };
      }
    }
    if (i < parts.length - 1) await delay(PHONICS_GAP_MS);
  }
  recordAmyVoiceLayerSuccess("phonics_sequence_success", { parts: parts.length });
  ctx.onFinished?.();
  return { ok: true, layer: "phonics_sequence" };
}

async function trySpeechCoachSplitLayer(
  text: string,
  mode: StaticAudioMode,
  ctx: AmyVoicePipelineContext,
): Promise<PlayAttemptResult> {
  const words = splitWords(text);
  if (words.length <= 1) {
    recordAmyVoiceLayerFailed("speech_coach_split", "single_word");
    return { ok: false, error: "speech_coach_split_skip" };
  }

  recordAmyVoiceFallbackUsed("phonics_sequence", "speech_coach_split");
  const subCtx: AmyVoicePipelineContext = { ...ctx, depth: (ctx.depth ?? 0) + 1 };
  for (let i = 0; i < words.length; i++) {
    if (ctx.isCancelled()) return { ok: false, error: "tts_cancelled" };
    const word = words[i]!;
    const wordMode: StaticAudioMode =
      isStaticTtsText(word, "phonics") ? "phonics" : mode === "phonics" ? "phonics" : "default";
    const sub = await speakAmyVoice(word, { mode: wordMode, waitUntilEnd: true }, subCtx);
    if (!sub.success) {
      const phonicsSub = await speakAmyVoice(word, { mode: "phonics", waitUntilEnd: true }, subCtx);
      if (!phonicsSub.success) {
        await playEmergencyPhrase(word);
      }
    }
    if (i < words.length - 1) await delay(WORD_GAP_MS);
  }
  recordAmyVoiceLayerSuccess("speech_coach_split_success", { words: words.length });
  ctx.onFinished?.();
  return { ok: true, layer: "speech_coach_split" };
}

async function tryEmergencyLayer(text: string): Promise<PlayAttemptResult> {
  const ok = await playEmergencyPhrase(text);
  if (ok) {
    recordAmyVoiceLayerSuccess("emergency_local_success");
    return { ok: true, layer: "emergency_local" };
  }
  recordAmyVoiceLayerFailed("emergency_local", "emergency_failed");
  return { ok: false, error: "emergency_failed" };
}

function tryTextVisualLayer(text: string, mode: StaticAudioMode): PlayAttemptResult {
  emitAmyVoiceTextFallback({
    phrase: text,
    mode,
    highlightWords: splitWords(text),
    showTapToHear: true,
    animated: true,
  });
  recordAmyVoiceLayerSuccess("text_visual_success");
  return { ok: true, layer: "text_visual" };
}

/**
 * Fail-safe speak — walks the full fallback chain; never stops at first failure.
 */
export async function speakAmyVoice(
  rawText: string,
  opts: SpeakOptions | undefined,
  ctx: AmyVoicePipelineContext,
): Promise<SpeakResult & { layer?: AmyVoiceLayer }> {
  const text = (rawText ?? "").trim();
  if (!text) return { success: false, error: "tts_empty_text" };

  recordTtsUserGesture();
  resetClientStaticAudioCircuit();

  const primaryMode: StaticAudioMode = opts?.mode === "phonics" ? "phonics" : "default";
  if (isAndroidAmyNestAudioClient()) {
    primeStaticAudioInUserGesture(text, primaryMode);
  }

  if (!isTtsPlaybackAllowed()) {
    tryTextVisualLayer(text, primaryMode);
    return { success: true, layer: "text_visual" };
  }

  if ((ctx.depth ?? 0) === 0) resetAmyVoiceTelemetry();
  const failureChain: FailureChainEntry[] = [];
  const mode: StaticAudioMode = opts?.mode === "phonics" ? "phonics" : "default";
  const waitUntilEnd = opts?.waitUntilEnd ?? false;
  const shallow = (ctx.depth ?? 0) > 0;

  const layers: Array<() => Promise<PlayAttemptResult>> = [
    () => tryStaticLayer(text, mode, ctx, waitUntilEnd),
    () => tryLocalCacheLayer(text, mode, ctx, waitUntilEnd),
    ...(shallow
      ? []
      : [
          () => tryLiveTtsLayer(text, opts, ctx, waitUntilEnd),
          () => tryPhonicsSequenceLayer(text, mode, ctx),
          () => trySpeechCoachSplitLayer(text, mode, ctx),
        ]),
    () => tryEmergencyLayer(text),
  ];

  for (let i = 0; i < layers.length; i++) {
    if (ctx.isCancelled()) return { success: false, error: "tts_cancelled" };
    const result = await layers[i]!();
    if (result.ok) {
      if (
        waitUntilEnd &&
        (result.layer === "static" ||
          result.layer === "cache" ||
          result.layer === "api" ||
          result.layer === "emergency_local")
      ) {
        ctx.onFinished?.();
      }
      return { success: true, layer: result.layer };
    }
    failureChain.push({
      layer:
        result.error === "static_failed"
          ? "static"
          : result.error.includes("cache")
            ? "cache"
            : result.error.includes("api")
              ? "api"
              : result.error.includes("phonics")
                ? "phonics_sequence"
                : result.error.includes("speech")
                  ? "speech_coach_split"
                  : "emergency_local",
      error: result.error,
    });
  }

  recordAmyVoiceFailureChain(text, failureChain, { mode });
  tryTextVisualLayer(text, mode);
  return { success: true, layer: "text_visual" };
}

export function mapPlayErrorToSpeakResult(err: unknown): SpeakResult {
  const errName = (err as { name?: string })?.name;
  if (errName === "AbortError") return { success: false, error: "tts_cancelled" };
  const msg = err instanceof Error ? err.message : "tts_failed";
  if (msg === AUDIO_ERROR.USER_INTERACTION_REQUIRED) {
    return { success: false, error: "playback_blocked_tap_again" };
  }
  return { success: false, error: msg };
}
