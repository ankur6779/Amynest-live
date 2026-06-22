import { parseApiJson } from "@/lib/safe-json-response";
import { useRef, useState, useMemo, useCallback } from "react";
import { ChatThread, type InteractionEvent, type ThreadMessage } from "@/components/chat-thread";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  HelpCircle,
  ListChecks,
  Sparkles,
  Zap,
} from "lucide-react";
import { AmyIcon } from "@/components/amy-icon";
import { AmyAvatar } from "@/components/amy-3d/amy-avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { readResolvedApiJson } from "@/lib/poll-result";
import { useSubscription } from "@/hooks/use-subscription";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import { AmyPresenceStrip } from "@/components/learning-progress";
import { cn } from "@/lib/utils";

type Mode = "teach" | "practice" | "quiz" | "doubt";
type Subject = "math" | "english" | "gk" | "logic" | "general";

interface TutorReply {
  type: Mode;
  content: string;
  examples: string[];
  question: string | null;
  options: string[];
  answer: number | string | null;
}

interface ChatTurn {
  id: string;
  role: "user" | "tutor";
  text?: string;
  reply?: TutorReply;
  pickedIndex?: number;
}

const MODE_META: Record<Mode, { icon: typeof GraduationCap; label: string; hint: string }> = {
  teach: { icon: GraduationCap, label: "Teach", hint: "Explain a topic with examples" },
  practice: { icon: ListChecks, label: "Practice", hint: "Recap + one MCQ" },
  quiz: { icon: Sparkles, label: "Quiz", hint: "Just one quick question" },
  doubt: { icon: HelpCircle, label: "Doubt", hint: "Answer my child's question" },
};

const SUBJECTS: Array<{ key: Subject; label: string; emoji: string }> = [
  { key: "general", label: "Anything", emoji: "✨" },
  { key: "math", label: "Math", emoji: "🔢" },
  { key: "english", label: "English", emoji: "📖" },
  { key: "gk", label: "GK", emoji: "🌍" },
  { key: "logic", label: "Logic", emoji: "🧩" },
];

function tutorTurnToThreadMessage(turn: ChatTurn): ThreadMessage {
  if (turn.role === "user") {
    return { kind: "user", id: turn.id, text: turn.text ?? "" };
  }

  if (!turn.reply) {
    return {
      kind: "amy",
      id: turn.id,
      text: "Amy's reply got lost in the post — try asking again.",
    };
  }

  const reply = turn.reply;
  const correctIdx =
    typeof reply.answer === "number" && reply.options[reply.answer] !== undefined
      ? reply.answer
      : null;

  if (reply.question && reply.options.length > 0) {
    return {
      kind: "interactive",
      id: turn.id,
      interaction: {
        type: "mcq",
        content: reply.content,
        examples: reply.examples,
        question: reply.question,
        options: reply.options,
        correctIndex: correctIdx,
      },
      state:
        turn.pickedIndex !== undefined
          ? { status: "resolved", pickedIndex: turn.pickedIndex }
          : { status: "pending" },
    };
  }

  if (reply.examples.length > 0) {
    return {
      kind: "interactive",
      id: turn.id,
      interaction: {
        type: "mcq",
        content: reply.content,
        examples: reply.examples,
        question: "",
        options: [],
      },
      state: { status: "resolved" },
    };
  }

  return { kind: "amy", id: turn.id, text: reply.content };
}

