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
import { audioManager } from "@/lib/audio-manager";
import { lookupStaticAudioUrlStrict } from "@/lib/static-audio";
import { resolveApiMediaUrl } from "@/lib/api";
import { isAndroidAmyNestAudioClient } from "@/lib/device-lite";
import {
  logAudioPipeline,
  setAudioPipelineContext,
  setAudioPipelineMachineState,
} from "@/lib/debug-audio-pipeline";

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
      logAudioPipeline("advanceParagraph", {
        paragraphIdx: current,
        lessonId,
        detail: { session, next: current + 1 },
        trace: true,
      });
      setAudioPipelineMachineState("advance", { from: current, session });

      if (current + 1 >= paragraphs.length) {
        playbackSessionRef.current += 1;
        intentRef.current = "idle";
        setIntent("idle");
        setAudioPipelineContext({ intent: "idle" });
        setAudioPipelineMachineState("idle", { reason: "lesson_complete" });
        onLessonComplete?.(lessonId);
        return;
      }

      const next = current + 1;
      playbackSessionRef.current += 1;
      paragraphIdxRef.current = next;
      setParagraphIdxState(next);
      setAudioPipelineContext({ paragraphIdx: next });
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
      const gestureBlocked =
        errMsg === "USER_INTERACTION_REQUIRED" ||
        errMsg === "GESTURE_BLOCKED" ||
        /user.?interaction|notallowed|gesture/i.test(errMsg);
      console.warn("[LessonPlayback] paragraph failed — staying on paragraph", {
        error: errMsg,
        layer: res?.layer,
        paragraphIdx: paragraphIdxRef.current,
        lessonId: lessonIdRef.current,
        gestureBlocked,
      });
      logAudioPipeline("handleSpeakResult_failure", {
        paragraphIdx: paragraphIdxRef.current,
        lessonId: lessonIdRef.current,
        detail: { errMsg, layer: res?.layer, gestureBlocked, success: res?.success },
      });
      setAudioPipelineMachineState("error", { errMsg });
      intentRef.current = "idle";
      setIntent("idle");
      pauseVoice();
      const shown = gestureBlocked ? "playback_blocked_tap_again" : errMsg;
      setPlaybackError(shown);
      setAudioPipelineContext({ intent: "idle", playbackError: shown });
      return;
    }
    logAudioPipeline("handleSpeakResult_success", {
      paragraphIdx: paragraphIdxRef.current,
      lessonId: lessonIdRef.current,
      detail: { layer: res?.layer },
    });
    setAudioPipelineMachineState("handle_result", { success: true });
    setPlaybackError(null);
    setAudioPipelineContext({ playbackError: null });
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

      setAudioPipelineContext({
        paragraphIdx: idx,
        lessonId: activeLessonId,
        intent: "playing",
      });
      setAudioPipelineMachineState("speak_start", { idx, session });
      logAudioPipeline("speakParagraphAt", {
        paragraphIdx: idx,
        lessonId: activeLessonId,
        detail: { session },
      });

      void (async () => {
        const staticRes = await playLessonParagraphStatic(identity, {
          playbackRate,
          isCancelled,
        });
        if (isCancelled()) {
          logAudioPipeline("speakParagraphAt_cancelled", {
            paragraphIdx: idx,
            lessonId: activeLessonId,
            detail: { session },
          });
          setAudioPipelineMachineState("cancelled", { session });
          return;
        }

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
    audioManager.unlockFromUserGesture();
    setPlaybackError(null);
    intentRef.current = "playing";
    setIntent("playing");
    setAudioPipelineContext({
      intent: "playing",
      playbackError: null,
      lessonId: lessonIdRef.current,
      paragraphIdx: paragraphIdxRef.current,
    });
    setAudioPipelineMachineState("playing");
    logAudioPipeline("play_tap", {
      paragraphIdx: paragraphIdxRef.current,
      lessonId: lessonIdRef.current,
    });
    skipParagraphEffectRef.current = true;
    const idx = paragraphIdxRef.current;
    const identity = identityForParagraph(
      lessonIdRef.current,
      paragraphsRef.current,
      idx,
    );
    if (identity) {
      const staticUrl = lookupStaticAudioUrlStrict(identity.text, "default");
      if (staticUrl) {
        audioManager.primeSpeechUrlInUserGesture(resolveApiMediaUrl(staticUrl));
      }
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

    // Auto-play from useEffect is outside the user-gesture stack. On Android
    // WebView that makes audio.play() fail immediately — show tap-to-start
    // instead of a hard failure on open.
    if (autoPlay) {
      if (isAndroidAmyNestAudioClient()) {
        setPlaybackError("playback_blocked_tap_again");
        return;
      }
      recordTtsUserGesture();
      audioManager.unlockFromUserGesture();
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
