import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { isCapacitorNative } from "@/lib/capacitor-native";

interface ViewportMetrics {
  height: number;
  offsetTop: number;
}

function readViewportMetrics(): ViewportMetrics {
  if (typeof window === "undefined") {
    return { height: 0, offsetTop: 0 };
  }

  const vv = window.visualViewport;
  if (vv) {
    return { height: vv.height, offsetTop: vv.offsetTop };
  }

  return { height: window.innerHeight, offsetTop: 0 };
}

function applyViewportCssVars(metrics: ViewportMetrics) {
  const root = document.documentElement;
  root.style.setProperty("--vv-height", `${metrics.height}px`);
  root.style.setProperty("--vv-offset-top", `${metrics.offsetTop}px`);
  root.style.setProperty("--vh", `${metrics.height * 0.01}px`);
}

export function useKeyboardChatLayout(scrollDeps: unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesWrapperRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [inputBarHeight, setInputBarHeight] = useState(0);
  const [viewport, setViewport] = useState<ViewportMetrics>(() => readViewportMetrics());

  const scrollToEnd = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      const thread = messagesRef.current;
      if (thread) {
        thread.scrollTo({ top: thread.scrollHeight, behavior });
      }
      endRef.current?.scrollIntoView({ behavior, block: "end" });
    });
  }, []);

  const syncViewport = useCallback(() => {
    const next = readViewportMetrics();
    setViewport(next);
    applyViewportCssVars(next);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    syncViewport();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncViewport);
    vv?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);

    let cancelled = false;
    if (isCapacitorNative()) {
      void import("@capacitor/keyboard")
        .then(({ Keyboard, KeyboardResize }) => {
          if (cancelled) return;
          void Keyboard.setResizeMode({ mode: KeyboardResize.Body });
          void Keyboard.addListener("keyboardDidShow", () => scrollToEnd("smooth"));
        })
        .catch(() => {
          /* optional native plugin */
        });
    }

    return () => {
      cancelled = true;
      vv?.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
    };
  }, [syncViewport]);

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
  }, [viewport.height, inputBarHeight]);

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
    const t = window.setTimeout(() => scrollToEnd("smooth"), 120);
    return () => window.clearTimeout(t);
  }, [viewport.height, viewport.offsetTop, scrollToEnd]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
      scrollToEnd("instant");
      window.setTimeout(() => scrollToEnd("smooth"), 300);
    };

    root.addEventListener("focusin", onFocusIn);
    return () => root.removeEventListener("focusin", onFocusIn);
  }, [scrollToEnd]);

  return {
    containerRef,
    messagesWrapperRef,
    messagesRef,
    inputBarRef,
    endRef,
    viewportHeight: viewport.height,
    viewportOffsetTop: viewport.offsetTop,
    inputBarHeight,
    scrollToEnd,
  };
}
