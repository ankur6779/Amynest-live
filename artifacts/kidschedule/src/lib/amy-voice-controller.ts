/**
 * Amy voice controller — single owner of TTS playback lifecycle.
 *
 * RULES:
 * - UI cannot control playback directly (no lifecycle stop, no audioManager access).
 * - Only this controller manages audio lifecycle via speak() / pause() intents.
 * - No lifecycle-based stop allowed — explicit pause() on user actions only.
 * - All playback must go through the request ownership model (latest requestId wins).
 * - Stale async work exits without side effects; dev mode throws on stale state mutation.
 */

import { createRunLatest } from "@/lib/run-latest";
import {
  createSpeakRequest,
  isCurrentSpeakRequest,
  invalidateSpeakRequests,
  bumpAudioIntentEpoch,
  isCurrentAudioIntent,
  isControlledAudioStop,
  runWithControlledAudioStop,
  warnExternalAudioStop,
} from "@/lib/amy-voice-ownership";
import { prepareAmySpeechInput, type AmySpeechPolicy } from "@/lib/amy-speech-mode";
import { enforceAmySpeechPolicyInvariants } from "@/lib/amy-voice-invariants";
import {
  assertVerbatimLessonText,
  logLessonAudioIdentity,
  type AudioIdentity,
} from "@/lib/lesson-audio-identity";
import {
  assertVerbatimParentHubText,
  isParentHubAudioIdentity,
  logParentHubAudioIdentity,
  parentHubPipelineCacheKey,
  type ParentHubAudioIdentity,
} from "@/lib/parent-hub-audio-identity";
import {
  assertVerbatimCoachText,
  isCoachAudioIdentity,
  logCoachAudioIdentity,
  coachPipelineCacheKey,
  type CoachAudioIdentity,
} from "@/lib/coach-audio-identity";
import { buildAdaptiveDelivery } from "@/lib/amy-voice-emotion";
import {
  assessAmyDifficulty,
  commitDifficultyLevel,
  getSessionSuccessStreak,
  recordAmyVoiceHesitation,
} from "@/lib/amy-voice-difficulty";
import {
  detectAmyIntent,
  simplifyPhrasesForDifficulty,
} from "@/lib/amy-voice-intent";
import { applyTeacherDelivery } from "@/lib/amy-voice-teacher";
import {
  recordAmyVoicePhraseReplay,
  computeLearningPriority,
} from "@/lib/amy-voice-learning";
import {
  preloadAmyVoiceAnticipatory,
  recordAmyVoiceSessionPhrase,
} from "@/lib/amy-voice-preload";
import {
  applyAmyVoiceDeliveryModifiers,
  isAmyVoiceFallbackLayer,
  recordAmyVoiceDeliveryOutcome,
  resolveAmyVoiceDeliveryProfile,
  type AmyVoiceDeliveryProfile,
} from "@/lib/amy-voice-delivery-profile";
import { bootstrapAmyVoiceGovernanceForRuntime } from "@/lib/amy-voice-governance";
import { recordAmyVoiceSpeakOutcome } from "@/lib/amy-voice-health";
import {
  recordAmyVoiceDifficultyTransition,
  recordAmyVoiceStrugglePhrase,
} from "@/lib/amy-voice-analytics";
import {
  speakAmyVoice,
  mapPlayErrorToSpeakResult,
  type AmyVoicePipelineContext,
} from "@/lib/amy-voice-pipeline";
import {
  isPhonicsHubFastClip,
  speakPhonicsFastClip,
} from "@/lib/phonics-audio";
import { stopPhonicsPlayback, isPhonicsPlaying } from "@/lib/phonics-player";
import {
  playControllerEmergencyAudio,
  resetGuardFailures,
  resetGuardForUserSpeak,
  shouldBypassAudioGuard,
  trackGuardFailure,
  CONTROLLER_EMERGENCY_PHRASE,
  type PlaybackFailureFeedback,
} from "@/lib/amy-voice-audio-guard";
import { resolveApiMediaUrl } from "@/lib/api";
import { audioManager, type AudioSrcType } from "@/lib/audio-manager";
import { emitAudioPlaybackEvent } from "@/lib/audio-playback-events";
import {
  resolveClientPlaybackUrl,
} from "@/lib/tts-playback";
import { prepareRemotePlaybackAudio } from "@/lib/static-audio";
import {
  attachAudioPipelineElementListeners,
  logAudioPipeline,
  setAudioPipelineMachineState,
} from "@/lib/debug-audio-pipeline";
import {
  logAudioHealthFailure,
  logAudioHealthFallback,
  logAudioHealthSuccess,
  mapAmyLayerToHealthLayer,
  startAudioHealthSpeak,
} from "@/lib/audio-health";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import {
  getAudioTraceModule,
  traceAudioManagerPlayResult,
  traceBrokenModulePreflight,
  tracePlayPreparedUrlInput,
} from "@/lib/audio-root-cause-trace";
import {
  resolvePlaybackMode,
  waitForSafePlaybackCompletion,
  type PlaybackMode,
} from "@/lib/amy-voice-playback-contract";
import type { AmyVoiceLayer } from "@/lib/amy-voice-telemetry";
import type { AuthFetchFn } from "@/lib/poll-result";
import { amyVoicePlaybackFsm } from "@/lib/audio-playback-state-machine";
import { isAudioPlaybackRecoveryMode } from "@/lib/audio-playback-recovery";
import {
  beginPlaybackTrace,
  flushPlaybackTrace,
  playbackTraceOwnerFromModule,
  tracePlaybackStopAll,
} from "@/lib/playback-trace";
import { recordPlaybackQualityRequested } from "@/lib/playback-quality-telemetry";
import {
  mapToAudioSourceLayer,
  resolveAudioReliabilityModule,
  recordSpeechCoachCacheOutcome,
  trackAudioCancelled,
  trackAudioPlayFailed,
  trackAudioPlayStarted,
  trackAudioRequest,
  trackAudioTimeout,
  finishAudioRequest,
} from "@/lib/audio-reliability-telemetry";
import {
  coalesceAudioRequest,
  resolveSpeakCoalesceKey,
} from "@/lib/audio-request-coalescer";
import {
  clearPlaybackQueue,
  enqueueFifoPlayback,
  getQueuePolicy,
  recordQueueInterruption,
} from "@/lib/audio-playback-queue";
import { recordHotCachePlay } from "@/lib/audio-hot-cache";

