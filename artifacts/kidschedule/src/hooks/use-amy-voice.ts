import { useCallback, useEffect, useRef, useState } from "react";
import { agentDebugLog } from "@/lib/agent-debug-log";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useGuardedSetter, useMountedRef } from "@/hooks/use-safe-async";
import {
  isValidAudioUrl,
  logTtsClient,
  logTtsClientError,
  playAudio,
  resolveClientPlaybackUrl,
  synthesizeTtsWithBackgroundPoll,
} from "@/lib/tts-playback";
import {
  emitStaticAudioVisualFallback,
  mustUseStaticOnly,
  prepareStaticPlaybackAudio,
  safePlayAudio,
} from "@/lib/static-audio";
import {
  configureMobileAudioElement,
  getTtsRequestTimeoutMs,
  isTtsPlaybackAllowed,
  recordTtsUserGesture,
} from "@/lib/tts-guard";

// ─── Global single-flight guard ───────────────────────────────────────────────
// At most one ElevenLabs network round-trip at a time, across all hook
// instances on the page. Protected by `busyRef` (instance-level) so that:
//   • A DIFFERENT instance calling speak() while one is in-flight is skipped.
//   • The SAME instance calling speak() again cancels its own previous call
//     (original cancel-and-restart behaviour preserved).
//   • stop() and unmount cleanly release the lock immediately.
let _ttsBusy = false;
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

export interface SpeakOptions {
  /**
   * `phonics` swaps to crisp ElevenLabs voice settings tuned for teaching
   * phoneme sounds. Used by the Phonics learning UI on letter tiles so
   * "buh" is pronounced as the actual sound, not the spoken word "buh".
   */
  mode?: "default" | "phonics";
}

/**
 * Structured return value from speak(). Callers that drive downstream logic
 * (play tracking, auto-advance) MUST check `success` before proceeding.
 * Never throws — all failure modes are represented as { success: false }.
 */
export type SpeakResult =
  | { success: true }
  | { success: false; error: string };

export interface UseAmyVoiceState {
  speaking: boolean;
  loading: boolean;
  error: string | null;
  /**
   * Synthesises and plays the given text. Always resolves — never throws.
   * Returns `{ success: true }` when audio starts playing, or
   * `{ success: false, error }` for any failure (timeout, network, abort,
   * busy-locked, empty text). Callers that auto-advance or record progress
   * MUST check `success` before running downstream logic.
   *
   * Pass `{ mode: "phonics" }` for letter-sound playback (different ElevenLabs
   * voice settings, separate cache namespace).
   */
  speak: (text: string, opts?: SpeakOptions) => Promise<SpeakResult>;
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
  const isMounted = useMountedRef();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  // AbortController for the currently-in-flight synth + audio fetches.
  const abortRef = useRef<AbortController | null>(null);
  // Monotonic request id: every call to speak() bumps this. Stale resolves
  // check the id before mutating state or starting playback.
  const reqIdRef = useRef(0);
  // Tracks whether THIS instance currently holds the global _ttsBusy lock.
  // Prevents the instance's own finally block from releasing a lock that was
  // already claimed by a newer speak() call or cleared by stop().
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

