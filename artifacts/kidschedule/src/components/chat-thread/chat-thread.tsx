import { useMemo, useRef, useState } from "react";
import { ChatPlatform } from "@/components/chat-platform";
import { Button } from "@/components/ui/button";
import { MessageTimeline } from "./message-timeline";
import { PersistentComposer } from "./persistent-composer";
import type { ChatThreadProps } from "./types";

export function ChatThread({
  surface,
  theme = "app",
  messages,
  draft,
  onDraftChange,
  onSend,
  onInteraction,
  header,
  composerPlaceholder,
  composerDisabled = false,
  composerHidden = false,
  sendDisabled = false,
  loading = false,
  className,
  style,
  messagesClassName,
  footerClassName,
  footerExtra,
  scrollDeps,
  onMessagesScroll,
  scrollToLatestLabel = "Latest",
  showScrollLatest: showScrollLatestProp,
  onScrollLatest,
  textareaRef: textareaRefProp,
  layout = surface === "onboarding" ? "fullscreen" : "embedded",
  testId,
}: ChatThreadProps) {
  const scrollApiRef = useRef<{ scrollToEnd: (behavior?: ScrollBehavior) => void } | null>(null);
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = textareaRefProp ?? internalTextareaRef;
  const [showScrollLatestInternal, setShowScrollLatestInternal] = useState(false);

  const deps = scrollDeps ?? [messages, draft, loading];

  const activePromptId = useMemo(() => {
    if (loading) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.kind === "amy" || msg.kind === "amy-rich") return msg.id;
      if (msg.kind === "interactive" && msg.state.status === "pending") return msg.id;
    }
    return null;
  }, [loading, messages]);

  const handleThreadScroll = (event: React.UIEvent<HTMLDivElement>) => {
    onMessagesScroll?.(event);
    const thread = event.currentTarget;
    const distanceFromBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight;
    setShowScrollLatestInternal(distanceFromBottom > 160);
  };

  const showScrollLatest = showScrollLatestProp ?? showScrollLatestInternal;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col" data-testid={testId}>
      <ChatPlatform
        surface={surface}
        layout={layout}
        scrollDeps={deps}
        activePromptId={activePromptId}
        scrollApiRef={scrollApiRef}
        onMessagesScroll={handleThreadScroll}
        className={className}
        style={style}
        messagesClassName={messagesClassName}
        footerClassName={footerClassName}
        header={header ?? null}
        footer={
          <PersistentComposer
            draft={draft}
            onDraftChange={onDraftChange}
            onSend={onSend}
            placeholder={composerPlaceholder}
            disabled={composerDisabled}
            sendDisabled={sendDisabled || loading}
            hidden={composerHidden}
            textareaRef={textareaRef}
            onKeyDown={handleKeyDown}
            footerExtra={footerExtra}
          />
        }
      >
        <MessageTimeline
          messages={messages}
          theme={theme}
          draft={draft}
          loading={loading}
          activePromptId={activePromptId}
          onInteraction={onInteraction}
        />
      </ChatPlatform>

      {showScrollLatest ? (
        <Button
          type="button"
          size="sm"
          onClick={() => {
            onScrollLatest?.();
            scrollApiRef.current?.scrollToEnd("smooth");
          }}
          className="absolute bottom-36 right-4 z-40 rounded-full shadow-lg"
        >
          {scrollToLatestLabel}
        </Button>
      ) : null}
    </div>
  );
}

export type { ChatThreadProps, InteractionEvent, ThreadMessage, ThreadTheme } from "./types";
export { createThreadMessageId } from "./types";
