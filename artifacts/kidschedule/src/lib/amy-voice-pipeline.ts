/**
 * Amy voice — adaptive fallback pipeline (staged pregen, time budget, layer memory).
 *
 * RULE:
 * - Streaming is ONLY for partial-ok playback (see amy-voice-playback-contract)
 * - Full-required playback MUST use complete audio
 * - HTMLAudioElement "ended" cannot be trusted for partial streams
 *
 * Layer 1: Static then cache — staged race (static first, cache after ~130ms)
 * Layer 2: OpenAI first → ElevenLabs only on failure (no overlap)
 * Layer 3–6: Phonics → word split → emergency → synthesis → visual
 */

import {
  assertVerbatimLessonText,
  lessonLocalCacheKey,
  logLessonAudioIdentity,
  type AudioIdentity,
} from "@/lib/lesson-audio-identity";
import {
  assertVerbatimParentHubText,
  isParentHubAudioIdentity,
  logParentHubAudioIdentity,
  parentHubLocalCacheKey,
} from "@/lib/parent-hub-audio-identity";
import {
  assertVerbatimCoachText,
  isCoachAudioIdentity,
  logCoachAudioIdentity,
  coachLocalCacheKey,
} from "@/lib/coach-audio-identity";
import {
  generateCoachWinAudio,
  resolveCoachPlaybackUrl,
} from "@/lib/coach-audio-playback";
import type { AuthFetchFn } from "@/lib/poll-result";
import { audioManager, AUDIO_ERROR } from "@/lib/audio-manager";
import { isCurrentAudioIntent } from "@/lib/amy-voice-ownership";
import { recordPlayLatency } from "@/lib/audio-latency-metrics";
import { recordStaleAudioPrevented } from "@/lib/audio-playback-queue";
import {
  trackAudioCacheHit,
  trackAudioCacheMiss,
} from "@/lib/audio-reliability-telemetry";
import { runWithControlledAudioStop } from "@/lib/amy-voice-safety";
import {
  isTtsPlaybackAllowed,
  recordTtsUserGesture,
} from "@/lib/tts-guard";
import { generateElevenLabsFallbackTts } from "@/lib/elevenlabs-fallback-tts";
import {
  generateTts,
  isValidAudioUrl,
  logTtsClient,
  playAudio,
  resolveClientPlaybackUrl,
} from "@/lib/tts-playback";
import {
  lookupStaticAudioUrl,
  prepareRemotePlaybackAudio,
  prepareStaticPlaybackAudio,
  primeStaticAudioInUserGesture,
  safePlayAudio,
} from "@/lib/static-audio";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import { isAndroidAmyNestAudioClient } from "@/lib/device-lite";
import { isAdminEmergencyForced, isCacheDisabled } from "@/lib/admin-audio-ops";
import { emitAmyVoiceTextFallback } from "@/lib/amy-voice-visual-fallback";
import { resetClientStaticAudioCircuit } from "@/lib/static-audio-telemetry";
import {
  isAmyVoiceOffline,
  recordTtsApiFailure,
  recordTtsApiSuccess,
  resetTtsApiCircuit,
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
  logAmyModeDiagnosis,
  prepareAmySpeechInput,
  type AmySpeechPolicy,
} from "@/lib/amy-speech-mode";
import { enforceAmySpeechPolicyInvariants } from "@/lib/amy-voice-invariants";
import { maybeQueueAmyVoiceLearning } from "@/lib/amy-voice-learning";
import { computePhraseTransitionGap } from "@/lib/amy-voice-emotion";
import {
  recordAmyVoiceDeliveryFallback,
  recordAmyVoiceDeliverySuccess,
} from "@/lib/amy-voice-difficulty";
import { preloadAmyVoiceNextPhrase } from "@/lib/amy-voice-preload";
import {
  resolveGraphemeToAudioKey,
} from "@workspace/phonics-sounds";
import {
  playPhonicsStaticAudio,
  resolvePhonicsAudioKey,
  resolvePhonicsSequenceKeys,
} from "@/lib/phonics-static-audio";
import { isStaticTtsText, type StaticAudioMode } from "@workspace/static-audio/browser";
import type { SpeakOptions, SpeakResult } from "@/hooks/use-amy-voice";
import {
  getAdaptiveSnapshot,
  shouldDeferElevenLabsFallback,
} from "@/lib/amy-voice-adaptive";
import {
  getPregenLayerOrder,
  getPregenLayerQuality,
  setSessionLastSuccessfulLayer,
} from "@/lib/amy-voice-session";
import {
  beginLayerTry,
  buildScoringContext,
  createAdaptivePipelineBudget,
  createPipelineTelemetry,
  getScoredLayerOrder,
  isLayerRecentlyFailed,
  isSlowNetwork,
  markLayerFailed,
  pipelineCacheKey,
  resolvePipelineStrategy,
  runStagedPregenRace,
  type LearnableLayer,
  type PipelineStrategy,
} from "@/lib/amy-voice-pipeline-optimizer";
import { isApiGloballyDegraded } from "@/lib/amy-voice-pipeline-server-sync";
import {
  isAudioPlaybackRecoveryMode,
  schedulePlaybackProgressCheck,
  shouldSkipLiveTtsWhenStaticExists,
} from "@/lib/audio-playback-recovery";
import {
  isNearSilentStaticDuration,
  probeStaticAudioProxyUrl,
} from "@/lib/static-audio-placeholder-guard";
import { hasStaticCatalogAudio } from "@/lib/unified-catalog-playback";
import {
  beginPlaybackTrace,
  playbackTraceAttach,
  playbackTraceStep,
} from "@/lib/playback-trace";
import {
  buildRlTelemetryPayload,
} from "@/lib/amy-voice-pipeline-learning";
import {
  recordRlOutcome,
} from "@/lib/amy-voice-rl-learning";
import {
  isStreamingLayerPenalized,
  penalizeStreamingLayer,
  playStreamingTts,
  resolveAdaptiveTtsSpeed,
  supportsStreamingPlayback,
} from "@/lib/amy-voice-stream-player";
import { flushUserTtsTimings } from "@/lib/tts-user-perceived-metrics";
import {
  isStreamingTemporarilyDisabled,
} from "@/lib/amy-voice-audio-guard";
import {
  logAudioHealthFailure,
  markAudioHealthAudibleStart,
  mapAmyLayerToHealthLayer,
} from "@/lib/audio-health";
import {
  canUseStreaming,
  getExpectedAudioDurationSec,
  logTtsEarlyCompletion,
  shouldTriggerCompletion,
  waitForSafePlaybackCompletion,
  type PlaybackMode,
} from "@/lib/amy-voice-playback-contract";
import {
  recordAmyVoiceFailureChain,
  recordAmyVoiceFallbackUsed,
  recordAmyVoiceLayerFailed,
  recordAmyVoiceLayerSuccess,
  resetAmyVoiceTelemetry,
  type AmyVoiceLayer,
  type FailureChainEntry,
} from "@/lib/amy-voice-telemetry";
import {
  bumpActiveSpeakGeneration,
  getActiveSpeakGeneration,
  BLEND_WORD_FINALE_GAP_MS,
  decomposePhonicsChunks,
  decomposeSpellingLetters,
  delay,
  ELEVENLABS_DYNAMIC_TIMEOUT_MS,
  isStale,
  LAYER1_TIMEOUT_MS,
  LAYER2_TIMEOUT_MS,
  NEVER_SILENT_MS,
  OPENAI_DYNAMIC_TIMEOUT_MS,
  PHONICS_CHUNK_ORDER,
  QUALITY_PICK_WINDOW_MS,
  SPEECH_COACH_RETRY_DELAY_MS,
  splitWords,
  withTimeout,
  type AmyVoicePipelineContext,
  type LayerRunner,
  type NeverSilentPipelineFlags,
  type PlayAttemptResult,
} from "@/lib/amy-voice-pipeline-types";
import {
  runNeverSilentFallback,
  tryEmergencyLayer,
  trySpeechSynthesisLayer,
  tryTextVisualLayer,
} from "@/lib/amy-voice-pipeline-fallback-layers";

export type { PlaybackMode };
export type { AmyVoicePipelineContext };
export { decomposePhonicsChunks };

function tracePipelineCacheHit(
  ctx: AmyVoicePipelineContext,
  source: "STATIC_GCS" | "LOCAL_CACHE" = "LOCAL_CACHE",
): void {
  const id = ctx.reliabilityRequestId;
  if (id) trackAudioCacheHit(id, source);
}

function tracePipelineCacheMiss(ctx: AmyVoicePipelineContext): void {
  const id = ctx.reliabilityRequestId;
  if (id) trackAudioCacheMiss(id);
}

function staticModesToTry(primary: StaticAudioMode, phonicsOnly = false): StaticAudioMode[] {
  if (phonicsOnly) return [primary];
  const alt: StaticAudioMode = primary === "phonics" ? "default" : "phonics";
  return [primary, alt];
}

