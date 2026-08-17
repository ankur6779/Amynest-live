import { parseApiJson } from "@/lib/safe-json-response";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  ChatThread,
  type ThreadMessage,
} from "@/components/chat-thread";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  RefreshCw,
  Sparkles,
  Heart,
  GraduationCap,
  CheckSquare,
  Lightbulb,
  HelpCircle,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { AmyIcon } from "@/components/amy-icon";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { readAssistantAnswer, readResolvedApiJson } from "@/lib/poll-result";
import { TAB_TOPICS, type AssistantTabId } from "@/lib/assistant-tab-topics";
import { FF_INFANT_PREMIUM } from "@/lib/infant-feature-flags";
import {
  ASK_AMY_SOFT_CONTINUE,
  askAmySoftContinueMessage,
} from "@/lib/hard-day-monetization";
import { isAskAmyLivingV1Enabled } from "@/lib/ask-amy/living-room";
import { AmyNestLeaveContinuity } from "@/components/amy-nest-leave-continuity";
import { AmyAiConversationWorkspace } from "@/components/ask-amy/amy-ai-conversation-workspace";
import "@/components/ask-amy/ask-amy-living-room.css";

function childTotalMonths(child: { age?: number | null; ageMonths?: number | null }): number {
  return (child.age ?? 0) * 12 + (child.ageMonths ?? 0);
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

type WebMode = AssistantTabId;

const ASSISTANT_AI_TIMEOUT_MS = 45_000;
const ASSISTANT_POLL_OPTIONS = {
  maxAttempts: 30,
  intervalMs: 2000,
  requestTimeoutMs: 20_000,
};

const WEB_MODES: { id: WebMode; labelKey: string; placeholderKey: string; icon: LucideIcon }[] = [
  { id: "parenting", labelKey: "ai.mode_parenting", placeholderKey: "ai.web_placeholder_parenting", icon: Heart },
  { id: "teach", labelKey: "ai.mode_teach", placeholderKey: "ai.web_placeholder_teach", icon: GraduationCap },
  { id: "practice", labelKey: "ai.mode_practice", placeholderKey: "ai.web_placeholder_practice", icon: CheckSquare },
  { id: "quiz", labelKey: "ai.mode_quiz", placeholderKey: "ai.web_placeholder_quiz", icon: Lightbulb },
  { id: "doubt", labelKey: "ai.mode_doubt", placeholderKey: "ai.web_placeholder_doubt", icon: HelpCircle },
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
  const sendAbortRef = useRef<AbortController | null>(null);
  /** Ask Amy Phase 2 — companionship chrome only. APIs/quotas untouched.
   * Portfolio P0-5: when living ON, companion chrome is the default face
   * (modes/Zap theatre off) even without ?companion=1. */
  const companionMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    if (new URLSearchParams(window.location.search).get("companion") === "1") {
      return true;
    }
    return isAskAmyLivingV1Enabled();
  }, []);

  useEffect(() => {
    return () => {
      sendAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setInput(q);
  }, []);

  useEffect(() => {
    if (companionMode) {
      setHistoryLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await authFetch("/api/ai/messages");
        if (!r.ok) return;
        const data = (await parseApiJson<{ messages?: Array<{ role: string; content: string }> }>(r));
        if (cancelled) return;
        const past: Message[] = (data.messages ?? [])
          .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        if (past.length > 0) setMessages(past);
      } catch {
        // non-fatal
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companionMode]);

  const { data: childrenData } = useQuery<
    Array<{ id?: number; name?: string; age?: number | null; ageMonths?: number | null }>
  >({
    queryKey: ["children-for-assistant"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      if (!r.ok) return [];
      return parseApiJson<Array<{ id?: number; name?: string; age?: number | null; ageMonths?: number | null }>>(r);
    },
    staleTime: 60_000,
  });
  const primaryChild = Array.isArray(childrenData) && childrenData.length > 0 ? childrenData[0] : null;
  const primaryChildTotalMonths = primaryChild ? childTotalMonths(primaryChild) : null;
  const isInfantAmyContext =
    FF_INFANT_PREMIUM &&
    primaryChildTotalMonths !== null &&
    primaryChildTotalMonths < 24;

  const dailyLimit = isInfantAmyContext
    ? (entitlements?.limits.infantAiQueriesPerDay ?? 3)
    : (entitlements?.limits.aiQueriesPerDay ?? 10);
  const remainingRaw = isInfantAmyContext
    ? entitlements?.usage.infantAiQueriesRemaining
    : entitlements?.usage.aiQueriesRemaining;
  const remaining = isPremium ? Infinity : Math.max(0, remainingRaw ?? dailyLimit);
  const limitReached = !isPremium && remaining <= 0;

  interface DailyBriefing {
    greeting?: string;
    wins?: string[];
    risks?: string[];
    suggestedQuestions?: string[];
    healthScore?: number;
    healthTrend?: string;
    continuationLine?: string;
  }

  const { data: dailyBriefing } = useQuery<DailyBriefing>({
    queryKey: ["amy-daily-briefing"],
    queryFn: async () => {
      const r = await authFetch("/api/amy/daily-briefing");
      if (!r.ok) return {};
      return parseApiJson<DailyBriefing>(r);
    },
    staleTime: 300_000,
    enabled: !companionMode,
  });

  const sendMessage = useCallback(async (question?: string) => {
    const text = (question ?? input).trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    sendAbortRef.current?.abort();
    const controller = new AbortController();
    sendAbortRef.current = controller;

    try {
      const { default: i18nInstance } = await import("@/i18n");
      const history = [...messages.slice(-5), { role: "user" as const, content: text }].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await authFetch(
        "/api/ai/assistant-ai",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            question: text,
            language: i18nInstance.language || "en",
            history,
            childId: primaryChild?.id ?? undefined,
            childName: primaryChild?.name ?? undefined,
            childAge: typeof primaryChild?.age === "number" ? primaryChild.age : undefined,
            childAgeMonths:
              primaryChildTotalMonths !== null ? primaryChildTotalMonths : undefined,
          }),
        },
        ASSISTANT_AI_TIMEOUT_MS,
      );
      if (res.status === 402) {
        // P0-7 D3 — soft-continue message only. Quotas unchanged (D4).
        // No auto-paywall, no Upgrade/Zap theatre on hard-day Ask Amy.
        refreshSubscription();
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: t(
              isInfantAmyContext
                ? "ai.infant_system_limit_message"
                : "ai.system_limit_message",
              askAmySoftContinueMessage(isInfantAmyContext),
            ),
          },
        ]);
        return;
      }
      if (!res.ok) throw new Error(`api_error_${res.status}`);
      const data = await readResolvedApiJson<unknown>(res, authFetch, {
        poll: { ...ASSISTANT_POLL_OPTIONS, signal: controller.signal },
      });
      const answer = readAssistantAnswer(data);
      if (!answer) throw new Error("empty_answer");
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
      window.dispatchEvent(new CustomEvent("amynest:refresh-subscription"));
    } catch (err) {
      if (controller.signal.aborted) return;
      toast({ title: t("ai.error_response"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [
    authFetch,
    input,
    isInfantAmyContext,
    loading,
    messages,
    primaryChild?.age,
    primaryChild?.name,
    primaryChildTotalMonths,
    refreshSubscription,
    t,
    toast,
  ]);

  const clearChat = async () => {
    setMessages([]);
    setInput("");
    toast({ title: t("ai.conversation_cleared"), duration: 2000 });
    try {
      await authFetch("/api/ai/messages", { method: "DELETE" });
    } catch {
      // non-fatal
    }
  };

  const historyPending = !historyLoaded;
  const isEmpty = historyLoaded && messages.length === 0;
  const tabTopics = TAB_TOPICS[mode] ?? [];

  const threadMessages = useMemo((): ThreadMessage[] => {
    const items: ThreadMessage[] = [];

    if (historyPending) {
      items.push({
        kind: "system",
        id: "history-loading",
        content: (
          <div className="flex justify-center py-10" role="status" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ),
      });
      return items;
    }

    if (limitReached) {
      // P0-7 D3 + D6 — soft-continue message only (PREMIUM_VOICE), living flag irrelevant.
      items.push({
        kind: "system",
        id: "limit",
        content: (
          <div
            className="flex justify-center px-1"
            data-testid="ask-amy-soft-continue"
            role="status"
            aria-live="polite"
          >
            <div className="w-full max-w-md rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-center text-sm text-foreground space-y-2">
              <p>
                {t(
                  isInfantAmyContext
                    ? "ai.infant_system_limit_message"
                    : "ai.system_limit_message",
                  askAmySoftContinueMessage(isInfantAmyContext),
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("ask_amy.soft_continue.hint", {
                  defaultValue: "You can leave whenever you need — no pressure.",
                })}
              </p>
            </div>
          </div>
        ),
      });
    }

    if (isEmpty) {
      if (dailyBriefing?.greeting) {
        items.push({
          kind: "system",
          id: "briefing",
          content: (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">{dailyBriefing.greeting}</p>
                </div>
                {dailyBriefing.continuationLine ? (
                  <p className="border-l-2 border-primary/40 pl-2 text-xs italic text-primary/90">
                    {dailyBriefing.continuationLine}
                  </p>
                ) : null}
                {dailyBriefing.suggestedQuestions && dailyBriefing.suggestedQuestions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {dailyBriefing.suggestedQuestions.slice(0, 3).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => void sendMessage(q)}
                        disabled={limitReached}
                        className="rounded-full border border-primary/30 bg-background px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 disabled:opacity-40"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ),
        });
      } else {
        items.push({
          kind: "system",
          id: "empty",
          content: (
            <p className="text-center text-sm text-muted-foreground">
              {companionMode
                ? t("ask_amy.companion.empty", {
                    defaultValue: "I'm here. Ask one calm question when you're ready.",
                  })
                : t("ai.empty_short")}
            </p>
          ),
        });
      }

      // Companionship soft-enter — no topic/mode mall as first impression.
      if (!companionMode && tabTopics.length > 0) {
        items.push({
          kind: "interactive",
          id: "topic-grid",
          interaction: {
            type: "topic-grid",
            topics: tabTopics.map((key) => ({ id: key, label: t(key) })),
          },
          state: { status: "pending" },
        });
      }
      return items;
    }

    messages.forEach((msg, i) => {
      if (msg.role === "system") {
        items.push({
          kind: "system",
          id: `system-${i}`,
          content: (
            <div className="flex justify-center">
              <div className="max-w-[90%] rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-2.5 text-center text-sm text-muted-foreground">
                {msg.content}
              </div>
            </div>
          ),
        });
        return;
      }
      if (msg.role === "user") {
        items.push({
          kind: "user",
          id: `user-${i}`,
          text: msg.content,
          askAgain: !loading && !limitReached
            ? { label: t("ai.ask_again"), onAskAgain: () => void sendMessage(msg.content) }
            : undefined,
        });
        return;
      }
      items.push({
        kind: "amy",
        id: `assistant-msg-${i}`,
        text: msg.content,
        disclaimer: t("ai.disclaimer"),
      });
    });

    return items;
  }, [
    companionMode,
    dailyBriefing,
    historyPending,
    isEmpty,
    limitReached,
    loading,
    messages,
    sendMessage,
    tabTopics,
    t,
  ]);

  if (companionMode) {
    return (
      <AmyAiConversationWorkspace
        primaryChild={primaryChild}
        primaryChildTotalMonths={primaryChildTotalMonths}
        isInfantAmyContext={isInfantAmyContext}
        limitReached={limitReached}
        refreshSubscription={refreshSubscription}
      />
    );
  }

  return (
    <div
      className="assistant-chat-page relative mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col bg-background"
      data-aa-companion={companionMode ? "1" : undefined}
    >
      <ChatThread
        surface="assistant"
        testId="assistant-chat-thread"
        messages={threadMessages}
        draft={input}
        onDraftChange={setInput}
        onSend={() => void sendMessage()}
        onInteraction={(event) => {
          if (event.type === "topic-grid" && event.optionValue) {
            setInput(event.optionValue);
            textareaRef.current?.focus();
            void sendMessage(event.optionValue);
          }
        }}
        loading={loading}
        composerDisabled={limitReached || historyPending}
        composerPlaceholder={
          limitReached
            ? t("ai.input_limit_placeholder", ASK_AMY_SOFT_CONTINUE.inputPlaceholder)
            : companionMode
              ? t("ask_amy.companion.placeholder", {
                  defaultValue: "Tell Amy what's on your mind…",
                })
              : t(WEB_MODES.find((m) => m.id === mode)!.placeholderKey)
        }
        scrollDeps={[messages, loading, historyLoaded, mode, input]}
        scrollToLatestLabel={t("ai.scroll_latest", { defaultValue: "Latest" })}
        className="min-h-0 flex-1 bg-background"
        messagesClassName="max-w-3xl space-y-3"
        footerClassName="border-t border-border/50 bg-background px-0 py-3"
        textareaRef={textareaRef}
        header={(
          <header className="assistant-chat-header">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <AmyIcon size={28} ring />
                <h1 className="truncate font-quicksand text-lg font-bold text-foreground">
                  {companionMode
                    ? t("ask_amy.companion.title", {
                        defaultValue: "Amy is here",
                      })
                    : t("ai.page_title")}
                </h1>
              </div>
              {!isEmpty ? (
                <Button variant="ghost" size="sm" onClick={clearChat} className="h-8 shrink-0 rounded-full px-2 text-muted-foreground">
                  <RefreshCw className="h-4 w-4" />
                  <span className="sr-only">
                    {companionMode
                      ? t("ask_amy.companion.clear", {
                          defaultValue: "Start a fresh quiet talk",
                        })
                      : t("ai.clear_chat")}
                  </span>
                </Button>
              ) : null}
            </div>
            {!companionMode ? (
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
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("ask_amy.companion.subtitle", {
                  defaultValue: "I'm with you — one calm conversation, no pressure.",
                })}
              </p>
            )}
          </header>
        )}
      />
      {companionMode || limitReached ? (
        <div className="mx-auto w-full max-w-3xl px-4 pb-6">
          <AmyNestLeaveContinuity />
        </div>
      ) : null}
    </div>
  );
}
