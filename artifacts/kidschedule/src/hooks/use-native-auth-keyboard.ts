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
import { isNativeAmyNestShell } from "@/lib/native-shell";

/** Applied to email/password/phone inputs on auth screens (native WebView text visibility). */
export const AUTH_INPUT_CLASS = "amynest-auth-input";

const AUTH_BOTTOM_CLEARANCE = 16;
const KEYBOARD_OPEN_THRESHOLD = 72;
const KEYBOARD_RESET_DELAY_MS = 320;
const AUTH_SCROLL_SETTLE_MS = 360;

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

/** Remove keyboard overrides so layout returns to natural full-screen flow. */
export function clearAuthViewportCssVars() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty("--auth-keyboard-inset");
  root.style.removeProperty("--auth-keyboard-inset-native");
  root.style.removeProperty("--auth-kav-offset");
  root.style.removeProperty("--vv-height");
  root.style.removeProperty("--vv-offset-top");
  root.style.removeProperty("--vh");
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

function readVisibleBottom(margin: number = AUTH_BOTTOM_CLEARANCE): number {
  const metrics = readViewportMetrics();
  const vv = window.visualViewport;
  const keyboardInset = metrics.keyboardInset;

  if (keyboardInset > KEYBOARD_OPEN_THRESHOLD) {
    return window.innerHeight - keyboardInset - margin;
  }

  return (
    (vv?.offsetTop ?? 0) +
    (vv?.height ?? window.innerHeight) -
    margin
  );
}

/** True when the input bottom edge sits behind the keyboard / visible viewport. */
function isAuthInputObscured(
  el: HTMLElement,
  margin: number = AUTH_BOTTOM_CLEARANCE,
): boolean {
  const rect = el.getBoundingClientRect();
  return rect.bottom > readVisibleBottom(margin);
}

/**
 * Minimal scroll — only when the input bottom is hidden. Never centers the field.
 */
export function scrollAuthInputIntoView(
  el: HTMLElement,
  scrollContainer?: HTMLElement | null,
  behavior: ScrollBehavior = "smooth",
  margin: number = AUTH_BOTTOM_CLEARANCE,
) {
  const visibleBottom = readVisibleBottom(margin);
  const rect = el.getBoundingClientRect();

  if (rect.bottom <= visibleBottom) {
    return;
  }

  const delta = rect.bottom - visibleBottom;
  if (delta <= 0) return;

  if (scrollContainer) {
    scrollContainer.scrollTo({
      top: scrollContainer.scrollTop + delta,
      behavior,
    });
    return;
  }

  el.scrollIntoView({ behavior, block: "nearest", inline: "nearest" });
}

function resetAuthScrollPosition(scroll: HTMLElement | null) {
  if (!scroll) return;
  scroll.style.removeProperty("height");
  scroll.style.removeProperty("maxHeight");
  requestAnimationFrame(() => {
    scroll.scrollTop = 0;
    requestAnimationFrame(() => {
      scroll.scrollTop = 0;
      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
      }
    });
  });
}

/**
 * Keeps sign-in / sign-up fields visible and typed text readable when the
 * native keyboard opens (Capacitor iOS + Play Store Android).
 */
