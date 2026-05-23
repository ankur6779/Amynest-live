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
import { AppState, Platform, type AppStateStatus } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus, AudioModule } from "expo-audio";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import {
  amyVoiceSpeak,
  amyVoicePlayUrl,
  getAmyVoiceGlobalReqId,
  getAmyVoicePlaybackState,
  stopAllAmyVoice,
  type AmyVoiceMode,
  type AmyVoicePlayer,
  type AmyVoiceSpeakOptions,
} from "@/lib/amy-voice-controller";
import { delay } from "@/lib/fetch-with-timeout";

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

async function ensurePlaybackAudioSession(): Promise<void> {
  try {
    await AudioModule.setIsAudioActiveAsync(true);
  } catch {
    /* ignore */
  }
}

export function AmyVoiceProvider({ children }: { children: ReactNode }) {
  const authFetch = useAuthFetch();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const statusRef = useRef(status);
  statusRef.current = status;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedPlaying, setRequestedPlaying] = useState(false);
  const activeReqRef = useRef(0);
  const onFinishedRef = useRef<(() => void) | undefined>(undefined);
  const wasBackgroundRef = useRef(false);
  const expectedPlayingRef = useRef(false);

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
      waitUntilPlaying: async (timeoutMs: number) => {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
          const s = statusRef.current;
          if (s.playing || (s.currentTime ?? 0) > 0) return true;
          await delay(50);
        }
        const s = statusRef.current;
        return Boolean(s.playing || (s.currentTime ?? 0) > 0);
      },
    }),
    [player],
  );

  const speaking = requestedPlaying && status.playing;

  useEffect(() => {
    void ensurePlaybackAudioSession();
  }, []);

  useEffect(() => {
    return () => {
      stopAllAmyVoice(playerAdapter);
    };
  }, [playerAdapter]);

  useEffect(() => {
    const onState = (next: AppStateStatus) => {
      if (next !== "active") {
        wasBackgroundRef.current = true;
        expectedPlayingRef.current = false;
        stopAllAmyVoice(playerAdapter);
        setRequestedPlaying(false);
        setLoading(false);
        onFinishedRef.current = undefined;
        return;
      }

      if (wasBackgroundRef.current) {
        wasBackgroundRef.current = false;
        void (async () => {
          try {
            player.pause();
          } catch {
            /* reset stale native session after background / interruption */
          }
          await ensurePlaybackAudioSession();
        })();
      }
    };
    const sub = AppState.addEventListener("change", onState);
    return () => sub.remove();
  }, [playerAdapter, player]);

  /* iOS / OS audio interruption — playing dropped while we still expect audio. */
  useEffect(() => {
    if (!expectedPlayingRef.current) return;
    if (status.playing) return;
    if (getAmyVoicePlaybackState() !== "playing") return;
    if (status.didJustFinish) return;

    expectedPlayingRef.current = false;
    stopAllAmyVoice(playerAdapter);
    setRequestedPlaying(false);
    setLoading(false);
    void ensurePlaybackAudioSession();
  }, [status.playing, status.didJustFinish, playerAdapter]);

  useEffect(() => {
    if (!status.didJustFinish) return;
    if (activeReqRef.current !== getAmyVoiceGlobalReqId()) return;
    expectedPlayingRef.current = false;
    setRequestedPlaying(false);
    onFinishedRef.current?.();
    onFinishedRef.current = undefined;
  }, [status.didJustFinish]);

  const stop = useCallback(() => {
    expectedPlayingRef.current = false;
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

      stopAllAmyVoice(playerAdapter);
      activeReqRef.current = 0;
      onFinishedRef.current = opts?.onFinished;
      setError(null);
      setLoading(true);
      setRequestedPlaying(false);
      expectedPlayingRef.current = false;

      if (Platform.OS === "ios") {
        await ensurePlaybackAudioSession();
      }

      const result = await amyVoiceSpeak(authFetch, playerAdapter, text, {
        mode: opts?.mode,
        voiceId: opts?.voiceId,
        modelId: opts?.modelId,
        playbackRate: opts?.playbackRate,
        module: opts?.module,
      });

      if (result.ok) {
        activeReqRef.current = getAmyVoiceGlobalReqId();
        expectedPlayingRef.current = true;
        setRequestedPlaying(true);
      } else if (result.error !== "tts_cancelled" && result.error !== "tts_superseded") {
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
      expectedPlayingRef.current = false;

      const result = await amyVoicePlayUrl(playerAdapter, url, opts);
      activeReqRef.current = getAmyVoiceGlobalReqId();

      if (result.ok) {
        expectedPlayingRef.current = true;
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
