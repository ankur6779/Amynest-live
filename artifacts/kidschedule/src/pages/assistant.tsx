import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, User, Sparkles, RefreshCw, Zap, RotateCcw, Heart, GraduationCap, CheckSquare, Lightbulb, HelpCircle } from "lucide-react";
import { AmyIcon } from "@/components/amy-icon";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { readResolvedApiJson } from "@/lib/poll-result";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type WebMode = "parenting" | "teach" | "practice" | "quiz" | "doubt";

const WEB_MODES: { id: WebMode; labelKey: string; hintKey: string; placeholderKey: string; icon: React.ElementType }[] = [
  { id: "parenting", labelKey: "ai.mode_parenting", hintKey: "ai.mode_parenting_hint", placeholderKey: "ai.web_placeholder_parenting", icon: Heart },
  { id: "teach",     labelKey: "ai.mode_teach",     hintKey: "ai.mode_teach_hint",     placeholderKey: "ai.web_placeholder_teach",     icon: GraduationCap },
  { id: "practice",  labelKey: "ai.mode_practice",  hintKey: "ai.mode_practice_hint",  placeholderKey: "ai.web_placeholder_practice",  icon: CheckSquare },
  { id: "quiz",      labelKey: "ai.mode_quiz",       hintKey: "ai.mode_quiz_hint",      placeholderKey: "ai.web_placeholder_quiz",       icon: Lightbulb },
  { id: "doubt",     labelKey: "ai.mode_doubt",      hintKey: "ai.mode_doubt_hint",     placeholderKey: "ai.web_placeholder_doubt",      icon: HelpCircle },
];

const PARENTING_CHIP_KEYS = [
  "ai.web_chip_parenting_1",
  "ai.web_chip_parenting_2",
  "ai.web_chip_parenting_3",
  "ai.web_chip_parenting_4",
  "ai.web_chip_parenting_5",
  "ai.web_chip_parenting_6",
] as const;

const SUGGESTED_QUESTION_KEYS = [
  "ai.suggested_q1",
  "ai.suggested_q2",
  "ai.suggested_q3",
  "ai.suggested_q4",
  "ai.suggested_q5",
  "ai.suggested_q6",
] as const;