/** Wait briefly for duration metadata on direct-stream static clips. */
async function waitForStaticDurationHint(audio: HTMLAudioElement, maxMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (Number.isFinite(audio.duration) && audio.duration > 0) return;
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) return;
    await delay(40);
  }
}

/** Strict audible check — playback must have started with valid duration. */
function validateAudibleElement(audio: HTMLAudioElement): boolean {
  if (isAudioPlaybackRecoveryMode()) {
    return audio.readyState >= 2 || !audio.paused;
  }
  if (audio.muted) return false;
  if (audio.volume <= 0) return false;
  const dur = audio.duration;
  if (!Number.isFinite(dur) || dur <= 0) return false;
  if (audio.currentTime <= 0) return false;
  return true;
}

function stopLoserPlaybacks(
  winner: PlayAttemptResult & { ok: true },
  pool: Array<PlayAttemptResult & { ok: true }>,
): void {
  for (const c of pool) {
    if (c.stopPlayback === winner.stopPlayback) continue;
    c.stopPlayback?.();
  }
}

/**
 * Parallel race with quality window: collect audible-valid winners, pick highest quality.
 */
async function raceQualityWeightedPlay(
  runners: LayerRunner[],
  layerTimeoutMs: number,
): Promise<PlayAttemptResult> {
  if (runners.length === 0) return { ok: false, error: "no_runners" };

  return new Promise((resolve) => {
    let settled = false;
    let failures = 0;
    const total = runners.length;
    const pool: Array<PlayAttemptResult & { ok: true; quality: number }> = [];
    let pickTimer: ReturnType<typeof setTimeout> | null = null;

    const finalize = () => {
      if (settled) return;
      settled = true;
      if (pickTimer) clearTimeout(pickTimer);
      if (pool.length === 0) {
        resolve({ ok: false, error: failures > 0 ? "layer_failed" : "layer_timeout" });
        return;
      }
      pool.sort((a, b) => b.quality - a.quality);
      const winner = pool[0]!;
      stopLoserPlaybacks(winner, pool);
      const { quality: _q, ...result } = winner;
      resolve(result);
    };

    const layerTimer = setTimeout(finalize, layerTimeoutMs);

    const schedulePick = () => {
      if (pickTimer || settled) return;
      pickTimer = setTimeout(() => {
        pickTimer = null;
        finalize();
      }, QUALITY_PICK_WINDOW_MS);
    };

    const onOutcome = (result: PlayAttemptResult, quality: number) => {
      if (settled) {
        if (result.ok) result.stopPlayback?.();
        return;
      }
      if (result.ok) {
        pool.push({ ...result, quality });
        if (pool.length === 1) schedulePick();
        return;
      }
      failures += 1;
      if (failures >= total && pool.length === 0) {
        clearTimeout(layerTimer);
        finalize();
      }
    };

    for (const runner of runners) {
      void withTimeout(runner.run(), layerTimeoutMs, "runner")
        .then((r) => onOutcome(r, runner.quality))
        .catch((err) => {
          const msg = err instanceof Error ? err.message : "layer_error";
          onOutcome(
            {
              ok: false,
              error: msg.includes("timeout") ? "layer_timeout" : "layer_error",
            },
            runner.quality,
          );
        });
    }
  });
}

async function waitForAudible(audio: HTMLAudioElement, maxMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (audio.ended) return validateAudibleElement(audio);
    if (!audio.paused && audio.currentTime > 0.02) return validateAudibleElement(audio);
    if (audio.readyState >= 3 && !audio.paused && audio.currentTime > 0) {
      return validateAudibleElement(audio);
    }
    await delay(40);
  }
  return validateAudibleElement(audio);
}

async function playElementWithNeverSilentWatchdog(
  audio: HTMLAudioElement,
  ctx: AmyVoicePipelineContext,
  meta: {
    proxyUrl: string;
    phrase: string;
    mode?: StaticAudioMode;
    source: "static" | "tts" | "cache" | "elevenlabs" | "api";
    waitUntilEnd: boolean;
  },
): Promise<{ ok: boolean; playedDuration?: number; expectedDuration?: number; error?: string }> {
  if (isStale(ctx)) return { ok: false };

  let traceId = ctx.playbackTraceId ?? "";
  if (!traceId) {
    traceId = beginPlaybackTrace({
      owner: "AmyVoicePipeline",
      requestedUrl: meta.proxyUrl,
      phrase: meta.phrase,
      audio,
      autoFlush: false,
    });
    ctx.playbackTraceId = traceId;
  } else {
    beginPlaybackTrace({
      owner: "AmyVoicePipeline",
      requestedUrl: meta.proxyUrl,
      phrase: meta.phrase,
      audio,
      existingTraceId: traceId,
      autoFlush: false,
    });
  }
  playbackTraceAttach(traceId, audio, "AmyVoicePipeline");
  playbackTraceStep(traceId, `${meta.source}_play_begin`, "AmyVoicePipeline", { audio });

  const playStartedAt = performance.now();
  const healthLayer = mapAmyLayerToHealthLayer(
    meta.source === "static"
      ? "static"
      : meta.source === "cache"
        ? "cache"
        : meta.source === "elevenlabs"
          ? "elevenlabs"
          : "api",
  );

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
            source: meta.source === "elevenlabs" ? "tts" : meta.source === "cache" ? "static" : "tts",
            channel: "speech",
            interrupt: true,
            srcType: meta.source === "cache" ? "static" : "tts",
            playbackTraceId: traceId,
          },
          { channel: "speech", interrupt: true, maxRetries: 1 },
        );

  if (!played || isStale(ctx)) return { ok: false, error: "audio_play_failed" };

  if (meta.source === "static") {
    await waitForStaticDurationHint(audio, 600);
    if (isNearSilentStaticDuration(audio.duration)) {
      return { ok: false, error: "static_placeholder" };
    }
  }

  if (isAudioPlaybackRecoveryMode()) {
    schedulePlaybackProgressCheck(audio, `${meta.source}_play`);
    markAudioHealthAudibleStart(healthLayer, { startedAt: playStartedAt });
    if (ctx.reliabilityModule) {
      recordPlayLatency(ctx.reliabilityModule, performance.now() - playStartedAt);
    }
    if (meta.waitUntilEnd) {
      const completion = await waitForSafePlaybackCompletion({
        audio,
        mode: ctx.playbackMode,
        isCancelled: () => isStale(ctx) || ctx.isCancelled(),
        usedStreaming: false,
        paragraphIdx: ctx.paragraphIdx,
        knownDurationSec: getExpectedAudioDurationSec(audio),
      });
      return {
        ok: completion.ok,
        playedDuration: completion.actualPlayedDuration,
        expectedDuration: completion.expectedDuration,
      };
    }
    return { ok: true };
  }

  const audible = await waitForAudible(audio, NEVER_SILENT_MS);
  logAmyVoiceDiag(`${meta.source}_play_verify`, {
    phrase: meta.phrase.slice(0, 80),
    audible,
    currentTime: audio.currentTime,
    paused: audio.paused,
    readyState: audio.readyState,
    srcType: audio.src.startsWith("blob:") ? "blob" : "remote",
  });
  if (!audible) {
    console.warn("[AudioPlaybackRecovery] never_silent_verify_failed — not restarting", {
      phrase: meta.phrase.slice(0, 80),
      currentTime: audio.currentTime,
      paused: audio.paused,
      readyState: audio.readyState,
    });
    audio.pause();
    logAudioHealthFailure("audio_start_timeout", healthLayer);
    return { ok: false, error: "audio_start_timeout" };
  }

  markAudioHealthAudibleStart(healthLayer, { startedAt: playStartedAt });
  if (ctx.reliabilityModule) {
    recordPlayLatency(ctx.reliabilityModule, performance.now() - playStartedAt);
  }

  if (meta.waitUntilEnd) {
    const completion = await waitForSafePlaybackCompletion({
      audio,
      mode: ctx.playbackMode,
      isCancelled: () => isStale(ctx) || ctx.isCancelled(),
      usedStreaming: false,
      paragraphIdx: ctx.paragraphIdx,
      knownDurationSec: getExpectedAudioDurationSec(audio),
    });
    return {
      ok: completion.ok,
      playedDuration: completion.actualPlayedDuration,
      expectedDuration: completion.expectedDuration,
    };
  }
  return { ok: true };
}

function uniqueStaticCandidates(primary: string, extras: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };
  for (const e of extras) push(e);
  push(primary);
  return out;
}

