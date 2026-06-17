export type { ChatPlatformTelemetryEvent, ChatPlatformTelemetryMeta } from "./telemetry";
export { trackChatPlatformEvent } from "./telemetry";

export type { ChatViewportMetrics } from "./viewport";
export {
  applyChatViewportCssVars,
  clearChatViewportCssVars,
  isAndroidAdjustResizeBroken,
  isAndroidAdjustResizeChatShell,
  isAndroidWebKeyboardOffsetRequired,
  isChatAnswerTarget,
  isKeyboardOpen,
  logAndroidChatLayoutDiagnostics,
  metricsForChatLayout,
  readAndroidChatLayoutDiagnostics,
  readChatViewportMetrics,
  readKeyboardOpenThresholdPx,
  readMeasuredVisibleBottomPx,
  readNativeImeInsetPx,
  readNativeWebViewVisibleHeightPx,
  recordAndroidBaselineHeight,
  resetAndroidBaselineHeightForTests,
  resetCapacitorIosKeyboardInsetForTests,
  resolveAndroidChatLayoutHeight,
  setCapacitorIosKeyboardInsetPx,
  setNativeWebViewVisibleHeightPx,
  usesCapacitorBodyKeyboardResize,
} from "./viewport";
export type { AndroidChatLayoutDiagnostic } from "./viewport";

export type {
  ChatVisibilityContext,
  ChatVisibilitySnapshot,
  EnsureVisibilityOptions,
  EnsureVisibilityResult,
  SelfHealingScheduleOptions,
  SelfHealingVisibilityHandle,
} from "./visibility";
export {
  CHAT_PROMPT_ATTR,
  ensureChatPromptVisible,
  measureChatVisibility,
  resolveActiveChatPromptId,
  scheduleSelfHealingVisibility,
  validateActivePromptVisibility,
} from "./visibility";

export type { ChatPlatformRemoteConfig } from "./remote-config";
export {
  getChatPlatformRemoteConfig,
  isForcePromptVisibilityModeActive,
  refreshChatPlatformRemoteConfig,
  startChatPlatformRemoteConfigPolling,
  subscribeChatPlatformRemoteConfig,
} from "./remote-config";

/** @deprecated Import from `@/lib/chat-platform` instead. */
export { readKeyboardOpenThresholdPx as KEYBOARD_OPEN_THRESHOLD_LEGACY } from "./viewport";
