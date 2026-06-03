import { isCapacitorNative } from "@/lib/capacitor-native";
import { isCapacitorIosShell, isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";

export interface ChatViewportMetrics {
  height: number;
  offsetTop: number;
  keyboardInset: number;
}

/** Minimum measured IME inset (px) before treating the keyboard as open. */
export function readKeyboardOpenThresholdPx(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(1, Math.round(vv.height * 0.01));
}

export function isKeyboardOpen(metrics: Pick<ChatViewportMetrics, "keyboardInset">): boolean {
  return metrics.keyboardInset > readKeyboardOpenThresholdPx();
}

/** Play Store WebView uses adjustResize — native layer owns resize; web reads innerHeight only. */
export function isAndroidAdjustResizeChatShell(): boolean {
  return isNativeAmyNestAndroidWrapper() && !isCapacitorNative();
}

/**
 * Baseline innerHeight captured before any keyboard activity.
 * Used only for diagnostic logging — not for layout offsets.
 */
let _androidBaselineInnerHeight: number | null = null;

/** @internal Vitest-only — reset baseline between tests. */
export function resetAndroidBaselineHeightForTests(): void {
  _androidBaselineInnerHeight = null;
}

/** Shrunk WebView height reported by MainActivity when IME is visible. */
let _nativeWebViewVisibleHeightPx: number | null = null;

/** @internal Updated from `amynest-keyboard-inset` native bridge events. */
export function setNativeWebViewVisibleHeightPx(px: number | null | undefined): void {
  if (!isAndroidAdjustResizeChatShell()) return;
  _nativeWebViewVisibleHeightPx =
    typeof px === "number" && Number.isFinite(px) && px > 0 ? Math.round(px) : null;
}

export function readNativeWebViewVisibleHeightPx(): number | null {
  return _nativeWebViewVisibleHeightPx;
}

/** Record full-screen innerHeight for keyboard diagnostics. */
export function recordAndroidBaselineHeight(): void {
  if (!isAndroidAdjustResizeChatShell()) return;
  if (typeof window === "undefined") return;
  if (readNativeImeInsetPx() > 0) return;
  _androidBaselineInnerHeight = window.innerHeight;
}

/**
 * Effective chat viewport height on Android WebView shells.
 * When adjustResize works, innerHeight or native visibleHeight already shrank.
 * On Samsung / Android 15 edge-to-edge, subtract measured IME inset once.
 */
export function resolveAndroidChatLayoutHeight(
  keyboardInset: number,
  nativeVisibleHeight: number | null = readNativeWebViewVisibleHeightPx(),
): number {
  if (typeof window === "undefined") return 0;
  const innerH = window.innerHeight;

  if (_androidBaselineInnerHeight != null && keyboardInset > 0) {
    if (innerH < _androidBaselineInnerHeight - keyboardInset * 0.4) {
      return innerH;
    }
  }

  if (nativeVisibleHeight != null && nativeVisibleHeight > 0 && keyboardInset > 0) {
    if (nativeVisibleHeight < innerH - keyboardInset * 0.35) {
      return nativeVisibleHeight;
    }
  }

  const vv = window.visualViewport;
  if (vv && vv.height > 0 && keyboardInset > 0 && vv.height <= innerH - keyboardInset * 0.35) {
    return Math.round(vv.height);
  }

  if (keyboardInset > 0) {
    return Math.max(0, innerH - keyboardInset);
  }

  return innerH;
}

/** True when the web layer must lift the chat shell above the IME (adjustResize broken). */
export function isAndroidWebKeyboardOffsetRequired(
  keyboardInset: number = readNativeImeInsetPx(),
): boolean {
  if (!isAndroidAdjustResizeChatShell()) return false;
  if (!isKeyboardOpen({ keyboardInset })) return false;
  if (typeof window === "undefined") return false;
  const resolved = resolveAndroidChatLayoutHeight(keyboardInset);
  return resolved < window.innerHeight - 8;
}

/** Whether adjustResize appears to have shrunk the WebView (diagnostic only). */
export function isAndroidAdjustResizeBroken(): boolean {
  if (!isAndroidAdjustResizeChatShell()) return false;
  if (typeof window === "undefined") return false;
  const inset = readNativeImeInsetPx();
  if (inset < 100) return false;
  if (_androidBaselineInnerHeight === null) return false;
  const didShrink = window.innerHeight < _androidBaselineInnerHeight - inset * 0.5;
  return !didShrink;
}

export interface AndroidChatLayoutDiagnostic {
  windowInnerHeight: number;
  visualViewportHeight: number | null;
  keyboardInset: number;
  baselineInnerHeight: number | null;
  adjustResizeBroken: boolean;
  /** Computed height if the reverted workaround were applied (for audit). */
  workaroundContainerHeightPx: number | null;
  workaroundContainerBottomPx: number | null;
}

/** Production-safe keyboard layout snapshot for Samsung / Android 15 audit. */
export function readAndroidChatLayoutDiagnostics(
  keyboardInset: number,
): AndroidChatLayoutDiagnostic {
  if (typeof window === "undefined") {
    return {
      windowInnerHeight: 0,
      visualViewportHeight: null,
      keyboardInset,
      baselineInnerHeight: null,
      adjustResizeBroken: false,
      workaroundContainerHeightPx: null,
      workaroundContainerBottomPx: null,
    };
  }
  const vv = window.visualViewport;
  const innerH = window.innerHeight;
  const broken = isAndroidAdjustResizeBroken();
  const inset = keyboardInset > 0 ? keyboardInset : readNativeImeInsetPx();
  // Mirrors the removed workaround: bottom=inset AND height=calc(100%-inset) double-subtracts.
  const workaroundBottom = broken && inset >= 100 ? inset : 0;
  const workaroundHeight =
    workaroundBottom > 0 ? Math.max(0, innerH - workaroundBottom * 2) : innerH;

  return {
    windowInnerHeight: innerH,
    visualViewportHeight: vv?.height ?? null,
    keyboardInset: inset,
    baselineInnerHeight: _androidBaselineInnerHeight,
    adjustResizeBroken: broken,
    workaroundContainerHeightPx: workaroundHeight,
    workaroundContainerBottomPx: workaroundBottom,
  };
}

let _lastLayoutDiagKey = "";

/** Log layout metrics once per keyboard-open / inset change (console + client logs). */
export function logAndroidChatLayoutDiagnostics(surface: string, keyboardInset: number): void {
  if (!isAndroidAdjustResizeChatShell()) return;
  const diag = readAndroidChatLayoutDiagnostics(keyboardInset);
  const key = `${surface}:${diag.keyboardInset}:${diag.windowInnerHeight}`;
  if (key === _lastLayoutDiagKey) return;
  _lastLayoutDiagKey = key;

  console.info("[chat-platform:android-layout]", { surface, ...diag });

  void import("@/lib/client-logs").then(({ queueClientLog }) => {
    queueClientLog({
      type: "info",
      message: "android_chat_layout_diagnostic",
      context: `chat_platform:${surface}`,
      meta: { surface, ...diag },
    });
  });
}

export function usesCapacitorBodyKeyboardResize(): boolean {
  return isCapacitorNative() && isCapacitorIosShell();
}

export function readNativeImeInsetPx(): number {
  if (typeof document === "undefined") return 0;
  const root = document.documentElement;
  const raw =
    root.style.getPropertyValue("--auth-keyboard-inset-native").trim() ||
    root.style.getPropertyValue("--auth-keyboard-inset").trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Keyboard inset measured from `window.visualViewport`.
 *
 * The visual viewport shrinks under the on-screen keyboard on every modern
 * engine (Chrome / Android WebView / Samsung Internet / WKWebView), even when
 * the native shell runs edge-to-edge (`setDecorFitsSystemWindows(false)`) and
 * never resizes the WebView or reports an IME inset. This is the universal,
 * measured keyboard signal — no native bridge or guessed ratios required.
 */
export function readVisualViewportInsetPx(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (!vv || vv.height <= 0) return 0;
  return Math.max(0, Math.round(window.innerHeight - vv.height - (vv.offsetTop ?? 0)));
}

/**
 * Android WebView chat metrics.
 *
 * Precedence:
 * 1. A real native IME inset (`--auth-keyboard-inset-native`) when the wrapper
 *    reports one — authoritative and used for height via measured subtraction.
 * 2. Otherwise the measured `visualViewport` inset — the height is the visual
 *    viewport height directly (no magic ratios), so the composer is pinned
 *    above the keyboard even though the WebView never resized.
 */
function readAndroidChatViewportMetrics(nativeInset: number): ChatViewportMetrics {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const vvInset = readVisualViewportInsetPx();
  const keyboardInset = nativeInset > 0 ? nativeInset : vvInset;
  const height =
    nativeInset > 0
      ? resolveAndroidChatLayoutHeight(nativeInset)
      : vvInset > 0 && vv
        ? Math.round(vv.height)
        : window.innerHeight;
  const offsetTop = vv && keyboardInset > 0 ? Math.max(0, Math.round(vv.offsetTop ?? 0)) : 0;
  return { height, offsetTop, keyboardInset };
}

export function readChatViewportMetrics(): ChatViewportMetrics {
  if (typeof window === "undefined") {
    return { height: 0, offsetTop: 0, keyboardInset: 0 };
  }

  if (isAndroidAdjustResizeChatShell()) {
    recordAndroidBaselineHeight();
    return readAndroidChatViewportMetrics(readNativeImeInsetPx());
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

/** Normalize metrics per platform so keyboard inset is never subtracted twice. */
export function metricsForChatLayout(
  metrics: ChatViewportMetrics,
  keyboardOpen: boolean,
): ChatViewportMetrics {
  if (isAndroidAdjustResizeChatShell()) {
    recordAndroidBaselineHeight();
    if (!keyboardOpen) {
      return { height: window.innerHeight, offsetTop: 0, keyboardInset: 0 };
    }
    // A real native inset wins; otherwise the helper falls back to the measured
    // visual viewport so the keyboard is honoured even with no native bridge.
    return readAndroidChatViewportMetrics(readNativeImeInsetPx());
  }
  if (usesCapacitorBodyKeyboardResize()) {
    if (!keyboardOpen) {
      return { height: window.innerHeight, offsetTop: 0, keyboardInset: 0 };
    }
    // Capacitor `resize: "body"` keeps window.innerHeight at full-screen and only
    // shrinks visualViewport when the keyboard opens. Size the fixed chat
    // container to the visible viewport so the composer is pinned directly above
    // the keyboard (ChatGPT-style) instead of rendering behind it.
    const vv = window.visualViewport;
    const visibleHeight =
      vv && vv.height > 0
        ? Math.round(vv.height)
        : Math.max(0, window.innerHeight - metrics.keyboardInset);
    const offsetTop = vv ? Math.max(0, Math.round(vv.offsetTop)) : 0;
    return {
      height: visibleHeight,
      offsetTop,
      keyboardInset: metrics.keyboardInset,
    };
  }
  return metrics;
}

export function applyChatViewportCssVars(metrics: Pick<ChatViewportMetrics, "height" | "offsetTop">) {
  const root = document.documentElement;
  root.style.setProperty("--vv-height", `${metrics.height}px`);
  root.style.setProperty("--vv-offset-top", `${metrics.offsetTop}px`);
  root.style.setProperty("--vh", `${metrics.height * 0.01}px`);
}

export function clearChatViewportCssVars() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty("--vv-height");
  root.style.removeProperty("--vv-offset-top");
  root.style.removeProperty("--vh");
}

/** Measured visible bottom edge (accounts for keyboard via visualViewport or native inset). */
export function readMeasuredVisibleBottomPx(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  const metrics = readChatViewportMetrics();
  if (isKeyboardOpen(metrics)) {
    if (
      isAndroidAdjustResizeChatShell() &&
      isAndroidWebKeyboardOffsetRequired(metrics.keyboardInset)
    ) {
      return metrics.offsetTop + metrics.height;
    }
    if (vv) return vv.offsetTop + vv.height;
    return window.innerHeight - metrics.keyboardInset;
  }
  return vv ? vv.offsetTop + vv.height : window.innerHeight;
}

export function isChatAnswerTarget(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  return Boolean(
    el.closest(
      '.chat-thread-input input, .chat-thread-input textarea, .chat-thread-input select, .chat-thread-input button, .chat-thread-input [role="combobox"], .chat-thread-input [role="listbox"], .chat-thread-input [role="option"], .chat-thread-input [contenteditable="true"]',
    ),
  );
}
