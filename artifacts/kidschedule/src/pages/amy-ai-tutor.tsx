import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ChatThread, type ThreadMessage } from "@/components/chat-thread";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, GraduationCap, HelpCircle, ListChecks, Sparkles, Zap } from "lucide-react";
import { AmyIcon } from "@/components/amy-icon";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { readResolvedApiJson } from "@/lib/poll-result";
import { useSubscription } from "@/hooks/use-subscription";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import { TutorProactiveLines, AmyPresenceStrip } from "@/components/learning-progress";
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: childrenData } = useQuery<Array<{ id?: number; name?: string; age?: number | null }>>({
    queryKey: ["children-for-amy-tutor"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      return r.ok ? r.json() : [];
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

    setTurns((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await authFetch("/api/ai-tutor/chat", {
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
      });
      if (res.status === 402) {
        refreshSubscription();
        window.dispatchEvent(new CustomEvent("amynest:open-paywall", { detail: { reason: "ai_quota" } }));
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await readResolvedApiJson<{ reply: TutorReply }>(res, authFetch);
      if (!data?.reply || typeof data.reply.content !== "string") throw new Error("invalid_reply_shape");
      setTurns((prev) => [...prev, { id: `t-${Date.now()}`, role: "tutor", reply: data.reply }]);
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
    learningProgress,
    limitReached,
    loading,
    mode,
    primaryChild?.id,
    refreshSubscription,
    subject,
    toast,
    topic,
  ]);

  const pickOption = useCallback((turnId: string, optIdx: number, optionText: string) => {
    setTurns((all) => [
      ...all.map((t) => (t.id === turnId ? { ...t, pickedIndex: optIdx } : t)),
      { id: `u-pick-${Date.now()}`, role: "user" as const, text: optionText },
    ]);
  }, []);

  const threadMessages = useMemo((): ThreadMessage[] => {
    if (turns.length === 0) {
      return [
        {
          kind: "system",
          id: "empty",
          content: (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
              <AmyIcon size={88} bounce ring />
              <div>
                <h2 className="mb-1 font-quicksand text-xl font-bold text-foreground">
                  Hi {primaryChild?.name ?? "there"} — what should we learn today?
                </h2>
                <p className="mx-auto max-w-xs text-sm text-muted-foreground">
                  Pick a mode above, then type a question.
                </p>
              </div>
            </div>
          ),
        },
      ];
    }

    const items: ThreadMessage[] = [];
    for (const turn of turns) {
      if (turn.role === "user") {
        items.push({ kind: "user", id: turn.id, text: turn.text ?? "" });
        continue;
      }
      if (!turn.reply) {
        items.push({
          kind: "amy",
          id: turn.id,
          text: "Amy's reply got lost in the post — try asking again.",
        });
        continue;
      }
      const reply = turn.reply;
      const correctIdx =
        typeof reply.answer === "number" && reply.options[reply.answer] !== undefined
          ? reply.answer
          : null;

      if (reply.question && reply.options.length > 0) {
        items.push({
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
        });
      } else {
        items.push({
          kind: "amy",
          id: turn.id,
          text: [reply.content, ...(reply.examples.length ? ["", ...reply.examples.map((e) => `• ${e}`)] : [])].join("\n"),
        });
      }
    }
    return items;
  }, [primaryChild?.name, turns]);

  return (
    <div
      className="assistant-chat-page chat-container relative mx-auto flex min-h-0 w-full max-w-3xl flex-col bg-background"
      data-testid="amy-tutor-page"
    >
      <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-4 md:px-0 md:pt-0">
        <div>
          <h1 className="font-quicksand flex items-center gap-2 text-3xl font-bold text-foreground">
            <AmyIcon size={38} bounce ring />
            Amy AI Tutor
            <Badge className="ml-1 border-0 bg-card text-xs font-bold text-white">
              <Zap className="mr-1 h-3 w-3" />
              Quick Tutor
            </Badge>
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            A warm, playful tutor — ask for a lesson, practice, or help with a doubt.
          </p>
        </div>
        <Link href="/learn-with-amy">
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5 rounded-full text-xs">
            <GraduationCap className="h-3.5 w-3.5" />
            Adaptive Tutor
          </Button>
        </Link>
      </div>

      {primaryChild?.id != null ? (
        <div className="mx-4 mb-3 shrink-0 md:mx-0">
          <AmyPresenceStrip surface="tutor" childId={primaryChild.id} />
        </div>
      ) : null}

      {learningProgress.phase3 && learningProgress.phase3.tutorLines.length > 0 ? (
        <div className="mx-4 mb-3 shrink-0 md:mx-0">
          <TutorProactiveLines lines={learningProgress.phase3.tutorLines} />
        </div>
      ) : null}

      <div
        className={cn(
          "mx-4 mb-3 flex shrink-0 items-center justify-between gap-3 rounded-2xl border px-4 py-2 text-sm md:mx-0",
          limitReached ? "border-border bg-muted text-foreground" : "border-primary/20 bg-primary/5 text-primary/80",
        )}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0" />
          {limitReached ? (
            <span className="font-bold">{t("pages.amy_ai_tutor.daily_amy_ai_limit_reached")}</span>
          ) : isPremium ? (
            <span>{t("pages.amy_ai_tutor.premium_unlimited_amy_ai")}</span>
          ) : (
            <span>{remaining} of {dailyLimit} Amy AI replies left today</span>
          )}
        </div>
        {limitReached ? (
          <Link href="/pricing">
            <Button size="sm" className="shrink-0 gap-1.5 rounded-full bg-primary text-white hover:bg-primary">
              <Zap className="h-3.5 w-3.5" />
              Upgrade
            </Button>
          </Link>
        ) : null}
      </div>

      <ChatThread
        surface="amy-ai-tutor"
        testId="amy-tutor-thread"
        messages={threadMessages}
        draft={input}
        onDraftChange={setInput}
        onSend={() => void send()}
        onInteraction={(event) => {
          if (event.type === "mcq" && event.pickedIndex != null && event.optionValue) {
            const turnId = event.messageId;
            pickOption(turnId, event.pickedIndex, event.optionValue);
          }
        }}
        loading={loading}
        composerDisabled={limitReached}
        composerPlaceholder={limitReached ? "Daily limit reached — upgrade to keep going." : "Ask Amy anything…"}
        scrollDeps={[turns, loading, input, mode, subject, topic]}
        className="min-h-0 flex-1 bg-background"
        messagesClassName="space-y-3 md:px-0"
        footerClassName="border-t border-border/50 bg-background px-0 py-3"
        textareaRef={inputRef}
        header={(
          <div className="space-y-2 px-4 pb-3 md:px-0">
            <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1" role="tablist">
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
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-foreground/80 hover:border-primary/40 hover:bg-primary/5",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1" role="tablist">
              {SUBJECTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={subject === s.key}
                  data-testid={`amy-tutor-subject-${s.key}`}
                  onClick={() => setSubject(s.key)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors",
                    subject === s.key
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-card text-foreground/70 hover:border-primary hover:bg-muted",
                  )}
                >
                  <span aria-hidden>{s.emoji}</span>
                  {s.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, 120))}
              placeholder={t("pages.amy_ai_tutor.topic_placeholder")}
              className="w-full rounded-full border border-border bg-card px-3 py-2 text-xs focus:border-primary focus:outline-none"
              data-testid="amy-tutor-topic"
            />
          </div>
        )}
      />
    </div>
  );
}
