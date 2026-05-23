import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useGuardedSetter, useMountedRef } from "@/hooks/use-safe-async";
import { prepareAmySpeechInput } from "@/lib/amy-speech-mode";
import { enforceAmySpeechPolicyInvariants } from "@/lib/amy-voice-invariants";
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
import { isAndroidAmyNestAudioClient } from "@/lib/device-lite";
import { audioManager } from "@/lib/audio-manager";
import {
  cancelAllSpeakRequests,
  getSpeakRequestId,
  isSpeakRequestCurrent,
  withSpeakMutex,
} from "@/lib/amy-voice-safety";
import { primeStaticAudioInUserGesture } from "@/lib/static-audio";
import { recordTtsUserGesture } from "@/lib/tts-guard";

let _ttsBusy = false;

export interface UseAmyVoiceOptions {
  voiceId?: string;
  modelId?: string;
  playbackRate?: number;
  onFinished?: () => void;
}

import type { AmySpeechPolicy } from "@/lib/amy-speech-mode";

export interface SpeakOptions {
  mode?: "default" | "phonics";
  phoneme?: string;
  word?: string;
  waitUntilEnd?: boolean;
  /** Amy Audio Lessons: one paragraph = one TTS unit (no semantic phrase splits). */
  lessonParagraph?: boolean;
  /** Pre-generated static catalog phrase (math tricks) — verbatim text, static MP3 first. */
  catalogPlayback?: boolean;
  /** Extra lines to try for static-audio lookup before live TTS. */
  staticCatalogTexts?: string[];
  /** Pre-computed speech mode policy (set by prepareAmySpeechInput). */
  speechPolicy?: AmySpeechPolicy;
}

export type SpeakResult =
  | { success: true; layer?: AmyVoiceLayer }
  | { success: false; error: string; layer?: AmyVoiceLayer };

export interface UseAmyVoiceState {
  speaking: boolean;
  loading: boolean;
  error: string | null;
  speak: (text: string, opts?: SpeakOptions) => Promise<SpeakResult>;
  /** Android PWA/WebView: call from onPointerDown before onClick speak(). */
  primeSpeakGesture: (text: string, opts?: SpeakOptions) => void;
  stop: () => void;
}

/**
 * Amy voice — fail-safe pipeline (pregen race → OpenAI → ElevenLabs → phonics
 * → word split → emergency → text/visual). Never silent.
 */
