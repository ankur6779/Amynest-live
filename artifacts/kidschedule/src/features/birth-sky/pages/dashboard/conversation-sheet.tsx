/**
 * Birth Sky AI conversation shell (Pack 6 §1.3 / §10).
 * No dashboard redesign — overlay sheet only.
 */

import { useEffect, useId, useRef } from "react";
import type {
  BirthSkyConversation,
  BirthSkyMessage,
  ConversationMachineState,
} from "../../domain/models/conversation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  reducedMotion: boolean;
  offline: boolean;
  state: ConversationMachineState;
  conversations: BirthSkyConversation[];
  activeConversationId: string | null;
  messages: BirthSkyMessage[];
  streamingText: string;
  errorMessage: string | null;
  composer: string;
  onComposerChange: (v: string) => void;
  onSend: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
};

export function BirthSkyConversationSheet({
  open,
  reducedMotion,
  offline,
  state,
  conversations,
  activeConversationId,
  messages,
  streamingText,
  errorMessage,
  composer,
  onComposerChange,
  onSend,
  onRetry,
  onCancel,
  onClose,
  onSelectConversation,
  onNewConversation,
}: Props) {
  const titleId = useId();
  const liveRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [open, messages, streamingText, state]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const writing = state === "creating" || state === "streaming";
  const showStream = state === "streaming" && streamingText.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center"
      data-testid="birth-sky-ai-sheet"
    >
      <div
        className={cn(
          "flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/12 bg-[hsl(220_28%_12%)] shadow-xl",
          !reducedMotion && "animate-in fade-in duration-200",
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-[hsl(40_20%_96%)]">
              Ask Amy
            </h2>
            <p className="text-xs text-[hsl(40_20%_96%/0.55)]">
              Parent-only · reflective · not a prediction
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 rounded-xl"
            onClick={onClose}
            data-testid="birth-sky-ai-close"
          >
            Close
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 sm:flex-row">
          <aside
            className="max-h-28 shrink-0 overflow-y-auto sm:max-h-none sm:w-36"
            aria-label="Conversation list"
          >
            <Button
              type="button"
              variant="secondary"
              className="mb-2 min-h-10 w-full rounded-lg text-xs"
              onClick={onNewConversation}
              data-testid="birth-sky-ai-new"
            >
              New chat
            </Button>
            {conversations.length === 0 ? (
              <p className="text-xs text-[hsl(40_20%_96%/0.5)]" data-testid="birth-sky-ai-list-empty">
                No past chats yet
              </p>
            ) : (
              <ul className="space-y-1">
                {conversations.map((c) => (
                  <li key={c.conversationId}>
                    <button
                      type="button"
                      className={cn(
                        "w-full rounded-lg px-2 py-2 text-left text-xs",
                        activeConversationId === c.conversationId
                          ? "bg-white/12"
                          : "bg-white/[0.03]",
                      )}
                      onClick={() => onSelectConversation(c.conversationId)}
                      data-testid={`birth-sky-ai-conv-${c.conversationId}`}
                    >
                      {new Date(c.createdAt).toLocaleDateString()}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <div className="flex min-h-[16rem] min-w-0 flex-1 flex-col">
            <div
              ref={listRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-white/8 bg-black/20 p-3"
              role="log"
              aria-relevant="additions"
              data-testid="birth-sky-ai-messages"
            >
              {messages.length === 0 && !writing && !errorMessage ? (
                <p
                  className="text-sm text-[hsl(40_20%_96%/0.65)]"
                  data-testid="birth-sky-ai-empty"
                >
                  Ask a gentle question about this birth sky. Amy stays reflective — never
                  predictive.
                </p>
              ) : null}

              {messages.map((m) => (
                <div
                  key={m.messageId}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "ml-6 bg-white/10"
                      : "mr-4 bg-[hsl(200_30%_20%/0.55)]",
                  )}
                  data-testid={`birth-sky-ai-msg-${m.messageId}`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(40_20%_96%/0.45)]">
                    {m.role === "user" ? "You" : "Amy"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[hsl(40_20%_96%/0.9)]">{m.body}</p>
                </div>
              ))}

              {showStream ? (
                <div className="mr-4 rounded-xl bg-[hsl(200_30%_20%/0.55)] px-3 py-2 text-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(40_20%_96%/0.45)]">
                    Amy
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{streamingText}</p>
                </div>
              ) : null}

              {writing && !showStream ? (
                <p
                  className={cn(
                    "text-sm text-[hsl(40_20%_96%/0.65)]",
                    !reducedMotion && "animate-pulse",
                  )}
                  data-testid="birth-sky-ai-typing"
                >
                  Amy is writing…
                </p>
              ) : null}

              {state === "failed" || errorMessage ? (
                <div
                  role="alert"
                  className="space-y-2 rounded-xl border border-red-400/30 px-3 py-2 text-sm"
                  data-testid="birth-sky-ai-error"
                >
                  <p>{errorMessage ?? "Something went wrong. You can try again."}</p>
                  <Button
                    type="button"
                    className="min-h-10 rounded-xl"
                    onClick={onRetry}
                    data-testid="birth-sky-ai-retry"
                  >
                    Retry
                  </Button>
                </div>
              ) : null}

              {offline ? (
                <p
                  role="status"
                  className="text-sm text-[hsl(40_20%_96%/0.7)]"
                  data-testid="birth-sky-ai-offline"
                >
                  You’re offline. Past messages stay readable; new Ask Amy needs a connection.
                </p>
              ) : null}
            </div>

            <div
              ref={liveRef}
              className="sr-only"
              aria-live="polite"
              aria-atomic="true"
              data-testid="birth-sky-ai-live"
            >
              {state === "completed"
                ? "Message from Amy"
                : writing
                  ? "Amy is writing"
                  : state === "moderated"
                    ? "Safe reply from Amy"
                    : ""}
            </div>

            <div className="mt-3 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]">
                Your question
                <textarea
                  ref={inputRef}
                  className="mt-2 min-h-20 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm text-[hsl(40_20%_96%)]"
                  value={composer}
                  onChange={(e) => onComposerChange(e.target.value)}
                  disabled={writing || offline}
                  maxLength={2000}
                  data-testid="birth-sky-ai-composer"
                />
              </label>
              <div className="flex gap-2">
                {writing ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11 flex-1 rounded-xl"
                    onClick={onCancel}
                    data-testid="birth-sky-ai-cancel"
                  >
                    Cancel
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="min-h-11 flex-1 rounded-xl"
                    disabled={offline || composer.trim().length === 0}
                    onClick={onSend}
                    data-testid="birth-sky-ai-send"
                  >
                    Send
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
