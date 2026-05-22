import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useGuardedSetter, useMountedRef } from "@/hooks/use-safe-async";
import {
  speakAmyVoice,
  mapPlayErrorToSpeakResult,
  type AmyVoicePipelineContext,
} from "@/lib/amy-voice-pipeline";
import type { AmyVoiceLayer } from "@/lib/amy-voice-telemetry";
import { audioManager } from "@/lib/audio-manager";
import { recordTtsUserGesture } from "@/lib/tts-guard";

let _ttsBusy = false;

export interface UseAmyVoiceOptions {
  voiceId?: string;
  modelId?: string;
  playbackRate?: number;
  onFinished?: () => void;
}

export interface SpeakOptions {
  mode?: "default" | "phonics";
  phoneme?: string;
  word?: string;
  waitUntilEnd?: boolean;
}

export type SpeakResult =
  | { success: true; layer?: AmyVoiceLayer }
  | { success: false; error: string; layer?: AmyVoiceLayer };

export interface UseAmyVoiceState {
  speaking: boolean;
  loading: boolean;
  error: string | null;
  speak: (text: string, opts?: SpeakOptions) => Promise<SpeakResult>;
  stop: () => void;
}

/**
 * Amy voice with fail-safe multi-layer fallback (static → cache → API → phonics
 * sequence → speech-coach split → emergency → text/visual). Never silent.
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
    reqIdRef.current += 1;
    abortInFlight();
    audioManager.stop();
    releaseBusy();
    safeSetSpeaking(false);
    safeSetLoading(false);
  }, [abortInFlight, releaseBusy, safeSetSpeaking, safeSetLoading]);

  const speak = useCallback(
    async (rawText: string, opts?: SpeakOptions): Promise<SpeakResult> => {
      const text = (rawText ?? "").trim();
      if (!text) return { success: false, error: "tts_empty_text" };

      recordTtsUserGesture();

      if (_ttsBusy && !busyRef.current) {
        console.warn("[TTS] skipped — another TTS instance is already in flight");
        return { success: false, error: "tts_skipped" };
      }

      const myId = ++reqIdRef.current;
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
        isCancelled: () => myId !== reqIdRef.current || !isMounted.current,
        onFinished: () => {
          if (myId !== reqIdRef.current || !isMounted.current) return;
          onFinishedRef.current?.();
        },
      };

      try {
        safeSetSpeaking(true);
        const result = await speakAmyVoice(text, opts, pipelineCtx);

        if (myId !== reqIdRef.current || !isMounted.current) {
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
        } else {
          const el = audioManager.getCurrentElement();
          if (el && !opts?.waitUntilEnd) {
            const prevEnded = el.onended;
            el.onended = (ev) => {
              prevEnded?.call(el, ev);
              if (myId !== reqIdRef.current || !isMounted.current) return;
              safeSetSpeaking(false);
              onFinishedRef.current?.();
            };
          } else {
            safeSetSpeaking(false);
          }
        }

        return result;
      } catch (err) {
        if (myId !== reqIdRef.current || !isMounted.current) {
          return { success: false, error: "tts_cancelled" };
        }
        const mapped = mapPlayErrorToSpeakResult(err);
        safeSetError(mapped.error);
        safeSetSpeaking(false);
        return mapped;
      } finally {
        if (myId === reqIdRef.current && isMounted.current) {
          releaseBusy();
          safeSetLoading(false);
        }
      }
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

  return { speaking, loading, error, speak, stop };
}
