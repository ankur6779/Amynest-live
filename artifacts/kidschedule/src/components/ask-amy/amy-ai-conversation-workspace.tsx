import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Menu, Plus } from "lucide-react";
import { ChatThread, type ThreadMessage } from "@/components/chat-thread";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { AmyAIIcon } from "@/components/ask-amy/amy-ai-icon";
import { AmyAiHistoryPanel } from "@/components/ask-amy/amy-ai-history-panel";
import { useAppNavigate } from "@/components/app-link";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useUser } from "@/lib/firebase-auth-hooks";
import { parseApiJson } from "@/lib/safe-json-response";
import {
  hasAsyncJobId,
  parseResponseJson,
  readAssistantAnswer,
  resolveAiApiData,
} from "@/lib/poll-result";
import { logClientError } from "@/lib/log-client-error";
import { ASK_AMY_SOFT_CONTINUE, askAmySoftContinueMessage } from "@/lib/hard-day-monetization";
import { AmyAiQuotaHint } from "@/components/ask-amy/amy-ai-quota-hint";
import {
  AMY_AI_SLOW_MS,
  finishAmyAiLatency,
  markAmyAiLatency,
  startAmyAiLatency,
} from "@/lib/ask-amy/amy-ai-latency";
import {
  appendMessage,
  deleteConversation,
  emptyConversation,
  listHistoryConversations,
  loadSessionStore,
  prepareAmyAiSessionForUser,
  renameConversation,
  saveSessionStore,
  seedFromServerHistory,
  upsertConversation,
  type AmyAiConversation,
  type AmyAiSessionStore,
} from "@/lib/ask-amy/conversation-sessions";
import { NEW_CHAT_TITLE } from "@/lib/ask-amy/conversation-title";
import "@/components/ask-amy/amy-ai-workspace.css";

const ASSISTANT_AI_TIMEOUT_MS = 45_000;
const ASSISTANT_POLL_OPTIONS = {
  maxAttempts: 30,
  intervalMs: 2000,
  requestTimeoutMs: 20_000,
};

const SUGGESTIONS = [
  "Help me with today's routine",
  "My child isn't sleeping well",
  "How can I help with tantrums?",
];

type Props = {
  primaryChild: {
    id?: number;
    name?: string;
    age?: number | null;
    ageMonths?: number | null;
  } | null;
  primaryChildTotalMonths: number | null;
  isInfantAmyContext: boolean;
  limitReached: boolean;
  remaining?: number;
  dailyLimit?: number;
  isPremium?: boolean;
  refreshSubscription: () => void;
  /** Open an existing local session instead of a blank new chat. */
  initialConversationId?: string | null;
};