async function attemptPhonicsLocalPlay(
  text: string,
  opts: SpeakOptions | undefined,
  ctx: AmyVoicePipelineContext,
  waitUntilEnd: boolean,
): Promise<PlayAttemptResult> {
  const audioKey =
    resolvePhonicsAudioKey({
      text,
      phoneme: opts?.phoneme ?? null,
      letter: text,
    }) ?? null;

  if (!audioKey) {
    recordAmyVoiceLayerFailed("static", "phonics_key_unresolved");
    return { ok: false, error: "phonics_key_unresolved" };
  }

  if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };

  const result = await playPhonicsStaticAudio(audioKey, {
    waitUntilEnd,
    playbackRate: ctx.playbackRate,
    isCancelled: () => isStale(ctx),
  });

  if (!result.ok) {
    recordAmyVoiceLayerFailed("static", result.error);
    return { ok: false, error: result.error };
  }

  recordAmyVoiceLayerSuccess("static_success", { source: "phonics_local", audioKey });
  tracePipelineCacheHit(ctx, "STATIC_GCS");
  return { ok: true, layer: "static" };
}

async function attemptStaticPlay(
  text: string,
  mode: StaticAudioMode,
  ctx: AmyVoicePipelineContext,
  waitUntilEnd: boolean,
  phonicsOnly = false,
  fallbackTexts: string[] = [],
): Promise<PlayAttemptResult> {
  const candidates = uniqueStaticCandidates(text, fallbackTexts);

  for (const candidate of candidates) {
    for (const tryMode of staticModesToTry(mode, phonicsOnly)) {
      if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
      const proxyUrl = lookupStaticAudioUrl(candidate, tryMode);
      if (!proxyUrl) continue;

      const probe = await probeStaticAudioProxyUrl(proxyUrl);
      if (probe.isPlaceholder) {
        recordAmyVoiceLayerFailed("static", "static_placeholder");
        continue;
      }

      const audio = await prepareStaticPlaybackAudio(candidate, tryMode, { quiet: true });
      if (!audio) continue;

      const play = await playElementWithNeverSilentWatchdog(audio, ctx, {
        proxyUrl,
        phrase: candidate,
        mode: tryMode,
        source: "static",
        waitUntilEnd,
      });
      if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
      if (play.ok) {
        void warmLocalCacheFromUrl(localCacheKeyForPhrase(candidate, tryMode), proxyUrl);
        tracePipelineCacheHit(ctx, "STATIC_GCS");
        recordAmyVoiceLayerSuccess("static_success", { mode: tryMode });
        return {
          ok: true,
          layer: "static",
          playedDuration: play.playedDuration,
          expectedDuration: play.expectedDuration,
          stopPlayback: () => {
            audio.pause();
            audio.currentTime = 0;
          },
        };
      }
    }
  }
  recordAmyVoiceLayerFailed("static", "static_failed");
  return { ok: false, error: "static_failed" };
}

async function attemptCachePlay(
  text: string,
  mode: StaticAudioMode,
  ctx: AmyVoicePipelineContext,
  waitUntilEnd: boolean,
  phonicsOnly = false,
  fallbackTexts: string[] = [],
  opts?: SpeakOptions,
): Promise<PlayAttemptResult> {
  if (isCacheDisabled()) return { ok: false, error: "cache_disabled" };

  if (opts?.parentHub && isParentHubAudioIdentity(opts.audioIdentity)) {
    assertVerbatimParentHubText(text, opts.audioIdentity.text);
    for (const tryMode of staticModesToTry(mode, phonicsOnly)) {
      if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
      const identityKey = parentHubLocalCacheKey(opts.audioIdentity);
      const objectUrl = await getLocalCachedAudioUrl(identityKey);
      if (!objectUrl) continue;

      const audio = playAudio(objectUrl);
      if (!audio) {
        URL.revokeObjectURL(objectUrl);
        continue;
      }

      const play = await playElementWithNeverSilentWatchdog(audio, ctx, {
        proxyUrl: objectUrl,
        phrase: opts.audioIdentity.text,
        mode: tryMode,
        source: "cache",
        waitUntilEnd,
      });
      URL.revokeObjectURL(objectUrl);
      if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
      if (play.ok) {
        tracePipelineCacheHit(ctx, "LOCAL_CACHE");
        recordAmyVoiceLayerSuccess("cache_success", { mode: tryMode });
        return {
          ok: true,
          layer: "cache",
          playedDuration: play.playedDuration,
          expectedDuration: play.expectedDuration,
          stopPlayback: () => {
            audio.pause();
            audio.currentTime = 0;
          },
        };
      }
    }
  } else if (
    opts?.lessonParagraph &&
    opts.audioIdentity &&
    !isParentHubAudioIdentity(opts.audioIdentity) &&
    !isCoachAudioIdentity(opts.audioIdentity)
  ) {
    assertVerbatimLessonText(text, opts.audioIdentity.text);
    for (const tryMode of staticModesToTry(mode, phonicsOnly)) {
      if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
      const identityKey = lessonLocalCacheKey(opts.audioIdentity as AudioIdentity, tryMode);
      const objectUrl = await getLocalCachedAudioUrl(identityKey);
      if (!objectUrl) continue;

      const audio = playAudio(objectUrl);
      if (!audio) {
        URL.revokeObjectURL(objectUrl);
        continue;
      }

      const play = await playElementWithNeverSilentWatchdog(audio, ctx, {
        proxyUrl: objectUrl,
        phrase: opts.audioIdentity.text,
        mode: tryMode,
        source: "cache",
        waitUntilEnd,
      });
      URL.revokeObjectURL(objectUrl);
      if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
      if (play.ok) {
        tracePipelineCacheHit(ctx, "LOCAL_CACHE");
        recordAmyVoiceLayerSuccess("cache_success", { mode: tryMode });
        return {
          ok: true,
          layer: "cache",
          playedDuration: play.playedDuration,
          expectedDuration: play.expectedDuration,
          stopPlayback: () => {
            audio.pause();
            audio.currentTime = 0;
          },
        };
      }
    }
  } else if (opts?.coach && isCoachAudioIdentity(opts.audioIdentity)) {
    assertVerbatimCoachText(text, opts.audioIdentity.text);
    for (const tryMode of staticModesToTry(mode, phonicsOnly)) {
      if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
      const identityKey = coachLocalCacheKey(opts.audioIdentity);
      const objectUrl = await getLocalCachedAudioUrl(identityKey);
      if (!objectUrl) continue;

      const audio = playAudio(objectUrl);
      if (!audio) {
        URL.revokeObjectURL(objectUrl);
        continue;
      }

      const play = await playElementWithNeverSilentWatchdog(audio, ctx, {
        proxyUrl: objectUrl,
        phrase: opts.audioIdentity.text,
        mode: tryMode,
        source: "cache",
        waitUntilEnd,
      });
      URL.revokeObjectURL(objectUrl);
      if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
      if (play.ok) {
        tracePipelineCacheHit(ctx, "LOCAL_CACHE");
        recordAmyVoiceLayerSuccess("cache_success", { mode: tryMode });
        return {
          ok: true,
          layer: "cache",
          playedDuration: play.playedDuration,
          expectedDuration: play.expectedDuration,
          stopPlayback: () => {
            audio.pause();
            audio.currentTime = 0;
          },
        };
      }
    }
  }

  const candidates = uniqueStaticCandidates(text, fallbackTexts);

  for (const candidate of candidates) {
    for (const tryMode of staticModesToTry(mode, phonicsOnly)) {
      if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
      const key = localCacheKeyForPhrase(candidate, tryMode);
      const objectUrl = await getLocalCachedAudioUrl(key);
      if (!objectUrl) continue;

      const audio = playAudio(objectUrl);
      if (!audio) {
        URL.revokeObjectURL(objectUrl);
        continue;
      }

      const play = await playElementWithNeverSilentWatchdog(audio, ctx, {
        proxyUrl: objectUrl,
        phrase: candidate,
        mode: tryMode,
        source: "cache",
        waitUntilEnd,
      });
      URL.revokeObjectURL(objectUrl);
      if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
      if (play.ok) {
        tracePipelineCacheHit(ctx, "LOCAL_CACHE");
        recordAmyVoiceLayerSuccess("cache_success", { mode: tryMode });
        return {
          ok: true,
          layer: "cache",
          playedDuration: play.playedDuration,
          expectedDuration: play.expectedDuration,
          stopPlayback: () => {
            audio.pause();
            audio.currentTime = 0;
          },
        };
      }
    }
  }
  recordAmyVoiceLayerFailed("cache", "cache_miss");
  tracePipelineCacheMiss(ctx);
  return { ok: false, error: "cache_miss" };
}