export function useAmyVoice(options: UseAmyVoiceOptions = {}): UseAmyVoiceState {
  const authFetch = useAuthFetch();
  const isMounted = useMountedRef();
  const abortRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);
  const busyRef = useRef(false);

  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const safeSetSpeaking = useGuardedSetter(setSpeaking, isMounted);
  const safeSetLoading = useGuardedSetter(setLoading, isMounted);
  const safeSetError = useGuardedSetter(setError, isMounted);

  const { voiceId, modelId, playbackRate, onFinished } = options;

  const playbackRateRef = useRef(playbackRate ?? 1);
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    playbackRateRef.current = playbackRate ?? 1;
  }, [playbackRate]);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const abortInFlight = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const releaseBusy = useCallback(() => {
    if (busyRef.current) {
      _ttsBusy = false;
      busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    return () => {
      reqIdRef.current += 1;
      abortInFlight();
      audioManager.stop();
      releaseBusy();
    };
  }, [abortInFlight, releaseBusy]);

  const stop = useCallback(() => {
    cancelAllSpeakRequests();
    reqIdRef.current = getSpeakRequestId();
    abortInFlight();
    audioManager.stopAll();
    releaseBusy();
    safeSetSpeaking(false);
    safeSetLoading(false);
  }, [abortInFlight, releaseBusy, safeSetSpeaking, safeSetLoading]);

  const speak = useCallback(
    async (rawText: string, opts?: SpeakOptions): Promise<SpeakResult> => {
      return withSpeakMutex(async () => {
      const text = (rawText ?? "").trim();
      if (!text) return { success: false, error: "tts_empty_text" };

      recordTtsUserGesture();

      cancelAllSpeakRequests();
      audioManager.stopAll();

      if (_ttsBusy && !busyRef.current) {
        console.warn("[TTS] skipped — another TTS instance is already in flight");
        return { success: false, error: "tts_skipped" };
      }

      const myId = getSpeakRequestId();
      reqIdRef.current = myId;
      abortInFlight();
      safeSetSpeaking(false);
      safeSetError(null);
      safeSetLoading(true);
      _ttsBusy = true;
      busyRef.current = true;

      const pipelineCtx: AmyVoicePipelineContext = {
        authFetch,
        voiceId,
        modelId,
        playbackRate: playbackRateRef.current,
        isCancelled: () => !isSpeakRequestCurrent(myId) || !isMounted.current,
        onFinished: () => {
          if (!isSpeakRequestCurrent(myId) || !isMounted.current) return;
          onFinishedRef.current?.();
        },
      };

      try {
        safeSetSpeaking(true);
        bootstrapAmyVoiceGovernanceForRuntime();
        const speakStartedAt = performance.now();
        let deliveryProfile: AmyVoiceDeliveryProfile | null = null;

        const speechPolicy = prepareAmySpeechInput(text, opts);
        let finalizedPolicy: AmySpeechPolicy;
        let replayCount = 0;
        let difficultyLevel: AmySpeechPolicy["difficultyLevel"] = "neutral";

        if (opts?.lessonParagraph || opts?.catalogPlayback) {
          finalizedPolicy = enforceAmySpeechPolicyInvariants(speechPolicy);
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
        const pipelineMode = finalizedPolicy.pipelineMode;
        const result = await speakAmyVoice(finalizedPolicy.normalizedText, {
          ...opts,
          mode: pipelineMode,
          speechPolicy: finalizedPolicy,
        }, pipelineCtx);

        const durationMs = Math.round(performance.now() - speakStartedAt);
        const fallback = result.success
          ? isAmyVoiceFallbackLayer(result.layer)
          : true;
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
            speechMode: finalizedPolicy.speechMode,
            pipelineMode: finalizedPolicy.pipelineMode,
            layer: result.layer,
            replayCount,
            durationMs,
            success: true,
          });
        }
        if (replayCount >= 2 || fallback || difficultyLevel === "struggling") {
          recordAmyVoiceStrugglePhrase(
            finalizedPolicy.normalizedText,
            finalizedPolicy.speechMode,
            finalizedPolicy.pipelineMode,
            {
              replayCount,
              difficulty: difficultyLevel,
              fallback,
            },
          );
        }

        if (!isSpeakRequestCurrent(myId) || !isMounted.current) {
          return { success: false, error: "tts_cancelled" };
        }

        if (!result.success) {
          safeSetError("error" in result ? result.error : "tts_failed");
          safeSetSpeaking(false);
          return result;
        }

        if (
          result.layer === "text_visual" ||
          result.layer === "phonics_sequence" ||
          result.layer === "speech_coach_split"
        ) {
          safeSetSpeaking(false);
        } else if (finalizedPolicy.useSemanticSplit || opts?.waitUntilEnd) {
          safeSetSpeaking(false);
        } else {
          const el = audioManager.getCurrentElement();
          if (el) {
            const prevEnded = el.onended;
            el.onended = (ev) => {
              prevEnded?.call(el, ev);
              if (!isSpeakRequestCurrent(myId) || !isMounted.current) return;
              safeSetSpeaking(false);
              onFinishedRef.current?.();
            };
          } else {
            safeSetSpeaking(false);
          }
        }

        return result;
      } catch (err) {
        if (!isSpeakRequestCurrent(myId) || !isMounted.current) {
          return { success: false, error: "tts_cancelled" };
        }
        const mapped = mapPlayErrorToSpeakResult(err);
        safeSetError(mapped.error);
        safeSetSpeaking(false);
        return mapped;
      } finally {
        if (isSpeakRequestCurrent(myId) && isMounted.current) {
          releaseBusy();
          safeSetLoading(false);
        }
      }
      });
    },
    [
      authFetch,
      abortInFlight,
      releaseBusy,
      modelId,
      voiceId,
      isMounted,
      safeSetSpeaking,
      safeSetLoading,
      safeSetError,
    ],
  );

  const primeSpeakGesture = useCallback((rawText: string, opts?: SpeakOptions) => {
    if (!isAndroidAmyNestAudioClient()) return;
    const text = (rawText ?? "").trim();
    if (!text) return;
    recordTtsUserGesture();
    primeStaticAudioInUserGesture(text, opts?.mode === "phonics" ? "phonics" : "default");
  }, []);

  return { speaking, loading, error, speak, primeSpeakGesture, stop };
}
