import { useMemo } from "react";
import { resolveActiveChatPromptId } from "@/lib/chat-platform";
import { AmyMessageBubble, AmyTypingBubble } from "./bubbles/amy-message-bubble";
import { InteractiveMessageBubble } from "./bubbles/interactive-message-bubble";
import { UserMessageBubble } from "./bubbles/user-message-bubble";
import type { InteractionEvent, ThreadMessage, ThreadTheme } from "./types";

export function MessageTimeline({
  messages,
  theme = "app",
  draft,
  showDraft = true,
  loading = false,
  activePromptId,
  onInteraction,
}: {
  messages: ThreadMessage[];
  theme?: ThreadTheme;
  draft?: string;
  showDraft?: boolean;
  loading?: boolean;
  activePromptId?: string | null;
  onInteraction?: (event: InteractionEvent) => void;
}) {
  const resolvedPromptId = useMemo(() => {
    if (activePromptId != null) return activePromptId;
    return resolveActiveChatPromptId(
      messages.flatMap((m) => {
        if (m.kind === "amy" || m.kind === "amy-rich") return [{ id: m.id, role: "amy" }];
        if (m.kind === "interactive" && m.state.status === "pending") {
          return [{ id: m.id, role: "amy" }];
        }
        return [];
      }),
      { awaitingAnswer: !loading },
    );
  }, [activePromptId, loading, messages]);

  return (
    <>
      {messages.map((message) => {
        if (message.kind === "amy") {
          return (
            <AmyMessageBubble
              key={message.id}
              text={message.text}
              theme={theme}
              disclaimer={message.disclaimer}
              badge={message.badge}
              promptId={message.id === resolvedPromptId ? message.id : undefined}
            />
          );
        }
        if (message.kind === "amy-rich") {
          return (
            <AmyMessageBubble
              key={message.id}
              text={message.text}
              theme={theme}
              badge={message.badge}
              onListen={message.onListen}
              onPrimeListen={message.onPrimeListen}
              highlight={message.highlight}
              promptId={message.id === resolvedPromptId ? message.id : undefined}
            />
          );
        }
        if (message.kind === "user") {
          return (
            <UserMessageBubble
              key={message.id}
              text={message.text}
              theme={theme}
              askAgain={
                message.askAgain
                  ? { label: message.askAgain.label, onAskAgain: message.askAgain.onAskAgain }
                  : undefined
              }
            />
          );
        }
        if (message.kind === "interactive") {
          return (
            <InteractiveMessageBubble
              key={message.id}
              messageId={message.id}
              amyText={message.amyText}
              interaction={message.interaction}
              state={message.state}
              theme={message.theme ?? theme}
              promptId={
                message.state.status === "pending" && message.id === resolvedPromptId
                  ? message.id
                  : undefined
              }
              onInteraction={onInteraction ?? (() => undefined)}
            />
          );
        }
        if (message.kind === "system") {
          return (
            <div key={message.id} className="system-message">
              {message.content}
            </div>
          );
        }
        if (message.kind === "typing") {
          return <AmyTypingBubble key={message.id ?? "typing"} theme={theme} />;
        }
        return null;
      })}
      {showDraft && draft && draft.trim().length > 0 ? (
        <UserMessageBubble text={draft} theme={theme} pending />
      ) : null}
      {loading ? <AmyTypingBubble theme={theme} /> : null}
    </>
  );
}
