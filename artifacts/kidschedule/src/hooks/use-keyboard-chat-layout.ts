import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  applyChatViewportCssVars,
  clearChatViewportCssVars,
  ensureChatPromptVisible,
  getChatPlatformRemoteConfig,
  isAndroidAdjustResizeChatShell,
  logAndroidChatLayoutDiagnostics,
  isChatAnswerTarget,
  isForcePromptVisibilityModeActive,
  isKeyboardOpen,
  metricsForChatLayout,
  readChatViewportMetrics,
  readNativeImeInsetPx,
  recordAndroidBaselineHeight,
  scheduleSelfHealingVisibility,
  setCapacitorIosKeyboardInsetPx,
  setNativeWebViewVisibleHeightPx,
  startChatPlatformRemoteConfigPolling,
  subscribeChatPlatformRemoteConfig,
  trackChatPlatformEvent,
  validateActivePromptVisibility,
  type SelfHealingVisibilityHandle,
} from "@/lib/chat-platform";
import { setChatPlatformKeyboardAppFromNative } from "@/lib/chat-platform/device-context";
import { isCapacitorNative } from "@/lib/capacitor-native";
import { isCapacitorIosShell } from "@/lib/device-lite";

export type ChatLayoutMode = "fullscreen" | "embedded";

export interface UseKeyboardChatLayoutOptions {
  layout?: ChatLayoutMode;
  activePromptId?: string | null;
  /** Required telemetry / dev-guard surface id (e.g. onboarding, assistant). */
  surface: string;
  route?: string;
}

const KEYBOARD_RESET_DELAY_MS = 320;

/** Distance from the bottom (px) within which we keep the thread pinned to the latest message. */
const NEAR_BOTTOM_THRESHOLD_PX = 160;

function isTextField(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

function isNearBottom(el: HTMLElement): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_THRESHOLD_PX;
}

function guardAndroidLayoutOwnership() {
  if (!isAndroidAdjustResizeChatShell() || typeof document === "undefined") return;
  const root = document.documentElement;
  const nativeVv = root.style.getPropertyValue("--vv-height").trim();
  const nativeInset = readNativeImeInsetPx();
  if (nativeVv && nativeInset > 0) {
    trackChatPlatformEvent("android_keyboard_layout_conflicts", {
      surface: "chat_platform",
      nativeVvHeight: nativeVv,
      nativeInset,
    });
    root.style.removeProperty("--vv-height");
  }
}