  // Release the global busy lock if this instance holds it.
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
      cleanup();
      releaseBusy();
    };
  }, [abortInFlight, cleanup, releaseBusy]);

  const stop = useCallback(() => {
    reqIdRef.current += 1;
    abortInFlight();
    cleanup();
    releaseBusy(); // release immediately — don't wait for async finally
    safeSetSpeaking(false);
    safeSetLoading(false);
  }, [abortInFlight, cleanup, releaseBusy, safeSetSpeaking, safeSetLoading]);

  const speak = useCallback(
    async (rawText: string, opts?: SpeakOptions): Promise<SpeakResult> => {
      const text = (rawText ?? "").trim();
      if (!text) return { success: false, error: "tts_empty_text" };
      if (!isTtsPlaybackAllowed()) {
        console.warn("Audio blocked: waiting for user interaction");
        return { success: false, error: "tts_blocked_until_gesture" };
      }
      recordTtsUserGesture();
      const mode = opts?.mode;

      // Cross-instance guard: if a DIFFERENT instance is fetching, skip.
      // busyRef.current being true means THIS instance set the lock, so we
      // allow it to cancel its own previous call (cancel-and-restart UX).
      if (_ttsBusy && !busyRef.current) {
        console.warn("[TTS] skipped — another TTS instance is already in flight");
        return { success: false, error: "tts_skipped" };
      }

      // Cancel any in-flight fetch + playing audio on this instance.
      const myId = ++reqIdRef.current;
      abortInFlight();
      cleanup();
      safeSetSpeaking(false);

      const controller = new AbortController();
      abortRef.current = controller;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const armTtsNetworkTimeout = () => {
        const ms = getTtsRequestTimeoutMs();
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (abortRef.current === controller) {
            console.error("[TTS] request timed out after", ms, "ms — aborting");
            controller.abort();
          }
        }, ms);
      };

      safeSetError(null);
      safeSetLoading(true);
      _ttsBusy = true;
      busyRef.current = true;

      try {
        const staticMode = mode === "phonics" ? "phonics" : "default";

        const staticAudio = await prepareStaticPlaybackAudio(text, staticMode);
        if (staticAudio) {
          if (timeoutId) clearTimeout(timeoutId);
          logTtsClient("Static audio hit", { chars: text.length, mode: staticMode });
          cleanup();
          configureMobileAudioElement(staticAudio);
          staticAudio.playbackRate = playbackRateRef.current;
          staticAudio.onended = () => {
            if (myId !== reqIdRef.current || !isMounted.current) return;
            safeSetSpeaking(false);
            cleanup();
            onFinishedRef.current?.();
          };
          staticAudio.onerror = () => {
            if (myId !== reqIdRef.current || !isMounted.current) return;
            safeSetSpeaking(false);
            cleanup();
          };
          audioRef.current = staticAudio;
          const played = await safePlayAudio(staticAudio, {
            proxyUrl: staticAudio.src,
            phrase: text,
            mode: staticMode,
          });
          if (!played) {
            cleanup();
            safeSetSpeaking(false);
            emitStaticAudioVisualFallback({ phrase: text, mode: staticMode });
            return { success: false, error: "play_failed_static" };
          }
          if (myId !== reqIdRef.current || !isMounted.current) {
            staticAudio.pause();
            cleanup();
            return { success: false, error: "tts_cancelled" };
          }
          safeSetSpeaking(true);
          return { success: true };
        }

        if (mustUseStaticOnly(text, staticMode)) {
          emitStaticAudioVisualFallback({ phrase: text, mode: staticMode });
          return { success: false, error: "tts_static_missing_url" };
        }

        armTtsNetworkTimeout();
        logTtsClient("Request start", { chars: text.length, mode });
        const data = await synthesizeTtsWithBackgroundPoll(
          authFetch,
          { text, voiceId, modelId, mode },
          { signal: controller.signal },
        );
        if (myId !== reqIdRef.current) return { success: false, error: "tts_cancelled" };

        // #region agent log
        agentDebugLog({
          runId: "post-fix",
          hypothesisId: "F",
          location: "use-amy-voice.ts:speak",
          message: "synthesizeTts response",
          data: {
            background: Boolean(data?.background),
            success: Boolean(data?.success),
            hasAudioUrl: Boolean(data?.audioUrl),
            error: data?.error ?? null,
          },
        });
        // #endregion

        if (data?.background) {
          console.warn("TTS warming in background — cache not ready after poll");
          return { success: false, error: "tts_background" };
        }
        if (!data?.success || !isValidAudioUrl(data.audioUrl)) {
          console.warn("No audio, skip");
          return { success: false, error: data?.error ?? "tts_failed" };
        }
        logTtsClient("Synthesize OK", { cacheKey: data.cacheKey, cached: data.cached });

        const playbackUrl = resolveClientPlaybackUrl(data.audioUrl, data.cacheKey);
        if (!playbackUrl) {
          console.warn("Invalid audio URL, skipping playback");
          return { success: false, error: "tts_invalid_audio_url" };
        }

        cleanup();
        const audio = playAudio(playbackUrl);
        if (timeoutId) clearTimeout(timeoutId);
        if (!audio) {
          console.warn("No audio, skip");
          return { success: false, error: "tts_invalid_audio_url" };
        }
        audio.playbackRate = playbackRateRef.current;
        audio.onended = () => {
          if (myId !== reqIdRef.current || !isMounted.current) return;
          safeSetSpeaking(false);
          cleanup();
          onFinishedRef.current?.();
        };
        audio.onerror = () => {
          if (myId !== reqIdRef.current || !isMounted.current) return;
          const mediaErr = audio.error;
          const code = mediaErr?.code ?? "unknown";
          logTtsClientError("HTMLAudioElement error", new Error(`media_error_${code}`));
          safeSetError(`playback_failed_${code}`);
          safeSetSpeaking(false);
          cleanup();
        };
        audioRef.current = audio;

        const played = await safePlayAudio(audio);
        if (!played) {
          const errCode = "playback_blocked_tap_again";
          safeSetError(errCode);
          cleanup();
          safeSetSpeaking(false);
          return { success: false, error: errCode };
        }
        if (myId !== reqIdRef.current || !isMounted.current) {
          audio.pause();
          cleanup();
          return { success: false, error: "tts_cancelled" };
        }
        logTtsClient("Playback started");
        safeSetSpeaking(true);
        return { success: true };

      } catch (err) {
        const errName = (err as { name?: string })?.name;
        if (errName === "AbortError") {
          if (myId === reqIdRef.current && isMounted.current) {
            console.error("[TTS] timed out — request aborted after", getTtsRequestTimeoutMs(), "ms");
            safeSetError("tts_timeout");
            safeSetSpeaking(false);
            return { success: false, error: "tts_timeout" };
          }
          return { success: false, error: "tts_cancelled" };
        }
        if (myId !== reqIdRef.current || !isMounted.current) {
          return { success: false, error: "tts_cancelled" };
        }
        logTtsClientError("speak failed", err);
        const errMsg = err instanceof Error ? err.message : "tts_failed";
        safeSetError(errMsg);
        cleanup();
        safeSetSpeaking(false);
        return { success: false, error: errMsg };

      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        // Only release the global lock if this call still owns it
        // (i.e. it hasn't already been released by stop() or a newer call).
        if (myId === reqIdRef.current && isMounted.current) {
          releaseBusy();
          safeSetLoading(false);
          if (abortRef.current === controller) abortRef.current = null;
        }
      }
    },
    [
      authFetch,
      cleanup,
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
