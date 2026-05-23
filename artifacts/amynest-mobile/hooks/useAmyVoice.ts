import { useCallback, useEffect, useRef } from "react";
import {
  useAmyVoiceContext,
  type AmyVoiceContextSpeakOptions,
} from "@/contexts/AmyVoiceProvider";

export interface UseAmyVoiceOptions {
  voiceId?: string;
  modelId?: string;
  onFinished?: () => void;
  playbackRate?: number;
}

export interface SpeakOptions {
  mode?: "default" | "phonics";
  /** Logical module name for structured error logs. */
  module?: string;
}

export interface UseAmyVoiceState {
  speaking: boolean;
  loading: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  speak: (text: string, opts?: SpeakOptions) => Promise<void>;
  stop: () => void;
  seekTo: (seconds: number) => void;
}

/**
 * Thin hook over the global AmyVoiceProvider — never creates its own player.
 * All modules share one audio stream (zero overlap).
 */
export function useAmyVoice(options: UseAmyVoiceOptions = {}): UseAmyVoiceState {
  const ctx = useAmyVoiceContext();
  const onFinishedRef = useRef(options.onFinished);
  onFinishedRef.current = options.onFinished;

  const { voiceId, modelId, playbackRate } = options;

  useEffect(() => {
    if (ctx.error && __DEV__) {
      console.warn("[AmyVoice] error state", ctx.error);
    }
  }, [ctx.error]);

  const speak = useCallback(
    async (rawText: string, opts?: SpeakOptions) => {
      const payload: AmyVoiceContextSpeakOptions = {
        mode: opts?.mode,
        module: opts?.module,
        voiceId,
        modelId,
        playbackRate,
        onFinished: () => onFinishedRef.current?.(),
      };
      await ctx.speak(rawText, payload);
    },
    [ctx, voiceId, modelId, playbackRate],
  );

  return {
    speaking: ctx.speaking,
    loading: ctx.loading,
    error: ctx.error,
    currentTime: ctx.currentTime,
    duration: ctx.duration,
    speak,
    stop: ctx.stop,
    seekTo: ctx.seekTo,
  };
}