export type AmyVoiceStatus = "idle" | "loading" | "playing";

export type { PlaybackMode } from "@/lib/amy-voice-playback-contract";

export interface SpeakOptions {
  mode?: "default" | "phonics";
  phoneme?: string;
  word?: string;
  waitUntilEnd?: boolean;
  /** Explicit playback contract — default: full-required (safe). */
  playbackMode?: PlaybackMode;
  /** Long-form narration (stories, articles) — implies full-required. */
  narration?: boolean;
  lessonParagraph?: boolean;
  /** Parent Hub read-aloud — implies verbatim identity + full-required by default. */
  parentHub?: boolean;
  /** Amy Coach win listen-aloud — plan-scoped shared cache. */
  coach?: boolean;
  /** Canonical lesson paragraph, Parent Hub, or Coach identity — required for guarded playback. */
  audioIdentity?: AudioIdentity | ParentHubAudioIdentity | CoachAudioIdentity;
  /** @deprecated Use audioIdentity.lessonId */
  lessonId?: string;
  /** @deprecated Use audioIdentity.paragraphIdx */
  lessonParagraphIndex?: number;
  catalogPlayback?: boolean;
  staticCatalogTexts?: string[];
  speechPolicy?: AmySpeechPolicy;
  onFinished?: () => void;
  /** Per-speak playback rate override (e.g. spelling slow mode 0.65). */
  playbackRate?: number;
}

export type PlayPreparedUrlOptions = {
  playbackRate?: number;
  source?: string;
  phrase?: string;
  srcType?: AudioSrcType;
  isCancelled?: () => boolean;
  waitUntilEnd?: boolean;
  /**
   * Skip async blob prepare before play(). Required for lesson / catalog clips started
   * from a tap — mobile WebViews drop the user-gesture token across fetch awaits.
   */
  preferDirectStream?: boolean;
};

export type SpeakResult =
  | { success: true; layer?: AmyVoiceLayer }
  | { success: false; error: string; layer?: AmyVoiceLayer; handled?: boolean };

export type AmyVoiceControllerSnapshot = {
  status: AmyVoiceStatus;
  error: string | null;
  requestId: number;
  /** Normalized phrase for the clip currently loading/playing (per-button UI). */
  activePhrase: string | null;
};

export interface AmyVoiceRuntime {
  authFetch: AuthFetchFn;
  voiceId?: string;
  modelId?: string;
  playbackRate?: number;
  onFinished?: () => void;
  /** Surface retry when pipeline + emergency both fail. */
  onPlaybackFailure?: (feedback: PlaybackFailureFeedback) => void;
  /** When false, onFinished and UI-facing errors are suppressed for this hook instance. */
  isMounted?: () => boolean;
}

type SnapshotListener = (snapshot: AmyVoiceControllerSnapshot) => void;

const speakExecutor = createRunLatest();

function logTts(event: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.debug("[AmyVoiceController]", event);
  }
}

function installDevAudioStopGuard(): void {
  if (!import.meta.env.DEV) return;
  const manager = audioManager as typeof audioManager & {
    __amyVoiceGuardInstalled?: boolean;
  };
  if (manager.__amyVoiceGuardInstalled) return;
  manager.__amyVoiceGuardInstalled = true;

  const origStop = audioManager.stop.bind(audioManager);
  const origStopAll = audioManager.stopAll.bind(audioManager);

  audioManager.stop = (...args: Parameters<typeof origStop>) => {
    if (!isControlledAudioStop()) warnExternalAudioStop("audioManager.stop");
    return origStop(...args);
  };

  audioManager.stopAll = (...args: Parameters<typeof origStopAll>) => {
    if (!isControlledAudioStop()) warnExternalAudioStop("audioManager.stopAll");
    return origStopAll(...args);
  };
}

installDevAudioStopGuard();

function snapshotFromStatus(
  status: AmyVoiceStatus,
  error: string | null,
  requestId: number,
  activePhrase: string | null = null,
): AmyVoiceControllerSnapshot {
  return { status, error, requestId, activePhrase };
}

/** Frozen public API — UI and hooks may only use these methods. */
export interface AmyVoiceControllerPublic {
  speak(
    rawText: string,
    opts: SpeakOptions | undefined,
    runtime: AmyVoiceRuntime,
  ): Promise<SpeakResult>;
  /** Play a pre-generated URL through the speech channel (session audio, cached TTS). */
  playPreparedUrl(
    url: string,
    opts?: PlayPreparedUrlOptions,
  ): Promise<SpeakResult>;
  /** Resolve narration URL via the standard TTS API (no playback). */
  fetchNarrationUrl(
    authFetch: AuthFetchFn,
    text: string,
    init?: { signal?: AbortSignal; category?: string },
  ): Promise<{ url: string; cacheKey?: string } | null>;
  pause(): void;
  subscribe(listener: SnapshotListener): () => void;
  getSnapshot(): Readonly<AmyVoiceControllerSnapshot>;
}

class AmyVoiceController implements AmyVoiceControllerPublic {
  private snapshot: AmyVoiceControllerSnapshot = snapshotFromStatus("idle", null, 0, null);
  private listeners = new Set<SnapshotListener>();
  private abortController: AbortController | null = null;
  private loadingWatchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private activeReliabilityRequestId: string | null = null;

