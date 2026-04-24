import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { API_BASE_URL } from "@/constants/api";

export interface UseAmyVoiceOptions {
  voiceId?: string;
  modelId?: string;
}

export interface UseAmyVoiceState {
  speaking: boolean;
  loading: boolean;
  error: string | null;
  /** Toggle: starts narration if idle, stops it if currently playing. */
  speak: (text: string) => Promise<void>;
  stop: () => void;
}

interface SynthesizeResponse {
  ok: true;
  cacheKey: string;
  audioUrl: string;
  cached: boolean;
  charCount: number;
  contentType: string;
}

/**
 * Mobile counterpart of the web `useAmyVoice`.
 *
 * Flow:
 *   1. Authed POST /api/tts/synthesize → returns a content-addressed audioUrl.
 *   2. Hand that public URL to expo-audio's `useAudioPlayer().replace()`.
 *
 * The audio endpoint is public because the SHA256 cacheKey is unguessable
 * and only ever produced by an authenticated synthesize call — so we don't
 * need to fight expo-audio over auth headers on the source URL.
 */
export function useAmyVoice(options: UseAmyVoiceOptions = {}): UseAmyVoiceState {
  const authFetch = useAuthFetch();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [requestedPlaying, setRequestedPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  // Cancels the in-flight synth fetch when the user taps Stop, switches
  // voice, or unmounts — otherwise a delayed response can race in and
  // start playing audio after we thought we'd stopped.
  const abortRef = useRef<AbortController | null>(null);
  // Monotonic request token; stale resolves bail before touching the player.
  const reqIdRef = useRef(0);

  const { voiceId, modelId } = options;

  // True only while the player is actively playing audio we asked for.
  const speaking = requestedPlaying && status.playing;

  const abortInFlight = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      reqIdRef.current += 1;
      abortInFlight();
      try { player.pause(); } catch {}
    };
  }, [player, abortInFlight]);

  // expo-audio fires `didJustFinish` on natural end → reset our state.
  useEffect(() => {
    if (status.didJustFinish) {
      setRequestedPlaying(false);
    }
  }, [status.didJustFinish]);

  const stop = useCallback(() => {
    reqIdRef.current += 1;
    abortInFlight();
    try { player.pause(); } catch {}
    if (isMountedRef.current) {
      setRequestedPlaying(false);
      setLoading(false);
    }
  }, [player, abortInFlight]);

  const speak = useCallback(
    async (rawText: string) => {
      const text = (rawText ?? "").trim();
      if (!text) return;

      // Toggle: pressing while already playing or loading stops + cancels.
      if (speaking || loading) {
        stop();
        return;
      }

      const myId = ++reqIdRef.current;
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setLoading(true);

      try {
        const synthRes = await authFetch("/api/tts/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId, modelId }),
          signal: controller.signal,
        });
        if (myId !== reqIdRef.current || !isMountedRef.current) return;
        if (!synthRes.ok) {
          const body = (await synthRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `synthesize_failed_${synthRes.status}`);
        }
        const data = (await synthRes.json()) as SynthesizeResponse;

        if (myId !== reqIdRef.current || !isMountedRef.current) return;

        const fullUrl = `${API_BASE_URL}${data.audioUrl}`;
        // .replace() loads the new source AND auto-plays once buffered.
        player.replace({ uri: fullUrl });
        player.play();
        setRequestedPlaying(true);
      } catch (err) {
        // AbortError is user-initiated cancel, not a failure.
        if ((err as { name?: string })?.name === "AbortError") return;
        if (isMountedRef.current && myId === reqIdRef.current) {
          setError(err instanceof Error ? err.message : "tts_failed");
          setRequestedPlaying(false);
        }
      } finally {
        if (isMountedRef.current && myId === reqIdRef.current) {
          setLoading(false);
          if (abortRef.current === controller) abortRef.current = null;
        }
      }
    },
    [authFetch, loading, modelId, player, speaking, stop, voiceId],
  );

  return { speaking, loading, error, speak, stop };
}
