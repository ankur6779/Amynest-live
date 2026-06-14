import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatThread, type InteractionEvent, type ThreadMessage } from "@/components/chat-thread";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AddChildLink } from "@/components/add-child-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, ArrowRight, Sparkles, Mic, MicOff, Loader2 } from "lucide-react";
import { AmyIcon } from "@/components/amy-icon";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { audioManager } from "@/lib/audio-manager";
import { scheduleLearningZoneAudioPrewarm } from "@/lib/learning-zone-audio-prewarm";
import { readResolvedApiJson } from "@/lib/poll-result";
import { primeStaticAudioInUserGesture } from "@/lib/static-audio";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import { getFirebaseAuth } from "@/lib/firebase";

type TutorAction = "start" | "answer" | "repeat" | "next_content";
type TeachingMode = "explain" | "ask" | "encourage" | "correct";
type NextExpected = "listen" | "answer" | "repeat" | "continue";

interface TutorPayload {
  message: string;
  voiceUrl?: string;
  mode: TeachingMode;
  nextExpectedResponse: NextExpected;
  slowMode?: boolean;
  question?: string;
  options?: string[];
  correctIndex?: number;
}

interface TutorTurnResponse {
  ok?: boolean;
  tutor: TutorPayload;
  goalMet?: boolean;
}

interface ChatTurn {
  id: string;
  role: "amy" | "child";
  text: string;
  mode?: TeachingMode;
  voiceUrl?: string;
  nextExpected?: NextExpected;
  goalMet?: boolean;
  question?: string;
  options?: string[];
  correctIndex?: number;
}

interface ChildRow {
  id?: number;
  name?: string;
  age?: number | null;
}

const MODE_LABEL: Record<TeachingMode, string> = {
  explain: "Explain",
  ask: "Question",
  encourage: "Encourage",
  correct: "Guide",
};

const TUTOR_WARM_PHRASES = [
  "Great job!",
  "Let's try again.",
  "Correct! Well done!",
  "Well done!",
  "Let's learn together!",
];

function tutorSpeakOpts(text: string) {
  const trimmed = text.trim();
  return {
    catalogPlayback: true as const,
    staticCatalogTexts: trimmed ? [trimmed] : [],
  };
}

function hasMcqOptions(payload: Pick<TutorPayload, "question" | "options"> | null | undefined): boolean {
  return Boolean(
    payload?.question &&
      Array.isArray(payload.options) &&
      payload.options.length === 4,
  );
}

