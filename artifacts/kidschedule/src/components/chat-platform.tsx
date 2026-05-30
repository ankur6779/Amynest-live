import type { CSSProperties, MutableRefObject, ReactNode, UIEvent } from "react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useKeyboardChatLayout, type ChatLayoutMode } from "@/hooks/use-keyboard-chat-layout";
import { cn } from "@/lib/utils";

export type ChatPlatformSurface =
  | "onboarding"
  | "assistant"
  | "amy-ai-tutor"
  | "amy-learning-tutor"
  | "speech-coach"
  | "amy-coach";

export interface ChatPlatformProps {
  /** Telemetry + dev-guard identifier for this conversational surface. */
  surface: ChatPlatformSurface;
  header: ReactNode;
  footer: ReactNode | null;
  children: ReactNode;
  scrollDeps: unknown[];
  activePromptId?: string | null;
  layout?: ChatLayoutMode;
  className?: string;
  style?: CSSProperties;
  messagesClassName?: string;
  footerClassName?: string;
  onMessagesScroll?: (event: UIEvent<HTMLDivElement>) => void;
  scrollApiRef?: MutableRefObject<{ scrollToEnd: (behavior?: ScrollBehavior) => void } | null>;
}

/**
 * Single shared chat layout platform — all conversational surfaces must use this
 * instead of custom keyboard/viewport handling.
 */
export function ChatPlatform({
  surface,
  header,
  footer,
  children,
  scrollDeps,
  activePromptId = null,
  layout = "fullscreen",
  className,
  style,
  messagesClassName,
  footerClassName,
  onMessagesScroll,
  scrollApiRef,
}: ChatPlatformProps) {
  const [location] = useLocation();

  const {
    containerRef,
    messagesWrapperRef,
    messagesRef,
    inputBarRef,
    endRef,
    inputBarHeight,
    keyboardOpen,
    containerStyle,
    scrollToEnd,
  } = useKeyboardChatLayout(scrollDeps, {
    layout,
    activePromptId,
    surface,
    route: location,
  });

  useEffect(() => {
    if (!scrollApiRef) return;
    scrollApiRef.current = { scrollToEnd };
    return () => {
      scrollApiRef.current = null;
    };
  }, [scrollApiRef, scrollToEnd]);

  return (
    <div
      ref={containerRef}
      data-chat-platform={surface}
      className={cn(
        "chat-thread-page flex w-full flex-col overflow-hidden",
        layout === "embedded" && "min-h-0 flex-1",
        keyboardOpen && "chat-thread-page--keyboard-open",
        className,
      )}
      style={{ ...containerStyle, ...style }}
    >
      <div className="chat-thread-header shrink-0">{header}</div>

      <div ref={messagesWrapperRef} className="chat-thread-messages-wrapper min-h-0 flex-1">
        <div
          ref={messagesRef}
          onScroll={onMessagesScroll}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Conversation"
          className={cn(
            "chat-thread-messages mx-auto flex w-full flex-col gap-3 overflow-y-auto px-4 py-5",
            messagesClassName,
          )}
          style={{ paddingBottom: Math.max(inputBarHeight, 16) + 12 }}
        >
          {children}
          <div ref={endRef} aria-hidden="true" />
        </div>
      </div>

      {footer ? (
        <div
          ref={inputBarRef}
          className={cn(
            "chat-thread-input mx-auto w-full shrink-0 px-4 pt-4 pb-[calc(1rem+var(--sab,env(safe-area-inset-bottom,0px)))]",
            footerClassName,
          )}
        >
          {footer}
        </div>
      ) : (
        <div ref={inputBarRef} className="h-0 overflow-hidden" aria-hidden="true" />
      )}
    </div>
  );
}

/** @deprecated Use ChatPlatform */
export const ChatThreadShell = ChatPlatform;

/** @deprecated Use ChatPlatform */
export const OnboardingChatShell = ChatPlatform;
