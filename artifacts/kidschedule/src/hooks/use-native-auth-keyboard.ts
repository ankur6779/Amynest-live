import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { isCapacitorNative } from "@/lib/capacitor-native";
import {
  isCapacitorIosShell,
  isNativeAmyNestAndroidWrapper,
} from "@/lib/device-lite";
import { syncAndroidSystemUi } from "@/lib/native-android-system-ui";
import { isNativeAmyNestShell } from "@/lib/native-shell";

/** Applied to email/password/phone inputs on auth screens (native WebView text visibility). */
export const AUTH_INPUT_CLASS = "amynest-auth-input";

const AUTH_INPUT_SCROLL_MARGIN = 36;
const KEYBOARD_OPEN_THRESHOLD = 72;

interface ViewportMetrics {
  height: number;
  offsetTop: number;
  keyboardInset: number;
}

function readNativeImeInsetPx(): number {
  if (typeof document === "undefined") return 0;
  const root = document.documentElement;
  const raw =
    root.style.getPropertyValue("--auth-keyboard-inset-native").trim() ||
    root.style.getPropertyValue("--auth-keyboard-inset").trim() ||
    getComputedStyle(root).getPropertyValue("--auth-keyboard-inset-native").trim() ||
    getComputedStyle(root).getPropertyValue("--auth-keyboard-inset").trim();
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
  let height = vv?.height ?? window.innerHeight;
  let keyboardInset = Math.max(0, window.innerHeight - height - offsetTop);

  const nativeImeInset = readNativeImeInsetPx();
  if (nativeImeInset > keyboardInset) {
    keyboardInset = nativeImeInset;
    height = Math.max(0, window.innerHeight - nativeImeInset - offsetTop);
  }

  const cssVvHeight = getComputedStyle(document.documentElement)
    .getPropertyValue("--vv-height")
    .trim();
  const parsedVvHeight = Number.parseFloat(cssVvHeight);
  if (
    Number.isFinite(parsedVvHeight) &&
    parsedVvHeight > 0 &&
    parsedVvHeight < height
  ) {
    height = parsedVvHeight;
  }

  return { height, offsetTop, keyboardInset };
}

/** Extra clearance so focused fields sit above the keyboard (iOS safe-area / status bar). */
function readKeyboardVerticalOffset(): number {
  if (isCapacitorIosShell()) return 12;
  if (isNativeAmyNestAndroidWrapper()) return 8;
  return 0;
}

function applyAuthViewportCssVars(metrics: ViewportMetrics) {
  const root = document.documentElement;
  root.style.setProperty("--vv-height", `${metrics.height}px`);
  root.style.setProperty("--vv-offset-top", `${metrics.offsetTop}px`);
  root.style.setProperty("--vh", `${metrics.height * 0.01}px`);
  root.style.setProperty("--auth-keyboard-inset", `${metrics.keyboardInset}px`);
  root.style.setProperty(
    "--auth-kav-offset",
    `${readKeyboardVerticalOffset()}px`,
  );
}

function isAuthField(
  el: EventTarget | null,
): el is HTMLInputElement | HTMLTextAreaElement {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, button, a, [role="button"], label, [contenteditable="true"]',
    ),
  );
}

function readVisibleBounds(margin: number = AUTH_INPUT_SCROLL_MARGIN): {
  top: number;
  bottom: number;
} {
  const metrics = readViewportMetrics();
  const vv = window.visualViewport;
  const keyboardInset = metrics.keyboardInset;

  if (keyboardInset > 0) {
    return {
      top: margin,
      bottom: window.innerHeight - keyboardInset - margin,
    };
  }

  return {
    top: (vv?.offsetTop ?? 0) + margin,
    bottom:
      (vv?.offsetTop ?? 0) +
      (vv?.height ?? window.innerHeight) -
      margin,
  };
}

/** Scroll a focused field into the visible area above the software keyboard. */
export function scrollAuthInputIntoView(
  el: HTMLElement,
  scrollContainer?: HTMLElement | null,
  behavior: ScrollBehavior = "smooth",
  margin: number = AUTH_INPUT_SCROLL_MARGIN,
) {
  const run = () => {
    const { top: visibleTop, bottom: visibleBottom } = readVisibleBounds(margin);
    const rect = el.getBoundingClientRect();

    if (rect.top >= visibleTop && rect.bottom <= visibleBottom) {
      return;
    }

    if (scrollContainer) {
      let delta = 0;
      if (rect.bottom > visibleBottom) {
        delta = rect.bottom - visibleBottom + 12;
      } else if (rect.top < visibleTop) {
        delta = rect.top - visibleTop;
      }
      if (delta !== 0) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollTop + delta,
          behavior,
        });
      }
      return;
    }

    el.scrollIntoView({ behavior, block: "center", inline: "nearest" });
  };

  requestAnimationFrame(run);
  window.setTimeout(run, 120);
  window.setTimeout(run, 320);
  window.setTimeout(run, 520);
}

/**
 * Keeps sign-in / sign-up fields visible and typed text readable when the
 * native keyboard opens (Capacitor iOS + Play Store Android).
 */
