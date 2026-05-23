import { useCallback, useEffect, useRef, useState } from "react";
import { useAmyVoice, type SpeakResult } from "@/hooks/use-amy-voice";
import { recordTtsUserGesture } from "@/lib/tts-guard";

const LESSON_AUDIBLE_LAYERS = new Set([
  "static",
  "cache",
  "api",
  "elevenlabs",
  "emergency_local",
]);

export interface UseLessonPlaybackOptions {
  paragraphs: string[];
  lessonId: string;
  voiceId: string;
  modelId: string;
  playbackRate?: number;
  autoPlay?: boolean;
  onLessonComplete?: (lessonId: string) => void;
}

export interface UseLessonPlaybackResult {
  paragraphIdx: number;
  setParagraphIdx: (idx: number) => void;
  intent: "idle" | "playing";
  playbackError: string | null;
  speaking: boolean;
  loading: boolean;
  error: string | null;
  play: () => void;
  pause: () => void;
  primeSpeakGesture: (text: string) => void;
}

/**
 * Intent-driven lesson playback — no lifecycle stop effects.
 * Only explicit play()/pause() control audio; controller owns TTS.
 */
export function useLessonPlayback({
  paragraphs,
  lessonId,
  voiceId,
  modelId,
  playbackRate = 1,
  autoPlay = false,
  onLessonComplete,
}: UseLessonPlaybackOptions): UseLessonPlaybackResult {
  const [paragraphIdx, setParagraphIdx] = useState(0);
  const [intent, setIntent] = useState<"idle" | "playing">("idle");
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const intentRef = useRef(intent);
  const paragraphIdxRef = useRef(paragraphIdx);
  const playbackSessionRef = useRef(0);
  const skipParagraphEffectRef = useRef(false);

  intentRef.current = intent;
  paragraphIdxRef.current = paragraphIdx;

  const advanceParagraph = useCallback(
    (session: number) => {
      if (session !== playbackSessionRef.current) return;
      if (intentRef.current !== "playing") return;

      setParagraphIdx((i) => {
        if (i + 1 >= paragraphs.length) {
          intentRef.current = "idle";
          setIntent("idle");
          onLessonComplete?.(lessonId);
          return i;
        }
        return i + 1;
      });
    },
    [paragraphs.length, lessonId, onLessonComplete],
  );

  const {
    speaking,
    loading,
    error,
    speak,
    pause: pauseVoice,
    primeSpeakGesture,
  } = useAmyVoice({
    voiceId,
    modelId,
    playbackRate,
  });

  const handleSpeakResult = useCallback((session: number, res: SpeakResult | undefined) => {
    if (session !== playbackSessionRef.current) return;
    if (intentRef.current !== "playing") return;

    const heard =
      res?.success === true &&
      res.layer != null &&
      LESSON_AUDIBLE_LAYERS.has(res.layer);

    if (!heard) {
      console.warn("[LessonPlayback] paragraph failed — staying on paragraph", {
        error: res?.error,
        layer: res?.layer,
      });
      intentRef.current = "idle";
      setIntent("idle");
      pauseVoice();
      setPlaybackError(res?.error ?? "playback_failed");
      return;
    }
    setPlaybackError(null);
  }, [pauseVoice]);

  const speakParagraphAt = useCallback(
    (idx: number) => {
      const txt = paragraphs[idx];
      if (!txt?.trim()) {
        intentRef.current = "idle";
        setIntent("idle");
        return;
      }

      const session = ++playbackSessionRef.current;
      void speak(txt, {
        waitUntilEnd: true,
        lessonParagraph: true,
        onFinished: () => advanceParagraph(session),
      })
        .then((res) => handleSpeakResult(session, res))
        .catch((err: unknown) => {
          if (session !== playbackSessionRef.current) return;
          if (intentRef.current !== "playing") return;
          console.warn("[LessonPlayback] speak rejected", err);
          intentRef.current = "idle";
          setIntent("idle");
          pauseVoice();
          setPlaybackError(
            err instanceof Error ? err.message : "playback_failed",
          );
        });
    },
    [paragraphs, speak, advanceParagraph, handleSpeakResult, pauseVoice],
  );

  const speakParagraphAtRef = useRef(speakParagraphAt);
  speakParagraphAtRef.current = speakParagraphAt;

  const play = useCallback(() => {
    recordTtsUserGesture();
    setPlaybackError(null);
    intentRef.current = "playing";
    setIntent("playing");
    skipParagraphEffectRef.current = true;
    speakParagraphAtRef.current(paragraphIdxRef.current);
  }, []);

  const pause = useCallback(() => {
    intentRef.current = "idle";
    setIntent("idle");
    playbackSessionRef.current += 1;
    pauseVoice();
  }, [pauseVoice]);

  useEffect(() => {
    if (intent !== "playing") return;
    if (skipParagraphEffectRef.current) {
      skipParagraphEffectRef.current = false;
      return;
    }
    speakParagraphAtRef.current(paragraphIdxRef.current);
  }, [paragraphIdx, intent]);

  useEffect(() => {
    playbackSessionRef.current = 0;
    intentRef.current = "idle";
    skipParagraphEffectRef.current = false;
    setIntent("idle");
    setPlaybackError(null);

    if (autoPlay) {
      recordTtsUserGesture();
      intentRef.current = "playing";
      setIntent("playing");
      skipParagraphEffectRef.current = true;
      speakParagraphAtRef.current(paragraphIdxRef.current);
    }
  }, [autoPlay, lessonId]);

  return {
    paragraphIdx,
    setParagraphIdx,
    intent,
    playbackError,
    speaking,
    loading,
    error,
    play,
    pause,
    primeSpeakGesture: (text: string) =>
      primeSpeakGesture(text, { lessonParagraph: true }),
  };
}
