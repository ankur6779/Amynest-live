// audit-block-ignore-start -- immersive Speech Coach uses intentional neon dark UI accents.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppLink } from "@/components/app-link";
import { getAuth } from "firebase/auth";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mic,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Volume2,
} from "lucide-react";
import { useGetSpeechProgress, useLogSpeechPracticeAttempt } from "@workspace/api-client-react";
import {
  buildActivityIntro,
  buildCoachSessionMemory,
  buildItemPromptLines,
  buildListeningEncouragement,
  buildPracticeSession,
  buildProgressNote,
  buildSessionClosing,
  buildSessionGreeting,
  countMemoryReferences,
  createCoachDialogueContext,
  evaluateCoachResponse,
  getPromptsPool,
  isSpeechCoachEligibleAgeMonths,
  type CoachEvaluationResult,
  type PronouncePrompt,
  type PronouncePromptDifficulty,
  type PronouncePromptKind,
} from "@workspace/speech-coach";
import { AmyIcon } from "@/components/amy-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { warmSpeechCoach } from "@/lib/global-audio-warmup";
import { isLocalAudioRecoveryEnabled } from "@/lib/local-audio-recovery";
import { isCoachStaticPackLine, playCoachStaticLine } from "@/lib/coach-local-playback";
import { openAndroidMicrophoneSettings } from "@/lib/microphone-permission";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import {
  buildCoachLocalSnapshot,
  clampClarityScore,
  getSpeechCoachMicStatusMessage,
  loadCoachLocalSnapshot,
  playSpeechCue,
  saveCoachJourneySnapshot,
  weakSoundsToHistory,
  type SessionAttemptInput,
} from "./speech-coach-utils";
import { useRecordLearningActivity } from "@/hooks/use-record-learning-activity";
import { useListChildren } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { usePrimeIosMicrophone } from "@/hooks/use-prime-ios-microphone";
import { useFeatureUsage } from "@/hooks/use-feature-usage";
import { SPEECH_COACH_SESSION_FEATURE } from "@/lib/feature-usage-limits";
import { openSubscriptionGate } from "@/lib/subscription-gate";
import { handleSubscriptionMutationGateError } from "@/lib/subscription-mutation-gate";

type AnyChild = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number | null;
};

type CoachState =
  | "idle"
  | "ai_speaking"
  | "listening"
  | "processing"
  | "feedback"
  | "next_task"
  | "complete";

type AgeMode = {
  label: string;
  intro: string;
  kind: PronouncePromptKind;
  difficulty: PronouncePromptDifficulty;
  sessionSize: number;
  toddler?: boolean;
};

type Result = CoachEvaluationResult;

const DEFAULT_TASKS: PronouncePrompt[] = [
  { id: "live_cat", kind: "word", text: "cat", ageBands: ["3y"], i18nKeyHint: "", difficulty: "easy" },
  { id: "live_ball", kind: "word", text: "ball", ageBands: ["3y"], i18nKeyHint: "", difficulty: "easy" },
  { id: "live_star", kind: "word", text: "star", ageBands: ["3y"], i18nKeyHint: "", difficulty: "medium" },
  { id: "live_happy", kind: "word", text: "happy", ageBands: ["3y"], i18nKeyHint: "", difficulty: "medium" },
  { id: "live_fun", kind: "sentence", text: "This is fun.", ageBands: ["4y_plus"], i18nKeyHint: "", difficulty: "medium" },
];