  constructor() {
    amyVoicePlaybackFsm.setWatchdogHandler((rid) => {
      if (isAudioPlaybackRecoveryMode()) {
        console.warn("[AudioPlaybackRecovery] fsm_loading_watchdog_skipped", { rid });
        return;
      }
      const requestId = Number.parseInt(rid, 10);
      if (!Number.isFinite(requestId)) return;
      trackAudioTimeout(this.activeReliabilityRequestId ?? rid, "audio_start_timeout");
      if (this.abortController) this.abortController.abort();
      amyVoicePlaybackFsm.markFailed(rid, "audio_start_timeout");
    });
  }

  private clearLoadingWatchdog(): void {
    if (this.loadingWatchdogTimer != null) {
      clearTimeout(this.loadingWatchdogTimer);
      this.loadingWatchdogTimer = null;
    }
  }

  private armLoadingWatchdog(requestId: number, runtime: AmyVoiceRuntime, rawText: string, opts?: SpeakOptions): void {
    if (isAudioPlaybackRecoveryMode()) return;
    this.clearLoadingWatchdog();
    this.loadingWatchdogTimer = setTimeout(() => {
      if (!isCurrentSpeakRequest(requestId)) return;
      if (this.snapshot.status !== "loading") return;
      trackAudioTimeout(this.activeReliabilityRequestId ?? String(requestId), "controller_loading_timeout");
      amyVoicePlaybackFsm.markFailed(String(requestId), "controller_loading_timeout");
      this.stopCurrentAudio();
      void this.handleAudioFailure(
        { success: false, error: "audio_start_timeout" },
        { requestId, rawText, opts, runtime },
      );
    }, 3_000);
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): AmyVoiceControllerSnapshot {
    return this.snapshot;
  }

  private publish(next: AmyVoiceControllerSnapshot): void {
    this.snapshot = next;
    for (const listener of this.listeners) {
      listener(next);
    }
  }

  /** Only the owning request may transition controller state. */
  private transition(
    requestId: number,
    status: AmyVoiceStatus,
    error: string | null = this.snapshot.error,
    activePhrase: string | null = status === "idle" ? null : this.snapshot.activePhrase,
  ): void {
    if (!isCurrentSpeakRequest(requestId)) {
      if (import.meta.env.DEV) {
        throw new Error(
          `[AmyVoiceController] Stale request ${requestId} attempted to mutate state → ${status}`,
        );
      }
      return;
    }
    this.publish(snapshotFromStatus(status, error, requestId, activePhrase));
  }

  private stopCurrentAudio(): void {
    tracePlaybackStopAll("AmyVoiceController", "stopCurrentAudio");
    // An actively-playing phonics clip is a separate single owner. When it owns
    // the speech channel the controller has no audio of its own there, so tearing
    // the channel down (stopPhonicsPlayback + audioManager.stopAll) would only
    // silence the phonics clip mid-play. Let it finish naturally — a real
    // controller playback still supersedes it via audioManager.play({ interrupt })
    // if/when one actually starts. We still abort our own in-flight TTS fetch.
    if (isPhonicsPlaying()) {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      return;
    }
    // Phonics player is a separate single owner — stop it too so a new tap can
    // never overlap a still-playing phoneme/blend.
    stopPhonicsPlayback("controller_stop");
    recordQueueInterruption();
    runWithControlledAudioStop(() => {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      audioManager.stopAll();
    });
  }

  /** User intent: pause / cancel current playback. */
  pause(): void {
    // partial-ok playback transitions the controller to idle while audioManager
    // may still be playing — always honor pause when speech is active.
    if (
      this.snapshot.status === "idle" &&
      !this.abortController &&
      !audioManager.isSpeechPlaying()
    ) {
      return;
    }
    clearPlaybackQueue();
    const requestId = invalidateSpeakRequests();
    logTts({ reason: "pause", requestId });
    if (this.activeReliabilityRequestId) {
      trackAudioCancelled(this.activeReliabilityRequestId);
      finishAudioRequest(this.activeReliabilityRequestId);
      this.activeReliabilityRequestId = null;
    }
    this.clearLoadingWatchdog();
    amyVoicePlaybackFsm.reset();
    this.stopCurrentAudio();
    this.publish(snapshotFromStatus("idle", null, requestId, null));
  }

