import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  GraduationCap,
  HelpCircle,
  ListChecks,
  Sparkles,
  Zap,
  Check,
  X,
} from "lucide-react";
import { AmyIcon } from "@/components/amy-icon";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────

type Mode = "teach" | "practice" | "quiz" | "doubt";
type Subject = "math" | "english" | "gk" | "logic" | "general";

/**
 * Strict tutor reply contract — mirrors `TutorJsonSchema` on the server.
 * Keep them in sync; if the server adds a field, add it here too.
 */
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
  // For user turns: free text. For tutor turns: structured reply.
  text?: string;
  reply?: TutorReply;
  /** Tutor turn only — locally tracked answer state (no server write yet). */
  pickedIndex?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────

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

// ─── Page ────────────────────────────────────────────────────────────────

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

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  // Pull primary child for context — best-effort.
  const { data: childrenData } = useQuery<Array<{ id?: number; name?: string; age?: number | null }>>({
    queryKey: ["children-for-amy-tutor"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      return r.ok ? r.json() : [];
    },
    staleTime: 60_000,
  });
  const primaryChild = Array.isArray(childrenData) && childrenData.length > 0 ? childrenData[0] : null;

  // Server-driven daily AI gate (shared with /assistant).
  const dailyLimit = entitlements?.limits.aiQueriesPerDay ?? 10;
  const remainingRaw = entitlements?.usage.aiQueriesRemaining;
  const remaining = isPremium ? Infinity : Math.max(0, remainingRaw ?? dailyLimit);
  const limitReached = !isPremium && remaining <= 0;

  const send = async () => {
    const text = input.trim();
    if (!text || loading || limitReached) return;

    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
    };
    setTurns((t) => [...t, userTurn]);
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
        }),
      });
      if (res.status === 402) {
        refreshSubscription();
        window.dispatchEvent(
          new CustomEvent("amynest:open-paywall", { detail: { reason: "ai_quota" } }),
        );
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { reply: TutorReply };
      if (!data?.reply || typeof data.reply.content !== "string") {
        throw new Error("invalid_reply_shape");
      }
      const tutorTurn: ChatTurn = {
        id: `t-${Date.now()}`,
        role: "tutor",
        reply: data.reply,
      };
      setTurns((t) => [...t, tutorTurn]);
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
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const pickOption = (turnId: string, optIdx: number) => {
    setTurns((all) =>
      all.map((t) => (t.id === turnId ? { ...t, pickedIndex: optIdx } : t)),
    );
  };

  const isEmpty = turns.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-3xl mx-auto" data-testid="amy-tutor-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h1 className="font-quicksand text-3xl font-bold text-foreground flex items-center gap-2">
            <AmyIcon size={38} bounce ring />
            Amy AI Tutor
            <Badge className="bg-card text-white text-xs font-bold border-0 ml-1">
              <Zap className="h-3 w-3 mr-1" />
              Tutor v1
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Ask Amy to teach a topic, run a practice, or explain a doubt — answers come with
            examples and a quick check.
          </p>
        </div>
      </div>

      {/* Daily limit bar */}
      <div
        className={cn(
          "flex-shrink-0 mb-3 rounded-2xl px-4 py-2 flex items-center justify-between gap-3 border text-sm",
          limitReached
            ? "bg-muted border-border text-foreground"
            : remaining <= 2
              ? "bg-muted border-border text-foreground"
              : "bg-primary/5 border-primary/20 text-primary/80",
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
        {limitReached && (
          <Link href="/pricing">
            <Button size="sm" className="rounded-full gap-1.5 shrink-0 bg-primary hover:bg-primary text-white" data-testid="button-upgrade-amy-tutor">
              <Zap className="h-3.5 w-3.5" />
              Upgrade
            </Button>
          </Link>
        )}
      </div>

      {/* Mode + subject + topic strip */}
      <div className="flex-shrink-0 mb-3 space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t("pages.amy_ai_tutor.tutor_mode")}>
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
                  "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground/80 border-border hover:border-primary/40 hover:bg-primary/5",
                )}
                title={meta.hint}
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t("pages.amy_ai_tutor.subject")}>
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
                  "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-white border-primary"
                    : "bg-card text-foreground/70 border-border hover:border-primary hover:bg-muted",
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
          className="w-full text-xs px-3 py-2 rounded-full border border-border bg-card focus:outline-none focus:border-primary"
          data-testid="amy-tutor-topic"
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1" data-testid="amy-tutor-thread">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-8">
            <AmyIcon size={88} bounce ring />
            <div>
              <h2 className="font-quicksand text-xl font-bold text-foreground mb-1">
                Hi {primaryChild?.name ?? "there"} — what should we learn today?
              </h2>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Pick a mode above, then type a question. Try "Teach me the letter B" or "Quiz me
                on addition".
              </p>
            </div>
          </div>
        ) : (
          turns.map((turn) => (
            <TurnView key={turn.id} turn={turn} onPickOption={pickOption} />
          ))
        )}
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm" data-testid="amy-tutor-thinking">
            <AmyIcon size={28} bounce ring />
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("pages.amy_ai_tutor.amy_is_thinking")}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 flex gap-2 border-t border-border pt-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={limitReached ? "Daily limit reached — upgrade to keep going." : "Ask Amy anything…"}
          disabled={limitReached}
          className="resize-none min-h-[44px] max-h-32 rounded-2xl"
          rows={1}
          data-testid="amy-tutor-input"
        />
        <Button
          onClick={() => send()}
          disabled={!input.trim() || loading || limitReached}
          className="rounded-full px-4"
          data-testid="amy-tutor-send"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Single-turn view ────────────────────────────────────────────────────

