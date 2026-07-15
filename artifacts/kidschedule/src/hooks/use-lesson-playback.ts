import { useCallback, useEffect, useRef, useState } from "react";
import { useAmyVoice, type SpeakResult } from "@/hooks/use-amy-voice";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { prefetchLessonParagraph } from "@/lib/amy-voice-pipeline-optimizer";
import { getPredictivePrefetchDepth, getAdminAudioOps } from "@/lib/admin-audio-ops";
import { getServerPrefetchDepth } from "@/lib/amy-voice-pipeline-server-sync";
import {
  assertLessonSpeakConsistency,
  createAudioIdentity,
  logLessonAudioIdentity,
  type AudioIdentity,
} from "@/lib/lesson-audio-identity";
import { playLessonParagraphStatic } from "@/lib/lesson-audio-playback";
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
  initialParagraphIdx?: number;
  onLessonComplete?: (lessonId: string) => void;
}

export interface UseLessonPlaybackResult {
  paragraphIdx: number;
  uiIdentity: AudioIdentity | null;
  setParagraphIdx: (idx: number) => void;
  jumpToParagraph: (idx: number) => void;
  intent: "idle" | "playing";
  playbackError: string | null;
  speaking: boolean;
  loading: boolean;
  error: string | null;
  play: () => void;
  pause: () => void;
  primeSpeakGesture: (text: string) => void;
}

function clampParagraphIdx(idx: number, length: number): number {
  if (length <= 0) return 0;
  if (idx < 0) return 0;
  if (idx >= length) return 0;
  return idx;
}