/** Layer 1 — static then cache staged race (phonics stays sequential). */
async function tryPregeneratedParallelLayer(
  text: string,
  mode: StaticAudioMode,
  ctx: AmyVoicePipelineContext,
  waitUntilEnd: boolean,
  phonicsOnly = false,
  fallbackTexts: string[] = [],
  cacheKey?: string,
  pregenPrimary: "static" | "cache" = "static",
  opts?: SpeakOptions,
): Promise<PlayAttemptResult> {
  const order = getPregenLayerOrder();
  logAmyVoiceDiag("layer1_staged", {
    order,
    timeoutMs: LAYER1_TIMEOUT_MS,
    adaptive: getAdaptiveSnapshot(),
    sequential: mode === "phonics" || phonicsOnly,
  });

  if (mode === "phonics" || phonicsOnly) {
    const runners: LayerRunner[] = order.map((kind) => ({
      quality: getPregenLayerQuality(kind),
      run: async () => {
        const local = await attemptPhonicsLocalPlay(text, opts, ctx, waitUntilEnd);
        if (local.ok) return local;
        return kind === "static"
          ? attemptStaticPlay(text, mode, ctx, waitUntilEnd, phonicsOnly, fallbackTexts)
          : attemptCachePlay(text, mode, ctx, waitUntilEnd, phonicsOnly, fallbackTexts, opts);
      },
    }));
    const sorted = [...runners].sort((a, b) => b.quality - a.quality);
    for (const runner of sorted) {
      if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
      try {
        const result = await withTimeout(runner.run(), LAYER1_TIMEOUT_MS, "runner");
        if (result.ok) return result;
      } catch {
        /* try next */
      }
    }
    return { ok: false, error: "layer_failed" };
  }

  const staticRun = (): Promise<PlayAttemptResult> => {
    if (isLayerRecentlyFailed("static", cacheKey)) {
      return Promise.resolve({ ok: false, error: "static_skipped" });
    }
    return attemptStaticPlay(text, mode, ctx, waitUntilEnd, phonicsOnly, fallbackTexts);
  };
  const cacheRun = (): Promise<PlayAttemptResult> => {
    if (isLayerRecentlyFailed("cache", cacheKey)) {
      return Promise.resolve({ ok: false, error: "cache_skipped" });
    }
    return attemptCachePlay(text, mode, ctx, waitUntilEnd, phonicsOnly, fallbackTexts, opts);
  };

  const result = await runStagedPregenRace(
    staticRun,
    cacheRun,
    LAYER1_TIMEOUT_MS,
    () => isStale(ctx),
    pregenPrimary,
  );
  if (result.ok) return result;

  if (isStaticTtsText(text, mode)) {
    recordAmyVoiceFallbackUsed("static", "cache");
  }
  if (!result.ok && result.error === "cache_miss") {
    markLayerFailed("cache", cacheKey);
  }
  if (!result.ok && result.error === "static_failed") {
    markLayerFailed("static", cacheKey);
  }
  return { ok: false, error: result.error };
}

async function attemptOpenAiPlay(
  text: string,
  opts: SpeakOptions | undefined,
  ctx: AmyVoicePipelineContext,
  waitUntilEnd: boolean,
  signal?: AbortSignal,
): Promise<PlayAttemptResult> {
  if (shouldSkipLiveTtsApi() || isApiGloballyDegraded()) {
    return { ok: false, error: isAmyVoiceOffline() ? "offline" : "api_circuit_open" };
  }

  if (opts?.coach && isCoachAudioIdentity(opts.audioIdentity)) {
    const identity = opts.audioIdentity;
    const data = await generateCoachWinAudio(
      ctx.authFetch,
      { planCacheKey: identity.planCacheKey, identity },
      { signal },
    );
    if (data?.ok && data.cached && data.audioUrl) {
      const playbackUrl = resolveCoachPlaybackUrl(data.audioUrl, data.cacheKey);
      if (!playbackUrl) return { ok: false, error: "tts_invalid_audio_url" };

      const audio = playAudio(playbackUrl);
      if (!audio) return { ok: false, error: "tts_invalid_audio_url" };

      const play = await playElementWithNeverSilentWatchdog(audio, ctx, {
        proxyUrl: playbackUrl,
        phrase: identity.text,
        mode: "default",
        source: "api",
        waitUntilEnd,
      });
      if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
      if (play.ok) {
        recordTtsApiSuccess();
        if (data.cacheKey) {
          void warmLocalCacheFromUrl(coachLocalCacheKey(identity), playbackUrl);
        }
        recordAmyVoiceLayerSuccess("api_success", { cacheKey: data.cacheKey, coach: true });
        return {
          ok: true,
          layer: "api",
          playedDuration: play.playedDuration,
          expectedDuration: play.expectedDuration,
          stopPlayback: () => {
            audio.pause();
            audio.currentTime = 0;
          },
        };
      }
    }
    // Cache miss — fall through to streaming-first path below.
  }

  const mode = opts?.mode === "phonics" ? "phonics" : "default";
  const cacheKeyHint = pipelineCacheKey(text, mode, opts);
  const scoringContext = buildScoringContext(
    text,
    enforceAmySpeechPolicyInvariants(prepareAmySpeechInput(text, opts)),
    opts,
  );
  const networkSlow = isSlowNetwork();
  const streamBody = {
    text,
    voiceId: ctx.voiceId,
    modelId: ctx.modelId,
    mode,
    speed: resolveAdaptiveTtsSpeed(networkSlow),
    phoneme: opts?.phoneme,
    word: opts?.word,
  };

  const startedAt = Date.now();
  const playbackMode = ctx.playbackMode;

  if (
    canUseStreaming(playbackMode) &&
    supportsStreamingPlayback() &&
    !isStreamingTemporarilyDisabled() &&
    !isStreamingLayerPenalized(cacheKeyHint)
  ) {
    ctx.trackStreamingAttempt?.();
    const stream = await playStreamingTts(ctx.authFetch, streamBody, {
      signal,
      cacheKeyHint,
      playbackMode,
    });

    if (stream.ok) {
      if (isStale(ctx)) {
        stream.audio.pause();
        URL.revokeObjectURL(stream.objectUrl);
        return { ok: false, error: "tts_cancelled" };
      }

      const audible = await waitForAudible(stream.audio, NEVER_SILENT_MS);
      if (audible) {
        if (stream.metrics.bufferingEvents > 1) {
          penalizeStreamingLayer(cacheKeyHint);
        }
        if (stream.cacheKey) {
          void warmLocalCacheFromUrl(localCacheKeyForTts(stream.cacheKey), stream.objectUrl);
        }
        recordTtsApiSuccess();
        recordAmyVoiceLayerSuccess("api_success", {
          cacheKey: stream.cacheKey,
          streaming: true,
          ttfaMs: stream.metrics.ttfaMs,
        });
        void flushUserTtsTimings(ctx.authFetch);
        if (opts?.coach && isCoachAudioIdentity(opts.audioIdentity)) {
          void generateCoachWinAudio(ctx.authFetch, {
            planCacheKey: opts.audioIdentity.planCacheKey,
            identity: opts.audioIdentity,
          });
        }
        recordRlOutcome(
          buildRlTelemetryPayload(
            scoringContext,
            "api",
            true,
            stream.metrics.ttfaMs,
            Date.now() - startedAt,
            stream.metrics.bufferingEvents,
            false,
            true,
          ),
          Date.now() - startedAt,
        );

        if (waitUntilEnd) {
          const completion = await waitForSafePlaybackCompletion({
            audio: stream.audio,
            mode: playbackMode,
            isCancelled: () => isStale(ctx) || ctx.isCancelled(),
            usedStreaming: true,
            paragraphIdx: ctx.paragraphIdx,
            knownDurationSec: getExpectedAudioDurationSec(stream.audio),
          });
          if (!completion.ok) {
            penalizeStreamingLayer(cacheKeyHint);
            stream.audio.pause();
            URL.revokeObjectURL(stream.objectUrl);
            recordAmyVoiceLayerFailed("api", "streaming_early_completion");
          } else {
            return {
              ok: true,
              layer: "api",
              playedDuration: completion.actualPlayedDuration,
              expectedDuration: completion.expectedDuration,
              usedStreaming: true,
              stopPlayback: () => {
                stream.audio.pause();
                stream.audio.currentTime = 0;
              },
            };
          }
        } else {
          return {
            ok: true,
            layer: "api",
            stopPlayback: () => {
              stream.audio.pause();
              stream.audio.currentTime = 0;
            },
          };
        }
      }

      penalizeStreamingLayer(cacheKeyHint);
      stream.audio.pause();
      URL.revokeObjectURL(stream.objectUrl);
    }
  }

  const data = await generateTts(ctx.authFetch, streamBody, { signal });

  if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
  if (!data?.success || !isValidAudioUrl(data.audioUrl)) {
    recordTtsApiFailure(data?.error);
    recordAmyVoiceLayerFailed("api", data?.error ?? "tts_failed");
    recordRlOutcome(
      buildRlTelemetryPayload(scoringContext, "api", false, Date.now() - startedAt, Date.now() - startedAt, 0, false, false),
      Date.now() - startedAt,
    );
    return { ok: false, error: data?.error ?? "tts_failed" };
  }

  recordTtsApiSuccess();
  const playbackUrl = resolveClientPlaybackUrl(data.audioUrl, data.cacheKey);
  if (!playbackUrl) return { ok: false, error: "tts_invalid_audio_url" };

  if (data.cacheKey) void warmLocalCacheFromUrl(localCacheKeyForTts(data.cacheKey), playbackUrl);
  void warmLocalCacheFromUrl(localCacheKeyForPhrase(text, mode), playbackUrl);

  const audio =
    (await prepareRemotePlaybackAudio(playbackUrl)) ?? playAudio(playbackUrl);
  if (!audio) return { ok: false, error: "tts_invalid_audio_url" };

  const play = await playElementWithNeverSilentWatchdog(audio, ctx, {
    proxyUrl: playbackUrl,
    phrase: text,
    mode,
    source: "tts",
    waitUntilEnd,
  });

  if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
  if (play.ok) {
    recordAmyVoiceLayerSuccess("api_success", { cacheKey: data.cacheKey });
    recordRlOutcome(
      buildRlTelemetryPayload(scoringContext, "api", true, Date.now() - startedAt, Date.now() - startedAt, 0, false, false),
      Date.now() - startedAt,
    );
    return {
      ok: true,
      layer: "api",
      playedDuration: play.playedDuration,
      expectedDuration: play.expectedDuration,
      stopPlayback: () => {
        audio.pause();
        audio.currentTime = 0;
      },
    };
  }
  recordAmyVoiceLayerFailed("api", "play_failed_or_silent");
  recordRlOutcome(
    buildRlTelemetryPayload(scoringContext, "api", false, Date.now() - startedAt, Date.now() - startedAt, 0, false, false),
    Date.now() - startedAt,
  );
  return { ok: false, error: "api_play_failed" };
}

