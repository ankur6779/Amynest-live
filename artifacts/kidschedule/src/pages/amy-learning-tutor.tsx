import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Send,
  Volume2,
  RotateCcw,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { AmyIcon } from "@/components/amy-icon";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { audioManager } from "@/lib/audio-manager";
import { scheduleLearningZoneAudioPrewarm } from "@/lib/learning-zone-audio-prewarm";
import { readResolvedApiJson } from "@/lib/poll-result";
import { primeStaticAudioInUserGesture } from "@/lib/static-audio";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import { cn } from "@/lib/utils";

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
  voiceUrl?: string;
  nextExpected?: NextExpected;
  goalMet?: boolean;
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
  const { speak, pause, primeSpeakGesture, speaking, loading: voiceLoading, activePhrase } =
    useAmyVoice();

  const [sessionStarted, setSessionStarted] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [pending, setPending] = useState<TutorPayload | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [goalMet, setGoalMet] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [turns, loading, pending]);

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
    if (!tutor?.message) {
      throw new Error("invalid_tutor_reply");
    }
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
        voiceUrl: pending.voiceUrl,
        nextExpected: pending.nextExpectedResponse,
        goalMet,
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
    setTurns((prev) => [
      ...prev,
      { id: `c-${Date.now()}`, role: "child", text },
    ]);
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

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitAnswer();
    }
  };

  const expectsAnswer = pending?.nextExpectedResponse === "answer";
  const expectsListen = pending?.nextExpectedResponse === "listen";
  const expectsContinue = pending?.nextExpectedResponse === "continue";

  return (
    <div
      className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col bg-background"
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
          <p className="mt-1 text-sm text-muted-foreground">
            {t("pages.amy_learning_tutor.subtitle")}
          </p>
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
      ) : null}

      <div
        ref={threadRef}
        className="min-h-0 flex-1 space-y-3 px-4 pb-28 pr-5 md:px-0"
        data-testid="amy-learning-tutor-thread"
      >
        {!sessionStarted && !loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <AmyIcon size={88} bounce ring />
            <div className="max-w-sm space-y-2">
              <h2 className="font-quicksand text-xl font-bold text-foreground">
                {t("pages.amy_learning_tutor.ready_title", {
                  name: primaryChild?.name ?? t("pages.amy_learning_tutor.default_child_name"),
                })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("pages.amy_learning_tutor.ready_body")}
              </p>
            </div>
            <Button
              size="lg"
              className="rounded-full px-8"
              disabled={!primaryChild?.id || loading}
              onPointerDown={() => primeTutorAudioGesture()}
              onClick={() => void startSession()}
              data-testid="amy-learning-tutor-start"
            >
              {t("pages.amy_learning_tutor.start_learning")}
            </Button>
          </div>
        ) : null}

        {turns.map((turn) => (
          <TurnBubble key={turn.id} turn={turn} onPlayMessage={playTutorMessage} />
        ))}

        {pending ? (
          <AmyPendingBubble
            pending={pending}
            goalMet={goalMet}
            onPlayMessage={playTutorMessage}
            onPrimePlay={primeTutorAudioGesture}
          />
        ) : null}

        {loading ? (
          <div
            className="flex items-center gap-2 text-sm text-muted-foreground"
            data-testid="amy-learning-tutor-thinking"
          >
            <AmyIcon size={28} bounce ring />
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("pages.amy_learning_tutor.thinking")}</span>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {sessionStarted && expectsAnswer ? (
        <div className="sticky bottom-0 z-50 flex w-full shrink-0 gap-2 border-t border-border bg-background/95 px-4 pb-[calc(var(--app-bottom-clearance)+0.75rem)] pt-3 backdrop-blur md:px-0">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("pages.amy_learning_tutor.answer_placeholder")}
            disabled={loading}
            className="max-h-32 min-h-[44px] resize-none rounded-2xl"
            rows={1}
            data-testid="amy-learning-tutor-input"
          />
          <Button
            onClick={() => void submitAnswer()}
            disabled={!input.trim() || loading}
            className="rounded-full px-4"
            data-testid="amy-learning-tutor-send"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      ) : null}

      {sessionStarted && pending && (expectsListen || expectsContinue) && !expectsAnswer ? (
        <div className="sticky bottom-0 z-50 flex w-full shrink-0 gap-2 border-t border-border bg-background/95 px-4 pb-[calc(var(--app-bottom-clearance)+0.75rem)] pt-3 backdrop-blur md:px-0">
          {(expectsListen || pending.nextExpectedResponse === "repeat") && (
            <Button
              variant="outline"
              className="rounded-full"
              disabled={loading}
              onPointerDown={() => primeTutorAudioGesture(pending.message)}
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
      ) : null}
    </div>
  );
}

function TurnBubble({
  turn,
  onPlayMessage,
}: {
  turn: ChatTurn;
  onPlayMessage: (message: string) => void;
}) {
  if (turn.role === "child") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2 text-sm text-primary-foreground">
          {turn.text}
        </div>
      </div>
    );
  }

  return (
    <AmyMessageCard
      message={turn.text}
      mode={turn.mode}
      onPlayMessage={onPlayMessage}
    />
  );
}

function AmyPendingBubble({
  pending,
  goalMet,
  onPlayMessage,
  onPrimePlay,
}: {
  pending: TutorPayload;
  goalMet: boolean;
  onPlayMessage: (message: string) => void;
  onPrimePlay: (message?: string) => void;
}) {
  return (
    <div className="space-y-2" data-testid="amy-learning-tutor-pending">
      <AmyMessageCard
        message={pending.message}
        mode={pending.mode}
        onPlayMessage={onPlayMessage}
        onPrimePlay={() => onPrimePlay(pending.message)}
        highlight
      />
      {goalMet ? (
        <p className="text-center text-xs font-semibold text-primary">
          Session goal reached — great work!
        </p>
      ) : null}
    </div>
  );
}

function AmyMessageCard({
  message,
  mode,
  onPlayMessage,
  onPrimePlay,
  highlight = false,
}: {
  message: string;
  mode?: TeachingMode;
  onPlayMessage: (message: string) => void;
  onPrimePlay?: () => void;
  highlight?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <div className="mt-1 shrink-0">
        <AmyIcon size={28} ring />
      </div>
      <Card
        className={cn(
          "flex-1 rounded-2xl rounded-tl-sm border border-border bg-card",
          highlight && "ring-2 ring-primary/20",
        )}
      >
        <CardContent className="space-y-2 p-3">
          {mode ? (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              {MODE_LABEL[mode]}
            </Badge>
          ) : null}
          <p className="whitespace-pre-wrap text-sm text-foreground">{message}</p>
          {message.trim() ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onPointerDown={() => onPrimePlay?.()}
              onClick={() => onPlayMessage(message)}
            >
              <Volume2 className="mr-1.5 h-3.5 w-3.5" />
              Listen
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