export default function AssistantPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const authFetch = useAuthFetch();
  const { entitlements, isPremium, refresh: refreshSubscription } = useSubscription();
  const [mode, setMode] = useState<WebMode>("parenting");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load saved chat history on mount so parents can pick up where they left off
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await authFetch("/api/ai/messages");
        if (!r.ok) return;
        const data = (await r.json()) as { messages?: Array<{ role: string; content: string }> };
        if (cancelled) return;
        const past: Message[] = (data.messages ?? [])
          .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        if (past.length > 0) setMessages(past);
      } catch {
        // non-fatal — empty chat is fine
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Server-driven gating — no local quota counter. Premium users have no limit.
  const dailyLimit = entitlements?.limits.aiQueriesPerDay ?? 10;
  const questionsUsed = entitlements?.usage.aiQueriesToday ?? 0;
  const remainingRaw = entitlements?.usage.aiQueriesRemaining; // null for premium
  const remaining = isPremium ? Infinity : Math.max(0, remainingRaw ?? dailyLimit);
  const limitReached = !isPremium && remaining <= 0;

  // Pull primary child for richer Amy context (name + age) — best-effort, no error if empty
  const { data: childrenData } = useQuery<Array<{ name?: string; age?: number | null }>>({
    queryKey: ["children-for-assistant"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      return r.ok ? r.json() : [];
    },
    staleTime: 60_000,
  });
  const primaryChild = Array.isArray(childrenData) && childrenData.length > 0 ? childrenData[0] : null;

  const sendMessage = async (question?: string) => {
    const text = (question ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const { default: i18nInstance } = await import("@/i18n");
      // Send last 6 turns (excluding the new question, which goes as `question`) for context
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const res = await authFetch("/api/ai/assistant-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          language: i18nInstance.language || "en",
          history,
          childName: primaryChild?.name ?? undefined,
          childAge: typeof primaryChild?.age === "number" ? primaryChild.age : undefined,
        }),
      });
      if (res.status === 402) {
        refreshSubscription();
        // Dispatched event is handled by SubscriptionEventBridge in App.tsx
        window.dispatchEvent(new CustomEvent("amynest:open-paywall", { detail: { reason: "ai_quota" } }));
        return;
      }
      if (!res.ok) throw new Error("api_error");
      const data = await readResolvedApiJson<{ answer?: string }>(res, authFetch);
      const assistantMsg: Message = { role: "assistant", content: data?.answer ?? "" };
      setMessages((prev) => [...prev, assistantMsg]);
      window.dispatchEvent(new CustomEvent("amynest:refresh-subscription"));
    } catch {
      toast({ title: t("ai.error_response"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    setMessages([]);
    setInput("");
    toast({ title: t("ai.conversation_cleared"), duration: 2000 });
    try {
      await authFetch("/api/ai/messages", { method: "DELETE" });
    } catch {
      // non-fatal — UI is already cleared
    }
  };

  // Suppress the empty-state flash while we're still loading saved history
  const isEmpty = historyLoaded && messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="font-quicksand text-3xl font-bold text-foreground flex items-center gap-2">
            <AmyIcon size={38} bounce ring />
            {t("ai.page_title")}
            <Badge className="bg-card text-primary-foreground text-xs font-bold border-0 ml-1">
              <Zap className="h-3 w-3 mr-1" />
              {t("ai.badge_label")}
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1">{t("ai.subtitle")}</p>
        </div>
        {!isEmpty && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="rounded-full gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            {t("ai.clear_chat")}
          </Button>
        )}
      </div>

      {/* Mode tabs */}
      <div className="flex-shrink-0 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {WEB_MODES.map(({ id, labelKey, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border ${
                mode === id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {t(labelKey)}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground italic mt-1.5 px-0.5">
          {t(WEB_MODES.find((m) => m.id === mode)!.hintKey)}
        </p>
      </div>

      {/* Daily limit bar */}
      <div className={`flex-shrink-0 mb-3 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 border text-sm ${
        limitReached
          ? "bg-muted border-border text-foreground"
          : remaining <= 2
          ? "bg-muted border-border text-foreground"
          : "bg-primary/5 border-primary/20 text-primary/80"
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0" />
          {limitReached ? (
            <span className="font-bold">{t("ai.quota_exhausted_upgrade")}</span>
          ) : (
            <span>
              {remaining === 1
                ? t("ai.quota_remaining_singular", { remaining, limit: dailyLimit })
                : t("ai.quota_remaining", { remaining, limit: dailyLimit })}
            </span>
          )}
        </div>
        {limitReached ? (
          <Link href="/pricing">
            <Button size="sm" className="rounded-full gap-1.5 shrink-0 bg-primary hover:bg-primary text-primary-foreground" data-testid="button-upgrade-banner">
              <Zap className="h-3.5 w-3.5" />
              {t("ai.upgrade")}
            </Button>
          </Link>
        ) : (
          <div className="flex gap-1">
            {Array.from({ length: dailyLimit }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < questionsUsed ? "bg-current opacity-80" : "bg-current opacity-20"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center py-8">
            <AmyIcon size={96} bounce ring />
            <div>
              <h2 className="font-quicksand text-xl font-bold text-foreground mb-1">{t("ai.empty_heading")}</h2>
              <p className="text-muted-foreground text-sm max-w-xs">
                {t("ai.empty_body")}
              </p>
            </div>

            <div className="w-full max-w-lg">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">{t("ai.popular_questions")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(mode === "parenting" ? PARENTING_CHIP_KEYS : SUGGESTED_QUESTION_KEYS).map((key, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(t(key))}
                    disabled={limitReached}
                    className="text-left text-sm p-3 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground/80 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>

            {limitReached && (
              <div className="bg-muted border border-border rounded-2xl p-5 text-sm text-foreground max-w-sm text-center space-y-3">
                <p className="font-bold text-base">{t("ai.quota_exhausted")}</p>
                <p>{t("ai.quota_exhausted_body", { limit: dailyLimit })}</p>
                <Link href="/pricing">
                  <Button className="w-full rounded-full gap-2 bg-primary hover:bg-primary text-primary-foreground" data-testid="button-upgrade-empty">
                    <Zap className="h-4 w-4" />
                    {t("ai.upgrade_premium")}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                  msg.role !== "assistant" ? "bg-secondary/20 text-secondary-foreground" : ""
                }`}>
                  {msg.role === "assistant" ? <AmyIcon size={36} ring /> : <User className="h-4 w-4" />}
                </div>
                <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <Card className={`rounded-2xl shadow-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground border-primary rounded-tr-sm"
                      : "bg-card border-border rounded-tl-sm"
                  }`}>
                    <CardContent className="p-3.5">
                      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user" ? "text-primary-foreground" : "text-foreground"
                      }`}>
                        {msg.content}
                      </p>
                    </CardContent>
                  </Card>
                  {msg.role === "assistant" && (
                    <Badge variant="outline" className="text-xs text-muted-foreground border-none px-0 h-auto">
                      {t("ai.disclaimer")}
                    </Badge>
                  )}
                  {msg.role === "user" && !loading && !limitReached && (
                    <button
                      type="button"
                      onClick={() => sendMessage(msg.content)}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors px-1"
                      data-testid={`ask-again-${i}`}
                      aria-label={t("ai.ask_again")}
                    >
                      <RotateCcw className="h-3 w-3" />
                      {t("ai.ask_again")}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="shrink-0">
                  <AmyIcon size={36} bounce ring />
                </div>
                <Card className="rounded-2xl rounded-tl-sm border-border shadow-sm">
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("ai.thinking")}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 pt-3 border-t border-border/50">
        {limitReached ? (
          <div className="bg-muted border border-border rounded-2xl p-4 text-center text-foreground space-y-2">
            <p className="font-bold text-sm">{t("ai.quota_exhausted")}</p>
            <p className="text-xs">{t("ai.quota_exhausted_input", { limit: dailyLimit })}</p>
            <Link href="/pricing">
              <Button size="sm" className="rounded-full gap-1.5 bg-primary hover:bg-primary text-primary-foreground" data-testid="button-upgrade-input">
                <Zap className="h-3.5 w-3.5" />
                {t("ai.upgrade_premium")}
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex gap-3 items-end bg-card rounded-2xl border border-border p-3 shadow-sm focus-within:border-primary transition-colors">
              <Textarea
                ref={textareaRef}
                placeholder={t(WEB_MODES.find((m) => m.id === mode)!.placeholderKey)}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 border-none shadow-none resize-none focus-visible:ring-0 min-h-[40px] max-h-[120px] bg-transparent p-0 text-sm placeholder:text-muted-foreground"
                rows={1}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading || limitReached}
                size="icon"
                className="rounded-xl h-9 w-9 shrink-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              {t("ai.send_hint")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