async function attemptElevenLabsPlay(
  text: string,
  opts: SpeakOptions | undefined,
  ctx: AmyVoicePipelineContext,
  waitUntilEnd: boolean,
  signal?: AbortSignal,
): Promise<PlayAttemptResult> {
  if (isAmyVoiceOffline()) return { ok: false, error: "elevenlabs_offline" };

  const data = await generateElevenLabsFallbackTts(ctx.authFetch, text, {
    mode: opts?.mode,
    voiceId: ctx.voiceId,
    modelId: ctx.modelId,
    signal,
  });

  if (signal?.aborted || isStale(ctx)) return { ok: false, error: "tts_cancelled" };

  if (data.error === "elevenlabs_fallback_disabled") {
    return { ok: false, error: "elevenlabs_disabled" };
  }
  if (!data?.success || !isValidAudioUrl(data.audioUrl)) {
    recordAmyVoiceLayerFailed("elevenlabs", data?.error ?? "elevenlabs_failed");
    return { ok: false, error: data?.error ?? "elevenlabs_failed" };
  }

  const playbackUrl = data.audioUrl;
  if (data.cacheKey) void warmLocalCacheFromUrl(localCacheKeyForTts(data.cacheKey), playbackUrl);

  const audio =
    (await prepareRemotePlaybackAudio(playbackUrl)) ?? playAudio(playbackUrl);
  if (!audio) return { ok: false, error: "tts_invalid_audio_url" };

  const play = await playElementWithNeverSilentWatchdog(audio, ctx, {
    proxyUrl: playbackUrl,
    phrase: text,
    mode: opts?.mode === "phonics" ? "phonics" : "default",
    source: "elevenlabs",
    waitUntilEnd,
  });

  if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
  if (play.ok) {
    recordAmyVoiceLayerSuccess("elevenlabs_success", { cacheKey: data.cacheKey });
    return {
      ok: true,
      layer: "elevenlabs",
      playedDuration: play.playedDuration,
      expectedDuration: play.expectedDuration,
      stopPlayback: () => {
        audio.pause();
        audio.currentTime = 0;
      },
    };
  }
  recordAmyVoiceLayerFailed("elevenlabs", "play_failed_or_silent");
  return { ok: false, error: "elevenlabs_play_failed" };
}

type DynamicProvider = "openai" | "elevenlabs";

async function tryPlayWithWatchdog(
  provider: DynamicProvider,
  text: string,
  opts: SpeakOptions | undefined,
  ctx: AmyVoicePipelineContext,
  waitUntilEnd: boolean,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<PlayAttemptResult> {
  const run =
    provider === "openai"
      ? () => attemptOpenAiPlay(text, opts, ctx, waitUntilEnd, signal)
      : () => attemptElevenLabsPlay(text, opts, ctx, waitUntilEnd, signal);

  try {
    return await withTimeout(run(), timeoutMs, provider);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "layer_error";
    return {
      ok: false,
      error: msg.includes("timeout") ? "layer_timeout" : "layer_error",
    };
  }
}

/** OpenAI may be audibly playing even if the attempt returned failure — do not overlap ElevenLabs. */
function resolveOpenAiAudibleSuccess(): PlayAttemptResult | null {
  const active = audioManager.getCurrentElement();
  if (!active || !validateAudibleElement(active)) return null;
  recordAmyVoiceLayerSuccess("api_success", { recovered: "audible_watchdog" });
  return {
    ok: true,
    layer: "api",
    stopPlayback: () => {
      active.pause();
      active.currentTime = 0;
    },
  };
}

/**
 * Layer 2 — OpenAI first; ElevenLabs only after OpenAI fully fails (no parallel race).
 */
async function tryDynamicSequentialLayer(
  text: string,
  opts: SpeakOptions | undefined,
  ctx: AmyVoicePipelineContext,
  waitUntilEnd: boolean,
  dynamicTimeoutMs = OPENAI_DYNAMIC_TIMEOUT_MS,
): Promise<PlayAttemptResult> {
  const openAiAbort = new AbortController();
  const elevenAbort = new AbortController();
  const openAiTimeoutMs = Math.max(dynamicTimeoutMs, OPENAI_DYNAMIC_TIMEOUT_MS);
  const elevenTimeoutMs = Math.max(openAiTimeoutMs + 3_000, ELEVENLABS_DYNAMIC_TIMEOUT_MS);

  const canUseOpenAi = !shouldSkipLiveTtsApi();
  const canUseEleven = !isAmyVoiceOffline() && !shouldDeferElevenLabsFallback();

  if (!canUseOpenAi && !canUseEleven) {
    return { ok: false, error: "dynamic_skipped" };
  }

  logTtsClient("Layer2 sequential", {
    canUseOpenAi,
    canUseEleven,
    openAiTimeoutMs,
    elevenTimeoutMs,
    adaptive: getAdaptiveSnapshot(),
  });

  if (canUseOpenAi) {
    console.log("[AmyTTS] Using OpenAI");
    const openaiResult = await tryPlayWithWatchdog(
      "openai",
      text,
      opts,
      ctx,
      waitUntilEnd,
      openAiTimeoutMs,
      openAiAbort.signal,
    );

    if (openaiResult.ok) {
      elevenAbort.abort();
      return openaiResult;
    }

    if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };

    const recovered = resolveOpenAiAudibleSuccess();
    if (recovered) {
      elevenAbort.abort();
      return recovered;
    }

    console.log("[AmyTTS] OpenAI failed, falling back to ElevenLabs");
  }

  if (!canUseEleven) {
    return { ok: false, error: canUseOpenAi ? "dynamic_failed" : "dynamic_skipped" };
  }

  if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };

  runWithControlledAudioStop(() => audioManager.stopAll());

  const elevenResult = await tryPlayWithWatchdog(
    "elevenlabs",
    text,
    opts,
    ctx,
    waitUntilEnd,
    elevenTimeoutMs,
    elevenAbort.signal,
  );

  return elevenResult.ok ? elevenResult : { ok: false, error: elevenResult.error ?? "dynamic_failed" };
}

/**
 * CVC blend finale — phoneme sequence only (no whole-word TTS).
 */
async function playPhonicsBlendFinale(
  word: string,
  ctx: AmyVoicePipelineContext,
  waitUntilEnd: boolean,
): Promise<PlayAttemptResult> {
  const keys = resolvePhonicsSequenceKeys(word);
  if (keys.length === 0) return { ok: false, error: "blend_finale_empty" };

  for (let i = 0; i < keys.length; i++) {
    if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
    const key = keys[i]!;
    const result = await playPhonicsStaticAudio(key, {
      waitUntilEnd,
      playbackRate: ctx.playbackRate,
      isCancelled: () => isStale(ctx),
    });
    if (!result.ok) {
      recordAmyVoiceLayerFailed("phonics_sequence", `part_failed:${key}`);
      return { ok: false, error: "blend_finale_failed" };
    }
    if (i < keys.length - 1) {
      await delay(BLEND_WORD_FINALE_GAP_MS);
    }
  }

  recordAmyVoiceLayerSuccess("phonics_sequence_success", { parts: keys.length, word });
  return { ok: true, layer: "phonics_sequence" };
}

