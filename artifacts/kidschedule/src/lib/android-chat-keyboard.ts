/** @deprecated Import from `@/lib/chat-platform` instead. */
export {
  CHAT_PROMPT_ATTR,
  applyChatViewportCssVars,
  clearChatViewportCssVars,
  ensureChatPromptVisible,
  isAndroidAdjustResizeChatShell,
  isChatAnswerTarget,
  isKeyboardOpen,
  metricsForChatLayout,
  measureChatVisibility,
  readChatViewportMetrics,
  readKeyboardOpenThresholdPx,
  readMeasuredVisibleBottomPx,
  readNativeImeInsetPx,
  resolveActiveChatPromptId,
  scheduleSelfHealingVisibility,
  trackChatPlatformEvent,
  usesCapacitorBodyKeyboardResize,
  validateActivePromptVisibility,
} from "@/lib/chat-platform";

export type { ChatViewportMetrics } from "@/lib/chat-platform";

/** @deprecated use readKeyboardOpenThresholdPx() */
export { readKeyboardOpenThresholdPx as KEYBOARD_OPEN_THRESHOLD } from "@/lib/chat-platform";

/** @deprecated self-healing visibility replaces fixed settle delays */
export const CHAT_SCROLL_SETTLE_MS = 150;