function identityForParagraph(
  lessonId: string,
  paragraphs: string[],
  idx: number,
): AudioIdentity | null {
  const text = paragraphs[idx];
  if (!text?.trim()) return null;
  return createAudioIdentity(lessonId, idx, text);
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
  initialParagraphIdx = 0,
  onLessonComplete,
}: UseLessonPlaybackOptions): UseLessonPlaybackResult {
  const [paragraphIdx, setParagraphIdxState] = useState(() =>
    clampParagraphIdx(initialParagraphIdx, paragraphs.length),
  );
  const [intent, setIntent] = useState<"idle" | "playing">("idle");
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const intentRef = useRef(intent);
  const paragraphIdxRef = useRef(paragraphIdx);
  const lessonIdRef = useRef(lessonId);
  const paragraphsRef = useRef(paragraphs);
  const playbackSessionRef = useRef(0);
  const skipParagraphEffectRef = useRef(false);
  const speakParagraphAtRef = useRef<(idx: number) => void>(() => {});

  intentRef.current = intent;
  paragraphIdxRef.current = paragraphIdx;
  lessonIdRef.current = lessonId;
  paragraphsRef.current = paragraphs;

  const uiIdentity = identityForParagraph(lessonId, paragraphs, paragraphIdx);

  const setParagraphIdx = useCallback(
    (idx: number) => {
      setParagraphIdxState(clampParagraphIdx(idx, paragraphs.length));
    },
    [paragraphs.length],
  );

  const advanceParagraph = useCallback(
    (session: number) => {
      if (session !== playbackSessionRef.current) return;
      if (intentRef.current !== "playing") return;

      const current = paragraphIdxRef.current;
      if (current + 1 >= paragraphs.length) {
        playbackSessionRef.current += 1;
        intentRef.current = "idle";
        setIntent("idle");
        onLessonComplete?.(lessonId);
        return;
      }

      const next = current + 1;
      playbackSessionRef.current += 1;
      paragraphIdxRef.current = next;
      setParagraphIdxState(next);
      skipParagraphEffectRef.current = true;
      speakParagraphAtRef.current(next);
    },
    [paragraphs.length, lessonId, onLessonComplete],
  );

  const {
    speaking,
    loading,
    error,
    pause: pauseVoice,
    primeSpeakGesture,
  } = useAmyVoice({
    voiceId,
    modelId,
    playbackRate,
  });

  const authFetch = useAuthFetch();

  const handleSpeakResult = useCallback((session: number, res: SpeakResult | undefined) => {
    if (session !== playbackSessionRef.current) return;
    if (intentRef.current !== "playing") return;

    const heard =
      res?.success === true &&
      res.layer != null &&
      LESSON_AUDIBLE_LAYERS.has(res.layer);

    if (!heard) {
      const errMsg = res && !res.success ? res.error : "playback_failed";
      console.warn("[LessonPlayback] paragraph failed — staying on paragraph", {
        error: errMsg,
        layer: res?.layer,
      });
      intentRef.current = "idle";
      setIntent("idle");
      pauseVoice();
      setPlaybackError(errMsg);
      return;
    }
    setPlaybackError(null);
  }, [pauseVoice]);

  const speakParagraphAt = useCallback(
    (idx: number) => {
      const activeLessonId = lessonIdRef.current;
      const activeParagraphs = paragraphsRef.current;
      const txt = activeParagraphs[idx];
      if (!txt?.trim()) {
        intentRef.current = "idle";
        setIntent("idle");
        return;
      }

      const identity = createAudioIdentity(activeLessonId, idx, txt);
      logLessonAudioIdentity(identity, { phase: "playback_start" });

      const session = ++playbackSessionRef.current;
      const isCancelled = () =>
        session !== playbackSessionRef.current || intentRef.current !== "playing";

      void (async () => {
        const staticRes = await playLessonParagraphStatic(identity, {
          playbackRate,
          isCancelled,
        });
        if (isCancelled()) return;

        if (staticRes.success) {
          handleSpeakResult(session, { ...staticRes, layer: "static" });
          advanceParagraph(session);
          return;
        }

        // Lessons are 100% pre-generated static catalog — never fall back to the Amy
        // voice pipeline (emergency tones + onFinished would chain-skip paragraphs).
        console.warn("[LessonPlayback] static playback failed — stopping", {
          error: staticRes.error,
          layer: staticRes.layer,
          paragraphIdx: idx,
          lessonId: activeLessonId,
        });
        handleSpeakResult(session, { ...staticRes, layer: staticRes.layer ?? "static" });
      })();
    },
    [playbackRate, advanceParagraph, handleSpeakResult],
  );

  speakParagraphAtRef.current = speakParagraphAt;

  const pause = useCallback(() => {
    intentRef.current = "idle";
    setIntent("idle");
    setPlaybackError(null);
    playbackSessionRef.current += 1;
    pauseVoice();
  }, [pauseVoice]);

  const play = useCallback(() => {
    recordTtsUserGesture();
    setPlaybackError(null);
    intentRef.current = "playing";
    setIntent("playing");
    skipParagraphEffectRef.current = true;
    const idx = paragraphIdxRef.current;
    const identity = identityForParagraph(
      lessonIdRef.current,
      paragraphsRef.current,
      idx,
    );
    if (identity) {
      prefetchLessonParagraph(identity, authFetch, voiceId, modelId);
    }
    speakParagraphAtRef.current(idx);
  }, [authFetch, voiceId, modelId]);

  const jumpToParagraph = useCallback(
    (idx: number) => {
      const next = clampParagraphIdx(idx, paragraphs.length);
      if (next === paragraphIdxRef.current) return;

      if (intentRef.current === "playing") {
        playbackSessionRef.current += 1;
        pauseVoice();
        intentRef.current = "playing";
        setIntent("playing");
        paragraphIdxRef.current = next;
        setParagraphIdxState(next);
        skipParagraphEffectRef.current = true;
        speakParagraphAtRef.current(next);
        return;
      }

      paragraphIdxRef.current = next;
      setParagraphIdxState(next);
    },
    [paragraphs.length, pauseVoice],
  );

  useEffect(() => {
    if (intent !== "playing") return;
    if (skipParagraphEffectRef.current) {
      skipParagraphEffectRef.current = false;
      return;
    }
    speakParagraphAtRef.current(paragraphIdxRef.current);
  }, [paragraphIdx, intent]);

  useEffect(() => {
    const nextIdx = clampParagraphIdx(initialParagraphIdx, paragraphs.length);
    playbackSessionRef.current = 0;
    intentRef.current = "idle";
    skipParagraphEffectRef.current = false;
    setIntent("idle");
    setPlaybackError(null);
    setParagraphIdxState(nextIdx);
    paragraphIdxRef.current = nextIdx;

    if (autoPlay) {
      recordTtsUserGesture();
      intentRef.current = "playing";
      setIntent("playing");
      skipParagraphEffectRef.current = true;
      speakParagraphAtRef.current(nextIdx);
    }
  }, [autoPlay, lessonId, initialParagraphIdx, paragraphs.length]);

  useEffect(() => {
    if (intent !== "playing") return;
    const prefetchDepth = Math.max(
      getPredictivePrefetchDepth(),
      getServerPrefetchDepth(),
      getAdminAudioOps().prefetchDepth ?? 1,
    );

    for (let offset = 1; offset <= prefetchDepth; offset += 1) {
      const nextIdx = paragraphIdx + offset;
      const nextText = paragraphs[nextIdx];
      if (!nextText?.trim()) break;

      const prevIdx = nextIdx - 1;
      const previousIdentity =
        prevIdx >= 0 ? identityForParagraph(lessonId, paragraphs, prevIdx) : undefined;
      const nextIdentity = identityForParagraph(lessonId, paragraphs, nextIdx);
      if (!nextIdentity) continue;

      prefetchLessonParagraph(
        nextIdentity,
        authFetch,
        voiceId,
        modelId,
        previousIdentity ?? undefined,
      );
    }
  }, [intent, paragraphIdx, paragraphs, authFetch, voiceId, modelId, lessonId]);

  return {
    paragraphIdx,
    uiIdentity,
    setParagraphIdx,
    jumpToParagraph,
    intent,
    playbackError,
    speaking,
    loading,
    error,
    play,
    pause,
    primeSpeakGesture: (text: string) => {
      const idx = paragraphIdxRef.current;
      const identity = identityForParagraph(lessonIdRef.current, paragraphsRef.current, idx);
      if (identity) assertLessonSpeakConsistency(identity, text);
      primeSpeakGesture(text, { lessonParagraph: true, audioIdentity: identity ?? undefined });
    },
  };
}