export function useNativeAuthKeyboard(
  enabled: boolean = isNativeAmyNestShell(),
): {
  kavRef: RefObject<HTMLDivElement | null>;
  scrollRef: RefObject<HTMLDivElement | null>;
  keyboardOpen: boolean;
  dismissKeyboard: () => void;
  handleBackgroundTap: (event: React.MouseEvent | React.TouchEvent) => void;
} {
  const kavRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const fallbackInsetRef = useRef(0);
  const resetTimerRef = useRef<number | null>(null);
  const scrollTimerRef = useRef<number | null>(null);
  const lastScrolledFieldRef = useRef<HTMLElement | null>(null);

  const scrollFocusedIfNeeded = useCallback(
    (behavior: ScrollBehavior = "smooth", delay = AUTH_SCROLL_SETTLE_MS) => {
      if (scrollTimerRef.current != null) {
        window.clearTimeout(scrollTimerRef.current);
      }

      scrollTimerRef.current = window.setTimeout(() => {
        scrollTimerRef.current = null;
        const active = document.activeElement;
        if (!isAuthField(active)) return;
        if (!isAuthInputObscured(active)) return;
        if (lastScrolledFieldRef.current === active) return;

        scrollAuthInputIntoView(active, scrollRef.current, behavior);
        lastScrolledFieldRef.current = active;
      }, delay);
    },
    [],
  );

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

  const resetAfterKeyboard = useCallback(() => {
    if (resetTimerRef.current != null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    fallbackInsetRef.current = 0;
    lastScrolledFieldRef.current = null;
    if (scrollTimerRef.current != null) {
      window.clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
    clearAuthViewportCssVars();
    document.documentElement.classList.remove("amynest-auth-keyboard-open");
    setKeyboardOpen(false);
    resetAuthScrollPosition(scrollRef.current);
  }, []);

  const scheduleResetAfterKeyboard = useCallback(() => {
    if (resetTimerRef.current != null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null;
      if (isAuthField(document.activeElement)) return;
      resetAfterKeyboard();
    }, KEYBOARD_RESET_DELAY_MS);
  }, [resetAfterKeyboard]);

  const openKeyboardLayout = useCallback(
    (metrics: ViewportMetrics) => {
      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
      applyAuthViewportCssVars(metrics);
      document.documentElement.classList.add("amynest-auth-keyboard-open");
      setKeyboardOpen(true);
    },
    [],
  );

  const syncViewport = useCallback(() => {
    const metrics = readViewportMetrics();
    const effectiveInset = Math.max(
      metrics.keyboardInset,
      fallbackInsetRef.current,
    );

    if (effectiveInset <= KEYBOARD_OPEN_THRESHOLD) {
      if (isAuthField(document.activeElement)) return;
      resetAfterKeyboard();
      return;
    }

    openKeyboardLayout({
      height: Math.max(
        0,
        window.innerHeight - effectiveInset - metrics.offsetTop,
      ),
      offsetTop: metrics.offsetTop,
      keyboardInset: effectiveInset,
    });
  }, [openKeyboardLayout, resetAfterKeyboard]);

  const applyAndroidKeyboardFallback = useCallback(() => {
    if (!isNativeAmyNestAndroidWrapper() || isCapacitorNative()) return;
    const metrics = readViewportMetrics();
    if (metrics.keyboardInset >= KEYBOARD_OPEN_THRESHOLD) return;

    const estimated = estimateAndroidKeyboardInset();
    fallbackInsetRef.current = estimated;
    openKeyboardLayout({
      ...metrics,
      keyboardInset: estimated,
      height: Math.max(0, window.innerHeight - estimated - metrics.offsetTop),
    });
  }, [openKeyboardLayout]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const root = document.documentElement;
    root.classList.add("amynest-auth-active");
    clearAuthViewportCssVars();
    resetAuthScrollPosition(scrollRef.current);

    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncViewport);
    vv?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);

    const onNativeKeyboardInset = (event: Event) => {
      const detail = (event as CustomEvent<{ inset?: number; visibleHeight?: number }>)
        .detail;
      const inset = detail?.inset ?? 0;
      fallbackInsetRef.current = 0;
      if (inset > KEYBOARD_OPEN_THRESHOLD) {
        const visibleHeight =
          detail?.visibleHeight ??
          Math.max(0, window.innerHeight - inset);
        openKeyboardLayout({
          height: visibleHeight,
          offsetTop: vv?.offsetTop ?? 0,
          keyboardInset: inset,
        });
        scrollFocusedIfNeeded("smooth");
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
          const mode = isCapacitorIosShell()
            ? KeyboardResize.Body
            : KeyboardResize.Native;
          void Keyboard.setResizeMode({ mode });
          void Keyboard.addListener("keyboardDidShow", () => {
            syncViewport();
            scrollFocusedIfNeeded("smooth");
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

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!isAuthField(target)) return;
      if (kavRef.current && !kavRef.current.contains(target)) return;

      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }

      lastScrolledFieldRef.current = null;
      window.setTimeout(() => syncViewport(), 80);
      scrollFocusedIfNeeded("smooth");
      window.setTimeout(() => applyAndroidKeyboardFallback(), 350);
    };

    const onFocusOut = () => {
      scheduleResetAfterKeyboard();
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

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
      root.classList.remove("amynest-auth-active");
      root.classList.remove("amynest-auth-keyboard-open");
      root.style.removeProperty("--auth-keyboard-inset");
      root.style.removeProperty("--auth-keyboard-inset-native");
      root.style.removeProperty("--auth-kav-offset");
      root.style.removeProperty("--vv-height");
      root.style.removeProperty("--vv-offset-top");
      root.style.removeProperty("--vh");
      vv?.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("amynest-keyboard-inset", onNativeKeyboardInset);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      removeKeyboardShow?.();
      removeKeyboardHide?.();
    };
  }, [
    applyAndroidKeyboardFallback,
    enabled,
    openKeyboardLayout,
    resetAfterKeyboard,
    scheduleResetAfterKeyboard,
    scrollFocusedIfNeeded,
    syncViewport,
  ]);

  return {
    kavRef,
    scrollRef,
    keyboardOpen,
    dismissKeyboard,
    handleBackgroundTap,
  };
}