async function tryPhonicsSequenceLayer(
  text: string,
  mode: StaticAudioMode,
  ctx: AmyVoicePipelineContext,
  policy?: AmySpeechPolicy,
  opts?: SpeakOptions,
): Promise<PlayAttemptResult> {
  if (policy && !policy.allowPhonicsSequence) {
    recordAmyVoiceLayerFailed("phonics_sequence", "blocked_by_speech_mode");
    return { ok: false, error: "phonics_sequence_blocked" };
  }
  const parts =
    policy?.speechMode === "spelling"
      ? decomposeSpellingLetters(text)
      : decomposePhonicsChunks(text);
  if (parts.length === 0 || (parts.length === 1 && parts[0] === text)) {
    recordAmyVoiceLayerFailed("phonics_sequence", "not_decomposable");
    return { ok: false, error: "phonics_sequence_skip" };
  }

  for (let i = 0; i < parts.length; i++) {
    if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
    const part = parts[i]!;
    preloadAmyVoiceNextPhrase(parts[i + 1], "phonics");
    const play = await playPhonicsStaticAudio(part, {
      waitUntilEnd: true,
      playbackRate: ctx.playbackRate,
      isCancelled: () => isStale(ctx),
    });
    if (!play.ok) {
      const emergency = await withTimeout(
        playEmergencyPhrase(part),
        NEVER_SILENT_MS,
        "phonics_emergency",
      ).catch(() => false);
      if (!emergency) {
        recordAmyVoiceLayerFailed("phonics_sequence", `part_failed:${part}`);
        return { ok: false, error: "phonics_sequence_failed" };
      }
    }
    if (i < parts.length - 1) {
      await delay(policy?.prosody.phonicsGapMs ?? 115);
    }
  }

  recordAmyVoiceLayerSuccess("phonics_sequence_success", { parts: parts.length, word: text });
  ctx.onFinished?.();
  return { ok: true, layer: "phonics_sequence" };
}

async function trySpeechCoachSplitLayer(
  text: string,
  mode: StaticAudioMode,
  ctx: AmyVoicePipelineContext,
  policy?: AmySpeechPolicy,
): Promise<PlayAttemptResult> {
  if (policy && !policy.allowSpeechCoachSplit) {
    recordAmyVoiceLayerFailed("speech_coach_split", "blocked_by_speech_mode");
    return { ok: false, error: "speech_coach_split_blocked" };
  }
  const words = splitWords(text);
  if (words.length <= 1) {
    recordAmyVoiceLayerFailed("speech_coach_split", "single_word");
    return { ok: false, error: "speech_coach_split_skip" };
  }

  recordAmyVoiceFallbackUsed("phonics_sequence", "speech_coach_split");
  const subCtx: AmyVoicePipelineContext = {
    ...ctx,
    depth: (ctx.depth ?? 0) + 1,
    speakGeneration: undefined,
  };

  for (let i = 0; i < words.length; i++) {
    if (isStale(ctx)) return { ok: false, error: "tts_cancelled" };
    const word = words[i]!;
    const wordMode: StaticAudioMode =
      isStaticTtsText(word, "phonics") ? "phonics" : mode === "phonics" ? "phonics" : "default";
    const sub = await speakAmyVoice(word, { mode: wordMode, waitUntilEnd: true }, subCtx);
    if (!sub.success) {
      await speakAmyVoice(word, { mode: "phonics", waitUntilEnd: true }, subCtx);
    }
    if (i < words.length - 1) await delay(380);
  }

  recordAmyVoiceLayerSuccess("speech_coach_split_success", { words: words.length });
  ctx.onFinished?.();
  return { ok: true, layer: "speech_coach_split" };
}

function pushFailure(
  chain: FailureChainEntry[],
  result: PlayAttemptResult,
  defaultLayer: AmyVoiceLayer,
  cacheKey?: string,
): void {
  if (result.ok) return;
  const layer: FailureChainEntry["layer"] =
    result.error.includes("static")
      ? "static"
      : result.error.includes("cache")
        ? "cache"
        : result.error.includes("elevenlabs")
          ? "elevenlabs"
          : result.error.includes("api") || result.error.includes("dynamic")
            ? "api"
            : result.error.includes("phonics")
              ? "phonics_sequence"
              : result.error.includes("speech")
                ? "speech_coach_split"
                : defaultLayer;
  chain.push({ layer, error: result.error });
  markLayerFailed(layer, cacheKey);
}


async function speakSemanticPhrases(
  policy: AmySpeechPolicy,
  opts: SpeakOptions | undefined,
  ctx: AmyVoicePipelineContext,
): Promise<SpeakResult & { layer?: AmyVoiceLayer }> {
  const subCtx: AmyVoicePipelineContext = {
    ...ctx,
    depth: (ctx.depth ?? 0) + 1,
    speakGeneration: undefined,
  };
  let lastLayer: AmyVoiceLayer | undefined;

  for (let i = 0; i < policy.phrases.length; i++) {
    if (isStale(ctx)) return { success: false, error: "tts_cancelled" };
    const attentionSilence = policy.phraseAttentionSilenceMs?.[i] ?? 0;
    if (attentionSilence > 0) await delay(attentionSilence);
    const phrase = policy.phrases[i]!;
    preloadAmyVoiceNextPhrase(policy.phrases[i + 1], policy.pipelineMode);
    const phrasePolicy: AmySpeechPolicy = {
      ...policy,
      originalText: phrase,
      normalizedText: phrase,
      phrases: [phrase],
      useSemanticSplit: false,
    };
    const sub = await speakAmyVoice(
      phrase,
      { ...opts, mode: policy.pipelineMode, speechPolicy: phrasePolicy },
      subCtx,
    );
    if (!sub.success) return sub;
    lastLayer = sub.layer;
    if (i < policy.phrases.length - 1) {
      const nextPhrase = policy.phrases[i + 1]!;
      const gap = computePhraseTransitionGap(
        phrase,
        nextPhrase,
        policy.prosody.phraseGapMs,
        policy.emotion,
        policy.intent,
      );
      await delay(gap);
    }
  }

  recordAmyVoiceLayerSuccess("api_success", {
    semanticPhrases: policy.phrases.length,
  });
  ctx.onFinished?.();
  logAmyModeDiagnosis(policy, lastLayer ?? "semantic_split");
  maybeQueueAmyVoiceLearning(policy, lastLayer ?? "semantic_split");
  return { success: true, layer: lastLayer };
}

function finishSpeak(
  result: PlayAttemptResult,
  waitUntilEnd: boolean,
  ctx: AmyVoicePipelineContext,
  policy: AmySpeechPolicy,
  depth: number,
  _cacheKey?: string,
): SpeakResult & { layer?: AmyVoiceLayer } {
  if (depth === 0) {
    const layer = result.ok ? result.layer : "failed";
    logAmyModeDiagnosis(policy, layer);
    if (result.ok) {
      if (
        layer === "emergency_local" ||
        layer === "text_visual" ||
        layer === "phonics_sequence"
      ) {
        recordAmyVoiceDeliveryFallback();
      } else {
        recordAmyVoiceDeliverySuccess();
      }
      maybeQueueAmyVoiceLearning(policy, layer);
    }
  }
  return finalizeSuccess(result, waitUntilEnd, ctx, depth);
}

function finalizeSuccess(
  result: PlayAttemptResult,
  waitUntilEnd: boolean,
  ctx: AmyVoicePipelineContext,
  depth = 0,
): SpeakResult & { layer?: AmyVoiceLayer } {
  if (!result.ok) return { success: false, error: result.error };
  setSessionLastSuccessfulLayer(result.layer);
  // Only the top-level speak should notify callers — nested phrase/word
  // playback must not fire onFinished early (e.g. audio lesson auto-advance).
  if (
    depth === 0 &&
    waitUntilEnd &&
    (result.layer === "static" ||
      result.layer === "cache" ||
      result.layer === "api" ||
      result.layer === "elevenlabs" ||
      result.layer === "emergency_local")
  ) {
    const played =
      result.playedDuration ?? 0;
    const expected = result.expectedDuration ?? 0;
    // The early-completion guard exists for STREAMING playback, where the
    // HTMLAudioElement "ended" event can fire before the full clip is heard.
    // A fully-downloaded clip that already reached completion must be treated
    // as done — otherwise auto-advancing flows (audio lessons) stall after the
    // first paragraph because onFinished is suppressed.
    if (
      expected > 0 &&
      result.usedStreaming === true &&
      !shouldTriggerCompletion({
        mode: ctx.playbackMode,
        actualPlayedDuration: played,
        expectedDuration: expected,
      })
    ) {
      logTtsEarlyCompletion({
        errorType: "early_completion",
        mode: ctx.playbackMode,
        playedDuration: played,
        expectedDuration: expected,
        usedStreaming: result.usedStreaming,
      });
      return { success: false, error: "early_completion", layer: result.layer };
    }
    if (ctx.completionFinalized) {
      return { success: true, layer: result.layer };
    }
    ctx.completionFinalized = true;
    ctx.onFinished?.();
  }
  return { success: true, layer: result.layer };
}

