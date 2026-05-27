import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { isCapacitorNative } from "@/lib/capacitor-native";
import { isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";

interface ViewportMetrics {
  height: number;
  offsetTop: number;
  keyboardInset: number;
}

const KEYBOARD_OPEN_THRESHOLD = 72;
const KEYBOARD_RESET_DELAY_MS = 320;
const CHAT_SCROLL_SETTLE_MS = 360;

function readNativeImeInsetPx(): number {
  if (typeof document === "undefined") return 0;
  const root = document.documentElement;
  const raw =
    root.style.getPropertyValue("--auth-keyboard-inset-native").trim() ||
    root.style.getPropertyValue("--auth-keyboard-inset").trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function estimateAndroidKeyboardInset(): number {
  if (typeof window === "undefined") return 0;
  return Math.round(Math.min(window.innerHeight * 0.42, 420));
}

function readViewportMetrics(): ViewportMetrics {
  if (typeof window === "undefined") {
    return { height: 0, offsetTop: 0, keyboardInset: 0 };
  }

  const vv = window.visualViewport;
  const offsetTop = vv?.offsetTop ?? 0;
  const layoutHeight = window.innerHeight;
  let height = vv?.height ?? layoutHeight;
  let keyboardInset = Math.max(0, layoutHeight - height - offsetTop);

  const nativeImeInset = readNativeImeInsetPx();
  if (nativeImeInset > keyboardInset) {
    keyboardInset = nativeImeInset;
    height = Math.max(0, layoutHeight - nativeImeInset - offsetTop);
  }

  return { height, offsetTop, keyboardInset };
}

function applyViewportCssVars(metrics: Pick<ViewportMetrics, "height" | "offsetTop">) {
  const root = document.documentElement;
  root.style.setProperty("--vv-height", `${metrics.height}px`);
  root.style.setProperty("--vv-offset-top", `${metrics.offsetTop}px`);
  root.style.setProperty("--vh", `${metrics.height * 0.01}px`);
}

function clearChatViewportCssVars() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty("--vv-height");
  root.style.removeProperty("--vv-offset-top");
  root.style.removeProperty("--vh");
}

function isTextField(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

export function useKeyboardChatLayout(scrollDeps: unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesWrapperRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fallbackInsetRef = useRef(0);
  const resetTimerRef = useRef<number | null>(null);
  const scrollTimerRef = useRef<number | null>(null);
  const [inputBarHeight, setInputBarHeight] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewport, setViewport] = useState<ViewportMetrics>(() => readViewportMetrics());

  const scrollToEnd = useCallback((behavior: ScrollBehavior = "smooth") => {
    const run = () => {
      const thread = messagesRef.current;
      if (thread) {
        thread.scrollTo({ top: thread.scrollHeight, behavior });
      }
      endRef.current?.scrollIntoView({ behavior, block: "end" });
    };

    requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });
  }, []);

  const scheduleScrollToEnd = useCallback(
    (behavior: ScrollBehavior = "smooth", delay = CHAT_SCROLL_SETTLE_MS) => {
      if (scrollTimerRef.current != null) {
        window.clearTimeout(scrollTimerRef.current);
      }
      scrollTimerRef.current = window.setTimeout(() => {
        scrollTimerRef.current = null;
        scrollToEnd(behavior);
      }, delay);
    },
    [scrollToEnd],
  );

  const applyOpenLayout = useCallback(
    (metrics: ViewportMetrics) => {
      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
      setViewport(metrics);
      setKeyboardOpen(true);
      applyViewportCssVars(metrics);
      scrollToEnd("instant");
      scheduleScrollToEnd("smooth", 120);
      scheduleScrollToEnd("smooth", CHAT_SCROLL_SETTLE_MS);
    },
    [scheduleScrollToEnd, scrollToEnd],
  );

  const resetKeyboardLayout = useCallback(() => {
    if (resetTimerRef.current != null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    if (scrollTimerRef.current != null) {
      window.clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }

    fallbackInsetRef.current = 0;
    const next = readViewportMetrics();
    const restored: ViewportMetrics = {
      height: window.innerHeight,
      offsetTop: next.offsetTop,
      keyboardInset: 0,
    };
    setViewport(restored);
    setKeyboardOpen(false);
    applyViewportCssVars(restored);
    scrollToEnd("instant");
  }, [scrollToEnd]);

  const scheduleResetAfterKeyboard = useCallback(() => {
    if (resetTimerRef.current != null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null;
      if (isTextField(document.activeElement)) return;
      resetKeyboardLayout();
    }, KEYBOARD_RESET_DELAY_MS);
  }, [resetKeyboardLayout]);

  const syncViewport = useCallback(() => {
    const metrics = readViewportMetrics();
    const effectiveInset = Math.max(metrics.keyboardInset, fallbackInsetRef.current);

    if (effectiveInset <= KEYBOARD_OPEN_THRESHOLD) {
      if (isTextField(document.activeElement)) return;
      resetKeyboardLayout();
      return;
    }

    applyOpenLayout({
      height: Math.max(0, window.innerHeight - effectiveInset - metrics.offsetTop),
      offsetTop: metrics.offsetTop,
      keyboardInset: effectiveInset,
    });
  }, [applyOpenLayout, resetKeyboardLayout]);

  const applyAndroidKeyboardFallback = useCallback(() => {
    if (!isNativeAmyNestAndroidWrapper() || isCapacitorNative()) return;
    const metrics = readViewportMetrics();
    if (metrics.keyboardInset >= KEYBOARD_OPEN_THRESHOLD) return;

    const estimated = estimateAndroidKeyboardInset();
    fallbackInsetRef.current = estimated;
    applyOpenLayout({
      ...metrics,
      keyboardInset: estimated,
      height: Math.max(0, window.innerHeight - estimated - metrics.offsetTop),
    });
  }, [applyOpenLayout]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    syncViewport();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncViewport);
    vv?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);

    const onNativeKeyboardInset = (event: Event) => {
      const detail = (event as CustomEvent<{ inset?: number; visibleHeight?: number }>).detail;
      const inset = detail?.inset ?? 0;
      fallbackInsetRef.current = 0;

      if (inset > KEYBOARD_OPEN_THRESHOLD) {
        const visibleHeight =
          detail?.visibleHeight ?? Math.max(0, window.innerHeight - inset);
        applyOpenLayout({
          height: visibleHeight,
          offsetTop: vv?.offsetTop ?? 0,
          keyboardInset: inset,
        });
        return;
      }

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
          void Keyboard.setResizeMode({ mode: KeyboardResize.Body });
          void Keyboard.addListener("keyboardDidShow", () => {
            syncViewport();
            scheduleScrollToEnd("smooth");
          }).then((handle) => {
            if (!cancelled) removeKeyboardShow = () => void handle.remove();
          });
          void Keyboard.addListener("keyboardDidHide", () => {
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
      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
      if (scrollTimerRef.current != null) {
        window.clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
      vv?.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("amynest-keyboard-inset", onNativeKeyboardInset);
      removeKeyboardShow?.();
      removeKeyboardHide?.();
      clearChatViewportCssVars();
    };
  }, [applyOpenLayout, scheduleResetAfterKeyboard, scheduleScrollToEnd, syncViewport]);

  // Android WebView: flex height chain often fails — pin scroll area to wrapper height.
  useLayoutEffect(() => {
    const wrapper = messagesWrapperRef.current;
    const body = messagesRef.current;
    if (!wrapper || !body) return;

    const syncScrollArea = () => {
      const height = wrapper.clientHeight;
      if (height <= 0) return;
      body.style.height = `${height}px`;
      body.style.maxHeight = `${height}px`;
    };

    syncScrollArea();
    const observer = new ResizeObserver(syncScrollArea);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [viewport.height, inputBarHeight, keyboardOpen]);

  useLayoutEffect(() => {
    const bar = inputBarRef.current;
    if (!bar) return;

    const measure = () => setInputBarHeight(bar.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    scrollToEnd("smooth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, scrollDeps);

  useEffect(() => {
    scrollToEnd("instant");
    scheduleScrollToEnd("smooth", 120);
    scheduleScrollToEnd("smooth", CHAT_SCROLL_SETTLE_MS);
  }, [viewport.height, viewport.offsetTop, keyboardOpen, scheduleScrollToEnd, scrollToEnd]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!isTextField(target)) return;
      if (!root.contains(target)) return;

      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }

      window.setTimeout(() => syncViewport(), 80);
      scrollToEnd("instant");
      scheduleScrollToEnd("smooth");
      window.setTimeout(() => applyAndroidKeyboardFallback(), 350);
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
  }, [
    applyAndroidKeyboardFallback,
    scheduleResetAfterKeyboard,
    scheduleScrollToEnd,
    scrollToEnd,
    syncViewport,
  ]);

  return {
    containerRef,
    messagesWrapperRef,
    messagesRef,
    inputBarRef,
    endRef,
    viewportHeight: viewport.height,
    viewportOffsetTop: viewport.offsetTop,
    inputBarHeight,
    keyboardOpen,
    scrollToEnd,
  };
}
