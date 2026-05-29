import type { CSSProperties, MutableRefObject, ReactNode, UIEvent } from "react";
import { useEffect } from "react";
import { useKeyboardChatLayout, type ChatLayoutMode } from "@/hooks/use-keyboard-chat-layout";
import { cn } from "@/lib/utils";

interface ChatThreadShellProps {
  header: ReactNode;
  footer: ReactNode | null;
  children: ReactNode;
  scrollDeps: unknown[];
  layout?: ChatLayoutMode;
  className?: string;
  style?: CSSProperties;
  messagesClassName?: string;
  footerClassName?: string;
  onMessagesScroll?: (event: UIEvent<HTMLDivElement>) => void;
  scrollApiRef?: MutableRefObject<{ scrollToEnd: (behavior?: ScrollBehavior) => void } | null>;
}

export function ChatThreadShell({
  header,
  footer,
  children,
  scrollDeps,
  layout = "fullscreen",
  className,
  style,
  messagesClassName,
  footerClassName,
  onMessagesScroll,
  scrollApiRef,
}: ChatThreadShellProps) {
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
  } = useKeyboardChatLayout(scrollDeps, { layout });

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

/** @deprecated Use ChatThreadShell */
export const OnboardingChatShell = ChatThreadShell;