export function useNativeAuthKeyboard(
  enabled: boolean = isNativeAmyNestShell(),
): {
  kavRef: RefObject<HTMLDivElement>;
  scrollRef: RefObject<HTMLDivElement>;
  keyboardOpen: boolean;
  dismissKeyboard: () => void;
  handleBackgroundTap: (event: React.MouseEvent | React.TouchEvent) => void;
} {
  const kavRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const fallbackInsetRef = useRef(0);

  const scrollFocused = useCallback((behavior: ScrollBehavior = "smooth") => {
    const active = document.activeElement;
    if (isAuthField(active)) {
      scrollAuthInputIntoView(active, scrollRef.current, behavior);
    }
  }, []);

  const dismissKeyboard = useCallback(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
    if (isCapacitorNative()) {
      void import("@capacitor/keyboard")
        .then(({ Keyboard }) => Keyboard.hide())
        .catch(() => {
          /* optional native plugin */
        });
    }
  }, []);

  const handleBackgroundTap = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (isInteractiveTarget(event.target)) return;
      dismissKeyboard();
    },
    [dismissKeyboard],
  );

  const syncViewport = useCallback(() => {
    const metrics = readViewportMetrics();
    const effectiveInset = Math.max(metrics.keyboardInset, fallbackInsetRef.current);
    const effectiveMetrics =
      effectiveInset > metrics.keyboardInset
        ? {
            ...metrics,
            keyboardInset: effectiveInset,
            height: Math.max(0, window.innerHeight - effectiveInset - metrics.offsetTop),
          }
        : metrics;
    applyAuthViewportCssVars(effectiveMetrics);
    setKeyboardOpen(effectiveInset > KEYBOARD_OPEN_THRESHOLD);
  }, []);

  const applyAndroidKeyboardFallback = useCallback(() => {
    if (!isNativeAmyNestAndroidWrapper()) return;
    const metrics = readViewportMetrics();
    if (metrics.keyboardInset >= KEYBOARD_OPEN_THRESHOLD) return;

    const estimated = estimateAndroidKeyboardInset();
    fallbackInsetRef.current = estimated;
    applyAuthViewportCssVars({
      ...metrics,
      keyboardInset: estimated,
      height: Math.max(0, window.innerHeight - estimated - metrics.offsetTop),
    });
    setKeyboardOpen(true);
    scrollFocused("smooth");
  }, [scrollFocused]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const root = document.documentElement;
    root.classList.add("amynest-auth-active");
    syncViewport();

    if (isNativeAmyNestAndroidWrapper()) {
      syncAndroidSystemUi(true);
    }

    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncViewport);
    vv?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);

    const onNativeKeyboardInset = (event: Event) => {
      const detail = (event as CustomEvent<{ inset?: number; visibleHeight?: number }>)
        .detail;
      const inset = detail?.inset ?? 0;
      fallbackInsetRef.current = 0;
      if (inset > 0) {
        const visibleHeight =
          detail?.visibleHeight ??
          Math.max(0, window.innerHeight - inset);
        applyAuthViewportCssVars({
          height: visibleHeight,
          offsetTop: vv?.offsetTop ?? 0,
          keyboardInset: inset,
        });
        setKeyboardOpen(true);
        scrollFocused("smooth");
        return;
      }
      syncViewport();
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
          void Keyboard.addListener("keyboardDidShow", () => {
            syncViewport();
            scrollFocused("smooth");
          }).then((handle) => {
            if (!cancelled) removeKeyboardShow = () => void handle.remove();
          });
          void Keyboard.addListener("keyboardDidHide", () => {
            fallbackInsetRef.current = 0;
            syncViewport();
            setKeyboardOpen(false);
          }).then((handle) => {
            if (!cancelled) removeKeyboardHide = () => void handle.remove();
          });
        })
        .catch(() => {
          /* optional native plugin */
        });
    }

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!isAuthField(target)) return;
      if (kavRef.current && !kavRef.current.contains(target)) return;

      setKeyboardOpen(true);
      syncViewport();
      scrollAuthInputIntoView(target, scrollRef.current, "instant");
      window.setTimeout(
        () => scrollAuthInputIntoView(target, scrollRef.current, "smooth"),
        280,
      );
      window.setTimeout(() => applyAndroidKeyboardFallback(), 350);
      window.setTimeout(
        () => scrollAuthInputIntoView(target, scrollRef.current, "smooth"),
        550,
      );
    };

    const onFocusOut = () => {
      window.setTimeout(() => {
        if (isAuthField(document.activeElement)) return;
        fallbackInsetRef.current = 0;
        syncViewport();
      }, 120);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      cancelled = true;
      root.classList.remove("amynest-auth-active");
      root.style.removeProperty("--auth-keyboard-inset");
      root.style.removeProperty("--auth-keyboard-inset-native");
      root.style.removeProperty("--auth-kav-offset");
      vv?.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("amynest-keyboard-inset", onNativeKeyboardInset);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      removeKeyboardShow?.();
      removeKeyboardHide?.();
      if (isNativeAmyNestAndroidWrapper()) {
        syncAndroidSystemUi(false);
      }
    };
  }, [applyAndroidKeyboardFallback, enabled, scrollFocused, syncViewport]);

  return {
    kavRef,
    scrollRef,
    keyboardOpen,
    dismissKeyboard,
    handleBackgroundTap,
  };
}
