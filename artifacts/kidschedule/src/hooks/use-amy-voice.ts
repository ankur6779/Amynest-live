import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";

export interface UseAmyVoiceOptions {
  /** Optional override for the voice persona (ElevenLabs voice id). */
  voiceId?: string;
  /** Optional override for the model id (defaults to Turbo v2.5 server-side). */
  modelId?: string;
  /** Multiplier on HTMLAudioElement.playbackRate. Defaults to 1. Live-applied. */
  playbackRate?: number;
  /**
   * Fired when the audio reaches its natural end (not on stop/abort/error).
   * Used by the audio-lessons player to auto-advance to the next paragraph.
   */
  onFinished?: () => void;
}

export interface UseAmyVoiceState {
  speaking: boolean;
  loading: boolean;
  error: string | null;
  /**
   * Synthesises and plays the given text. Calling again while a previous
   * synth/playback is in-flight cancels it and starts fresh — consumers that
   * want toggle (tap-to-stop) UX should check `speaking || loading` first
   * and call `stop()` themselves.
   */
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
 * High-quality Amy TTS via ElevenLabs, with the server doing the actual
 * caching. The client's only job is to swap an <audio> source and tear it
 * down on unmount. We keep at most one audio element alive per consumer.
 */
export function useAmyVoice(options: UseAmyVoiceOptions = {}): UseAmyVoiceState {
  const authFetch = useAuthFetch();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  // AbortController for the currently-in-flight synth + audio fetches. We
  // keep it in a ref so `stop()` can cancel network work that hasn't yet
  // produced a response — without this, tapping Stop during loading still
  // results in a delayed `audio.play()` once the response arrives.
  const abortRef = useRef<AbortController | null>(null);
  // Monotonic request id: every call to `speak()` bumps this. Stale resolves
  // (older request still resolving after the user moved on) check the id
  // before mutating state or starting playback.
  const reqIdRef = useRef(0);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { voiceId, modelId, playbackRate, onFinished } = options;

  // Refs so live changes to rate / onFinished don't bust speak's identity
  // (and don't accidentally re-trigger consumer effects that depend on it).
  const playbackRateRef = useRef(playbackRate ?? 1);
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    playbackRateRef.current = playbackRate ?? 1;
    // Apply rate change live to currently-playing audio.
    if (audioRef.current) audioRef.current.playbackRate = playbackRateRef.current;
  }, [playbackRate]);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const cleanup = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    audioRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const abortInFlight = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      // Bump the id so any still-resolving promise is treated as stale.
      reqIdRef.current += 1;
      abortInFlight();
      cleanup();
      setSpeaking(false);
    };
  }, [abortInFlight, cleanup]);

  const stop = useCallback(() => {
    reqIdRef.current += 1;
    abortInFlight();
    cleanup();
    setSpeaking(false);
    setLoading(false);
  }, [abortInFlight, cleanup]);

  const speak = useCallback(
    async (rawText: string) => {
      const text = (rawText ?? "").trim();
      if (!text) return;

      // Always start fresh: cancel any in-flight fetch and tear down any
      // currently-playing audio. Consumers wanting toggle behaviour gate
      // the call on `speaking || loading` themselves.
      const myId = ++reqIdRef.current;
      abortInFlight();
      cleanup();
      setSpeaking(false);

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
        if (myId !== reqIdRef.current) return; // superseded by a newer call
        if (!synthRes.ok) {
          const body = (await synthRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `synthesize_failed_${synthRes.status}`);
        }
        const data = (await synthRes.json()) as SynthesizeResponse;
        if (myId !== reqIdRef.current) return;

        // Audio routes also require auth, so we fetch the bytes ourselves
        // (with the bearer token attached) and play from a blob URL — this
        // avoids tying auth to <audio> src which can't carry headers.
        const audioRes = await authFetch(data.audioUrl, { signal: controller.signal });
        if (myId !== reqIdRef.current) return;
        if (!audioRes.ok) {
          throw new Error(`audio_fetch_failed_${audioRes.status}`);
        }
        const blob = await audioRes.blob();
        if (myId !== reqIdRef.current) return;

        cleanup();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audio.playbackRate = playbackRateRef.current;
        audio.onended = () => {
          if (myId !== reqIdRef.current) return;
          setSpeaking(false);
          cleanup();
          // Natural completion → notify consumer (e.g. paragraph advance).
          onFinishedRef.current?.();
        };
        audio.onerror = () => {
          if (myId !== reqIdRef.current) return;
          setError("playback_failed");
          setSpeaking(false);
          cleanup();
        };
        audioRef.current = audio;

        await audio.play();
        if (myId !== reqIdRef.current) {
          // User cancelled between play() being scheduled and resolving —
          // tear the audio back down so it doesn't keep playing.
          audio.pause();
          cleanup();
          return;
        }
        setSpeaking(true);
      } catch (err) {
        // Aborts are user-initiated stops, not real errors.
        if ((err as { name?: string })?.name === "AbortError") return;
        if (myId !== reqIdRef.current) return;
        setError(err instanceof Error ? err.message : "tts_failed");
        cleanup();
        setSpeaking(false);
      } finally {
        if (myId === reqIdRef.current) {
          setLoading(false);
          if (abortRef.current === controller) abortRef.current = null;
        }
      }
    },
    [authFetch, cleanup, abortInFlight, modelId, voiceId],
  );

  return { speaking, loading, error, speak, stop };
}
