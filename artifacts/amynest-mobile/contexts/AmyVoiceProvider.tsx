import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import {
  amyVoiceSpeak,
  amyVoicePlayUrl,
  getAmyVoiceGlobalReqId,
  stopAllAmyVoice,
  type AmyVoiceMode,
  type AmyVoicePlayer,
  type AmyVoiceSpeakOptions,
} from "@/lib/amy-voice-controller";

export type { AmyVoiceMode };

export type AmyVoiceContextSpeakOptions = Omit<AmyVoiceSpeakOptions, "onFinished"> & {
  onFinished?: () => void;
};

export type AmyVoiceContextValue = {
  speaking: boolean;
  loading: boolean;
  error: string | null;
  speak: (text: string, opts?: AmyVoiceContextSpeakOptions) => Promise<void>;
  playUrl: (url: string, opts?: { module?: string; playbackRate?: number }) => Promise<void>;
  stop: () => void;
  seekTo: (seconds: number) => void;
  currentTime: number;
  duration: number;
};

const AmyVoiceContext = createContext<AmyVoiceContextValue | null>(null);

export function AmyVoiceProvider({ children }: { children: ReactNode }) {
  const authFetch = useAuthFetch();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedPlaying, setRequestedPlaying] = useState(false);
  const activeReqRef = useRef(0);
  const onFinishedRef = useRef<(() => void) | undefined>(undefined);
  const wasBackgroundRef = useRef(false);

  const playerAdapter = useMemo(
    (): AmyVoicePlayer => ({
      replace: (source) => player.replace(source),
      play: () => player.play(),
      pause: () => {
        try {
          player.pause();
        } catch {
          /* ignore */
        }
      },
      setPlaybackRate: (rate) => {
        try {
          player.setPlaybackRate(rate);
        } catch {
          /* ignore */
        }
      },
    }),
    [player],
  );

  const speaking = requestedPlaying && status.playing;

  useEffect(() => {
    return () => {
      stopAllAmyVoice(playerAdapter);
    };
  }, [playerAdapter]);

  useEffect(() => {
    const onState = (next: AppStateStatus) => {
      if (next !== "active") {
        wasBackgroundRef.current = true;
        stopAllAmyVoice(playerAdapter);
        setRequestedPlaying(false);
        setLoading(false);
        onFinishedRef.current = undefined;
        return;
      }

      if (wasBackgroundRef.current) {
        wasBackgroundRef.current = false;
        try {
          player.pause();
        } catch {
          /* reset stale native session after background */
        }
      }
    };
    const sub = AppState.addEventListener("change", onState);
    return () => sub.remove();
  }, [playerAdapter, player]);

  useEffect(() => {
    if (!status.didJustFinish) return;
    if (activeReqRef.current !== getAmyVoiceGlobalReqId()) return;
    setRequestedPlaying(false);
    onFinishedRef.current?.();
    onFinishedRef.current = undefined;
  }, [status.didJustFinish]);

  const stop = useCallback(() => {
    stopAllAmyVoice(playerAdapter);
    setRequestedPlaying(false);
    setLoading(false);
    onFinishedRef.current = undefined;
  }, [playerAdapter]);

  const seekTo = useCallback(
    (seconds: number) => {
      try {
        player.seekTo(Math.max(0, seconds));
      } catch {
        /* ignore */
      }
    },
    [player],
  );

  const speak = useCallback(
    async (rawText: string, opts?: AmyVoiceContextSpeakOptions) => {
      const text = (rawText ?? "").trim();
      if (!text) return;

      /* Preemptive stop on every user action — cancels pending async + audio. */
      stopAllAmyVoice(playerAdapter);
      onFinishedRef.current = opts?.onFinished;
      setError(null);
      setLoading(true);
      setRequestedPlaying(false);

      const result = await amyVoiceSpeak(authFetch, playerAdapter, text, {
        mode: opts?.mode,
        voiceId: opts?.voiceId,
        modelId: opts?.modelId,
        playbackRate: opts?.playbackRate,
        module: opts?.module,
      });

      activeReqRef.current = getAmyVoiceGlobalReqId();

      if (result.ok) {
        setRequestedPlaying(true);
      } else if (result.error !== "tts_cancelled") {
        setError(result.error);
      }

      setLoading(false);
    },
    [authFetch, playerAdapter],
  );

  const playUrl = useCallback(
    async (url: string, opts?: { module?: string; playbackRate?: number }) => {
      stopAllAmyVoice(playerAdapter);
      setError(null);
      setLoading(true);
      setRequestedPlaying(false);

      const result = await amyVoicePlayUrl(playerAdapter, url, opts);
      activeReqRef.current = getAmyVoiceGlobalReqId();

      if (result.ok) {
        setRequestedPlaying(true);
      } else if (result.error !== "tts_cancelled") {
        setError(result.error);
      }
      setLoading(false);
    },
    [playerAdapter],
  );

  const value = useMemo(
    (): AmyVoiceContextValue => ({
      speaking,
      loading,
      error,
      speak,
      playUrl,
      stop,
      seekTo,
      currentTime: status.currentTime ?? 0,
      duration: status.duration ?? 0,
    }),
    [speaking, loading, error, speak, playUrl, stop, seekTo, status.currentTime, status.duration],
  );

  return (
    <AmyVoiceContext.Provider value={value}>{children}</AmyVoiceContext.Provider>
  );
}

export function useAmyVoiceContext(): AmyVoiceContextValue {
  const ctx = useContext(AmyVoiceContext);
  if (!ctx) {
    throw new Error("useAmyVoice / useAmyVoiceContext requires AmyVoiceProvider");
  }
  return ctx;
}