export default function AmyAiTutorPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const authFetch = useAuthFetch();
  const { entitlements, isPremium, refresh: refreshSubscription } = useSubscription();

  const [mode, setMode] = useState<Mode>("teach");
  const [subject, setSubject] = useState<Subject>("general");
  const [topic, setTopic] = useState("");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: childrenData } = useQuery<Array<{ id?: number; name?: string; age?: number | null }>>({
    queryKey: ["children-for-amy-tutor"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      if (!r.ok) return [];
      return parseApiJson<Array<{ id?: number; name?: string; age?: number | null }>>(r);
    },
    staleTime: 60_000,
  });
  const primaryChild = Array.isArray(childrenData) && childrenData.length > 0 ? childrenData[0] : null;
  const learningProgress = useLearningProgress(primaryChild?.id ?? null);

  const dailyLimit = entitlements?.limits.aiQueriesPerDay ?? 10;
  const remainingRaw = entitlements?.usage.aiQueriesRemaining;
  const remaining = isPremium ? Infinity : Math.max(0, remainingRaw ?? dailyLimit);
  const limitReached = !isPremium && remaining <= 0;

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || limitReached) return;

    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
    };
    setTurns((prev) => [...prev, userTurn]);
    setInput("");
    setLoading(true);

    try {
      const res = await authFetch(
        "/api/ai-tutor/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId: primaryChild?.id,
            mode,
            subject,
            topic: topic.trim() || undefined,
            message: text,
            learningContext: learningProgress.aiTutorContext
              ? {
                  weakSkills: [
                    ...learningProgress.aiTutorContext.weakSkills,
                    ...(learningProgress.phase3?.memory.strugglingSkills ?? []),
                  ].slice(0, 20),
                  recentMistakes: learningProgress.aiTutorContext.recentMistakes,
                  learningLevel: learningProgress.aiTutorContext.learningLevel,
                  unlockedSkills: [
                    ...learningProgress.aiTutorContext.unlockedSkills,
                    ...(learningProgress.phase3?.memory.masteredSkills ?? []),
                  ].slice(0, 30),
                  masteryScore: learningProgress.aiTutorContext.masteryScore,
                  currentPhase: learningProgress.aiTutorContext.currentPhase,
                  journeyDay: learningProgress.aiTutorContext.journeyDay,
                  proactiveInsights: learningProgress.phase3?.tutorLines.map((l) => l.text),
                }
              : undefined,
          }),
        },
        45_000,
      );
      if (res.status === 402) {
        refreshSubscription();
        window.dispatchEvent(
          new CustomEvent("amynest:open-paywall", { detail: { reason: "ai_quota" } }),
        );
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await readResolvedApiJson<{ reply: TutorReply }>(res, authFetch, {
        poll: { maxAttempts: 30, intervalMs: 2000, requestTimeoutMs: 20_000 },
      });
      if (!data?.reply || typeof data.reply.content !== "string") {
        throw new Error("invalid_reply_shape");
      }
      const tutorTurn: ChatTurn = {
        id: `t-${Date.now()}`,
        role: "tutor",
        reply: data.reply,
      };
      setTurns((prev) => [...prev, tutorTurn]);
      window.dispatchEvent(new CustomEvent("amynest:refresh-subscription"));
    } catch (err) {
      toast({
        title: "Amy couldn't reply",
        description: err instanceof Error ? err.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    authFetch,
    input,
    learningProgress.aiTutorContext,
    learningProgress.phase3?.memory.masteredSkills,
    learningProgress.phase3?.memory.strugglingSkills,
    learningProgress.phase3?.tutorLines,
    limitReached,
    loading,
    mode,
    primaryChild?.id,
    refreshSubscription,
    subject,
    toast,
    topic,
  ]);

  const pickOption = useCallback((turnId: string, optIdx: number) => {
    setTurns((all) =>
      all.map((turn) => (turn.id === turnId ? { ...turn, pickedIndex: optIdx } : turn)),
    );
  }, []);

  const handleInteraction = useCallback(
    (event: InteractionEvent) => {
      if (event.type === "mcq" && event.pickedIndex !== undefined) {
        pickOption(event.messageId, event.pickedIndex);
      }
    },
    [pickOption],
  );

  const isEmpty = turns.length === 0;
  const proactiveLines = learningProgress.phase3?.tutorLines ?? [];
  const showProactiveLines = proactiveLines.length > 0;
  const showPresenceStrip = primaryChild?.id != null && !showProactiveLines;

  const threadMessages = useMemo((): ThreadMessage[] => {
    if (isEmpty) {
      return [
        {
          kind: "system",
          id: "empty",
          content: (
            <div className="flex min-h-[min(36vh,240px)] flex-col items-center justify-center gap-3 px-2 py-6 text-center">
              <AmyAvatar tier="hero" size={96} ring bounce state="idle" />
              <div>
                <h2 className="mb-1 font-quicksand text-lg font-bold text-foreground">
                  Hi {primaryChild?.name ?? "there"} — what should we learn today?
                </h2>
                <p className="mx-auto max-w-xs text-sm text-muted-foreground">
                  Pick a mode above, then type a question. Try &quot;Teach me the letter B&quot; or
                  &quot;Quiz me on addition&quot;.
                </p>
              </div>
            </div>
          ),
        },
      ];
    }

    return turns.map(tutorTurnToThreadMessage);
  }, [isEmpty, primaryChild?.name, turns]);

  return (
    <div
      className="assistant-chat-page relative mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col bg-background"
      data-testid="amy-tutor-page"
    >
      <ChatThread
        surface="amy-ai-tutor"
        testId="amy-tutor-thread"
        layout="embedded"
        messages={threadMessages}
        draft={input}
        onDraftChange={setInput}
        onSend={() => void send()}
        onInteraction={handleInteraction}
        loading={loading}
        composerDisabled={limitReached}
        composerPlaceholder={
          limitReached ? "Daily limit reached — upgrade to keep going." : "Ask Amy anything…"
        }
        scrollDeps={[turns, loading, input, mode, subject, topic, proactiveLines.length]}
        scrollToLatestLabel="Latest"
        className="min-h-0 flex-1 bg-background"
        messagesClassName="space-y-3 px-4 md:px-0"
        footerClassName="border-t border-border/50 bg-background/95 backdrop-blur px-0 py-3"
        textareaRef={textareaRef}
        header={(
          <header className="assistant-chat-header space-y-2.5 px-4 md:px-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <AmyIcon size={28} ring />
                <div className="min-w-0">
                  <h1 className="flex flex-wrap items-center gap-1.5 font-quicksand text-lg font-bold text-foreground">
                    <span className="truncate">Amy AI Tutor</span>
                    <Badge className="border-0 bg-primary/15 px-2 py-0 text-[10px] font-bold text-primary">
                      <Zap className="mr-0.5 h-3 w-3" />
                      Quick Tutor
                    </Badge>
                  </h1>
                  <p className="text-xs leading-snug text-muted-foreground">
                    A warm tutor — lesson, practice, quiz, or doubt.
                  </p>
                </div>
              </div>
            </div>

            {showPresenceStrip && (
              <AmyPresenceStrip surface="tutor" childId={primaryChild!.id} className="[&>div]:rounded-xl" />
            )}

            {showProactiveLines && (
              <div
                className="rounded-xl border border-border/70 bg-card/60 px-3 py-2.5"
                data-testid="tutor-proactive-lines"
              >
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary/80">
                  Amy noticed
                </p>
                <div className="space-y-1.5">
                  {proactiveLines.slice(0, 2).map((line) => (
                    <p key={line.id} className="text-xs leading-relaxed text-foreground/85">
                      {line.text}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div
              className={cn(
                "flex items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-xs",
                limitReached
                  ? "border-border bg-muted text-foreground"
                  : remaining <= 2
                    ? "border-border bg-muted text-foreground"
                    : "border-primary/20 bg-primary/5 text-primary/80",
              )}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                {limitReached ? (
                  <span className="truncate font-semibold">
                    {t("pages.amy_ai_tutor.daily_amy_ai_limit_reached")}
                  </span>
                ) : isPremium ? (
                  <span className="truncate">{t("pages.amy_ai_tutor.premium_unlimited_amy_ai")}</span>
                ) : (
                  <span className="truncate">
                    {remaining} of {dailyLimit} Amy AI replies left today
                  </span>
                )}
              </div>
              {limitReached && (
                <Link href="/pricing">
                  <Button
                    size="sm"
                    className="h-7 shrink-0 gap-1 rounded-full px-2.5 text-[11px]"
                    data-testid="button-upgrade-amy-tutor"
                  >
                    <Zap className="h-3 w-3" />
                    Upgrade
                  </Button>
                </Link>
              )}
            </div>

            <div
              className="scrollbar-none flex gap-1.5 overflow-x-auto pb-0.5"
              role="tablist"
              aria-label={t("pages.amy_ai_tutor.tutor_mode")}
            >
              {(Object.keys(MODE_META) as Mode[]).map((m) => {
                const meta = MODE_META[m];
                const Icon = meta.icon;
                const active = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-testid={`amy-tutor-mode-${m}`}
                    onClick={() => setMode(m)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-foreground/80 hover:border-primary/40 hover:bg-primary/5",
                    )}
                    title={meta.hint}
                  >
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            <div
              className="scrollbar-none flex gap-1.5 overflow-x-auto pb-0.5"
              role="tablist"
              aria-label={t("pages.amy_ai_tutor.subject")}
            >
              {SUBJECTS.map((s) => {
                const active = subject === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-testid={`amy-tutor-subject-${s.key}`}
                    onClick={() => setSubject(s.key)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground/70 hover:border-primary hover:bg-muted",
                    )}
                  >
                    <span aria-hidden>{s.emoji}</span>
                    {s.label}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, 120))}
              placeholder={t("pages.amy_ai_tutor.topic_placeholder")}
              className="w-full rounded-full border border-border bg-card px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
              data-testid="amy-tutor-topic"
            />
          </header>
        )}
      />
    </div>
  );
}
