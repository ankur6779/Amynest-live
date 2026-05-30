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
 * Used to detect whether adjustResize is actually shrinking the WebView.
 */
let _androidBaselineInnerHeight: number | null = null;

/**
 * Call once on component mount (before any keyboard opens) to record the
 * full-screen innerHeight. This baseline lets us detect Android 15 edge-to-edge
 * mode where adjustResize no longer shrinks the WebView.
 */
export function recordAndroidBaselineHeight(): void {
  if (!isAndroidAdjustResizeChatShell()) return;
  if (typeof window === "undefined") return;
  // Only record when the keyboard is definitely closed.
  if (readNativeImeInsetPx() > 0) return;
  _androidBaselineInnerHeight = window.innerHeight;
}

/**
 * Returns true when the native IME inset is non-zero but the WebView has NOT
 * shrunk — meaning adjustResize is broken (Android 15+ edge-to-edge default).
 * In this case the keyboard overlays content and the container must manually
 * offset its bottom edge by the inset amount.
 */
export function isAndroidAdjustResizeBroken(): boolean {
  if (!isAndroidAdjustResizeChatShell()) return false;
  if (typeof window === "undefined") return false;
  const inset = readNativeImeInsetPx();
  // Need a meaningful inset to evaluate — at least 100 px (keyboard).
  if (inset < 100) return false;
  // If we never recorded a baseline, assume broken (safe default on Android 15).
  if (_androidBaselineInnerHeight === null) return true;
  // If innerHeight shrank by at least half the inset, adjustResize is working.
  const didShrink = window.innerHeight < _androidBaselineInnerHeight - inset * 0.5;
  return !didShrink;
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

export function readChatViewportMetrics(): ChatViewportMetrics {
  if (typeof window === "undefined") {
    return { height: 0, offsetTop: 0, keyboardInset: 0 };
  }

  if (isAndroidAdjustResizeChatShell()) {
    return {
      height: window.innerHeight,
      offsetTop: 0,
      keyboardInset: readNativeImeInsetPx(),
    };
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
  if (usesCapacitorBodyKeyboardResize() || isAndroidAdjustResizeChatShell()) {
    return {
      height: window.innerHeight,
      offsetTop: 0,
      keyboardInset: keyboardOpen ? metrics.keyboardInset : 0,
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
