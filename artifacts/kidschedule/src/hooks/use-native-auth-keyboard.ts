import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { isCapacitorNative } from "@/lib/capacitor-native";
import { isNativeAmyNestShell } from "@/lib/native-shell";

/** Applied to email/password/phone inputs on auth screens (native WebView text visibility). */
export const AUTH_INPUT_CLASS = "amynest-auth-input";

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

function applyAuthViewportCssVars(metrics: ViewportMetrics) {
  const root = document.documentElement;
  root.style.setProperty("--vv-height", `${metrics.height}px`);
  root.style.setProperty("--vv-offset-top", `${metrics.offsetTop}px`);
  root.style.setProperty("--vh", `${metrics.height * 0.01}px`);
  root.style.setProperty("--auth-keyboard-inset", `${metrics.keyboardInset}px`);
}

/** Scroll a focused field into the visible area above the software keyboard. */
export function scrollAuthInputIntoView(
  el: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  const run = () => {
    const vv = window.visualViewport;
    const margin = 28;
    if (vv) {
      const rect = el.getBoundingClientRect();
      const visibleTop = vv.offsetTop + margin;
      const visibleBottom = vv.offsetTop + vv.height - margin;
      if (rect.bottom > visibleBottom || rect.top < visibleTop) {
        el.scrollIntoView({ behavior, block: "center", inline: "nearest" });
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
  shellRef: RefObject<HTMLDivElement | null>;
  keyboardOpen: boolean;
} {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const scrollFocused = useCallback((behavior: ScrollBehavior = "smooth") => {
    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement
    ) {
      scrollAuthInputIntoView(active, behavior);
    }
  }, []);

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
          void Keyboard.setResizeMode({ mode: KeyboardResize.Body });
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

    const shell = shellRef.current;
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLTextAreaElement)
      ) {
        return;
      }
      syncViewport();
      scrollAuthInputIntoView(target, "instant");
      window.setTimeout(() => scrollAuthInputIntoView(target, "smooth"), 280);
    };

    shell?.addEventListener("focusin", onFocusIn);

    return () => {
      cancelled = true;
      root.classList.remove("amynest-auth-active");
      root.style.removeProperty("--auth-keyboard-inset");
      vv?.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      shell?.removeEventListener("focusin", onFocusIn);
      removeKeyboardShow?.();
      removeKeyboardHide?.();
    };
  }, [enabled, scrollFocused, syncViewport]);

  return { shellRef, keyboardOpen };
}
