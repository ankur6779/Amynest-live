import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useMountedRef } from "@/hooks/use-safe-async";
import {
  amyVoiceController,
  snapshotToHookState,
  type SpeakOptions,
  type SpeakResult,
} from "@/lib/amy-voice-controller";
import { isAndroidAmyNestAudioClient } from "@/lib/device-lite";
import { primeStaticAudioInUserGesture } from "@/lib/static-audio";
import { recordTtsUserGesture } from "@/lib/tts-guard";

export type { SpeakOptions, SpeakResult, PlaybackMode } from "@/lib/amy-voice-controller";
export type { AmySpeechPolicy } from "@/lib/amy-speech-mode";

export interface UseAmyVoiceOptions {
  voiceId?: string;
  modelId?: string;
  playbackRate?: number;
  onFinished?: () => void;
}

export interface UseAmyVoiceState {
  speaking: boolean;
  loading: boolean;
  error: string | null;
  speak: (text: string, opts?: SpeakOptions) => Promise<SpeakResult>;
  /** Android PWA/WebView: call from onPointerDown before onClick speak(). */
  primeSpeakGesture: (text: string, opts?: SpeakOptions) => void;
  /** Explicit pause intent — invalidates in-flight playback. */
  pause: () => void;
}

/**
 * React binding for the global Amy voice controller.
 * UI sends speak/pause intents only; controller owns playback and state.
 */
export function useAmyVoice(options: UseAmyVoiceOptions = {}): UseAmyVoiceState {
  const authFetch = useAuthFetch();
  const isMounted = useMountedRef();

  const snapshot = useSyncExternalStore(
    (onStoreChange) => amyVoiceController.subscribe(onStoreChange),
    () => amyVoiceController.getSnapshot(),
    () => amyVoiceController.getSnapshot(),
  );

  const { speaking, loading, error } = snapshotToHookState(snapshot);

  const { voiceId, modelId, playbackRate, onFinished } = options;
  const playbackRateRef = useRef(playbackRate ?? 1);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    playbackRateRef.current = playbackRate ?? 1;
  }, [playbackRate]);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const pause = useCallback(() => {
    amyVoiceController.pause();
  }, []);

  const speak = useCallback(
    (rawText: string, opts?: SpeakOptions): Promise<SpeakResult> => {
      return amyVoiceController.speak(rawText, opts, {
        authFetch,
        voiceId,
        modelId,
        playbackRate: playbackRateRef.current,
        onFinished: onFinishedRef.current,
        isMounted: () => isMounted.current,
      });
    },
    [authFetch, voiceId, modelId, isMounted],
  );

  const primeSpeakGesture = useCallback((rawText: string, opts?: SpeakOptions) => {
    if (!isAndroidAmyNestAudioClient()) return;
    const text = (rawText ?? "").trim();
    if (!text) return;
    recordTtsUserGesture();
    primeStaticAudioInUserGesture(text, opts?.mode === "phonics" ? "phonics" : "default");
  }, []);

  return { speaking, loading, error, speak, primeSpeakGesture, pause };
}