async function tryLearnableLayerPlay(
  layer: LearnableLayer,
  text: string,
  mode: StaticAudioMode,
  ctx: AmyVoicePipelineContext,
  waitUntilEnd: boolean,
  phonicsOnly: boolean,
  fallbackTexts: string[],
  opts: SpeakOptions | undefined,
  policy: AmySpeechPolicy,
): Promise<PlayAttemptResult | null> {
  switch (layer) {
    case "static":
      return attemptStaticPlay(text, mode, ctx, waitUntilEnd, phonicsOnly, fallbackTexts);
    case "cache":
      return attemptCachePlay(text, mode, ctx, waitUntilEnd, phonicsOnly, fallbackTexts, opts);
    case "api":
    case "elevenlabs":
      if (phonicsOnly || policy.forcePhonicsOnly) return null;
      if (isSlowNetwork() || shouldSkipLiveTtsApi()) return null;
      return tryDynamicSequentialLayer(
        text,
        opts,
        ctx,
        waitUntilEnd,
        policy.dynamicTimeoutMs,
      );
    default:
      return null;
  }
}

async function tryScoredLayersPlay(
  layers: LearnableLayer[],
  text: string,
  mode: StaticAudioMode,
  ctx: AmyVoicePipelineContext,
  waitUntilEnd: boolean,
  phonicsOnly: boolean,
  fallbackTexts: string[],
  opts: SpeakOptions | undefined,
  policy: AmySpeechPolicy,
  cacheKey: string,
  telemetry: ReturnType<typeof createPipelineTelemetry> | null,
): Promise<PlayAttemptResult | null> {
  for (const layer of layers.slice(0, 2)) {
    if (isLayerRecentlyFailed(layer, cacheKey)) continue;
    const tryLabel = `learned_${layer}`;
    beginLayerTry(telemetry, tryLabel);
    const result = await tryLearnableLayerPlay(
      layer,
      text,
      mode,
      ctx,
      waitUntilEnd,
      phonicsOnly,
      fallbackTexts,
      opts,
      policy,
    );
    if (result?.ok) {
      telemetry?.recordTry(tryLabel, true);
      return result;
    }
    if (result) {
      telemetry?.recordTry(tryLabel, false);
    }
  }
  return null;
}

/**
 * Fail-safe speak — adaptive layers, strict timeouts, never silent (visual last).
 */
