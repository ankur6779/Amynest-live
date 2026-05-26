import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { isCapacitorNative } from "@/lib/capacitor-native";
import { isCapacitorIosShell } from "@/lib/device-lite";
import { isNativeAmyNestShell } from "@/lib/native-shell";

/** Applied to email/password/phone inputs on auth screens (native WebView text visibility). */
export const AUTH_INPUT_CLASS = "amynest-auth-input";

const AUTH_INPUT_SCROLL_MARGIN = 28;

interface ViewportMetrics {
  height: number;
  offsetTop: number;
  keyboardInset: number;
}

function readViewportMetrics(): ViewportMetrics {
  if (typeof window === "undefined") {
    return { height: 0, offsetTop: 0, keyboardInset: 0 };
  }

  const vv = window.visualViewport;
  const height = vv?.height ?? window.innerHeight;
  const offsetTop = vv?.offsetTop ?? 0;
  const keyboardInset = Math.max(0, window.innerHeight - height - offsetTop);

  return { height, offsetTop, keyboardInset };
}

/** Extra clearance so focused fields sit above the keyboard (iOS safe-area / status bar). */
function readKeyboardVerticalOffset(): number {
  if (!isCapacitorIosShell()) return 0;
  return 12;
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

function isAuthField(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
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

/** Scroll a focused field into the visible area above the software keyboard. */
export function scrollAuthInputIntoView(
  el: HTMLElement,
  scrollContainer?: HTMLElement | null,
  behavior: ScrollBehavior = "smooth",
  margin: number = AUTH_INPUT_SCROLL_MARGIN,
) {
  const run = () => {
    const vv = window.visualViewport;
    const visibleTop = (vv?.offsetTop ?? 0) + margin;
    const visibleBottom =
      (vv?.offsetTop ?? 0) + (vv?.height ?? window.innerHeight) - margin;
    const rect = el.getBoundingClientRect();

    if (rect.top >= visibleTop && rect.bottom <= visibleBottom) {
      return;
    }

    if (scrollContainer) {
      let delta = 0;
      if (rect.bottom > visibleBottom) {
        delta = rect.bottom - visibleBottom;
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
    applyAuthViewportCssVars(metrics);
    setKeyboardOpen(metrics.keyboardInset > 72);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const root = document.documentElement;
    root.classList.add("amynest-auth-active");
    syncViewport();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncViewport);
    vv?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);

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
      syncViewport();
      scrollAuthInputIntoView(target, scrollRef.current, "instant");
      window.setTimeout(
        () => scrollAuthInputIntoView(target, scrollRef.current, "smooth"),
        280,
      );
    };

    document.addEventListener("focusin", onFocusIn);

    return () => {
      cancelled = true;
      root.classList.remove("amynest-auth-active");
      root.style.removeProperty("--auth-keyboard-inset");
      root.style.removeProperty("--auth-kav-offset");
      vv?.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      document.removeEventListener("focusin", onFocusIn);
      removeKeyboardShow?.();
      removeKeyboardHide?.();
    };
  }, [enabled, scrollFocused, syncViewport]);

  return {
    kavRef,
    scrollRef,
    keyboardOpen,
    dismissKeyboard,
    handleBackgroundTap,
  };
}