export default function AmyLearningTutorPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const authFetch = useAuthFetch();
  const { speak, pause, primeSpeakGesture, speaking, loading: voiceLoading, activePhrase } =
    useAmyVoice();

  const getAuthToken = useCallback(async () => {
    try {
      return (await getFirebaseAuth().currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  }, []);

  const stt = useSpeechRecognition("en-US", { getAuthToken });
  const voiceSubmitRef = useRef(false);

  const [sessionStarted, setSessionStarted] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [pending, setPending] = useState<TutorPayload | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [goalMet, setGoalMet] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: childrenData } = useQuery<ChildRow[]>({
    queryKey: ["children-for-amy-learning-tutor"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      return r.ok ? r.json() : [];
    },
    staleTime: 60_000,
  });
  const primaryChild =
    Array.isArray(childrenData) && childrenData.length > 0 ? childrenData[0] : null;

  const tutorPrewarmStateKey = useMemo(
    () => (primaryChild?.id ? `learn_with_amy:${primaryChild.id}` : undefined),
    [primaryChild?.id],
  );

  const scheduleTutorAudioPrewarm = useCallback(
    (texts: string[]) => {
      if (!tutorPrewarmStateKey || texts.length === 0) return;
      scheduleLearningZoneAudioPrewarm(authFetch, {
        module: "learn_with_amy",
        texts,
        stateKey: tutorPrewarmStateKey,
        ageGroup: primaryChild?.age ?? undefined,
      });
    },
    [authFetch, primaryChild?.age, tutorPrewarmStateKey],
  );

  useEffect(() => {
    scheduleTutorAudioPrewarm(TUTOR_WARM_PHRASES);
  }, [scheduleTutorAudioPrewarm]);

  const playTutorMessage = useCallback(
    (message: string, question?: string) => {
      const text = [message, question].filter(Boolean).join(" ").trim();
      if (!text) return;
      const opts = tutorSpeakOpts(text);
      if (activePhrase === text.toLowerCase() && (speaking || voiceLoading)) {
        pause();
        return;
      }
      void speak(text, opts);
    },
    [activePhrase, pause, speak, speaking, voiceLoading],
  );

  const primeTutorAudioGesture = useCallback(
    (message?: string, question?: string) => {
      audioManager.unlockFromUserGesture();
      recordTtsUserGesture();
      const warmText = (message ?? TUTOR_WARM_PHRASES[0] ?? "Let's learn together!").trim();
      const full = [warmText, question].filter(Boolean).join(" ").trim();
      if (full) {
        primeStaticAudioInUserGesture(full, "default");
        primeSpeakGesture(full, tutorSpeakOpts(full));
      }
    },
    [primeSpeakGesture],
  );

  const applyTutorResponse = useCallback(
    (data: TutorTurnResponse) => {
      const tutor = data.tutor;
      if (!tutor?.message) {
        throw new Error("invalid_tutor_reply");
      }
      setPending(tutor);
      setGoalMet(Boolean(data.goalMet));
      const prewarmTexts = [tutor.message, tutor.question, ...(tutor.options ?? []), ...TUTOR_WARM_PHRASES].filter(
        Boolean,
      ) as string[];
      scheduleTutorAudioPrewarm(prewarmTexts);
      playTutorMessage(tutor.message, tutor.question);
    },
    [playTutorMessage, scheduleTutorAudioPrewarm],
  );

  const callTutor = useCallback(
    async (action: TutorAction, childAnswer?: string) => {
      if (!primaryChild?.id) {
        toast({
          title: t("pages.amy_learning_tutor.no_child_title"),
          description: t("pages.amy_learning_tutor.no_child_body"),
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      try {
        const res = await authFetch("/api/content/tutor/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId: primaryChild.id,
            action,
            childAnswer,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await readResolvedApiJson<TutorTurnResponse>(res, authFetch);
        applyTutorResponse(data);
        setSessionStarted(true);
      } catch (err) {
        toast({
          title: t("pages.amy_learning_tutor.error_title"),
          description: err instanceof Error ? err.message : t("pages.amy_learning_tutor.error_body"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [applyTutorResponse, authFetch, primaryChild?.id, t, toast],
  );

  const commitPendingAsTurn = useCallback(() => {
    if (!pending) return;
    setTurns((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        role: "amy",
        text: pending.message,
        mode: pending.mode,
        voiceUrl: pending.voiceUrl,
        nextExpected: pending.nextExpectedResponse,
        goalMet,
        question: pending.question,
        options: pending.options,
        correctIndex: pending.correctIndex,
      },
    ]);
    setPending(null);
  }, [goalMet, pending]);

  const submitAnswerWithText = useCallback(
    async (text: string) => {
      const answer = text.trim();
      if (!answer || loading) return;
      setTurns((prev) => [...prev, { id: `c-${Date.now()}`, role: "child", text: answer }]);
      setInput("");
      commitPendingAsTurn();
      await callTutor("answer", answer);
    },
    [callTutor, commitPendingAsTurn, loading],
  );

  const startSession = useCallback(async () => {
    primeTutorAudioGesture();
    setTurns([]);
    setGoalMet(false);
    setPending(null);
    voiceSubmitRef.current = false;
    stt.reset();
    await callTutor("start");
  }, [callTutor, primeTutorAudioGesture, stt]);

  const submitAnswer = useCallback(async () => {
    await submitAnswerWithText(input);
  }, [input, submitAnswerWithText]);

  const onContinue = useCallback(async () => {
    commitPendingAsTurn();
    await callTutor("start");
  }, [callTutor, commitPendingAsTurn]);

  const onRepeat = useCallback(async () => {
    primeTutorAudioGesture(pending?.message, pending?.question);
    await callTutor("repeat");
  }, [callTutor, pending?.message, pending?.question, primeTutorAudioGesture]);

  const handleInteraction = useCallback(
    (event: InteractionEvent) => {
      if (event.type === "start-session" && event.actionId === "start") {
        void startSession();
        return;
      }
      if (
        event.type === "mcq" &&
        event.pickedIndex !== undefined &&
        pending?.options?.[event.pickedIndex]
      ) {
        void submitAnswerWithText(pending.options[event.pickedIndex]!);
      }
    },
    [pending?.options, startSession, submitAnswerWithText],
  );

  const toggleVoiceAnswer = useCallback(async () => {
    if (stt.listening) {
      stt.stop();
      return;
    }
    if (stt.transcribing || loading) return;
    voiceSubmitRef.current = false;
    stt.reset();
    primeTutorAudioGesture(pending?.message, pending?.question);
    const started = await stt.start();
    if (!started && stt.error) {
      toast({
        title: t("pages.amy_learning_tutor.error_title"),
        description: t("pages.amy_learning_tutor.voice_tap_to_answer"),
        variant: "destructive",
      });
    }
  }, [loading, pending?.message, pending?.question, primeTutorAudioGesture, stt, t, toast]);

  useEffect(() => {
    if (!stt.transcript.trim() || stt.listening || stt.transcribing || loading) return;
    if (voiceSubmitRef.current) return;
    voiceSubmitRef.current = true;
    void submitAnswerWithText(stt.transcript).finally(() => {
      stt.reset();
      voiceSubmitRef.current = false;
    });
  }, [loading, stt, stt.transcript, stt.listening, stt.transcribing, submitAnswerWithText]);

  const expectsAnswer = pending?.nextExpectedResponse === "answer";
  const expectsListen = pending?.nextExpectedResponse === "listen";
  const expectsContinue = pending?.nextExpectedResponse === "continue";
  const pendingMcq = hasMcqOptions(pending);
  const showActionFooter =
    sessionStarted && pending != null && !expectsAnswer && (expectsListen || expectsContinue);

  const threadMessages = useMemo((): ThreadMessage[] => {
    const items: ThreadMessage[] = [];

    if (!sessionStarted && !loading && primaryChild?.id) {
      items.push({
        kind: "interactive",
        id: "start-session",
        interaction: {
          type: "start-session",
          title: t("pages.amy_learning_tutor.ready_title", {
            name: primaryChild.name ?? t("pages.amy_learning_tutor.default_child_name"),
          }),
          body: t("pages.amy_learning_tutor.ready_body"),
          buttonLabel: t("pages.amy_learning_tutor.start_learning"),
        },
        state: { status: "pending" },
      });
      return items;
    }

    for (const turn of turns) {
      if (turn.role === "child") {
        items.push({ kind: "user", id: turn.id, text: turn.text });
        continue;
      }

      if (hasMcqOptions(turn)) {
        items.push({
          kind: "amy-rich",
          id: `${turn.id}-intro`,
          text: turn.text,
          badge: MODE_LABEL.explain,
          onListen: () => playTutorMessage(turn.text, turn.question),
          onPrimeListen: () => primeTutorAudioGesture(turn.text, turn.question),
        });
        items.push({
          kind: "interactive",
          id: `${turn.id}-mcq`,
          interaction: {
            type: "mcq",
            question: turn.question ?? "",
            options: turn.options ?? [],
            correctIndex: turn.correctIndex ?? null,
          },
          state: { status: "resolved", pickedIndex: undefined },
        });
        continue;
      }

      items.push({
        kind: "amy-rich",
        id: turn.id,
        text: turn.text,
        badge: turn.mode ? MODE_LABEL[turn.mode] : undefined,
        onListen: () => playTutorMessage(turn.text, turn.question),
        onPrimeListen: () => primeTutorAudioGesture(turn.text, turn.question),
      });
    }

    if (pending) {
      if (pendingMcq) {
        items.push({
          kind: "amy-rich",
          id: "amy-learning-pending-intro",
          text: pending.message,
          badge: MODE_LABEL.explain,
          onListen: () => playTutorMessage(pending.message, pending.question),
          onPrimeListen: () => primeTutorAudioGesture(pending.message, pending.question),
          highlight: true,
        });
        items.push({
          kind: "interactive",
          id: "amy-learning-mcq",
          interaction: {
            type: "mcq",
            question: pending.question ?? "",
            options: pending.options ?? [],
            correctIndex: pending.correctIndex ?? null,
          },
          state: { status: "pending" },
        });
      } else {
        items.push({
          kind: "amy-rich",
          id: "amy-learning-pending",
          text: pending.message,
          badge: MODE_LABEL[pending.mode],
          onListen: () => playTutorMessage(pending.message, pending.question),
          onPrimeListen: () => primeTutorAudioGesture(pending.message, pending.question),
          highlight: true,
        });
      }

      if (goalMet) {
        items.push({
          kind: "system",
          id: "goal-met",
          content: (
            <p className="text-center text-xs font-semibold text-primary">
              {t("pages.amy_learning_tutor.session_goal_met")}
            </p>
          ),
        });
      }
    }

    return items;
  }, [
    goalMet,
    loading,
    pending,
    pendingMcq,
    playTutorMessage,
    primaryChild?.id,
    primaryChild?.name,
    primeTutorAudioGesture,
    sessionStarted,
    t,
    turns,
  ]);

  const voiceFooter =
    sessionStarted && expectsAnswer ? (
      <div className="mb-2 flex w-full flex-col gap-2">
        <Button
          type="button"
          variant={stt.listening ? "default" : "outline"}
          className="w-full rounded-full"
          disabled={loading || stt.transcribing}
          onClick={() => void toggleVoiceAnswer()}
          data-testid="amy-learning-tutor-voice"
        >
          {stt.transcribing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("pages.amy_learning_tutor.voice_processing")}
            </>
          ) : stt.listening ? (
            <>
              <MicOff className="mr-2 h-4 w-4" />
              {t("pages.amy_learning_tutor.voice_listening")}
            </>
          ) : (
            <>
              <Mic className="mr-2 h-4 w-4" />
              {t("pages.amy_learning_tutor.voice_answer")}
            </>
          )}
        </Button>
        {!pendingMcq ? (
          <p className="text-center text-[11px] text-muted-foreground">
            {t("pages.amy_learning_tutor.voice_tap_to_answer")}
          </p>
        ) : null}
      </div>
    ) : undefined;

  return (
    <div
      className="assistant-chat-page relative mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col bg-background"
      data-testid="amy-learning-tutor-page"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-4 md:px-0 md:pt-0">
        <div>
          <h1 className="flex items-center gap-2 font-quicksand text-3xl font-bold text-foreground">
            <AmyIcon size={38} bounce ring />
            {t("pages.amy_learning_tutor.title")}
            <Badge className="ml-1 border-0 bg-primary text-xs font-bold text-primary-foreground">
              <Sparkles className="mr-1 h-3 w-3" />
              V7
            </Badge>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("pages.amy_learning_tutor.subtitle")}</p>
        </div>
        <Link href="/amy-ai-tutor">
          <Button variant="outline" size="sm" className="shrink-0 rounded-full text-xs">
            {t("pages.amy_learning_tutor.quick_tutor_link")}
          </Button>
        </Link>
      </div>

      {!primaryChild?.id ? (
        <div className="mx-4 rounded-2xl border border-border bg-muted/40 p-6 text-center md:mx-0">
          <p className="text-sm text-muted-foreground">{t("pages.amy_learning_tutor.no_child_body")}</p>
          <AddChildLink source="amy-learning-tutor-empty">
            <Button className="mt-4 rounded-full">{t("pages.amy_learning_tutor.add_child")}</Button>
          </AddChildLink>
        </div>
      ) : (
        <ChatThread
          surface="amy-learning-tutor"
          testId="amy-learning-tutor-thread"
          layout="embedded"
          messages={threadMessages}
          draft={input}
          onDraftChange={setInput}
          onSend={() => void submitAnswer()}
          onInteraction={handleInteraction}
          loading={loading}
          composerHidden={!sessionStarted || !expectsAnswer || pendingMcq}
          composerDisabled={loading || stt.listening || stt.transcribing}
          composerPlaceholder={t("pages.amy_learning_tutor.answer_placeholder")}
          scrollDeps={[turns, loading, pending, sessionStarted, input, goalMet, stt.listening]}
          className="min-h-0 flex-1"
          messagesClassName="space-y-3 pr-5 md:px-0"
          footerClassName="border-t border-border/50 bg-background/95 backdrop-blur px-0 py-3"
          textareaRef={textareaRef}
          header={null}
          footerExtra={
            voiceFooter ?? (showActionFooter ? (
              <div className="mb-2 flex w-full gap-2">
                {(expectsListen || pending?.nextExpectedResponse === "repeat") && (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    disabled={loading}
                    onPointerDown={() => primeTutorAudioGesture(pending?.message, pending?.question)}
                    onClick={() => void onRepeat()}
                    data-testid="amy-learning-tutor-repeat"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t("pages.amy_learning_tutor.repeat")}
                  </Button>
                )}
                <Button
                  className="flex-1 rounded-full"
                  disabled={loading}
                  onClick={() => void onContinue()}
                  data-testid="amy-learning-tutor-continue"
                >
                  {goalMet
                    ? t("pages.amy_learning_tutor.goal_met_continue")
                    : t("pages.amy_learning_tutor.continue")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : undefined)
          }
        />
      )}
    </div>
  );
}
