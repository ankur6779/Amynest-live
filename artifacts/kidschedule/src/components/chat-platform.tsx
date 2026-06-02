import type { CSSProperties, MutableRefObject, ReactNode, UIEvent } from "react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useKeyboardChatLayout, type ChatLayoutMode } from "@/hooks/use-keyboard-chat-layout";
import { cn } from "@/lib/utils";

/**
 * TEMPORARY on-device keyboard-layout debug overlay.
 * Enable with `localStorage.setItem("amynest:chat-debug","1")` or `?chatDebug=1`.
 * Lives inside chat-platform.tsx (the single layout owner) so it can read the raw
 * viewport metrics. Remove before final release.
 */
function useChatDebugFlag(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("amynest:chat-debug") === "1";
      const query = new URLSearchParams(window.location.search).get("chatDebug") === "1";
      setOn(stored || query);
    } catch {
      /* storage may be unavailable */
    }
  }, []);
  return on;
}

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
    viewportHeight,
    keyboardInset,
    containerStyle,
    scrollToEnd,
  } = useKeyboardChatLayout(scrollDeps, {
    layout,
    activePromptId,
    surface,
    route: location,
  });

  const debugEnabled = useChatDebugFlag();

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
      {debugEnabled ? (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 4,
            left: 4,
            zIndex: 9999,
            pointerEvents: "none",
            background: "rgba(0,0,0,0.78)",
            color: "#4ade80",
            font: "10px/1.35 ui-monospace, monospace",
            padding: "4px 6px",
            borderRadius: 4,
            whiteSpace: "pre",
          }}
        >
          {[
            `surface: ${surface}`,
            `kbOpen: ${keyboardOpen}`,
            `inset: ${Math.round(keyboardInset)}`,
            `vpH: ${Math.round(viewportHeight)}`,
            `innerH: ${typeof window !== "undefined" ? window.innerHeight : 0}`,
            `vvH: ${
              typeof window !== "undefined" && window.visualViewport
                ? Math.round(window.visualViewport.height)
                : "n/a"
            }`,
            `barH: ${Math.round(inputBarHeight)}`,
          ].join("\n")}
        </div>
      ) : null}

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