  private async handleAudioFailure(
    result: SpeakResult,
    ctx: {
      requestId: number;
      rawText: string;
      opts?: SpeakOptions;
      runtime: AmyVoiceRuntime;
    },
  ): Promise<SpeakResult> {
    const error = "error" in result ? result.error : "tts_failed";
    const layer = "layer" in result ? result.layer : undefined;

    if (shouldBypassAudioGuard(error)) {
      return { success: false, error, layer };
    }

    trackGuardFailure();
    logTts({ event: "audio_failure", error, layer: result.layer });
    logAudioHealthFailure(error, mapAmyLayerToHealthLayer(layer));

    const emergencyText = (ctx.rawText ?? "").trim() || CONTROLLER_EMERGENCY_PHRASE;
    try {
      const emergencyResult = await playControllerEmergencyAudio(emergencyText);
      if (emergencyResult.success) {
        resetGuardFailures();
        logTts({ event: "emergency_success", forced: true });
        logTts({ event: "final_guard", status: "fallback", error });
        logAudioHealthFallback(
          mapAmyLayerToHealthLayer(layer) ?? "api",
          "emergency",
        );
        logAudioHealthSuccess({
          layer: "emergency",
          fallbackUsed: true,
        });
        if (!ctx.runtime.isMounted || ctx.runtime.isMounted()) {
          this.transition(ctx.requestId, "idle", null, null);
        }
        return emergencyResult;
      }
    } catch (err) {
      logTts({
        event: "emergency_failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const retry = () => this.runSpeak(ctx.rawText, ctx.opts, ctx.runtime);

    if (!ctx.runtime.isMounted || ctx.runtime.isMounted()) {
      ctx.runtime.onPlaybackFailure?.({
        message: "Audio unavailable. Retrying…",
        error,
        retry,
      });
      this.transition(ctx.requestId, "idle", error, null);
    }

    if (this.activeReliabilityRequestId) {
      trackAudioPlayFailed(
        this.activeReliabilityRequestId,
        error,
        mapToAudioSourceLayer(layer),
      );
      finishAudioRequest(this.activeReliabilityRequestId);
      this.activeReliabilityRequestId = null;
    }
    this.clearLoadingWatchdog();
    amyVoicePlaybackFsm.markFailed(String(ctx.requestId), error);

    logTts({ event: "final_guard", status: "error", error });
    return { success: false, error, layer, handled: true };
  }

  /** User intent: speak text. Latest tap wins (interrupt modules) or FIFO queue (hub/lessons). */
  speak(
    rawText: string,
    opts: SpeakOptions | undefined,
    runtime: AmyVoiceRuntime,
  ): Promise<SpeakResult> {
    const module = resolveAudioReliabilityModule({
      speakOpts: opts,
      blending: !!opts?.word,
    });
    const coalesceKey = resolveSpeakCoalesceKey(rawText, opts, module);
    const run = () => this.runSpeak(rawText, opts, runtime);
    const exec = coalesceKey ? () => coalesceAudioRequest(coalesceKey, run) : run;
    const onReject = (err: unknown) => {
      if ((err as { code?: string })?.code === "tts_superseded") {
        logTts({ reason: "superseded" });
        return { success: false, error: "tts_stale" };
      }
      throw err;
    };

    if (getQueuePolicy(module) === "fifo") {
      return exec().catch(onReject);
    }
    return speakExecutor.runLatest(exec).catch(onReject);
  }

  private async runSpeak(
    rawText: string,
    opts: SpeakOptions | undefined,
    runtime: AmyVoiceRuntime,
  ): Promise<SpeakResult> {
    const parentHubIdentity =
      opts?.parentHub && isParentHubAudioIdentity(opts.audioIdentity)
        ? opts.audioIdentity
        : null;
    const coachIdentity =
      opts?.coach && isCoachAudioIdentity(opts.audioIdentity) ? opts.audioIdentity : null;
    const text = parentHubIdentity
      ? parentHubIdentity.text
      : coachIdentity
        ? coachIdentity.text
        : (rawText ?? "").trim();
    if (!text) {
      return { success: false, error: "tts_empty_text" };
    }

    const traceModule = getAudioTraceModule();
    if (traceModule) {
      traceBrokenModulePreflight(traceModule, {
        audioIdentity: opts?.audioIdentity,
        resolvedText: text,
        staticCatalogTexts: opts?.staticCatalogTexts,
        catalogPlayback: opts?.catalogPlayback,
      });
    }

    const requestId = createSpeakRequest();
    const intentEpoch = bumpAudioIntentEpoch();
    recordPlaybackQualityRequested({
      owner: "AmyVoice",
      assetRequested: text.slice(0, 80),
      assetResolved: opts?.word ?? text.slice(0, 80),
      extra: {
        mode: opts?.mode,
        requestId,
        blending: !!opts?.word,
      },
    });
    const reliabilityModule = resolveAudioReliabilityModule({
      speakOpts: opts,
      blending: !!opts?.word,
    });

    if (opts?.parentHub) {
      const identity = opts.audioIdentity;
      if (!isParentHubAudioIdentity(identity)) {
        const msg = "Parent Hub playback requires audioIdentity";
        if (import.meta.env.DEV) throw new Error(msg);
        console.error("[ParentHubAudioIdentity]", msg);
        return { success: false, error: "parent_hub_identity_missing" };
      }
      assertVerbatimParentHubText(rawText, identity.text);
      logParentHubAudioIdentity(identity, { phase: "speak_start", requestId });
    }

    if (opts?.lessonParagraph) {
      const identity = opts.audioIdentity;
      if (!identity || isParentHubAudioIdentity(identity) || isCoachAudioIdentity(identity)) {
        const msg = "Lesson playback requires audioIdentity";
        if (import.meta.env.DEV) throw new Error(msg);
        console.error("[LessonAudioIdentity]", msg);
        return { success: false, error: "lesson_identity_missing" };
      }
      assertVerbatimLessonText(text, identity.text);
      if (identity.lessonId !== opts.lessonId && opts.lessonId != null) {
        const msg = "Lesson speak lessonId mismatch";
        if (import.meta.env.DEV) throw new Error(msg);
        console.error("[LessonAudioIdentity]", msg);
        return { success: false, error: "lesson_identity_mismatch" };
      }
      if (
        identity.paragraphIdx !== opts.lessonParagraphIndex &&
        opts.lessonParagraphIndex != null
      ) {
        const msg = "Lesson speak paragraphIdx mismatch";
        if (import.meta.env.DEV) throw new Error(msg);
        console.error("[LessonAudioIdentity]", msg);
        return { success: false, error: "lesson_identity_mismatch" };
      }
      logLessonAudioIdentity(identity, { phase: "speak_start", requestId });
    }

    if (opts?.coach) {
      const identity = opts.audioIdentity;
      if (!isCoachAudioIdentity(identity)) {
        const msg = "Coach playback requires audioIdentity";
        if (import.meta.env.DEV) throw new Error(msg);
        console.error("[CoachAudioIdentity]", msg);
        return { success: false, error: "coach_identity_missing" };
      }
      assertVerbatimCoachText(rawText, identity.text);
      logCoachAudioIdentity(identity, { phase: "speak_start", requestId });
    }
    logTts({ reason: "speak_start", requestId, textPreview: text.slice(0, 80) });

    startAudioHealthSpeak(opts);
    recordTtsUserGesture();
    resetGuardForUserSpeak();
    if (getQueuePolicy(reliabilityModule) === "interrupt") {
      this.stopCurrentAudio();
    }
    this.abortController = new AbortController();
    const activePhrase = text.toLowerCase();
    this.activeReliabilityRequestId = trackAudioRequest({
      module: reliabilityModule,
      audioIdentity: text.slice(0, 120),
    });
    amyVoicePlaybackFsm.beginRequest(String(requestId));
    this.transition(requestId, "loading", null, activePhrase);
    this.armLoadingWatchdog(requestId, runtime, rawText, opts);

    if (isPhonicsHubFastClip(text, opts)) {
      try {
        this.transition(requestId, "playing", null, activePhrase);
        amyVoicePlaybackFsm.markPlaying(String(requestId));
        this.clearLoadingWatchdog();
        const fast = await speakPhonicsFastClip(text, {
          phoneme: opts?.phoneme,
          playbackRate: opts?.playbackRate ?? runtime.playbackRate ?? 1,
          isCancelled: () => !isCurrentSpeakRequest(requestId),
        });
        if (!isCurrentSpeakRequest(requestId)) {
          return { success: false, error: "tts_stale" };
        }
        if (fast.success) {
          resetGuardFailures();
          if (this.activeReliabilityRequestId) {
            trackAudioPlayStarted(
              this.activeReliabilityRequestId,
              mapToAudioSourceLayer(fast.layer),
            );
            finishAudioRequest(this.activeReliabilityRequestId);
            this.activeReliabilityRequestId = null;
          }
          amyVoicePlaybackFsm.markCompleted(String(requestId));
          logAudioHealthSuccess({
            layer: mapAmyLayerToHealthLayer(fast.layer),
            fallbackUsed: fast.layer === "emergency_local",
          });
          this.transition(requestId, "idle", null, null);
          (opts?.onFinished ?? runtime.onFinished)?.();
          return fast;
        }
        logTts({ reason: "phonics_fast_miss", requestId, error: fast.error });
        amyVoicePlaybackFsm.markCompleted(String(requestId));
        this.transition(requestId, "idle", null, null);
        if (this.activeReliabilityRequestId) {
          finishAudioRequest(this.activeReliabilityRequestId);
          this.activeReliabilityRequestId = null;
        }
        return fast;
      } catch (err) {
        logTts({
          reason: "phonics_fast_error",
          requestId,
          error: err instanceof Error ? err.message : String(err),
        });
        amyVoicePlaybackFsm.markCompleted(String(requestId));
        this.transition(requestId, "idle", null, null);
        if (this.activeReliabilityRequestId) {
          finishAudioRequest(this.activeReliabilityRequestId);
          this.activeReliabilityRequestId = null;
        }
        return {
          success: false,
          error: err instanceof Error ? err.message : "phonics_audio_preparing",
        };
      }
    }

    this.transition(requestId, "loading", null, activePhrase);

    const playbackTraceId = beginPlaybackTrace({
      owner: playbackTraceOwnerFromModule(getAudioTraceModule(), "AmyVoiceController"),
      requestedUrl: text,
      phrase: text.slice(0, 120),
      autoFlush: false,
    });

    const pipelineCtx: AmyVoicePipelineContext = {
      authFetch: runtime.authFetch,
      voiceId: runtime.voiceId,
      modelId: runtime.modelId,
      playbackRate: opts?.playbackRate ?? runtime.playbackRate ?? 1,
      playbackMode: resolvePlaybackMode(opts),
      playbackTraceId: playbackTraceId || undefined,
      paragraphIdx:
        opts?.audioIdentity && "paragraphIdx" in opts.audioIdentity
          ? opts.audioIdentity.paragraphIdx
          : undefined,
      intentEpoch,
      reliabilityModule,
      reliabilityRequestId: this.activeReliabilityRequestId,
      isCancelled: () => !isCurrentSpeakRequest(requestId),
      onFinished: () => {
        if (!isCurrentSpeakRequest(requestId)) return;
        if (runtime.isMounted && !runtime.isMounted()) return;
        (opts?.onFinished ?? runtime.onFinished)?.();
      },
    };

    try {
      bootstrapAmyVoiceGovernanceForRuntime();
      const speakStartedAt = performance.now();
      let deliveryProfile: AmyVoiceDeliveryProfile | null = null;

      const speechPolicy = prepareAmySpeechInput(text, opts);
      let finalizedPolicy: AmySpeechPolicy;
      let replayCount = 0;
      let difficultyLevel: AmySpeechPolicy["difficultyLevel"] = "neutral";

      if (opts?.lessonParagraph || opts?.catalogPlayback || opts?.parentHub) {
        finalizedPolicy = enforceAmySpeechPolicyInvariants(speechPolicy);
        if (
          opts?.lessonParagraph &&
          opts.audioIdentity &&
          !isParentHubAudioIdentity(opts.audioIdentity)
        ) {
          assertVerbatimLessonText(finalizedPolicy.normalizedText, opts.audioIdentity.text);
          assertVerbatimLessonText(finalizedPolicy.originalText, opts.audioIdentity.text);
        }
        if (opts?.parentHub && isParentHubAudioIdentity(opts.audioIdentity)) {
          assertVerbatimParentHubText(finalizedPolicy.normalizedText, opts.audioIdentity.text);
          assertVerbatimParentHubText(finalizedPolicy.originalText, opts.audioIdentity.text);
        }
      } else {
        replayCount = recordAmyVoicePhraseReplay(
          speechPolicy.normalizedText,
          speechPolicy.pipelineMode,
          speechPolicy.speechMode,
        );
        if (replayCount >= 2) recordAmyVoiceHesitation();

        const intent = detectAmyIntent(
          speechPolicy.normalizedText,
          speechPolicy.speechMode,
        );
        const difficulty = assessAmyDifficulty(
          speechPolicy.normalizedText,
          speechPolicy.pipelineMode,
          replayCount,
        );
        difficultyLevel = difficulty.level;
        const previousDifficulty = commitDifficultyLevel(difficulty.level);
        recordAmyVoiceDifficultyTransition(previousDifficulty, difficulty.level);

        deliveryProfile = resolveAmyVoiceDeliveryProfile({
          replayCount,
          difficulty: difficulty.level,
        });

        let phrases = speechPolicy.phrases;
        if (difficulty.level === "struggling") {
          phrases = simplifyPhrasesForDifficulty(phrases, true);
        }
        phrases = applyTeacherDelivery({
          phrases,
          intent,
          difficulty: difficulty.level,
          previousDifficulty,
          speechMode: speechPolicy.speechMode,
          multiStep: phrases.length > 1 || speechPolicy.useSemanticSplit,
          successStreak: getSessionSuccessStreak(),
          guidanceTierOverride: deliveryProfile.guidanceTier,
        });
        speechPolicy.phrases = phrases;
        speechPolicy.useSemanticSplit = phrases.length > 1;
        speechPolicy.normalizedText =
          phrases.length === 1
            ? phrases[0]!
            : phrases.join(speechPolicy.prosody.pauseMarker);

        const delivery = buildAdaptiveDelivery(
          speechPolicy.prosody,
          speechPolicy.speechMode,
          speechPolicy.normalizedText,
          replayCount,
          intent,
          difficulty.level,
        );
        speechPolicy.prosody = applyAmyVoiceDeliveryModifiers(
          delivery.prosody,
          deliveryProfile.modifiers,
        );
        speechPolicy.emotion = delivery.emotion;
        speechPolicy.intent = delivery.intent;
        speechPolicy.difficultyLevel = delivery.difficulty;
        speechPolicy.replayCount = replayCount;
        speechPolicy.learningPriority = computeLearningPriority(
          speechPolicy.normalizedText,
          speechPolicy.pipelineMode,
          speechPolicy.speechMode,
        );
        finalizedPolicy = enforceAmySpeechPolicyInvariants(speechPolicy);
        recordAmyVoiceSessionPhrase(finalizedPolicy.normalizedText);
        preloadAmyVoiceAnticipatory(finalizedPolicy);
      }

      if (!isCurrentSpeakRequest(requestId)) {
        logTts({ reason: "stale_request", requestId, phase: "pre_pipeline" });
        return { success: false, error: "tts_stale" };
      }

      this.transition(requestId, "playing", null, activePhrase);
      amyVoicePlaybackFsm.markPlaying(String(requestId));
      this.clearLoadingWatchdog();

      const pipelineMode = finalizedPolicy!.pipelineMode;
      const invokePipeline = () =>
        speakAmyVoice(
          finalizedPolicy!.normalizedText,
          {
            ...opts,
            mode: pipelineMode,
            speechPolicy: finalizedPolicy,
          },
          pipelineCtx,
        );

      const result =
        getQueuePolicy(reliabilityModule) === "fifo"
          ? await new Promise<Awaited<ReturnType<typeof speakAmyVoice>>>((resolve) => {
              enqueueFifoPlayback(async () => {
                if (!isCurrentAudioIntent(intentEpoch) || !isCurrentSpeakRequest(requestId)) {
                  resolve({ success: false, error: "tts_stale" });
                  return;
                }
                resolve(await invokePipeline());
              });
            })
          : await invokePipeline();

      if (!isCurrentSpeakRequest(requestId)) {
        logTts({ reason: "stale_request", requestId, phase: "post_pipeline" });
        return { success: false, error: "tts_stale" };
      }

      const durationMs = Math.round(performance.now() - speakStartedAt);
      const fallback = result.success ? isAmyVoiceFallbackLayer(result.layer) : true;

      if (deliveryProfile) {
        recordAmyVoiceDeliveryOutcome(deliveryProfile, {
          replayCount,
          difficulty: difficultyLevel,
          durationMs,
          fallback,
        });
      }
      if (result.success) {
        recordAmyVoiceSpeakOutcome({
          speechMode: finalizedPolicy!.speechMode,
          pipelineMode: finalizedPolicy!.pipelineMode,
          layer: result.layer,
          replayCount,
          durationMs,
          success: true,
        });
      }
      if (replayCount >= 2 || fallback || difficultyLevel === "struggling") {
        recordAmyVoiceStrugglePhrase(
          finalizedPolicy!.normalizedText,
          finalizedPolicy!.speechMode,
          finalizedPolicy!.pipelineMode,
          { replayCount, difficulty: difficultyLevel, fallback },
        );
      }

      if (!result.success) {
        const err = "error" in result ? result.error : "tts_failed";
        logTts({ reason: "speak_failed", requestId, error: err, layer: result.layer });
        return this.handleAudioFailure(result, {
          requestId,
          rawText,
          opts,
          runtime,
        });
      }

      resetGuardFailures();
      if (this.activeReliabilityRequestId) {
        trackAudioPlayStarted(
          this.activeReliabilityRequestId,
          mapToAudioSourceLayer(result.layer),
        );
        finishAudioRequest(this.activeReliabilityRequestId);
        this.activeReliabilityRequestId = null;
      }
      if (opts?.coach) {
        const hit = result.layer === "static" || result.layer === "cache";
        recordSpeechCoachCacheOutcome(
          text,
          hit,
          result.layer === "static" ? "static" : result.layer === "cache" ? "cache" : "dynamic",
        );
        if (isCoachAudioIdentity(opts.audioIdentity)) {
          recordHotCachePlay(coachPipelineCacheKey(opts.audioIdentity));
        }
      }
      if (opts?.parentHub && isParentHubAudioIdentity(opts.audioIdentity)) {
        recordHotCachePlay(parentHubPipelineCacheKey(opts.audioIdentity));
      }
      amyVoicePlaybackFsm.markCompleted(String(requestId));
      logTts({ event: "final_guard", status: "success" });
      logAudioHealthSuccess({
        layer: mapAmyLayerToHealthLayer(result.layer),
        fallbackUsed: isAmyVoiceFallbackLayer(result.layer),
        totalDurationMs: durationMs,
      });

      if (
        result.layer !== "text_visual" &&
        result.layer !== "phonics_sequence" &&
        result.layer !== "speech_coach_split" &&
        !finalizedPolicy!.useSemanticSplit &&
        !opts?.waitUntilEnd
      ) {
        const el = audioManager.getCurrentElement();
        if (el) {
          const prevEnded = el.onended;
          el.onended = (ev) => {
            prevEnded?.call(el, ev);
            if (!isCurrentSpeakRequest(requestId)) return;
            if (runtime.isMounted && !runtime.isMounted()) return;
            this.transition(requestId, "idle", null, null);
            (opts?.onFinished ?? runtime.onFinished)?.();
          };
        }
      }

      this.transition(requestId, "idle", null, null);
      if (traceModule) {
        traceAudioManagerPlayResult(traceModule, result.success);
      }
      return result;
    } catch (err) {
      if (!isCurrentSpeakRequest(requestId)) {
        logTts({ reason: "stale_request", requestId, phase: "catch" });
        return { success: false, error: "tts_stale" };
      }
      const mapped = mapPlayErrorToSpeakResult(err);
      const errMsg = mapped.success ? "tts_failed" : mapped.error;
      logTts({ reason: "speak_error", requestId, error: errMsg });
      return this.handleAudioFailure(mapped, {
        requestId,
        rawText,
        opts,
        runtime,
      });
    } finally {
      if (playbackTraceId) {
        flushPlaybackTrace(
          playbackTraceId,
          this.snapshot.status === "idle" ? "speak_complete" : "speak_exit",
        );
      }
      if (isCurrentSpeakRequest(requestId) && this.snapshot.status !== "idle") {
        this.transition(requestId, "idle", this.snapshot.error, null);
      }
      if (isCurrentSpeakRequest(requestId)) {
        this.abortController = null;
      }
    }
  }

  async fetchNarrationUrl(
    authFetch: AuthFetchFn,
    text: string,
    init?: { signal?: AbortSignal; category?: string },
  ): Promise<{ url: string; cacheKey?: string } | null> {
    const trimmed = (text ?? "").trim();
    if (!trimmed) return null;
    const { streamTtsToObjectUrl } = await import("@/lib/amy-voice-stream-player");
    const data = await streamTtsToObjectUrl(
      authFetch,
      { text: trimmed, category: init?.category ?? "words", playbackMode: "partial-ok" },
      { signal: init?.signal, feature: init?.category ?? "narration" },
    );
    if (!data.ok) {
      emitAudioPlaybackEvent("audio_failed", {
        source: "amy_voice",
        phrase: trimmed.slice(0, 80),
        error: data.error ?? "tts_failed",
      });
      return null;
    }
    const url = data.cacheKey
      ? (resolveClientPlaybackUrl(`/api/tts/audio/${data.cacheKey}.mp3`, data.cacheKey) ?? data.url)
      : data.url;
    emitAudioPlaybackEvent("source_selected", {
      source: "tts",
      phrase: trimmed.slice(0, 80),
      proxyUrl: url.slice(0, 120),
      layer: "api",
    });
    return { url, cacheKey: data.cacheKey };
  }

  async playPreparedUrl(
    url: string,
    opts: PlayPreparedUrlOptions = {},
  ): Promise<SpeakResult> {
    const trimmed = (url ?? "").trim();
    const traceModule = getAudioTraceModule();
    if (traceModule) {
      tracePlayPreparedUrlInput(traceModule, trimmed || null);
    }
    if (!trimmed || trimmed.includes("undefined")) {
      emitAudioPlaybackEvent("audio_failed", {
        source: (opts.source as "spelling" | "poem_player" | "unknown") ?? "unknown",
        error: "invalid_audio_url",
      });
      return { success: false, error: "invalid_audio_url" };
    }

    recordTtsUserGesture();
    resetGuardForUserSpeak();

    const proxyUrl = resolveApiMediaUrl(trimmed);
    const source = opts.source ?? "amy_voice";
    // Claim gesture-primed element BEFORE stopCurrentAudio so lesson Play that
    // already called audio.play() in pointerdown is not discarded.
    const gesturePrimed = audioManager.takeGesturePrimedElement(proxyUrl);
    this.stopCurrentAudio();

    const playbackTraceId = beginPlaybackTrace({
      owner: playbackTraceOwnerFromModule(traceModule, "AmyVoiceController"),
      requestedUrl: proxyUrl,
      phrase: opts.phrase,
      autoFlush: false,
    });

    emitAudioPlaybackEvent("source_selected", {
      source: source as "spelling" | "poem_player" | "amy_voice",
      proxyUrl: proxyUrl.slice(0, 120),
      phrase: opts.phrase,
    });

    let traceEnd = "playPreparedUrl_exit";
    try {
      // Lessons (and any preferDirectStream caller) must call audio.play() without an
      // intervening fetch await — otherwise Android/iOS WebViews throw NotAllowedError
      // and the lesson pipeline reports a false "couldn't play" failure.
      const preferDirect =
        opts.preferDirectStream === true ||
        source === "lesson" ||
        source === "spelling" ||
        source === "catalog";

      let audio: HTMLAudioElement;
      let detachPipelineListeners = () => {};
      const alreadyPlayingFromGesture = Boolean(gesturePrimed && !gesturePrimed.paused);

      if (gesturePrimed) {
        audio = gesturePrimed;
        audio.muted = false;
        audio.volume = 1;
        if (alreadyPlayingFromGesture) {
          logAudioPipeline("playPreparedUrl_gesture_continue", {
            detail: { source, proxyUrl: proxyUrl.slice(0, 80) },
          });
        }
      } else if (preferDirect) {
        audioManager.unlockFromUserGesture();
        audioManager.primeSpeechUrlInUserGesture(proxyUrl);
        audio =
          audioManager.takeGesturePrimedElement(proxyUrl) ?? audioManager.create(proxyUrl);
      } else {
        const prepared = await prepareRemotePlaybackAudio(proxyUrl);
        audio = prepared ?? audioManager.create(proxyUrl);
      }
      detachPipelineListeners = attachAudioPipelineElementListeners(audio, source);

      const rate = opts.playbackRate ?? 1;
      if (rate !== 1) audio.playbackRate = rate;

      emitAudioPlaybackEvent("audio_started", {
        source: source as "spelling" | "poem_player" | "amy_voice",
        proxyUrl: proxyUrl.slice(0, 120),
        phrase: opts.phrase,
      });

      // If the gesture already started this element, audio.play() is a no-op that
      // resolves without needing a fresh user activation (HTML media element rules).
      const played = await audioManager.play(
        audio,
        {
          proxyUrl,
          phrase: opts.phrase,
          source,
          channel: "speech",
          interrupt: true,
          srcType: opts.srcType ?? "tts",
          playbackTraceId: playbackTraceId || undefined,
        },
        { channel: "speech", interrupt: true },
      );

      setAudioPipelineMachineState("audible_start", {
        played,
        source,
        alreadyPlayingFromGesture,
      });

      if (traceModule) {
        traceAudioManagerPlayResult(traceModule, played);
      }

      if (!played) {
        const lastErr = audioManager.getLastPlayError() ?? "play_failed";
        traceEnd = lastErr;
        emitAudioPlaybackEvent("audio_failed", {
          source: source as "spelling" | "poem_player" | "amy_voice",
          error: lastErr,
          phrase: opts.phrase,
        });
        console.warn("[AmyVoicePlayback] playPreparedUrl play() failed", {
          source,
          error: lastErr,
          proxyUrl: proxyUrl.slice(0, 120),
          phrase: opts.phrase?.slice(0, 80),
        });
        logAudioPipeline("playPreparedUrl_failed", {
          detail: { source, error: lastErr, preferDirect, alreadyPlayingFromGesture },
        });
        detachPipelineListeners();
        return { success: false, error: lastErr };
      }

      if (opts.waitUntilEnd !== false) {
        const isCancelled = opts.isCancelled ?? (() => false);
        if (source === "lesson") {
          const completion = await waitForSafePlaybackCompletion({
            audio,
            mode: "full-required",
            isCancelled,
          });
          if (!completion.ok) {
            const err = completion.earlyCompletion ? "early_completion" : "interrupted";
            traceEnd = err;
            emitAudioPlaybackEvent("audio_failed", {
              source: source as "spelling" | "poem_player" | "amy_voice",
              error: err,
              phrase: opts.phrase,
            });
            logAudioPipeline("playPreparedUrl_interrupted", {
              detail: { error: err, source, earlyCompletion: completion.earlyCompletion },
            });
            detachPipelineListeners();
            return { success: false, error: err, layer: "static" };
          }
        } else {
          const ended = await audioManager.waitUntilEnd(audio, isCancelled);
          if (!ended.ok) {
            traceEnd = ended.error ?? "interrupted";
            logAudioPipeline("playPreparedUrl_interrupted", {
              detail: { error: ended.error, source },
            });
            emitAudioPlaybackEvent("audio_interrupted", {
              source: source as "spelling" | "poem_player" | "amy_voice",
              error: ended.error ?? "interrupted",
            });
            detachPipelineListeners();
            return { success: false, error: ended.error ?? "interrupted" };
          }
        }
      }

      emitAudioPlaybackEvent("audio_completed", {
        source: source as "spelling" | "poem_player" | "amy_voice",
        phrase: opts.phrase,
      });
      logAudioPipeline("playPreparedUrl_success", {
        detail: {
          source,
          preferDirect,
          alreadyPlayingFromGesture,
          waitUntilEnd: opts.waitUntilEnd !== false,
        },
      });
      detachPipelineListeners();
      traceEnd = "playPreparedUrl_success";
      return { success: true, layer: "static" };
    } catch (err) {
      traceEnd = "playPreparedUrl_error";
      const message = err instanceof Error ? err.message : String(err);
      emitAudioPlaybackEvent("audio_failed", {
        source: source as "spelling" | "poem_player" | "amy_voice",
        error: message,
        phrase: opts.phrase,
      });
      console.warn("[AmyVoicePlayback] playPreparedUrl exception", {
        source,
        error: message,
        phrase: opts.phrase?.slice(0, 80),
      });
      logAudioPipeline("playPreparedUrl_exception", { detail: { source, error: message } });
      return { success: false, error: message };
    } finally {
      if (playbackTraceId) {
        flushPlaybackTrace(playbackTraceId, traceEnd);
      }
    }
  }
}

export const amyVoiceController: AmyVoiceControllerPublic = new AmyVoiceController();

/** @internal Test-only access to full controller instance. */
export const __amyVoiceControllerForTests = amyVoiceController;

/** Map controller snapshot to hook-facing booleans (backward compatible). */
export function snapshotToHookState(snapshot: AmyVoiceControllerSnapshot): {
  speaking: boolean;
  loading: boolean;
  error: string | null;
  activePhrase: string | null;
} {
  return {
    speaking: snapshot.status === "playing",
    loading: snapshot.status === "loading",
    error: snapshot.error,
    activePhrase: snapshot.activePhrase,
  };
}
