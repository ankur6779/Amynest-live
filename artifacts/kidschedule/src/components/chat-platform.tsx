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
    if (!import.meta.env.DEV) return;
    try {
      const w = window as unknown as { __amynestChatDebug?: boolean };
      const query = new URLSearchParams(window.location.search).get("chatDebug") === "1";
      const hash = window.location.hash.includes("chatDebug");
      if (query || hash) {
        localStorage.setItem("amynest:chat-debug", "1");
      }
      const stored = localStorage.getItem("amynest:chat-debug") === "1";
      setOn(stored || query || hash || w.__amynestChatDebug === true);
    } catch {
      /* storage may be unavailable */
    }
  }, []);
  return on;
}

function rectLine(el: HTMLElement | null): string {
  if (!el) return "null";
  const r = el.getBoundingClientRect();
  return `t${Math.round(r.top)} b${Math.round(r.bottom)} h${Math.round(r.height)} w${Math.round(r.width)}`;
}

/**
 * Walk ancestors to find the element that establishes the containing block for
 * `position: fixed` descendants (transform / filter / perspective / will-change
 * / contain). If one exists, our fixed chat overlay is positioned & clipped
 * relative to it — NOT the viewport — which is a classic "fixed off-screen / get
 * clipped" cause.
 */
function findFixedContainingBlock(el: HTMLElement | null): string {
  let node = el?.parentElement ?? null;
  while (node && node !== document.documentElement) {
    const cs = getComputedStyle(node);
    const reasons: string[] = [];
    if (cs.transform && cs.transform !== "none") reasons.push("transform");
    if (cs.filter && cs.filter !== "none") reasons.push("filter");
    if (cs.perspective && cs.perspective !== "none") reasons.push("perspective");
    if (cs.willChange && /transform|perspective|filter/.test(cs.willChange))
      reasons.push("will-change");
    if (cs.contain && /paint|layout|strict|content/.test(cs.contain))
      reasons.push(`contain:${cs.contain}`);
    if (reasons.length) {
      const cls = (node.className?.toString() || "").trim().split(/\s+/)[0] || "";
      return `${node.tagName.toLowerCase()}${cls ? "." + cls : ""} [${reasons.join(",")}] ovf=${cs.overflow}`;
    }
    node = node.parentElement;
  }
  return "viewport (none)";
}

function describeActiveElement(): string {
  const ae = document.activeElement as HTMLElement | null;
  if (!ae) return "null";
  const testid = ae.getAttribute?.("data-testid");
  return `${ae.tagName.toLowerCase()}${testid ? "#" + testid : ""}`;
}

/**
 * TEMPORARY diagnostic HUD + console logger for the keyboard / composer layout.
 * Enable with `?chatDebug=1` or `localStorage.setItem("amynest:chat-debug","1")`.
 * Reads the live container / messages / composer rects and computed styles so we
 * can pinpoint why the composer is off-screen WITHOUT changing any styles.
 */
function ChatDebugOverlay({
  surface,
  containerRef,
  messagesRef,
  inputBarRef,
  endRef,
}: {
  surface: string;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  messagesRef: MutableRefObject<HTMLDivElement | null>;
  inputBarRef: MutableRefObject<HTMLDivElement | null>;
  endRef: MutableRefObject<HTMLDivElement | null>;
}) {
  const [text, setText] = useState("collecting…");

  useEffect(() => {
    let timer = 0;

    const snapshot = () => {
      const vv = window.visualViewport;
      const innerH = window.innerHeight;
      const vvH = vv ? Math.round(vv.height) : null;
      const vvTop = vv ? Math.round(vv.offsetTop) : null;
      const kbInset = vv ? Math.max(0, Math.round(innerH - vv.height - vv.offsetTop)) : null;

      const container = containerRef.current;
      const messages = messagesRef.current;
      const composer = inputBarRef.current;
      const ccs = container ? getComputedStyle(container) : null;
      const ics = composer ? getComputedStyle(composer) : null;
      const composerRect = composer?.getBoundingClientRect();
      const visibleBottom = vv ? vv.offsetTop + vv.height : innerH;
      const composerOffscreen =
        composerRect != null && composerRect.bottom > visibleBottom + 1
          ? `YES (+${Math.round(composerRect.bottom - visibleBottom)}px below keyboard)`
          : "no";

      return {
        lines: [
          `surface ${surface}`,
          `innerH ${innerH}  vvH ${vvH}  vvTop ${vvTop}`,
          `>> kbInset ${kbInset}  visBottom ${Math.round(visibleBottom)}`,
          `container ${rectLine(container)}`,
          `  pos=${ccs?.position} top=${ccs?.top} h=${ccs?.height}`,
          `  z=${ccs?.zIndex} tf=${ccs?.transform === "none" ? "none" : "SET"}`,
          `  fixedCB: ${findFixedContainingBlock(container)}`,
          `messages ${rectLine(messages)}`,
          `  sT ${messages ? Math.round(messages.scrollTop) : "-"} sH ${messages?.scrollHeight ?? "-"} cH ${messages?.clientHeight ?? "-"}`,
          `composer ${rectLine(composer)}`,
          `  z=${ics?.zIndex} tf=${ics?.transform === "none" ? "none" : ics?.transform}`,
          `  OFFSCREEN: ${composerOffscreen}`,
          `endRect ${rectLine(endRef.current)}`,
          `active ${describeActiveElement()}`,
        ],
        log: {
          surface,
          keyboardHeight: kbInset,
          innerHeight: innerH,
          visualViewportHeight: vvH,
          visualViewportOffsetTop: vvTop,
          containerRect: container?.getBoundingClientRect(),
          containerPosition: ccs?.position,
          containerTop: ccs?.top,
          containerHeight: ccs?.height,
          containerTransform: ccs?.transform,
          containerZ: ccs?.zIndex,
          fixedContainingBlock: findFixedContainingBlock(container),
          messagesRect: messages?.getBoundingClientRect(),
          messagesScrollTop: messages?.scrollTop,
          messagesScrollHeight: messages?.scrollHeight,
          messagesClientHeight: messages?.clientHeight,
          composerRect,
          composerZ: ics?.zIndex,
          composerTransform: ics?.transform,
          composerOffscreen,
          activeElement: describeActiveElement(),
        },
      };
    };

    const update = () => setText(snapshot().lines.join("\n"));

    const logNow = (event: string) => {
      // eslint-disable-next-line no-console
      console.log(`[chat-debug:${event}]`, snapshot().log);
      update();
    };

    timer = window.setInterval(update, 250);
    const onFocusIn = () => logNow("focusin");
    const onFocusOut = () => logNow("focusout");
    const onVvResize = () => logNow("vv-resize");
    const onVvScroll = () => update();
    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", onVvResize);
    window.visualViewport?.addEventListener("scroll", onVvScroll);
    logNow("mount");

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", onVvResize);
      window.visualViewport?.removeEventListener("scroll", onVvScroll);
    };
  }, [surface, containerRef, messagesRef, inputBarRef, endRef]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 2,
        left: 2,
        zIndex: 99999,
        pointerEvents: "none",
        background: "rgba(0,0,0,0.82)",
        color: "#4ade80",
        font: "9px/1.3 ui-monospace, monospace",
        padding: "3px 5px",
        borderRadius: 4,
        whiteSpace: "pre",
        maxWidth: "62vw",
      }}
    >
      {text}
    </div>
  );
}