export async function speakAmyVoice(
  rawText: string,
  opts: SpeakOptions | undefined,
  ctx: AmyVoicePipelineContext,
): Promise<SpeakResult & { layer?: AmyVoiceLayer }> {
  const policy = enforceAmySpeechPolicyInvariants(
    opts?.speechPolicy ?? prepareAmySpeechInput(rawText, opts),
  );
  const depth = ctx.depth ?? 0;

  if (depth === 0 && policy.useSemanticSplit && policy.phrases.length > 1) {
    const speakGeneration = bumpActiveSpeakGeneration();
    const pipelineCtx: AmyVoicePipelineContext = {
      ...ctx,
      speakGeneration,
      depth,
      playbackRate: ctx.playbackRate * policy.prosody.playbackRate,
    };
    recordTtsUserGesture();
    runWithControlledAudioStop(() => audioManager.stopAll());
    resetClientStaticAudioCircuit();
    resetTtsApiCircuit();
    resetAmyVoiceTelemetry();
    return speakSemanticPhrases(policy, opts, pipelineCtx);
  }

  const text = policy.normalizedText.trim();
  if (!text) return { success: false, error: "tts_empty_text" };

  if (opts?.parentHub && isParentHubAudioIdentity(opts.audioIdentity)) {
    assertVerbatimParentHubText(text, opts.audioIdentity.text);
    logParentHubAudioIdentity(opts.audioIdentity, { phase: "pipeline_entry" });
  } else if (opts?.coach && isCoachAudioIdentity(opts.audioIdentity)) {
    assertVerbatimCoachText(text, opts.audioIdentity.text);
    logCoachAudioIdentity(opts.audioIdentity, { phase: "pipeline_entry" });
  } else if (
    opts?.lessonParagraph &&
    opts.audioIdentity &&
    !isParentHubAudioIdentity(opts.audioIdentity) &&
    !isCoachAudioIdentity(opts.audioIdentity)
  ) {
    assertVerbatimLessonText(text, opts.audioIdentity.text);
    logLessonAudioIdentity(opts.audioIdentity, { phase: "pipeline_entry" });
  }

  const speakGeneration = depth === 0 ? bumpActiveSpeakGeneration() : getActiveSpeakGeneration();
  const pipelineFlags: NeverSilentPipelineFlags = {
    dynamicAttempted: false,
    streamingAttempted: false,
    emergencyAttempted: false,
    synthesisAttempted: false,
  };
  const pipelineCtx: AmyVoicePipelineContext = {
    ...ctx,
    speakGeneration,
    depth,
    playbackRate: ctx.playbackRate * policy.prosody.playbackRate,
    trackStreamingAttempt: () => {
      pipelineFlags.streamingAttempted = true;
    },
  };

  recordTtsUserGesture();
  runWithControlledAudioStop(() => audioManager.stopAll());
  resetClientStaticAudioCircuit();
  resetTtsApiCircuit();

  const attentionSilence = policy.phraseAttentionSilenceMs?.[0] ?? 0;
  if (depth === 0 && attentionSilence > 0) {
    await delay(attentionSilence);
  }

  const primaryMode: StaticAudioMode = policy.pipelineMode;
  if (isAndroidAmyNestAudioClient()) {
    primeStaticAudioInUserGesture(text, primaryMode);
  }

  if (!isTtsPlaybackAllowed()) {
    const blockedCacheKey = pipelineCacheKey(text, primaryMode, opts);
    const blockedFlags: NeverSilentPipelineFlags = {
      dynamicAttempted: false,
      streamingAttempted: false,
      emergencyAttempted: true,
      synthesisAttempted: false,
    };
    const emergency = await tryEmergencyLayer(text, pipelineCtx);
    if (emergency.ok) {
      return finishSpeak(emergency, opts?.waitUntilEnd ?? false, pipelineCtx, policy, depth);
    }
    const blockedChain: FailureChainEntry[] = [
      { layer: "emergency_local", error: emergency.error },
    ];
    return runNeverSilentFallback(
      text,
      primaryMode,
      pipelineCtx,
      policy,
      depth,
      blockedCacheKey,
      blockedChain,
      opts,
      blockedFlags,
      (result) => finishSpeak(result, opts?.waitUntilEnd ?? false, pipelineCtx, policy, depth),
      null,
    );
  }

  if (depth === 0 && isAdminEmergencyForced()) {
    const emergency = await tryEmergencyLayer(text, pipelineCtx);
    if (emergency.ok) {
      return finishSpeak(emergency, opts?.waitUntilEnd ?? false, pipelineCtx, policy, depth);
    }
  }

  if (depth === 0) resetAmyVoiceTelemetry();
  const failureChain: FailureChainEntry[] = [];
  const mode: StaticAudioMode = primaryMode;
  const waitUntilEnd = opts?.waitUntilEnd ?? false;
  const shallow = depth > 0;
  const cacheKey = pipelineCacheKey(text, mode, opts);
  const scoringContext = buildScoringContext(text, policy, opts);
  const scoredLayers = depth === 0 ? getScoredLayerOrder(cacheKey, text, policy, opts) : [];
  const strategy: PipelineStrategy =
    depth === 0 ? resolvePipelineStrategy(text, policy, cacheKey, opts) : "static_first";
  const budget =
    depth === 0 ? createAdaptivePipelineBudget(cacheKey, text, policy, opts) : null;
  const telemetry =
    depth === 0 ? createPipelineTelemetry(cacheKey, strategy, scoringContext) : null;
  const pregenPrimary: "static" | "cache" =
    scoredLayers[0] === "cache" ? "cache" : "static";
  let fallbackUsed = false;
  let budgetExceededFlag = false;

  const endPipeline = (
    result: SpeakResult & { layer?: AmyVoiceLayer },
    successLayer?: AmyVoiceLayer | null,
  ): SpeakResult & { layer?: AmyVoiceLayer } => {
    if (depth === 0 && telemetry) {
      telemetry.finish(
        successLayer ?? (result.success ? (result.layer ?? null) : null),
        fallbackUsed,
        budgetExceededFlag,
      );
    }
    return result;
  };

  const finishAttempt = (
    result: PlayAttemptResult,
    isFallback = false,
  ): SpeakResult & { layer?: AmyVoiceLayer } => {
    if (isFallback) fallbackUsed = true;
    const out = finishSpeak(result, waitUntilEnd, pipelineCtx, policy, depth, cacheKey);
    return endPipeline(out, result.ok ? result.layer : null);
  };

  const checkBudgetEmergency = async (): Promise<
    (SpeakResult & { layer?: AmyVoiceLayer }) | null
  > => {
    if (!budget?.exceeded()) return null;
    budgetExceededFlag = true;
    fallbackUsed = true;
    telemetry?.recordTry("budget_emergency");
    const emergency = await tryEmergencyLayer(text, pipelineCtx);
    if (emergency.ok) {
      return finishAttempt(emergency, true);
    }
    pushFailure(failureChain, emergency, "emergency_local", cacheKey);
    return null;
  };

  if (isStale(pipelineCtx)) return { success: false, error: "tts_cancelled" };

  const staticFallbackTexts = [
    ...(opts?.staticCatalogTexts ?? []),
    ...(policy.originalText.trim() && policy.originalText.trim() !== text
      ? [policy.originalText]
      : []),
  ];

  if (depth === 0 && shouldSkipLiveTtsWhenStaticExists()) {
    const staticMapped =
      hasStaticCatalogAudio(text) ||
      staticFallbackTexts.some(
        (candidate) =>
          Boolean(lookupStaticAudioUrl(candidate, mode)) ||
          Boolean(lookupStaticAudioUrl(candidate, "phonics")),
      );
    if (staticMapped) {
      const staticOnly = await tryPregeneratedParallelLayer(
        text,
        mode,
        pipelineCtx,
        waitUntilEnd,
        policy.forcePhonicsOnly,
        staticFallbackTexts,
        cacheKey,
        "static",
        opts,
      );
      if (staticOnly.ok) {
        return finishAttempt(staticOnly);
      }
      console.warn("[AudioPlaybackRecovery] static_only_failed — falling back to live TTS", {
        error: staticOnly.error,
        text: text.slice(0, 80),
      });
      pushFailure(failureChain, staticOnly, "static", cacheKey);
      fallbackUsed = true;
    }
  }

  if (depth === 0 && !shallow && scoredLayers.length > 0) {
    const learned = await tryScoredLayersPlay(
      scoredLayers,
      text,
      mode,
      pipelineCtx,
      waitUntilEnd,
      policy.forcePhonicsOnly,
      staticFallbackTexts,
      opts,
      policy,
      cacheKey,
      telemetry,
    );
    if (learned?.ok) {
      return finishAttempt(learned);
    }
    if (learned) {
      pushFailure(failureChain, learned, scoredLayers[0] ?? "static", cacheKey);
    }
  }

  const runDynamic = async (): Promise<PlayAttemptResult | null> => {
    if (policy.forcePhonicsOnly || shallow) return null;
    if (isApiGloballyDegraded()) return null;
    if (isSlowNetwork() && strategy !== "dynamic_first") return null;
    pipelineFlags.dynamicAttempted = true;
    beginLayerTry(telemetry, "dynamic");
    let result = await tryDynamicSequentialLayer(
      text,
      opts,
      pipelineCtx,
      waitUntilEnd,
      policy.dynamicTimeoutMs,
    );
    if (result.ok || !policy.retryDynamicTts || isStale(pipelineCtx)) {
      telemetry?.recordTry("dynamic", result.ok);
      return result;
    }
    recordAmyVoiceFallbackUsed("api", "api");
    await delay(SPEECH_COACH_RETRY_DELAY_MS);
    if (isStale(pipelineCtx)) return { ok: false, error: "tts_cancelled" };
    result = await tryDynamicSequentialLayer(
      text,
      opts,
      pipelineCtx,
      waitUntilEnd,
      policy.dynamicTimeoutMs,
    );
    telemetry?.recordTry("dynamic", result.ok);
    return result;
  };

  const runPregen = async (): Promise<PlayAttemptResult> => {
    beginLayerTry(telemetry, "pregen");
    const result = await tryPregeneratedParallelLayer(
      text,
      mode,
      pipelineCtx,
      waitUntilEnd,
      policy.forcePhonicsOnly,
      staticFallbackTexts,
      cacheKey,
      pregenPrimary,
      opts,
    );
    telemetry?.recordTry("pregen", result.ok);
    return result;
  };

  const tryBlendWordFinale = async (): Promise<PlayAttemptResult | null> => {
    if (!opts?.word || shallow) return null;
    if (isStale(pipelineCtx)) return { ok: false, error: "tts_cancelled" };
    return playPhonicsBlendFinale(opts.word, pipelineCtx, waitUntilEnd);
  };

  const preferDynamicFirst =
    strategy === "dynamic_first" && !policy.forcePhonicsOnly && !shallow;

  if (preferDynamicFirst) {
    const budgetJump = await checkBudgetEmergency();
    if (budgetJump) return budgetJump;

    telemetry?.recordTry("dynamic");
    const layer2 = await runDynamic();
    if (layer2?.ok) return finishAttempt(layer2);
    if (layer2) pushFailure(failureChain, layer2, "api", cacheKey);

    if (isStale(pipelineCtx)) return { success: false, error: "tts_cancelled" };
    const budgetJump2 = await checkBudgetEmergency();
    if (budgetJump2) return budgetJump2;

    telemetry?.recordTry("pregen");
    const layer1 = await runPregen();
    if (layer1.ok) return finishAttempt(layer1, true);
    pushFailure(failureChain, layer1, "static", cacheKey);

    const wordFinale = await tryBlendWordFinale();
    if (wordFinale?.ok) return finishAttempt(wordFinale, true);
    if (wordFinale) pushFailure(failureChain, wordFinale, "api", cacheKey);
  } else {
    const budgetJump = await checkBudgetEmergency();
    if (budgetJump) return budgetJump;

    telemetry?.recordTry("pregen");
    const layer1 = await runPregen();
    if (layer1.ok) return finishAttempt(layer1);
    pushFailure(failureChain, layer1, "static", cacheKey);

    const wordFinale = await tryBlendWordFinale();
    if (wordFinale?.ok) return finishAttempt(wordFinale, true);
    if (wordFinale) pushFailure(failureChain, wordFinale, "api", cacheKey);

    if (!policy.forcePhonicsOnly && !shallow && !isSlowNetwork()) {
      if (isStale(pipelineCtx)) return { success: false, error: "tts_cancelled" };
      const budgetJump2 = await checkBudgetEmergency();
      if (budgetJump2) return budgetJump2;

      telemetry?.recordTry("dynamic");
      const layer2 = await runDynamic();
      if (layer2?.ok) return finishAttempt(layer2, true);
      if (layer2) pushFailure(failureChain, layer2, "api", cacheKey);
    }
  }

  if (!shallow && policy.allowPhonicsSequence) {
    if (isStale(pipelineCtx)) return { success: false, error: "tts_cancelled" };
    const budgetJump = await checkBudgetEmergency();
    if (budgetJump) return budgetJump;

    recordAmyVoiceFallbackUsed("api", "phonics_sequence");
    telemetry?.recordTry("phonics_sequence");
    fallbackUsed = true;
    const layer3 = await withTimeout(
      tryPhonicsSequenceLayer(text, mode, pipelineCtx, policy, opts),
      LAYER2_TIMEOUT_MS + OPENAI_DYNAMIC_TIMEOUT_MS,
      "phonics_layer",
    ).catch((e) => ({
      ok: false as const,
      error: e instanceof Error ? e.message : "phonics_timeout",
    }));
    if (layer3.ok) return finishAttempt(layer3, true);
    pushFailure(failureChain, layer3, "phonics_sequence", cacheKey);
  }

  if (!shallow && policy.allowSpeechCoachSplit) {
    if (isStale(pipelineCtx)) return { success: false, error: "tts_cancelled" };
    const budgetJump = await checkBudgetEmergency();
    if (budgetJump) return budgetJump;

    telemetry?.recordTry("speech_coach_split");
    fallbackUsed = true;
    const layer4 = await withTimeout(
      trySpeechCoachSplitLayer(text, mode, pipelineCtx, policy),
      LAYER2_TIMEOUT_MS,
      "speech_split",
    ).catch((e) => ({
      ok: false as const,
      error: e instanceof Error ? e.message : "speech_split_timeout",
    }));
    if (layer4.ok) return finishAttempt(layer4, true);
    pushFailure(failureChain, layer4, "speech_coach_split", cacheKey);
  }

  if (isStale(pipelineCtx)) return { success: false, error: "tts_cancelled" };
  const budgetJump = await checkBudgetEmergency();
  if (budgetJump) return budgetJump;

  telemetry?.recordTry("emergency");
  fallbackUsed = true;
  pipelineFlags.emergencyAttempted = true;
  const layer5 = await tryEmergencyLayer(text, pipelineCtx);
  if (layer5.ok) return finishAttempt(layer5, true);
  pushFailure(failureChain, layer5, "emergency_local", cacheKey);

  if (!shallow && policy.preferSpeechSynthesisFallback) {
    if (isStale(pipelineCtx)) return { success: false, error: "tts_cancelled" };
    telemetry?.recordTry("speech_synthesis");
    fallbackUsed = true;
    pipelineFlags.synthesisAttempted = true;
    const synth = await trySpeechSynthesisLayer(text, pipelineCtx, policy);
    if (synth.ok) return finishAttempt(synth, true);
    pushFailure(failureChain, synth, "emergency_local", cacheKey);
  }

  recordAmyVoiceFailureChain(text, failureChain, {
    mode,
    speechMode: policy.speechMode,
  });
  return runNeverSilentFallback(
    text,
    mode,
    pipelineCtx,
    policy,
    depth,
    cacheKey,
    failureChain,
    opts,
    pipelineFlags,
    finishAttempt,
    telemetry,
  );
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
