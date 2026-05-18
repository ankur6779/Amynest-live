import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { resolveMediaUrl } from "@/constants/api";

export interface UseAmyVoiceOptions {
  voiceId?: string;
  modelId?: string;
  /** Called when the audio finishes playing naturally (not when stop() is called). */
  onFinished?: () => void;
  /**
   * Playback speed multiplier (e.g. 0.85, 1, 1.15, 1.3, 1.5).
   * Applied to the expo-audio player via `setPlaybackRate` after each `replace`.
   * Defaults to 1 (normal speed).
   */
  playbackRate?: number;
}

export interface SpeakOptions {
  /**
   * `phonics` swaps to crisp ElevenLabs voice settings tuned for teaching
   * phoneme sounds. Use only for bare phonemes ("buh", "ah"), never full
   * sentences. Caches separately from default mode on the server.
   */
  mode?: "default" | "phonics";
}

export interface UseAmyVoiceState {
  speaking: boolean;
  loading: boolean;
  error: string | null;
  /** Current playback position in seconds (0 when not loaded). */
  currentTime: number;
  /** Total audio duration in seconds (0 until the audio is buffered). */
  duration: number;
  /**
   * Synthesises and plays the given text. Calling again while a previous
   * synth/playback is in-flight cancels it and starts fresh — consumers that
   * want toggle (tap-to-stop) UX should check `speaking || loading` first
   * and call `stop()` themselves.
   *
   * Pass `{ mode: "phonics" }` for crisp letter-sound playback.
   */
  speak: (text: string, opts?: SpeakOptions) => Promise<void>;
  stop: () => void;
  /** Seek to an absolute position in seconds. No-op if nothing is loaded. */
  seekTo: (seconds: number) => void;
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
  // Keep latest onFinished in a ref so we don't re-create callbacks when it changes.
  const onFinishedRef = useRef(options.onFinished);
  onFinishedRef.current = options.onFinished;

  const { voiceId, modelId, playbackRate } = options;

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

  // expo-audio fires `didJustFinish` on natural end → reset our state and
  // notify the caller via onFinished.
  useEffect(() => {
    if (status.didJustFinish) {
      setRequestedPlaying(false);
      onFinishedRef.current?.();
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

  const seekTo = useCallback(
    (seconds: number) => {
      try {
        player.seekTo(Math.max(0, seconds));
      } catch {}
    },
    [player],
  );

  const speak = useCallback(
    async (rawText: string, opts?: SpeakOptions) => {
      const text = (rawText ?? "").trim();
      if (!text) return;
      const mode = opts?.mode;

      // Always start fresh: cancel any in-flight fetch and pause current
      // playback. Consumers wanting toggle behaviour gate the call on
      // `speaking || loading` themselves.
      const myId = ++reqIdRef.current;
      abortInFlight();
      try { player.pause(); } catch {}
      if (isMountedRef.current) setRequestedPlaying(false);

      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setLoading(true);

      try {
        if (__DEV__) console.info("[ElevenLabs] Request start", { chars: text.length, mode });
        const synthRes = await authFetch("/api/tts/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId, modelId, mode }),
          signal: controller.signal,
        });
        if (myId !== reqIdRef.current || !isMountedRef.current) return;
        if (!synthRes.ok) {
          const body = (await synthRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `synthesize_failed_${synthRes.status}`);
        }
        const { readResolvedApiJson } = await import("@/lib/poll-result");
        const data = await readResolvedApiJson<SynthesizeResponse>(synthRes, authFetch);
        if (!data?.audioUrl) throw new Error("tts_missing_audio_url");

        if (myId !== reqIdRef.current || !isMountedRef.current) return;

        const fullUrl = resolveMediaUrl(data.audioUrl);
        if (__DEV__) console.info("[ElevenLabs] Playback URL", fullUrl);
        player.replace({ uri: fullUrl });
        // Apply playback speed if requested (default 1 = normal).
        if (playbackRate && playbackRate !== 1) {
          try { player.setPlaybackRate(playbackRate); } catch {}
        }
        player.play();
        setRequestedPlaying(true);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        if (isMountedRef.current && myId === reqIdRef.current) {
          const message = err instanceof Error ? err.message : "tts_failed";
          if (__DEV__) console.error("[ElevenLabs] Error:", message);
          setError(message);
          setRequestedPlaying(false);
        }
      } finally {
        if (isMountedRef.current && myId === reqIdRef.current) {
          setLoading(false);
          if (abortRef.current === controller) abortRef.current = null;
        }
      }
    },
    [authFetch, abortInFlight, modelId, player, voiceId],
  );

  return {
    speaking,
    loading,
    error,
    currentTime: status.currentTime ?? 0,
    duration: status.duration ?? 0,
    speak,
    stop,
    seekTo,
  };
}
