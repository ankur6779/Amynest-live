/**
 * Talking Amy analytics — mode/replay/session counts only. Never recordings.
 */

import { queueClientLog } from "@/lib/client-logs";
import type { TalkingAmyModeId } from "@/lib/talking-amy-modes";

export type TalkingAmyTelemetryEvent =
  | "talking_amy_session_started"
  | "talking_amy_mode_selected"
  | "talking_amy_replay"
  | "talking_amy_surprise_mode";

function emit(event: TalkingAmyTelemetryEvent, meta: Record<string, unknown>): void {
  queueClientLog({
    type: "info",
    message: `[talking-amy] ${event}`,
    meta: { feature: "talking_amy", event, ...meta },
  });
}

export function trackTalkingAmySessionStarted(childId: number, sessionCount: number): void {
  emit("talking_amy_session_started", { childId, sessionCount });
}

export function trackTalkingAmyModeSelected(childId: number, modeId: TalkingAmyModeId): void {
  emit("talking_amy_mode_selected", { childId, modeId });
}

export function trackTalkingAmyReplay(childId: number, replayCount: number): void {
  emit("talking_amy_replay", { childId, replayCount });
}

export function trackTalkingAmySurpriseMode(childId: number, modeId: TalkingAmyModeId): void {
  emit("talking_amy_surprise_mode", { childId, modeId });
}