export function AmyAiConversationWorkspace({
  primaryChild,
  primaryChildTotalMonths,
  isInfantAmyContext,
  limitReached,
  remaining = 10,
  dailyLimit = 10,
  isPremium = false,
  refreshSubscription,
  initialConversationId = null,
}: Props) {
  const authFetch = useAuthFetch();
  const { user } = useUser();
  const userId = user?.uid ?? user?.id ?? null;
  const { back } = useAppNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendAbortRef = useRef<AbortController | null>(null);
  const storeRef = useRef<AmyAiSessionStore>(loadSessionStore(userId));
  const prevUserIdRef = useRef<string | null>(userId);

  const [store, setStore] = useState<AmyAiSessionStore>(() => storeRef.current);
  const [current, setCurrent] = useState<AmyAiConversation>(() => emptyConversation());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [slowWait, setSlowWait] = useState(false);
  const [pendingRetry, setPendingRetry] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const userChanged = prevUserIdRef.current !== null && prevUserIdRef.current !== userId;
    prevUserIdRef.current = userId;

    if (userChanged) {
      const reset = prepareAmyAiSessionForUser(userId);
      storeRef.current = reset.store;
      setStore(reset.store);
      setCurrent(reset.current);
      setInput("");
      setPendingRetry(null);
      setHistoryOpen(false);
    }

    (async () => {
      const loaded = loadSessionStore(userId);
      storeRef.current = loaded;
      try {
        const r = await authFetch("/api/ai/messages");
        if (r.ok) {
          const data = await parseApiJson<{
            messages?: Array<{ role: string; content: string; createdAt?: string }>;
          }>(r);
          const seeded = seedFromServerHistory(loaded, data.messages ?? []);
          if (!cancelled) {
            storeRef.current = seeded;
            setStore(seeded);
            saveSessionStore(userId, seeded);
            if (initialConversationId) {
              const found = seeded.conversations.find((c) => c.id === initialConversationId);
              if (found) setCurrent(found);
            }
          }
          return;
        }
      } catch {
        /* non-fatal */
      }
      if (!cancelled) {
        setStore(loaded);
        if (initialConversationId) {
          const found = loaded.conversations.find((c) => c.id === initialConversationId);
          if (found) setCurrent(found);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, initialConversationId, userId]);

  useEffect(() => {
    return () => sendAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setInput(q);
  }, []);

  const persist = useCallback(
    (nextCurrent: AmyAiConversation) => {
      const merged = upsertConversation(storeRef.current, nextCurrent);
      storeRef.current = merged;
      setStore(merged);
      saveSessionStore(userId, merged);
    },
    [userId],
  );

  const focusComposerIfDesktop = useCallback(() => {
    if (!window.matchMedia("(min-width: 900px)").matches) return;
    window.setTimeout(() => textareaRef.current?.focus(), 40);
  }, []);

  const startNewChat = useCallback(() => {
    persist(current);
    setCurrent(emptyConversation());
    setInput("");
    setPendingRetry(null);
    setHistoryOpen(false);
    focusComposerIfDesktop();
  }, [current, focusComposerIfDesktop, persist]);

  const openConversation = useCallback(
    (id: string) => {
      persist(current);
      const found = storeRef.current.conversations.find((c) => c.id === id);
      if (found) setCurrent(found);
      setHistoryOpen(false);
    },
    [current, persist],
  );

  const sendMessage = useCallback(
    async (question?: string) => {
      const text = (question ?? input).trim();
      if (!text || loading || limitReached) return;

      const userTurn = appendMessage(current, { role: "user", content: text });
      setCurrent(userTurn);
      persist(userTurn);
      setInput("");
      setPendingRetry(text);
      setLoading(true);
      setSlowWait(false);
      sendAbortRef.current?.abort();
      const controller = new AbortController();
      sendAbortRef.current = controller;
      const slowTimer = window.setTimeout(() => setSlowWait(true), AMY_AI_SLOW_MS);
      const trace = startAmyAiLatency();

      try {
        const { default: i18nInstance } = await import("@/i18n");
        const history = userTurn.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-6)
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        markAmyAiLatency(trace, "fetchStart");
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
        markAmyAiLatency(trace, "fetchEnd");
        if (res.status === 402) {
          refreshSubscription();
          const limited = appendMessage(userTurn, {
            role: "system",
            content: askAmySoftContinueMessage(isInfantAmyContext),
          });
          setCurrent(limited);
          persist(limited);
          markAmyAiLatency(trace, "responseComplete");
          markAmyAiLatency(trace, "persistenceComplete");
          finishAmyAiLatency(trace, { ok: true, asyncJob: false });
          return;
        }
        if (!res.ok) throw new Error(`api_error_${res.status}`);
        const raw = await parseResponseJson(res);
        const asyncJob = hasAsyncJobId(raw);
        if (asyncJob) markAmyAiLatency(trace, "pollStart");
        const data = await resolveAiApiData<unknown>(raw, authFetch, {
          poll: { ...ASSISTANT_POLL_OPTIONS, signal: controller.signal },
        });
        markAmyAiLatency(trace, "responseComplete");
        const answer = readAssistantAnswer(data);
        if (!answer) throw new Error("empty_answer");
        const withAmy = appendMessage(userTurn, { role: "assistant", content: answer });
        setCurrent(withAmy);
        persist(withAmy);
        markAmyAiLatency(trace, "persistenceComplete");
        finishAmyAiLatency(trace, { ok: true, asyncJob });
        setPendingRetry(null);
        window.dispatchEvent(new CustomEvent("amynest:refresh-subscription"));
      } catch (err) {
        if (controller.signal.aborted) return;
        markAmyAiLatency(trace, "responseComplete");
        finishAmyAiLatency(trace, { ok: false });
        const message = err instanceof Error ? err.message : String(err);
        void logClientError({
          message,
          stack: err instanceof Error ? err.stack : undefined,
          label: "amy_ai",
          meta: { source: "assistant-ai" },
        });
        const failed = appendMessage(userTurn, {
          role: "system",
          content: "Something interrupted Amy's reply.",
        });
        setCurrent(failed);
        persist(failed);
      } finally {
        window.clearTimeout(slowTimer);
        setLoading(false);
        setSlowWait(false);
      }
    },
    [
      authFetch,
      current,
      input,
      isInfantAmyContext,
      limitReached,
      loading,
      persist,
      primaryChild?.age,
      primaryChild?.id,
      primaryChild?.name,
      primaryChildTotalMonths,
      refreshSubscription,
    ],
  );

  const historyList = listHistoryConversations(store);
  const isBlank = current.messages.length === 0 && !loading;

  const threadMessages = useMemo((): ThreadMessage[] => {
    const items: ThreadMessage[] = [];
    if (limitReached && isBlank) {
      items.push({
        kind: "system",
        id: "limit",
        content: (
          <div className="mx-auto max-w-md space-y-2 text-center text-sm text-muted-foreground">
            <p>{askAmySoftContinueMessage(isInfantAmyContext)}</p>
            <p className="text-xs">{ASK_AMY_SOFT_CONTINUE.resetHint}</p>
          </div>
        ),
      });
    }
    if (isBlank) {
      items.push({
        kind: "system",
        id: "empty",
        content: (
          <div className="amy-ai-empty" data-testid="amy-ai-empty">
            <AmyAIIcon size={40} decorative={false} />
            <h2>Hi, I&apos;m Amy.</h2>
            <p>What&apos;s on your mind?</p>
            {!limitReached ? (
              <div className="amy-ai-suggest">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => void sendMessage(s)}>
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ),
      });
      return items;
    }

    current.messages.forEach((msg, i) => {
      if (msg.role === "system") {
        items.push({
          kind: "system",
          id: msg.id,
          content: (
            <div className="mx-auto max-w-md space-y-2 text-center text-sm text-muted-foreground">
              <p>{msg.content}</p>
              {msg.content.includes("interrupted") && pendingRetry ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 rounded-full"
                    onClick={() => void sendMessage(pendingRetry)}
                  >
                    Try again
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 rounded-full"
                    onClick={() => {
                      setCurrent((prev) => ({
                        ...prev,
                        messages: prev.messages.filter((m) => m.id !== msg.id),
                      }));
                    }}
                  >
                    Back
                  </Button>
                </div>
              ) : null}
            </div>
          ),
        });
        return;
      }
      if (msg.role === "user") {
        items.push({ kind: "user", id: msg.id, text: msg.content });
        return;
      }
      items.push({
        kind: "amy",
        id: msg.id || `amy-${i}`,
        text: msg.content,
        markdown: true,
      });
    });
    return items;
  }, [current.messages, isBlank, isInfantAmyContext, limitReached, pendingRetry, sendMessage]);

  const header = (
    <header className="amy-ai-header flex flex-col gap-1">
      <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-11 w-11"
        aria-label="Back"
        onClick={() => back("amy-ai-back")}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      {!desktop ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          aria-label="Open history"
          onClick={() => setHistoryOpen(true)}
          data-testid="amy-ai-open-history"
        >
          <Menu className="h-5 w-5" />
        </Button>
      ) : null}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <AmyAIIcon size={22} />
        <div className="min-w-0">
          <p className="amy-ai-title truncate">
            {isBlank ? "Amy" : current.title === NEW_CHAT_TITLE ? "Amy" : current.title}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-11 w-11"
        aria-label="New chat"
        onClick={startNewChat}
        data-testid="amy-ai-header-new"
      >
        <Plus className="h-5 w-5" />
      </Button>
      </div>
      <AmyAiQuotaHint remaining={remaining} limit={dailyLimit} isPremium={isPremium} />
    </header>
  );

  const historyPanel = (
    <AmyAiHistoryPanel
      conversations={historyList}
      activeId={current.messages.length ? current.id : null}
      onNewChat={startNewChat}
      onSelect={openConversation}
      onDelete={(id) => {
        const next = deleteConversation(storeRef.current, id);
        storeRef.current = next;
        setStore(next);
        saveSessionStore(userId, next);
        if (current.id === id) setCurrent(emptyConversation());
      }}
      onRename={(id, title) => {
        const next = renameConversation(storeRef.current, id, title);
        storeRef.current = next;
        setStore(next);
        saveSessionStore(userId, next);
        if (current.id === id) {
          setCurrent((c) => ({ ...c, title }));
        }
      }}
      onClose={desktop ? undefined : () => setHistoryOpen(false)}
    />
  );

  const thread = (
    <ChatThread
      surface="assistant"
      layout={desktop ? "embedded" : "fullscreen"}
      testId="assistant-chat-thread"
      messages={threadMessages}
      draft={input}
      onDraftChange={setInput}
      onSend={() => void sendMessage()}
      loading={loading}
      showDraft={false}
      enterToSend
      typingStatusLabel={
        slowWait
          ? "Amy is taking a little longer because she's considering your family's context."
          : "Amy is thinking…"
      }
      composerDisabled={limitReached}
      composerPlaceholder={
        limitReached ? ASK_AMY_SOFT_CONTINUE.inputPlaceholder : "Ask Amy anything…"
      }
      scrollDeps={[current.messages, loading, input]}
      scrollToLatestLabel="Jump to latest"
      jumpToLatestClassName="amy-ai-jump"
      textareaRef={textareaRef}
      header={header}
      className="min-h-0 flex-1 bg-transparent"
      messagesClassName="max-w-3xl space-y-4 px-2"
      footerClassName="bg-transparent px-3 py-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] sm:px-4"
    />
  );

  return (
    <div
      className="amy-ai-workspace assistant-chat-page relative flex min-h-0 w-full flex-1 flex-col"
      data-aa-companion="1"
      data-testid="amy-ai-workspace"
    >
      <div className="amy-ai-shell min-h-0 flex-1">
        {desktop ? <aside className="min-h-0 overflow-hidden">{historyPanel}</aside> : null}
        {thread}
      </div>
      {!desktop ? (
        <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
          <SheetContent
            side="left"
            className="w-[86vw] max-w-sm p-0 [&>button]:hidden"
            aria-label="Conversation history"
            aria-describedby={undefined}
          >
            <SheetTitle className="sr-only">Conversation history</SheetTitle>
            <SheetDescription className="sr-only">
              Search, open, rename, or delete previous chats.
            </SheetDescription>
            {historyPanel}
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