export type ChatPlatformSurface =
  | "onboarding"
  | "assistant"
  | "amy-ai-tutor"
  | "amy-learning-tutor"
  | "speech-coach"
  | "amy-coach"
  | "abacus-tutor"
  | "conversation-coach"
  | "cry-insight"
  | "ptm-prep";

export interface KeyboardSafeShellProps {
  surface: ChatPlatformSurface;
  header?: ReactNode;
  footer?: ReactNode | null;
  children: ReactNode;
  scrollDeps?: unknown[];
  layout?: ChatLayoutMode;
  className?: string;
  style?: CSSProperties;
  contentClassName?: string;
  footerClassName?: string;
  contentRole?: "main" | "log";
  contentAriaLabel?: string;
}

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
    keyboardOpen,
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
        <ChatDebugOverlay
          surface={surface}
          containerRef={containerRef}
          messagesRef={messagesRef}
          inputBarRef={inputBarRef}
          endRef={endRef}
        />
      ) : null}

      <div className="chat-thread-header kb-safe-header shrink-0">{header}</div>

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
        >
          {children}
          <div ref={endRef} aria-hidden="true" />
        </div>
      </div>

      {footer ? (
        <div
          ref={inputBarRef}
          className={cn(
            "chat-thread-input mx-auto w-full shrink-0 px-4 pt-4 pb-safe",
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

/**
 * Keyboard-safe scroll shell for search, forms, and voice controls outside ChatThread.
 * Uses the same viewport / IME handling as ChatPlatform — single architecture owner.
 */
export function KeyboardSafeShell({
  surface,
  header,
  footer,
  children,
  scrollDeps = [],
  layout = "embedded",
  className,
  style,
  contentClassName,
  footerClassName,
  contentRole = "main",
  contentAriaLabel,
}: KeyboardSafeShellProps) {
  const [location] = useLocation();

  const {
    containerRef,
    messagesWrapperRef,
    messagesRef,
    inputBarRef,
    endRef,
    keyboardOpen,
    containerStyle,
  } = useKeyboardChatLayout(scrollDeps, {
    layout,
    activePromptId: null,
    surface,
    route: location,
  });

  const debugEnabled = useChatDebugFlag();

  return (
    <div
      ref={containerRef}
      data-chat-platform={surface}
      data-keyboard-safe-shell
      className={cn(
        "chat-thread-page flex w-full flex-col overflow-hidden",
        layout === "embedded" && "min-h-0 flex-1",
        keyboardOpen && "chat-thread-page--keyboard-open",
        className,
      )}
      style={{ ...containerStyle, ...style }}
    >
      {debugEnabled ? (
        <ChatDebugOverlay
          surface={surface}
          containerRef={containerRef}
          messagesRef={messagesRef}
          inputBarRef={inputBarRef}
          endRef={endRef}
        />
      ) : null}

      {header ? <div className="chat-thread-header kb-safe-header shrink-0">{header}</div> : null}

      <div ref={messagesWrapperRef} className="chat-thread-messages-wrapper min-h-0 flex-1">
        <div
          ref={messagesRef}
          role={contentRole}
          aria-label={contentAriaLabel}
          className={cn(
            "chat-thread-messages mx-auto flex w-full flex-col overflow-y-auto",
            contentClassName,
          )}
        >
          {children}
          <div ref={endRef} aria-hidden="true" />
        </div>
      </div>

      {footer ? (
        <div
          ref={inputBarRef}
          className={cn(
            "chat-thread-input mx-auto w-full shrink-0 px-4 pt-3 pb-safe",
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
