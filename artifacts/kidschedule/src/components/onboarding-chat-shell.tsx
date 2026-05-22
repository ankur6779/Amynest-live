import type { CSSProperties, ReactNode } from "react";
import { useKeyboardChatLayout } from "@/hooks/use-keyboard-chat-layout";

interface OnboardingChatShellProps {
  header: ReactNode;
  footer: ReactNode | null;
  children: ReactNode;
  scrollDeps: unknown[];
  className?: string;
  style?: CSSProperties;
}

export function OnboardingChatShell({
  header,
  footer,
  children,
  scrollDeps,
  className,
  style,
}: OnboardingChatShellProps) {
  const {
    containerRef,
    messagesWrapperRef,
    messagesRef,
    inputBarRef,
    endRef,
    viewportHeight,
    viewportOffsetTop,
    inputBarHeight,
  } = useKeyboardChatLayout(scrollDeps);

  return (
    <div
      ref={containerRef}
      className={`onboarding-chat-page flex w-full flex-col overflow-hidden ${className ?? ""}`}
      style={{
        position: "fixed",
        top: viewportOffsetTop,
        left: 0,
        right: 0,
        height: viewportHeight > 0 ? `${viewportHeight}px` : "var(--vv-height, 100%)",
        maxHeight: viewportHeight > 0 ? `${viewportHeight}px` : "var(--vv-height, 100%)",
        ...style,
      }}
    >
      <div className="onboarding-chat-header shrink-0">{header}</div>

      <div ref={messagesWrapperRef} className="onboarding-chat-messages-wrapper min-h-0 flex-1">
        <div
          ref={messagesRef}
          className="onboarding-chat-messages mx-auto flex w-full max-w-lg flex-col gap-3 overflow-y-auto px-4 py-5"
          style={{ paddingBottom: Math.max(inputBarHeight, 16) + 12 }}
        >
          {children}
          <div ref={endRef} aria-hidden="true" />
        </div>
      </div>

      {footer ? (
        <div
          ref={inputBarRef}
          className="onboarding-chat-input mx-auto w-full max-w-lg shrink-0 px-4 py-4"
        >
          {footer}
        </div>
      ) : (
        <div ref={inputBarRef} className="h-0 overflow-hidden" aria-hidden="true" />
      )}
    </div>
  );
}
