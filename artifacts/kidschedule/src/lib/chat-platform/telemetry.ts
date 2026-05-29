import { queueClientLog } from "@/lib/client-logs";
import { getChatPlatformDeviceContext } from "@/lib/chat-platform/device-context";

export type ChatPlatformTelemetryEvent =
  | "chat_prompt_hidden_after_keyboard_open"
  | "chat_prompt_recovery_triggered"
  | "keyboard_visibility_failures"
  | "android_keyboard_layout_conflicts";

export interface ChatPlatformTelemetryMeta {
  surface: string;
  route?: string;
  promptId?: string | null;
  keyboardOpen?: boolean;
  promptVisible?: boolean;
  answerVisible?: boolean;
  promptOverlapsKeyboard?: boolean;
  answerOverlapsKeyboard?: boolean;
  scrollLostActivePrompt?: boolean;
  recoveryPass?: number;
  [key: string]: unknown;
}

export function trackChatPlatformEvent(
  event: ChatPlatformTelemetryEvent,
  meta: ChatPlatformTelemetryMeta,
): void {
  const device = getChatPlatformDeviceContext();
  queueClientLog({
    type: "info",
    message: event,
    context: `chat_platform:${meta.surface}`,
    route: meta.route,
    meta: { event, ...device, ...meta },
  });

  if (import.meta.env.DEV) {
    console.info(`[ChatPlatform:${event}]`, meta);
  }
}
