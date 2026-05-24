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
  type ParentHubAudioIdentity,
} from "@/lib/parent-hub-audio-identity";
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
  playControllerEmergencyAudio,
  resetGuardFailures,
  shouldBypassAudioGuard,
  trackGuardFailure,
  CONTROLLER_EMERGENCY_PHRASE,
  type PlaybackFailureFeedback,
} from "@/lib/amy-voice-audio-guard";
import { audioManager } from "@/lib/audio-manager";
import {
  logAudioHealthFailure,
  logAudioHealthFallback,
  logAudioHealthSuccess,
  mapAmyLayerToHealthLayer,
  startAudioHealthSpeak,
} from "@/lib/audio-health";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import {
  resolvePlaybackMode,
  type PlaybackMode,
} from "@/lib/amy-voice-playback-contract";
import type { AmyVoiceLayer } from "@/lib/amy-voice-telemetry";
import type { AuthFetchFn } from "@/lib/poll-result";

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
  /** Canonical lesson paragraph or Parent Hub identity — required for guarded playback. */
  audioIdentity?: AudioIdentity | ParentHubAudioIdentity;
  /** @deprecated Use audioIdentity.lessonId */
  lessonId?: string;
  /** @deprecated Use audioIdentity.paragraphIdx */
  lessonParagraphIndex?: number;
  catalogPlayback?: boolean;
  staticCatalogTexts?: string[];
  speechPolicy?: AmySpeechPolicy;
  onFinished?: () => void;
}

export type SpeakResult =
  | { success: true; layer?: AmyVoiceLayer }
  | { success: false; error: string; layer?: AmyVoiceLayer; handled?: boolean };

export type AmyVoiceControllerSnapshot = {
  status: AmyVoiceStatus;
  error: string | null;
  requestId: number;
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
): AmyVoiceControllerSnapshot {
  return { status, error, requestId };
}

/** Frozen public API — UI and hooks may only use these methods. */
export interface AmyVoiceControllerPublic {
  speak(
    rawText: string,
    opts: SpeakOptions | undefined,
    runtime: AmyVoiceRuntime,
  ): Promise<SpeakResult>;
  pause(): void;
  subscribe(listener: SnapshotListener): () => void;
  getSnapshot(): Readonly<AmyVoiceControllerSnapshot>;
}

class AmyVoiceController implements AmyVoiceControllerPublic {
  private snapshot: AmyVoiceControllerSnapshot = snapshotFromStatus("idle", null, 0);
  private listeners = new Set<SnapshotListener>();
  private abortController: AbortController | null = null;

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
  ): void {
    if (!isCurrentSpeakRequest(requestId)) {
      if (import.meta.env.DEV) {
        throw new Error(
          `[AmyVoiceController] Stale request ${requestId} attempted to mutate state → ${status}`,
        );
      }
      return;
    }
    this.publish(snapshotFromStatus(status, error, requestId));
  }

  private stopCurrentAudio(): void {
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
    const requestId = invalidateSpeakRequests();
    logTts({ reason: "pause", requestId });
    this.stopCurrentAudio();
    this.publish(snapshotFromStatus("idle", null, requestId));
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
          this.transition(ctx.requestId, "idle", null);
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
        message: "Audio failed. Tap to retry.",
        error,
        retry,
      });
      this.transition(ctx.requestId, "idle", error);
    }

    logTts({ event: "final_guard", status: "error", error });
    return { success: false, error, layer, handled: true };
  }

  /** User intent: speak text. Latest tap wins. */
  speak(
    rawText: string,
    opts: SpeakOptions | undefined,
    runtime: AmyVoiceRuntime,
  ): Promise<SpeakResult> {
    return speakExecutor
      .runLatest(() => this.runSpeak(rawText, opts, runtime))
      .catch((err: unknown) => {
        if ((err as { code?: string })?.code === "tts_superseded") {
          logTts({ reason: "superseded" });
          return { success: false, error: "tts_stale" };
        }
        throw err;
      });
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
    const text = parentHubIdentity
      ? parentHubIdentity.text
      : (rawText ?? "").trim();
    if (!text) {
      return { success: false, error: "tts_empty_text" };
    }

    const requestId = createSpeakRequest();

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
      if (!identity || isParentHubAudioIdentity(identity)) {
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
    logTts({ reason: "speak_start", requestId, textPreview: text.slice(0, 80) });

    startAudioHealthSpeak(opts);
    recordTtsUserGesture();
    this.stopCurrentAudio();
    this.abortController = new AbortController();
    this.transition(requestId, "loading", null);

    const pipelineCtx: AmyVoicePipelineContext = {
      authFetch: runtime.authFetch,
      voiceId: runtime.voiceId,
      modelId: runtime.modelId,
      playbackRate: runtime.playbackRate ?? 1,
      playbackMode: resolvePlaybackMode(opts),
      paragraphIdx: opts?.audioIdentity?.paragraphIdx,
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

      this.transition(requestId, "playing", null);

      const pipelineMode = finalizedPolicy!.pipelineMode;
      const result = await speakAmyVoice(
        finalizedPolicy!.normalizedText,
        {
          ...opts,
          mode: pipelineMode,
          speechPolicy: finalizedPolicy,
        },
        pipelineCtx,
      );

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
            this.transition(requestId, "idle", null);
            (opts?.onFinished ?? runtime.onFinished)?.();
          };
        }
      }

      this.transition(requestId, "idle", null);
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
      if (isCurrentSpeakRequest(requestId) && this.snapshot.status !== "idle") {
        this.transition(requestId, "idle", this.snapshot.error);
      }
      if (isCurrentSpeakRequest(requestId)) {
        this.abortController = null;
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
} {
  return {
    speaking: snapshot.status === "playing",
    loading: snapshot.status === "loading",
    error: snapshot.error,
  };
}