export function useKeyboardChatLayout(
  scrollDeps: unknown[],
  options: UseKeyboardChatLayoutOptions,
) {
  const layoutMode = options.layout ?? "fullscreen";
  const activePromptId = options.activePromptId ?? null;
  const surface = options.surface;
  const route = options.route;
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesWrapperRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const activePromptIdRef = useRef(activePromptId);
  const surfaceRef = useRef(surface);
  const routeRef = useRef(route);
  const resetTimerRef = useRef<number | null>(null);
  const healRef = useRef<SelfHealingVisibilityHandle | null>(null);
  const endScrollTimersRef = useRef<number[]>([]);
  const [inputBarHeight, setInputBarHeight] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewport, setViewport] = useState(() =>
    metricsForChatLayout(readChatViewportMetrics(), false),
  );

  activePromptIdRef.current = activePromptId;
  surfaceRef.current = surface;
  routeRef.current = route;

  const remoteConfig = useSyncExternalStore(
    subscribeChatPlatformRemoteConfig,
    getChatPlatformRemoteConfig,
    getChatPlatformRemoteConfig,
  );
  const forcePromptVisibilityMode = isForcePromptVisibilityModeActive(remoteConfig);

  const buildVisibilityContext = useCallback(() => {
    const messagesEl = messagesRef.current;
    if (!messagesEl) return null;
    return {
      messagesEl,
      inputBarEl: inputBarRef.current,
      promptId: activePromptIdRef.current,
      surface: surfaceRef.current,
      route: routeRef.current,
    };
  }, []);

  const runVisibilityPass = useCallback(
    (behavior: ScrollBehavior = "instant") => {
      if (!remoteConfig.chatPlatformVisibilityProtection) return { adjusted: false, snapshot: null };

      guardAndroidLayoutOwnership();
      const ctx = buildVisibilityContext();
      if (!ctx) return { adjusted: false, snapshot: null };

      const scrollBehavior = forcePromptVisibilityMode ? "instant" : behavior;
      const result = ensureChatPromptVisible(ctx, {
        behavior: scrollBehavior,
        forcePromptVisibilityMode,
      });
      validateActivePromptVisibility(ctx);
      return result;
    },
    [buildVisibilityContext, remoteConfig.chatPlatformVisibilityProtection, forcePromptVisibilityMode],
  );

  const scrollTimelineToEnd = useCallback((behavior: ScrollBehavior = "instant") => {
    const end = endRef.current;
    const messagesEl = messagesRef.current;
    if (!end || !messagesEl) return;
    end.scrollIntoView({ behavior: behavior === "smooth" ? "smooth" : "auto", block: "end" });
  }, []);

  const cancelEndScroll = useCallback(() => {
    endScrollTimersRef.current.forEach((id) => window.clearTimeout(id));
    endScrollTimersRef.current = [];
  }, []);

  /**
   * Pin the thread to the latest message + composer across the keyboard's open
   * animation. OEM keyboards report their final height over several frames, so a
   * single scroll loses the bottom — re-anchor on rAF, 50ms and 150ms.
   */
  const scheduleEndScroll = useCallback(
    (behavior: ScrollBehavior) => {
      cancelEndScroll();
      scrollTimelineToEnd(behavior);
      requestAnimationFrame(() => scrollTimelineToEnd("instant"));
      endScrollTimersRef.current.push(
        window.setTimeout(() => scrollTimelineToEnd("instant"), 50),
      );
      endScrollTimersRef.current.push(
        window.setTimeout(() => scrollTimelineToEnd("instant"), 150),
      );
    },
    [cancelEndScroll, scrollTimelineToEnd],
  );

  const runSelfHealingVisibility = useCallback(
    (behavior: ScrollBehavior = "instant") => {
      // ChatGPT-style: when there is no active prompt, or the user is already at
      // the bottom following the conversation, keep the latest message and the
      // composer in view. This stick-to-bottom path is the core auto-scroll
      // contract and must always run — it is NOT gated behind remote config.
      const messagesEl = messagesRef.current;
      // Embedded goal/search surfaces (Amy Coach) should keep content anchored at the
      // top — not pinned to the scroll end like a live chat thread.
      const embeddedNonChatSurface =
        layoutMode === "embedded" &&
        (surfaceRef.current === "amy-coach" || surfaceRef.current === "abacus-tutor");
      const stickToBottom =
        !embeddedNonChatSurface &&
        (!activePromptIdRef.current || (messagesEl ? isNearBottom(messagesEl) : true));
      if (stickToBottom) {
        healRef.current?.cancel();
        scheduleEndScroll(forcePromptVisibilityMode ? "instant" : behavior);
        return;
      }

      // Prompt-anchored recovery (keeping a specific Amy bubble visible while the
      // user has scrolled up to read history) is the advanced protection layer
      // and stays behind the remote-config kill switch.
      if (!remoteConfig.chatPlatformVisibilityProtection) return;

      cancelEndScroll();
      healRef.current?.cancel();
      const ctx = buildVisibilityContext();
      if (!ctx) return;

      const scrollBehavior = forcePromptVisibilityMode ? "instant" : behavior;
      healRef.current = scheduleSelfHealingVisibility(
        ctx,
        () => {
          guardAndroidLayoutOwnership();
          const fresh = buildVisibilityContext();
          if (!fresh) {
            return { adjusted: false, snapshot: measureFallbackSnapshot() };
          }
          const result = ensureChatPromptVisible(fresh, {
            behavior: scrollBehavior,
            forcePromptVisibilityMode,
          });
          validateActivePromptVisibility(fresh);
          return result;
        },
        { forcePromptVisibilityMode },
      );
    },
    [
      buildVisibilityContext,
      remoteConfig.chatPlatformVisibilityProtection,
      forcePromptVisibilityMode,
      scheduleEndScroll,
      cancelEndScroll,
    ],
  );

  function measureFallbackSnapshot() {
    return {
      promptVisible: true,
      answerVisible: true,
      promptOverlapsKeyboard: false,
      answerOverlapsKeyboard: false,
      scrollLostActivePrompt: false,
      keyboardOpen: false,
    };
  }

  const scrollToEnd = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const scrollBehavior = forcePromptVisibilityMode ? "instant" : behavior;
      runSelfHealingVisibility(scrollBehavior);
    },
    [forcePromptVisibilityMode, runSelfHealingVisibility],
  );

  const applyOpenLayout = useCallback(
    (rawMetrics: ReturnType<typeof readChatViewportMetrics>) => {
      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
      const metrics = metricsForChatLayout(rawMetrics, true);
      setViewport(metrics);
      setKeyboardOpen(true);
      applyChatViewportCssVars(metrics);
      runSelfHealingVisibility("instant");
    },
    [runSelfHealingVisibility],
  );

  const resetKeyboardLayout = useCallback(() => {
    if (resetTimerRef.current != null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    healRef.current?.cancel();

    const next = readChatViewportMetrics();
    const restored = metricsForChatLayout(
      {
        height: window.innerHeight,
        offsetTop: next.offsetTop,
        keyboardInset: 0,
      },
      false,
    );
    setViewport(restored);
    setKeyboardOpen(false);
    setNativeWebViewVisibleHeightPx(null);
    applyChatViewportCssVars(restored);
    recordAndroidBaselineHeight();
    runVisibilityPass("instant");
  }, [runVisibilityPass]);

  const scheduleResetAfterKeyboard = useCallback(() => {
    if (resetTimerRef.current != null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null;
      if (isTextField(document.activeElement) || isChatAnswerTarget(document.activeElement)) {
        return;
      }
      resetKeyboardLayout();
    }, KEYBOARD_RESET_DELAY_MS);
  }, [resetKeyboardLayout]);

  const syncViewport = useCallback(() => {
    guardAndroidLayoutOwnership();
    const metrics = readChatViewportMetrics();

    if (!isKeyboardOpen(metrics)) {
      if (isTextField(document.activeElement) || isChatAnswerTarget(document.activeElement)) {
        return;
      }
      resetKeyboardLayout();
      return;
    }

    applyOpenLayout(metrics);
  }, [applyOpenLayout, resetKeyboardLayout]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stopRemoteConfigPolling = startChatPlatformRemoteConfigPolling();
    recordAndroidBaselineHeight();
    const initial = metricsForChatLayout(readChatViewportMetrics(), false);
    setViewport(initial);
    applyChatViewportCssVars(initial);

    const vv = window.visualViewport;
    const onOrientationChange = () => {
      window.setTimeout(() => {
        syncViewport();
        runSelfHealingVisibility("instant");
      }, 0);
    };

    const onVisibilityTrigger = () => {
      syncViewport();
      runSelfHealingVisibility("instant");
    };

    vv?.addEventListener("resize", onVisibilityTrigger);
    vv?.addEventListener("scroll", onVisibilityTrigger);
    window.addEventListener("resize", onVisibilityTrigger);
    window.addEventListener("orientationchange", onOrientationChange);

    const onNativeKeyboardInset = (event: Event) => {
      const detail = (event as CustomEvent<{
        inset?: number;
        visibleHeight?: number;
        keyboardPackage?: string;
      }>).detail;
      const inset = detail?.inset ?? 0;
      setNativeWebViewVisibleHeightPx(detail?.visibleHeight);
      if (detail?.keyboardPackage) {
        setChatPlatformKeyboardAppFromNative(detail.keyboardPackage);
      }
      guardAndroidLayoutOwnership();

      if (isKeyboardOpen({ keyboardInset: inset })) {
        applyOpenLayout(readChatViewportMetrics());
        return;
      }

      setNativeWebViewVisibleHeightPx(null);
      scheduleResetAfterKeyboard();
    };
    window.addEventListener("amynest-keyboard-inset", onNativeKeyboardInset);

    let cancelled = false;
    let removeKeyboardShow: (() => void) | undefined;
    let removeKeyboardHide: (() => void) | undefined;

    if (isCapacitorNative()) {
      void import("@capacitor/keyboard")
        .then(({ Keyboard, KeyboardResize }) => {
          if (cancelled) return;
          const mode = isCapacitorIosShell()
            ? KeyboardResize.Body
            : KeyboardResize.Native;
          void Keyboard.setResizeMode({ mode });
          void Keyboard.addListener("keyboardDidShow", (info) => {
            if (isCapacitorIosShell() && info.keyboardHeight > 0) {
              setCapacitorIosKeyboardInsetPx(info.keyboardHeight);
            }
            onVisibilityTrigger();
          }).then((handle) => {
            if (!cancelled) removeKeyboardShow = () => void handle.remove();
          });
          void Keyboard.addListener("keyboardDidHide", () => {
            if (isCapacitorIosShell()) {
              setCapacitorIosKeyboardInsetPx(null);
            }
            scheduleResetAfterKeyboard();
          }).then((handle) => {
            if (!cancelled) removeKeyboardHide = () => void handle.remove();
          });
        })
        .catch(() => {
          /* optional native plugin */
        });
    }

    return () => {
      cancelled = true;
      stopRemoteConfigPolling();
      healRef.current?.cancel();
      cancelEndScroll();
      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
      vv?.removeEventListener("resize", onVisibilityTrigger);
      vv?.removeEventListener("scroll", onVisibilityTrigger);
      window.removeEventListener("resize", onVisibilityTrigger);
      window.removeEventListener("orientationchange", onOrientationChange);
      window.removeEventListener("amynest-keyboard-inset", onNativeKeyboardInset);
      removeKeyboardShow?.();
      removeKeyboardHide?.();
      clearChatViewportCssVars();
    };
  }, [
    applyOpenLayout,
    runSelfHealingVisibility,
    scheduleResetAfterKeyboard,
    syncViewport,
    cancelEndScroll,
  ]);

  useLayoutEffect(() => {
    const wrapper = messagesWrapperRef.current;
    const body = messagesRef.current;
    if (!wrapper || !body) return;

    const syncScrollArea = () => {
      const height = wrapper.clientHeight;
      if (height <= 0) return;
      body.style.height = `${height}px`;
      body.style.maxHeight = `${height}px`;
      runSelfHealingVisibility("instant");
    };

    syncScrollArea();
    const observer = new ResizeObserver(syncScrollArea);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [viewport.height, inputBarHeight, keyboardOpen, runSelfHealingVisibility]);

  useLayoutEffect(() => {
    const bar = inputBarRef.current;
    if (!bar) return;

    const measure = () => setInputBarHeight(bar.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [scrollDeps]);

  useEffect(() => {
    runSelfHealingVisibility("instant");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, scrollDeps);

  useEffect(() => {
    runSelfHealingVisibility("instant");
  }, [activePromptId, viewport.height, viewport.offsetTop, keyboardOpen, route, runSelfHealingVisibility]);

  useEffect(() => {
    if (forcePromptVisibilityMode) {
      runSelfHealingVisibility("instant");
    }
  }, [forcePromptVisibilityMode, runSelfHealingVisibility]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!isTextField(target) && !isChatAnswerTarget(target)) return;
      if (!root.contains(target)) return;

      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }

      syncViewport();
      runSelfHealingVisibility("instant");
      if (target instanceof HTMLElement) {
        requestAnimationFrame(() => {
          target.scrollIntoView({ block: "nearest", behavior: "instant" });
          runSelfHealingVisibility("instant");
        });
      }
    };

    const onFocusOut = () => {
      scheduleResetAfterKeyboard();
    };

    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    return () => {
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
    };
  }, [runSelfHealingVisibility, scheduleResetAfterKeyboard, syncViewport]);

  const androidAdjustResize = isAndroidAdjustResizeChatShell();

  // Diagnostic only — logs Samsung / Android 15 keyboard layout metrics.
  useEffect(() => {
    if (!androidAdjustResize || !keyboardOpen) return;
    logAndroidChatLayoutDiagnostics(surface, viewport.keyboardInset);
  }, [androidAdjustResize, keyboardOpen, surface, viewport.keyboardInset]);

  /**
   * Universal keyboard layout: when the keyboard is open AND we measured a real
   * inset (the platform did not already resize the WebView), pin the chat shell
   * to the visual viewport so the composer sits directly above the keyboard and
   * the messages region scrolls in the remaining space. This is identical on
   * Android WebView, Chrome, Samsung Internet and Capacitor iOS — the only
   * source of truth is `window.visualViewport` (read in viewport.ts).
   *
   * When the platform already shrank the viewport (Capacitor Android native
   * resize, or `interactive-widget`) the inset is ~0, so embedded surfaces stay
   * in normal document flow and the flex column shrinks naturally.
   */
  const keyboardOverlayActive =
    keyboardOpen && viewport.keyboardInset > 0 && viewport.height > 0;

  const visualViewportOverlayStyle = {
    position: "fixed" as const,
    top: viewport.offsetTop,
    left: 0,
    right: 0,
    width: "100%",
    height:
      viewport.height > 0 ? `${viewport.height}px` : "var(--vv-height, 100%)",
    maxHeight:
      viewport.height > 0 ? `${viewport.height}px` : "var(--vv-height, 100%)",
    zIndex: 50,
  };

  const containerStyle =
    layoutMode === "fullscreen" || keyboardOverlayActive
      ? visualViewportOverlayStyle
      : {
          height: "100%",
          maxHeight: "100%",
          minHeight: 0,
        };

  return {
    containerRef,
    messagesWrapperRef,
    messagesRef,
    inputBarRef,
    endRef,
    viewportHeight: viewport.height,
    viewportOffsetTop: viewport.offsetTop,
    keyboardInset: viewport.keyboardInset,
    inputBarHeight,
    keyboardOpen,
    scrollToEnd,
    containerStyle,
    layoutMode,
  };
}