function TurnView({
  turn,
  onPickOption,
}: {
  turn: ChatTurn;
  onPickOption: (turnId: string, optIdx: number) => void;
}) {
  if (turn.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2 text-sm"
          data-testid="amy-tutor-user-bubble"
        >
          {turn.text}
        </div>
      </div>
    );
  }

  // Defensive: a malformed tutor turn (no reply payload) should never crash
  // the whole thread — render a neutral placeholder instead (architect flag).
  if (!turn.reply) {
    return (
      <div className="flex gap-2">
        <div className="shrink-0 mt-1">
          <AmyIcon size={28} ring />
        </div>
        <div className="flex-1 rounded-2xl rounded-tl-sm bg-card border border-border p-3 text-sm text-muted-foreground">
          Amy's reply got lost in the post — try asking again.
        </div>
      </div>
    );
  }
  const reply = turn.reply;
  const correctIdx =
    typeof reply.answer === "number" && reply.options[reply.answer] !== undefined
      ? reply.answer
      : null;
  const picked = turn.pickedIndex;

  return (
    <div className="flex gap-2">
      <div className="shrink-0 mt-1">
        <AmyIcon size={28} ring />
      </div>
      <Card
        className="flex-1 rounded-2xl rounded-tl-sm bg-card border border-border"
        data-testid="amy-tutor-tutor-bubble"
      >
        <CardContent className="p-3 space-y-2">
          {reply.content && (
            <p className="text-sm text-foreground whitespace-pre-wrap">{reply.content}</p>
          )}

          {reply.examples.length > 0 && (
            <div className="flex flex-wrap gap-1.5" data-testid="amy-tutor-examples">
              {reply.examples.map((ex, i) => (
                <span
                  key={i}
                  className="inline-block rounded-full bg-muted text-foreground text-xs font-semibold px-2.5 py-0.5"
                >
                  {ex}
                </span>
              ))}
            </div>
          )}

          {reply.question && (
            <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2" data-testid="amy-tutor-question">
              <p className="text-sm font-bold text-foreground">{reply.question}</p>
              {reply.options.length > 0 && (
                <div className="grid gap-1.5">
                  {reply.options.map((opt, i) => {
                    const isPicked = picked === i;
                    const isCorrect = correctIdx === i;
                    const showVerdict = picked !== undefined;
                    const stateClass = !showVerdict
                      ? "border-border hover:border-primary/40 hover:bg-primary/10"
                      : isPicked && isCorrect
                        ? "border-primary bg-muted text-foreground"
                        : isPicked && !isCorrect
                          ? "border-primary bg-muted text-foreground"
                          : isCorrect
                            ? "border-border bg-muted text-foreground"
                            : "border-border opacity-70";
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => picked === undefined && onPickOption(turn.id, i)}
                        disabled={picked !== undefined}
                        data-testid={`amy-tutor-option-${i}`}
                        className={cn(
                          "text-left text-sm rounded-lg border px-3 py-2 transition-colors flex items-center gap-2",
                          stateClass,
                        )}
                      >
                        <span className="flex-1">{opt}</span>
                        {showVerdict && isPicked && isCorrect && <Check className="h-4 w-4" />}
                        {showVerdict && isPicked && !isCorrect && <X className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              )}
              {picked !== undefined && correctIdx !== null && (
                <p className="text-xs font-semibold mt-1">
                  {picked === correctIdx ? "🎉 Right on!" : `The answer is: ${reply.options[correctIdx]}`}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