function totalMonths(c: AnyChild): number {
  return (c.age ?? 0) * 12 + (c.ageMonths ?? 0);
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  let s = seed || 1;
  const next = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function getAgeMode(months: number): AgeMode {
  if (months < 12) {
    return { label: "Infant", intro: "Parent-led vowels — celebrate any sound.", kind: "phonic", difficulty: "easy", sessionSize: 4, toddler: true };
  }
  if (months < 36) {
    return { label: "Ages 1-2", intro: "Short sounds — hold the mic while you speak.", kind: "phonic", difficulty: "easy", sessionSize: 4, toddler: true };
  }
  if (months < 72) {
    return {
      label: "Ages 3-5",
      intro: "Fun word practice with lots of encouragement.",
      kind: "word",
      difficulty: "easy",
      sessionSize: 6,
    };
  }
  if (months < 108) {
    return {
      label: "Ages 6-8",
      intro: "Words and short phrases with simple corrections.",
      kind: "word",
      difficulty: "medium",
      sessionSize: 8,
    };
  }
  return {
    label: "Ages 9-10",
    intro: "Sentence practice focused on fluency and clarity.",
    kind: "sentence",
    difficulty: "advanced",
    sessionSize: 8,
  };
}

function buildTasks(months: number, history: ReturnType<typeof weakSoundsToHistory>): PronouncePrompt[] {
  const mode = getAgeMode(months);
  const primary = buildPracticeSession(months, mode.kind, mode.difficulty, mode.sessionSize + 4, Date.now(), history);
  if (primary.length >= mode.sessionSize) return [...primary].slice(0, mode.sessionSize);
  const secondary =
    mode.kind === "sentence"
      ? [...getPromptsPool(months, "word", "advanced")]
      : [...getPromptsPool(months, "sentence", mode.difficulty)];
  const pool = [...primary, ...secondary, ...DEFAULT_TASKS];
  const unique = Array.from(new Map(pool.map((p) => [p.id, p])).values());
  return seededShuffle(unique, Date.now()).slice(0, Math.min(mode.sessionSize, unique.length));
}

function StarsBurst({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="absolute h-5 w-5 animate-ping fill-yellow-300 text-yellow-300"
          style={{
            left: `${18 + i * 13}%`,
            top: `${18 + (i % 3) * 18}%`,
            animationDelay: `${i * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}

function AmyHero({ state, success }: { state: CoachState; success: boolean }) {
  const listening = state === "listening";
  const speaking = state === "ai_speaking" || state === "feedback" || state === "next_task";
  const thinking = state === "processing";
  return (
    <div className="relative flex min-h-[320px] items-center justify-center">
      <StarsBurst show={success} />
      <div
        className={[
          "absolute h-72 w-72 rounded-full blur-3xl transition-all duration-500",
          listening ? "bg-cyan-400/30" : speaking ? "bg-fuchsia-500/35" : "bg-violet-500/20",
        ].join(" ")}
      />
      {listening && <div className="absolute h-56 w-56 animate-ping rounded-full border border-cyan-300/50" />}
      <div
        className={[
          "relative grid h-52 w-52 place-items-center rounded-full border bg-white/10 shadow-2xl backdrop-blur-xl transition-all duration-500",
          speaking ? "scale-105 border-fuchsia-300/70 shadow-fuchsia-500/40" : "",
          listening ? "scale-110 border-cyan-300/80 shadow-cyan-500/40" : "",
          thinking ? "border-amber-300/80 shadow-amber-500/40" : "",
        ].join(" ")}
      >
        {thinking && <Loader2 className="absolute h-56 w-56 animate-spin text-amber-200/50" />}
        <AmyIcon size={132} ring bounce={success || speaking} />
      </div>
    </div>
  );
}

export function LiveSpeechCoach({
  child,
  onOpenParentTools,
}: {
  child: AnyChild;
  onOpenParentTools?: () => void;
}) {
  const ageMonths = totalMonths(child);
  const mode = useMemo(() => getAgeMode(ageMonths), [ageMonths]);
  const progress = useGetSpeechProgress({ childId: child.id, range: "week" });
  const featureUsage = useFeatureUsage();
  const speechLocked = featureUsage.isFeatureLocked(SPEECH_COACH_SESSION_FEATURE);
  const { recordActivity } = useRecordLearningActivity(child.id);
  const practiceHistory = useMemo(() => weakSoundsToHistory(progress.data?.weakSounds ?? []), [progress.data?.weakSounds]);
  const [tasks, setTasks] = useState<PronouncePrompt[]>(() => buildTasks(ageMonths, practiceHistory));
  const [idx, setIdx] = useState(0);
  const [state, setState] = useState<CoachState>("idle");
  const [lastResult, setLastResult] = useState<Result | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [status, setStatus] = useState("Tap Start and Amy will begin.");
  const [hasStarted, setHasStarted] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);
  const [micSettingsOpen, setMicSettingsOpen] = useState(false);
  const [startingMic, setStartingMic] = useState(false);
  const [sessionSeed, setSessionSeed] = useState(() => Date.now());
  const [turnIndex, setTurnIndex] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [memoryRefsUsed, setMemoryRefsUsed] = useState(0);
  const localSnapshot = useMemo(
    () => loadCoachLocalSnapshot(child.id),
    [child.id],
  );
  const coachMemory = useMemo(() => {
    const p = progress.data;
    if (!p) return undefined;
    return buildCoachSessionMemory(
      {
        promptsAttempted: p.promptsAttempted,
        promptsClear: p.promptsClear,
        pronunciationPct: p.pronunciationPct,
        streakDays: p.streakDays,
        daysActive: p.daysActive,
        dailyTrend: p.dailyTrend,
        weakSounds: p.weakSounds,
      },
      localSnapshot,
    );
  }, [localSnapshot, progress.data]);
  const stateRef = useRef<CoachState>("idle");
  const ttsPurposeRef = useRef<"prompt" | "feedback" | "complete" | "encouragement" | null>(null);
  const inSequenceRef = useRef(false);
  const listenStartedRef = useRef(false);
  const startingMicRef = useRef(false);
  const listeningEncouragedRef = useRef(false);
  const sessionAttemptsRef = useRef<SessionAttemptInput[]>([]);
  const logAttempt = useLogSpeechPracticeAttempt();

  const dialogueContext = useCallback(
    (sessionIndex: number, currentStreak: number) =>
      createCoachDialogueContext({
        childName: child.name,
        ageMonths,
        promptKind: mode.kind,
        sessionIndex,
        sessionTotal: tasks.length,
        streak: currentStreak,
        sessionSeed,
        turnIndex,
        toddler: mode.toddler,
        memory: coachMemory,
        memoryRefsUsed,
        sessionBestStreak: bestStreak,
        sessionScore: score,
      }),
    [
      ageMonths,
      bestStreak,
      child.name,
      coachMemory,
      memoryRefsUsed,
      mode.kind,
      mode.toddler,
      score,
      sessionSeed,
      tasks.length,
      turnIndex,
    ],
  );

  const getAuthToken = useCallback(async () => {
    try {
      return (await getAuth().currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  }, []);
  const stt = useSpeechRecognition("en-US", { getAuthToken });
  const voice = useAmyVoice({
    onFinished: () => {
      if (inSequenceRef.current) return;
      if (ttsPurposeRef.current === "prompt") {
        setState("idle");
        setStatus("Tap the mic and say it back.");
      }
      if (ttsPurposeRef.current === "feedback") {
        setState("next_task");
      }
      ttsPurposeRef.current = null;
    },
  });

  const current = tasks[idx] ?? null;
  const progressPct = tasks.length > 0 ? ((idx + (state === "complete" ? 1 : 0)) / tasks.length) * 100 : 0;
  const canRecord = hasStarted && current && (state === "idle" || state === "listening");

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const ctx = dialogueContext(0, 0);
    const warmLines = [
      ...buildSessionGreeting(ctx).slice(0, 2),
      ...tasks.slice(0, 3).flatMap((task) => buildItemPromptLines(ctx, task)),
    ];
    warmSpeechCoach(warmLines);
  }, [dialogueContext, tasks]);

  useEffect(() => {
    setTasks(buildTasks(ageMonths, practiceHistory));
    setIdx(0);
    setState("idle");
    setLastResult(null);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setMemoryRefsUsed(0);
    sessionAttemptsRef.current = [];
    setTurnIndex(0);
    setSessionSeed(Date.now());
    setStatus("Tap Start and Amy will greet you.");
    setHasStarted(false);
    stt.reset();
    voice.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id, ageMonths, practiceHistory]);

  useEffect(() => {
    if (state !== "listening") return;
    if (!listenStartedRef.current) return;
    if (stt.listening || stt.transcribing) return;
    const transcript = stt.transcript.trim();
    if (!transcript && !stt.error) return;
    void processResponse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, stt.listening, stt.transcribing, stt.transcript, stt.error]);

  useEffect(() => {
    if (stt.error === "microphone_blocked") {
      listenStartedRef.current = false;
      setStartingMic(false);
      startingMicRef.current = false;
      setState("idle");
      setStatus("Microphone access is required for Speech Coach.");
      setMicSettingsOpen(true);
    } else if (stt.error === "microphone_denied") {
      listenStartedRef.current = false;
      setStartingMic(false);
      startingMicRef.current = false;
      setState("idle");
      setStatus(getSpeechCoachMicStatusMessage({
        error: stt.error,
        sessionStatus: stt.status,
        fallbackStatus: status,
      }));
    } else if (stt.error && stt.error !== "transcription_failed" && stt.error !== "transcription_auth_failed") {
      listenStartedRef.current = false;
      setStartingMic(false);
      startingMicRef.current = false;
      setState("idle");
      setStatus(getSpeechCoachMicStatusMessage({
        error: stt.error,
        sessionStatus: stt.status,
        fallbackStatus: status,
      }));
    }
  }, [stt.error, stt.status, status]);

  const finishSpeakPurpose = useCallback((purpose: "prompt" | "feedback" | "complete") => {
    if (purpose === "prompt") {
      setState("idle");
      setStatus("Tap the mic and say it back.");
    } else if (purpose === "feedback") {
      setState("next_task");
    }
    ttsPurposeRef.current = null;
  }, []);

  const speak = useCallback(
    async (text: string, purpose: "prompt" | "feedback" | "complete" | "encouragement") => {
      ttsPurposeRef.current = purpose;
      if (purpose !== "encouragement") {
        setState(purpose === "prompt" ? "ai_speaking" : purpose === "complete" ? "complete" : "feedback");
      }
      setStatus(purpose === "prompt" ? "Amy is teaching..." : text);
      if (isLocalAudioRecoveryEnabled() && isCoachStaticPackLine(text)) {
        const local = await playCoachStaticLine(text);
        if (local.ok) {
          if (!inSequenceRef.current && purpose !== "encouragement") {
            finishSpeakPurpose(purpose);
          }
          return;
        }
      }
      const result = await voice.speak(text, {
        coach: true,
        mode: purpose === "encouragement" ? "default" : undefined,
      });
      if (!result.success && !inSequenceRef.current) {
        if (purpose === "prompt" || purpose === "encouragement") {
          setState("idle");
          setStatus("Tap the mic and say it back.");
        } else if (purpose === "feedback") {
          setState("next_task");
        }
        ttsPurposeRef.current = null;
      }
    },
    [voice],
  );

  const speakSequence = useCallback(
    async (lines: string[], purpose: "prompt" | "feedback" | "complete") => {
      const spoken = lines.map((l) => l.trim()).filter(Boolean);
      if (spoken.length === 0) {
        finishSpeakPurpose(purpose);
        return;
      }
      inSequenceRef.current = true;
      ttsPurposeRef.current = purpose;
      setState(purpose === "prompt" ? "ai_speaking" : purpose === "complete" ? "complete" : "feedback");
      setStatus("Amy is teaching...");
      for (const line of spoken) {
        if (isLocalAudioRecoveryEnabled() && isCoachStaticPackLine(line)) {
          const local = await playCoachStaticLine(line);
          if (!local.ok) break;
          continue;
        }
        const result = await voice.speak(line, { coach: true });
        if (!result.success) break;
      }
      inSequenceRef.current = false;
      finishSpeakPurpose(purpose);
    },
    [finishSpeakPurpose, voice],
  );

  const startSession = useCallback(() => {
    if (speechLocked) {
      openSubscriptionGate({ reason: "speech_coach", source: "live_speech_coach" });
      return;
    }
    if (featureUsage.tryFreeFor(SPEECH_COACH_SESSION_FEATURE)) {
      featureUsage.markFeatureUsed(SPEECH_COACH_SESSION_FEATURE);
    }
    recordTtsUserGesture();
    const seed = Date.now();
    setSessionSeed(seed);
    setTurnIndex(0);
    setMemoryRefsUsed(0);
    setHasStarted(true);
    setLastResult(null);
    sessionAttemptsRef.current = [];
    if (!current) return;
    const ctx = createCoachDialogueContext({
      childName: child.name,
      ageMonths,
      promptKind: mode.kind,
      sessionIndex: 0,
      sessionTotal: tasks.length,
      streak: 0,
      sessionSeed: seed,
      turnIndex: 0,
      toddler: mode.toddler,
      memory: coachMemory,
      memoryRefsUsed: 0,
      sessionBestStreak: 0,
      sessionScore: 0,
    });
    const greeting = buildSessionGreeting(ctx);
    const opening = [
      ...greeting,
      ...buildActivityIntro(ctx),
      ...buildItemPromptLines(ctx, current),
    ];
    setMemoryRefsUsed(countMemoryReferences(greeting));
    void speakSequence(opening, "prompt");
  }, [
    ageMonths,
    child.name,
    coachMemory,
    current,
    featureUsage,
    mode.kind,
    mode.toddler,
    speakSequence,
    speechLocked,
    tasks.length,
  ]);

  const startListening = useCallback(async () => {
    if (!canRecord || state !== "idle") {
      if (state === "listening") stt.stop();
      return;
    }
    if (startingMicRef.current) return;
    startingMicRef.current = true;
    setStartingMic(true);
    stt.reset();
    voice.pause();
    setLastResult(null);
    setStatus("Checking microphone...");
    const started = await stt.start();
    startingMicRef.current = false;
    setStartingMic(false);
    if (!started) {
      listenStartedRef.current = false;
      setState("idle");
      if (!stt.error) setStatus("Could not start the microphone. Please try again.");
      return;
    }
    listenStartedRef.current = true;
    listeningEncouragedRef.current = false;
    setState("listening");
    setStatus("Amy is listening...");
  }, [canRecord, state, stt, voice]);

  const processResponse = useCallback(async () => {
    if (!current) return;
    listenStartedRef.current = false;
    setState("processing");
    setStatus("Amy is thinking...");
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    const ctx = dialogueContext(idx, streak);
    const result = evaluateCoachResponse(current, stt.transcript, ctx);
    setLastResult(result);
    setScore((n) => n + result.points);
    setStreak((n) => {
      const next = result.correct ? n + 1 : 0;
      if (next > bestStreak) setBestStreak(next);
      return next;
    });
    setTurnIndex((n) => n + 1);
    playSpeechCue(result.correct ? "success" : "retry");
    setSuccessFlash(result.correct);
    window.setTimeout(() => setSuccessFlash(false), 900);
    logAttempt.mutate(
      {
        data: {
          childId: child.id,
          promptId: current.id,
          clarityScore: clampClarityScore(Math.round(result.confidence * 100)),
        },
      },
      { onError: (err) => handleSubscriptionMutationGateError(err, "speech_coach_live_log") },
    );
    sessionAttemptsRef.current.push({
      promptId: current.id,
      promptText: current.text,
      kind: current.kind,
      score: Math.round(result.confidence * 100),
    });
    await speakSequence(result.spokenLines, "feedback");
  }, [bestStreak, child.id, current, dialogueContext, idx, logAttempt, speakSequence, streak, stt.transcript]);

  useEffect(() => {
    if (state !== "listening") return;
    const id = window.setTimeout(() => {
      if (stateRef.current !== "listening" || listeningEncouragedRef.current) return;
      const line = buildListeningEncouragement(dialogueContext(idx, streak));
      if (!line) return;
      listeningEncouragedRef.current = true;
      void speak(line, "encouragement");
    }, 3500);
    return () => window.clearTimeout(id);
  }, [dialogueContext, idx, speak, state, streak]);

  useEffect(() => {
    if (state !== "listening") return;
    const id = window.setTimeout(() => {
      if (stateRef.current !== "listening") return;
      stt.stop();
      window.setTimeout(() => {
        if (stateRef.current === "listening") void processResponse();
      }, 350);
    }, 8000);
    return () => window.clearTimeout(id);
  }, [processResponse, state, stt]);

  const nextTask = useCallback(() => {
    stt.reset();
    setLastResult(null);
    if (idx >= tasks.length - 1) {
      const ctx = dialogueContext(idx, streak);
      const closing = buildSessionClosing(ctx, score, bestStreak);
      const attempts = sessionAttemptsRef.current;
      saveCoachJourneySnapshot(
        {
          childId: child.id,
          score,
          bestStreak,
          itemsCompleted: tasks.length,
          attempts,
          activity: "live",
          perfectSession:
            attempts.length > 0 && attempts.every((a) => a.score >= 80),
        },
        localSnapshot,
      );
      void speakSequence(closing, "complete");
      void recordActivity({
        activityId: `speech_session_${Date.now()}`,
        section: "speech",
        correct: score > 0,
        analyticsEvent: "speech_improved",
        metadata: { score, streak: bestStreak, tasks: tasks.length },
      });
      return;
    }
    const nextIdx = idx + 1;
    setIdx(nextIdx);
    const next = tasks[nextIdx];
    if (!next) return;
    const ctx = dialogueContext(nextIdx, streak);
    const progressLines = buildProgressNote(ctx);
    if (progressLines.some((l) => /last time|remember|mastered|worked hard|tricky|noticed the|improving/i.test(l))) {
      setMemoryRefsUsed((n) => n + 1);
    }
    const lines = [...progressLines, ...buildItemPromptLines(ctx, next)];
    void speakSequence(lines, "prompt");
  }, [
    bestStreak,
    child.id,
    dialogueContext,
    idx,
    localSnapshot,
    recordActivity,
    score,
    speakSequence,
    streak,
    stt,
    tasks,
  ]);

  const retryTask = useCallback(() => {
    stt.reset();
    setLastResult(null);
    if (current) {
      const ctx = dialogueContext(idx, streak);
      void speakSequence(buildItemPromptLines(ctx, current), "prompt");
    }
  }, [current, dialogueContext, idx, speakSequence, streak, stt]);

  const restart = useCallback(() => {
    const fresh = buildTasks(ageMonths, practiceHistory);
    setTasks(fresh);
    setIdx(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setMemoryRefsUsed(0);
    sessionAttemptsRef.current = [];
    setTurnIndex(0);
    setSessionSeed(Date.now());
    setLastResult(null);
    setState("idle");
    setStatus("Tap Start and Amy will greet you.");
    setHasStarted(false);
    stt.reset();
    voice.pause();
  }, [ageMonths, practiceHistory, stt, voice]);

  if (!current && state !== "complete") {
    return (
      <EmptyFullScreen title="No speech tasks ready" body="Please try again after adding practice prompts." />
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#070812] text-white" data-testid="live-speech-coach-page">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-500/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-4">
        <header className="flex items-center gap-3">
          <AppLink href="/speech-coach" replace source="live-speech-coach-back">
            <Button variant="ghost" size="icon" className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </AppLink>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200/80">Live AI Speech Coach</p>
            <h1 className="truncate font-quicksand text-xl font-black">{child.name}'s voice session</h1>
          </div>
          {onOpenParentTools ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15"
              onClick={onOpenParentTools}
              data-testid="speech-open-parent-tools"
            >
              Parent Tools
            </Button>
          ) : null}
          <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black">
            Step {Math.min(idx + 1, tasks.length)}/{tasks.length}
          </div>
        </header>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-yellow-300 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-[0_24px_80px_-30px_rgba(168,85,247,0.75)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 text-xs text-white/70">
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 font-bold text-cyan-100">{mode.label}</span>
            <span>{mode.intro}</span>
          </div>
          <AmyHero state={state} success={successFlash} />
          <div className="space-y-3 text-center">
            {state !== "complete" && current && (
              <>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-white/45">Say this</p>
                <p className="font-quicksand text-4xl font-black tracking-wide text-white drop-shadow">
                  {current.text}
                </p>
              </>
            )}
            {state === "complete" && (
              <div className="space-y-2">
                <Trophy className="mx-auto h-12 w-12 fill-yellow-300 text-yellow-300" />
                <p className="font-quicksand text-3xl font-black">Amazing work today!</p>
                <p className="text-white/70">Score: {score} points · Best streak: {bestStreak}</p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-auto space-y-4 pb-4 pt-5">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Points" value={score} />
            <Stat label="Streak" value={streak} />
            <Stat label="Mode" value={stt.mode === "native" ? "STT" : stt.mode} />
          </div>

          {lastResult && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4">
              <div className="flex items-start gap-3">
                <div className={`rounded-2xl p-2 ${lastResult.correct ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{lastResult.displayFeedback}</p>
                  {lastResult.improvement && <p className="mt-1 text-sm text-white/65">{lastResult.improvement}</p>}
                  <p className="mt-2 text-xs text-white/45">
                    Accuracy {Math.round(lastResult.confidence * 100)}%
                    {lastResult.transcript ? ` - Heard: "${lastResult.transcript}"` : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="min-h-6 text-center text-sm font-bold text-white/75" aria-live="polite">
            {getSpeechCoachMicStatusMessage({
              error: stt.error,
              sessionStatus: stt.status,
              fallbackStatus: status,
            })}
          </p>

          {state !== "complete" ? (
            <div className="flex items-center justify-center gap-3">
              {hasStarted && (
                <Button type="button" variant="ghost" className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={retryTask}>
                  <Volume2 className="h-4 w-4" />
                  Hear again
                </Button>
              )}
              {!hasStarted ? (
                <Button type="button" size="lg" className="h-16 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-10 text-base font-black text-white shadow-[0_0_40px_rgba(34,211,238,0.35)]" onClick={startSession}>
                  <Sparkles className="h-5 w-5" />
                  Start Live Session
                </Button>
              ) : (
                <button
                  type="button"
                  disabled={startingMic || (!canRecord && state !== "listening")}
                  onClick={() => void startListening()}
                  className={[
                    "grid h-20 w-20 place-items-center rounded-full border text-white transition-all",
                    state === "listening"
                      ? "animate-pulse border-cyan-200 bg-cyan-400/30 shadow-[0_0_45px_rgba(34,211,238,0.65)]"
                      : "border-fuchsia-200/70 bg-fuchsia-500/30 shadow-[0_0_40px_rgba(217,70,239,0.45)]",
                    startingMic || (!canRecord && state !== "listening") ? "opacity-50" : "active:scale-95",
                  ].join(" ")}
                  aria-label={state === "listening" ? "Stop listening" : "Start listening"}
                >
                  {state === "processing" || startingMic ? <Loader2 className="h-8 w-8 animate-spin" /> : <Mic className="h-9 w-9" />}
                </button>
              )}
              {state === "next_task" && (
                <Button type="button" className="rounded-full bg-white text-slate-950 hover:bg-white/90" onClick={nextTask}>
                  Next
                </Button>
              )}
            </div>
          ) : (
            <div className="flex justify-center gap-3">
              <Button type="button" className="rounded-full bg-white text-slate-950 hover:bg-white/90" onClick={restart}>
                <RotateCcw className="h-4 w-4" />
                New Session
              </Button>
              {onOpenParentTools ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15"
                  onClick={onOpenParentTools}
                >
                  Parent Tools
                </Button>
              ) : (
                <AppLink href="/speech-coach" replace source="live-speech-coach-complete">
                  <Button type="button" variant="ghost" className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15">
                    Parent Tools
                  </Button>
                </AppLink>
              )}
            </div>
          )}
        </section>
      </div>
      <Dialog open={micSettingsOpen} onOpenChange={setMicSettingsOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Microphone access is required for Speech Coach.</DialogTitle>
            <DialogDescription>
              Android is no longer showing the microphone permission popup. Open app settings and allow Microphone, then return here and tap the mic again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" className="rounded-full" onClick={() => openAndroidMicrophoneSettings()}>
              Open Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-center">
      <p className="text-[10px] font-black uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-0.5 font-quicksand text-lg font-black text-white">{value}</p>
    </div>
  );
}

function EmptyFullScreen({ title, body }: { title: string; body: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#070812] p-4 text-white">
      <Card className="max-w-sm rounded-3xl border-white/10 bg-white/[0.06] text-white">
        <CardContent className="space-y-3 p-6 text-center">
          <AmyIcon size={56} ring bounce />
          <h1 className="font-quicksand text-xl font-black">{title}</h1>
          <p className="text-sm text-white/65">{body}</p>
          <AppLink href="/speech-coach" replace source="live-speech-coach-empty">
            <Button className="rounded-full">Back to Amy Speech Coach</Button>
          </AppLink>
        </CardContent>
      </Card>
    </main>
  );
}

export default function LiveSpeechCoachPage() {
  usePrimeIosMicrophone();
  const [, setLocation] = useLocation();
  const childrenQuery = useListChildren();
  const childList = (childrenQuery.data ?? []) as AnyChild[];
  const eligible = childList.filter((c) =>
    isSpeechCoachEligibleAgeMonths(totalMonths(c)),
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const child =
    eligible.find((c) => c.id === selectedId) ?? eligible[0] ?? null;

  if (childrenQuery.isLoading) {
    return (
      <main className="min-h-dvh grid place-items-center bg-[#070812] text-white">
        <div className="text-white/70">Loading your speech coach...</div>
      </main>
    );
  }

  if (!child) {
    return (
      <main className="min-h-dvh grid place-items-center bg-[#070812] p-4 text-white">
        <Card className="max-w-sm rounded-3xl border-white/10 bg-white/[0.06] text-white">
          <CardContent className="space-y-4 p-6 text-center">
            <AmyIcon size={56} ring bounce />
            <h1 className="font-quicksand text-xl font-black">Amy Speech Coach</h1>
            <p className="text-sm text-white/65">Add a child profile to start live speech practice sessions.</p>
            <AppLink href="/children/new" replace source="live-speech-no-child">
              <Button className="rounded-full">Add Child Profile</Button>
            </AppLink>
            <AppLink href="/speech-coach" replace source="live-speech-back-home">
              <Button variant="ghost" className="rounded-full text-white/70">Back to Speech Coach</Button>
            </AppLink>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <>
      {eligible.length > 1 ? (
        <div className="fixed left-1/2 top-16 z-30 flex -translate-x-1/2 gap-2 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-xl">
          {eligible.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={[
                "rounded-full px-3 py-1 text-xs font-black transition-colors",
                child.id === c.id
                  ? "bg-white text-slate-950"
                  : "text-white/70 hover:bg-white/10",
              ].join(" ")}
            >
              {c.name}
            </button>
          ))}
        </div>
      ) : null}
      <LiveSpeechCoach
        child={child}
        onOpenParentTools={() => setLocation("/speech-coach")}
      />
    </>
  );
}
