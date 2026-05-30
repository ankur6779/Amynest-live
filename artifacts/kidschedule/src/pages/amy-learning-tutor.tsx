import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatThread, type ThreadMessage } from "@/components/chat-thread";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { AmyIcon } from "@/components/amy-icon";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { audioManager } from "@/lib/audio-manager";
import { scheduleLearningZoneAudioPrewarm } from "@/lib/learning-zone-audio-prewarm";
import { readResolvedApiJson } from "@/lib/poll-result";
import { primeStaticAudioInUserGesture } from "@/lib/static-audio";
import { recordTtsUserGesture } from "@/lib/tts-guard";

type TutorAction = "start" | "answer" | "repeat" | "next_content";
type TeachingMode = "explain" | "ask" | "encourage" | "correct";
type NextExpected = "listen" | "answer" | "repeat" | "continue";

interface TutorPayload {
  message: string;
  voiceUrl?: string;
  mode: TeachingMode;
  nextExpectedResponse: NextExpected;
  slowMode?: boolean;
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

export default function AmyLearningTutorPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const authFetch = useAuthFetch();
  const { speak, pause, primeSpeakGesture, speaking, voiceLoading, activePhrase } = useAmyVoice();

  const [sessionStarted, setSessionStarted] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [pending, setPending] = useState<TutorPayload | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [goalMet, setGoalMet] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    (message: string) => {
      const text = message.trim();
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
    (message?: string) => {
      audioManager.unlockFromUserGesture();
      recordTtsUserGesture();
      const warmText = (message ?? TUTOR_WARM_PHRASES[0] ?? "Let's learn together!").trim();
      if (warmText) {
        primeStaticAudioInUserGesture(warmText, "default");
        primeSpeakGesture(warmText, tutorSpeakOpts(warmText));
      }
    },
    [primeSpeakGesture],
  );

  const applyTutorResponse = (data: TutorTurnResponse) => {
    const tutor = data.tutor;
    if (!tutor?.message) throw new Error("invalid_tutor_reply");
    setPending(tutor);
    setGoalMet(Boolean(data.goalMet));
    scheduleTutorAudioPrewarm([tutor.message, ...TUTOR_WARM_PHRASES]);
    playTutorMessage(tutor.message);
  };

  const callTutor = async (action: TutorAction, childAnswer?: string) => {
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
        body: JSON.stringify({ childId: primaryChild.id, action, childAnswer }),
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
  };

  const commitPendingAsTurn = () => {
    if (!pending) return;
    setTurns((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        role: "amy",
        text: pending.message,
        mode: pending.mode,
      },
    ]);
    setPending(null);
  };

  const startSession = async () => {
    primeTutorAudioGesture();
    setTurns([]);
    setGoalMet(false);
    setPending(null);
    await callTutor("start");
  };

  const submitAnswer = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setTurns((prev) => [...prev, { id: `c-${Date.now()}`, role: "child", text }]);
    setInput("");
    commitPendingAsTurn();
    await callTutor("answer", text);
  };

  const onContinue = async () => {
    commitPendingAsTurn();
    await callTutor("start");
  };

  const onRepeat = async () => {
    primeTutorAudioGesture(pending?.message);
    await callTutor("repeat");
  };

  const expectsAnswer = pending?.nextExpectedResponse === "answer";

  const threadMessages = useMemo((): ThreadMessage[] => {
    const items: ThreadMessage[] = [];

    if (!sessionStarted && !loading) {
      items.push({
        kind: "interactive",
        id: "start-session",
        interaction: {
          type: "start-session",
          title: t("pages.amy_learning_tutor.ready_title", {
            name: primaryChild?.name ?? t("pages.amy_learning_tutor.default_child_name"),
          }),
          body: t("pages.amy_learning_tutor.ready_body"),
          buttonLabel: t("pages.amy_learning_tutor.start_learning"),
        },
        state: { status: "pending" },
      });
    }

    for (const turn of turns) {
      if (turn.role === "child") {
        items.push({ kind: "user", id: turn.id, text: turn.text });
      } else {
        items.push({
          kind: "amy-rich",
          id: turn.id,
          text: turn.text,
          badge: turn.mode ? MODE_LABEL[turn.mode] : undefined,
          onListen: () => playTutorMessage(turn.text),
          onPrimeListen: () => primeTutorAudioGesture(turn.text),
        });
      }
    }

    if (pending) {
      const actionButtons: Array<{ id: string; label: string; variant?: "default" | "outline" }> = [];
      if (pending.nextExpectedResponse === "listen" || pending.nextExpectedResponse === "repeat") {
        actionButtons.push({
          id: "repeat",
          label: t("pages.amy_learning_tutor.repeat"),
          variant: "outline",
        });
      }
      if (pending.nextExpectedResponse === "continue" || pending.nextExpectedResponse === "listen") {
        actionButtons.push({
          id: "continue",
          label: goalMet
            ? t("pages.amy_learning_tutor.goal_met_continue")
            : t("pages.amy_learning_tutor.continue"),
        });
      }

      items.push({
        kind: "amy-rich",
        id: "amy-learning-pending",
        text: pending.message,
        badge: MODE_LABEL[pending.mode],
        onListen: () => playTutorMessage(pending.message),
        onPrimeListen: () => primeTutorAudioGesture(pending.message),
        highlight: true,
      });

      if (goalMet) {
        items.push({
          kind: "system",
          id: "goal-met",
          content: (
            <p className="text-center text-xs font-semibold text-primary">
              Session goal reached — great work!
            </p>
          ),
        });
      }

      if (actionButtons.length > 0 && !expectsAnswer) {
        items.push({
          kind: "interactive",
          id: "pending-actions",
          interaction: { type: "actions", buttons: actionButtons },
          state: { status: "pending" },
        });
      }
    }

    return items;
  }, [
    expectsAnswer,
    goalMet,
    loading,
    pending,
    playTutorMessage,
    primaryChild?.name,
    primeTutorAudioGesture,
    sessionStarted,
    t,
    turns,
  ]);

  return (
    <div
      className="relative mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col bg-background"
      data-testid="amy-learning-tutor-page"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-4 md:px-0 md:pt-0">
        <div>
          <h1 className="font-quicksand flex items-center gap-2 text-3xl font-bold text-foreground">
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
          <Link href="/children/new">
            <Button className="mt-4 rounded-full">{t("pages.amy_learning_tutor.add_child")}</Button>
          </Link>
        </div>
      ) : (
        <ChatThread
          surface="amy-learning-tutor"
          testId="amy-learning-tutor-thread"
          messages={threadMessages}
          draft={input}
          onDraftChange={setInput}
          onSend={() => void submitAnswer()}
          onInteraction={(event) => {
            if (event.type === "start-session" && event.actionId === "start") {
              primeTutorAudioGesture();
              void startSession();
            }
            if (event.type === "actions") {
              if (event.actionId === "repeat") void onRepeat();
              if (event.actionId === "continue") void onContinue();
            }
          }}
          loading={loading}
          composerDisabled={!sessionStarted || !expectsAnswer}
          composerPlaceholder={t("pages.amy_learning_tutor.answer_placeholder")}
          sendDisabled={!expectsAnswer}
          scrollDeps={[turns, loading, pending, sessionStarted, input, goalMet]}
          className="min-h-0 flex-1"
          messagesClassName="space-y-3 pr-5 md:px-0"
          footerClassName="border-t border-border/50 bg-background/95 backdrop-blur"
          textareaRef={inputRef}
          header={null}
        />
      )}
    </div>
  );
}
