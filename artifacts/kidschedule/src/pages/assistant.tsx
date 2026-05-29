import { useState, useRef, useEffect } from "react";
import { ChatThreadShell } from "@/components/chat-thread-shell";
import { ChatTypingBubble } from "@/components/chat-bubbles";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, User, RefreshCw, Zap, RotateCcw, Heart, GraduationCap, CheckSquare, Lightbulb, HelpCircle } from "lucide-react";
import { AmyIcon } from "@/components/amy-icon";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { readResolvedApiJson } from "@/lib/poll-result";
import { TAB_TOPICS, type AssistantTabId } from "@/lib/assistant-tab-topics";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

type WebMode = AssistantTabId;

const WEB_MODES: { id: WebMode; labelKey: string; hintKey: string; placeholderKey: string; icon: React.ElementType }[] = [
  { id: "parenting", labelKey: "ai.mode_parenting", hintKey: "ai.mode_parenting_hint", placeholderKey: "ai.web_placeholder_parenting", icon: Heart },
  { id: "teach",     labelKey: "ai.mode_teach",     hintKey: "ai.mode_teach_hint",     placeholderKey: "ai.web_placeholder_teach",     icon: GraduationCap },
  { id: "practice",  labelKey: "ai.mode_practice",  hintKey: "ai.mode_practice_hint",  placeholderKey: "ai.web_placeholder_practice",  icon: CheckSquare },
  { id: "quiz",      labelKey: "ai.mode_quiz",       hintKey: "ai.mode_quiz_hint",      placeholderKey: "ai.web_placeholder_quiz",       icon: Lightbulb },
  { id: "doubt",     labelKey: "ai.mode_doubt",      hintKey: "ai.mode_doubt_hint",     placeholderKey: "ai.web_placeholder_doubt",      icon: HelpCircle },
];

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollApiRef = useRef<{ scrollToEnd: (behavior?: ScrollBehavior) => void } | null>(null);
  const [showScrollLatest, setShowScrollLatest] = useState(false);

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

  const handleThreadScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const thread = event.currentTarget;
    const distanceFromBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight;
    setShowScrollLatest(distanceFromBottom > 160);
  };

  // Server-driven gating — no local quota counter. Premium users have no limit.
  const dailyLimit = entitlements?.limits.aiQueriesPerDay ?? 10;
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
  const tabTopics = TAB_TOPICS[mode] ?? [];

  const handleTopicClick = (topicKey: string) => {
    const text = t(topicKey);
    setInput(text);
    textareaRef.current?.focus();
    void sendMessage(text);
  };

  const renderSystemLimitMessage = () => (
    <div className="flex justify-center px-1">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-center text-sm text-foreground">
        <p>{t("ai.system_limit_message")}</p>
        <Link href="/pricing" className="mt-2 inline-block">
          <Button size="sm" className="rounded-full gap-1.5" data-testid="button-upgrade-system">
            <Zap className="h-3.5 w-3.5" />
            {t("ai.upgrade_premium")}
          </Button>
        </Link>
      </div>
    </div>
  );

  const renderMessageBubble = (msg: Message, i: number) => {
    if (msg.role === "system") {
      return (
        <div key={`system-${i}`} className="flex justify-center">
          <div className="max-w-[90%] rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-2.5 text-center text-sm text-muted-foreground">
            {msg.content}
          </div>
        </div>
      );
    }

    return (
      <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          msg.role !== "assistant" ? "bg-secondary/20 text-secondary-foreground" : ""
        }`}>
          {msg.role === "assistant" ? <AmyIcon size={32} ring /> : <User className="h-3.5 w-3.5" />}
        </div>
        <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
          <Card className={`rounded-2xl shadow-sm ${
            msg.role === "user"
              ? "bg-primary text-primary-foreground border-primary rounded-tr-sm"
              : "bg-card border-border rounded-tl-sm"
          }`}>
            <CardContent className="p-3">
              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user" ? "text-primary-foreground" : "text-foreground"
              }`}>
                {msg.content}
              </p>
            </CardContent>
          </Card>
          {msg.role === "assistant" && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-none px-0 h-auto">
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
    );
  };

  return (
    <div className="assistant-chat-page relative mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col bg-background">
      <ChatThreadShell
        layout="embedded"
        scrollDeps={[messages, loading, historyLoaded, mode, input]}
        scrollApiRef={scrollApiRef}
        onMessagesScroll={handleThreadScroll}
        className="bg-background"
        messagesClassName="max-w-3xl space-y-3"
        footerClassName="border-t border-border/50 bg-background px-0 py-3"
        header={(
          <header className="assistant-chat-header">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <AmyIcon size={28} ring />
                <h1 className="truncate font-quicksand text-lg font-bold text-foreground">
                  {t("ai.page_title")}
                </h1>
              </div>
              {!isEmpty && (
                <Button variant="ghost" size="sm" onClick={clearChat} className="h-8 shrink-0 rounded-full px-2 text-muted-foreground">
                  <RefreshCw className="h-4 w-4" />
                  <span className="sr-only">{t("ai.clear_chat")}</span>
                </Button>
              )}
            </div>
            <div className="assistant-chat-tabs mt-2 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {WEB_MODES.map(({ id, labelKey, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setMode(id)}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                    mode === id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </header>
        )}
        footer={(
          <div className="mx-auto w-full max-w-3xl px-4">
            <div className="flex items-end gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition-colors focus-within:border-primary">
              <Textarea
                ref={textareaRef}
                placeholder={
                  limitReached
                    ? t("ai.input_limit_placeholder")
                    : t(WEB_MODES.find((m) => m.id === mode)!.placeholderKey)
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={limitReached}
                className="max-h-[120px] min-h-[40px] flex-1 resize-none border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground disabled:opacity-60"
                rows={1}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading || limitReached}
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      >
        {limitReached ? renderSystemLimitMessage() : null}

        {isEmpty ? (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-center text-sm text-muted-foreground">{t("ai.empty_short")}</p>
            {tabTopics.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">{t("ai.no_tab_topics")}</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {tabTopics.map((topicKey) => (
                  <button
                    key={topicKey}
                    type="button"
                    onClick={() => handleTopicClick(topicKey)}
                    disabled={limitReached}
                    className="rounded-xl border border-border bg-card p-2.5 text-left text-sm font-medium text-foreground/80 transition-all hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t(topicKey)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg, i) => renderMessageBubble(msg, i))}
            {loading ? <ChatTypingBubble /> : null}
          </>
        )}
      </ChatThreadShell>

      {showScrollLatest && (
        <Button
          type="button"
          size="sm"
          onClick={() => scrollApiRef.current?.scrollToEnd("smooth")}
          className="absolute bottom-36 right-4 z-40 rounded-full shadow-lg"
        >
          {t("ai.scroll_latest", { defaultValue: "Latest" })}
        </Button>
      )}
    </div>
  );
}
