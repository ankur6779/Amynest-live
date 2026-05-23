import type { RealtimeCoordinator } from "./realtimeCoordinator.js";
import type {
  ClientEmitMessage,
  ClientSubscribeMessage,
  SessionUpdateMessage,
} from "./types.js";

export type RealtimeWireMessage =
  | ClientEmitMessage
  | ClientSubscribeMessage
  | SessionUpdateMessage
  | { type: "error"; message: string }
  | { type: "connected"; childId?: string };

/**
 * Transport-agnostic message handler.
 * WebSocket / Socket.IO adapters parse JSON and call this.
 *
 * Client contract:
 *   send: { type: "subscribe", childId, sessionPlan, profile? }
 *   send: { type: "event", payload: RealtimeEvent }
 *   receive: { type: "session_update", action, payload, sessionPlan, ... }
 */
export function handleRealtimeWireMessage(
  coordinator: RealtimeCoordinator,
  raw: string,
): RealtimeWireMessage {
  try {
    const parsed = JSON.parse(raw) as ClientEmitMessage | ClientSubscribeMessage;
    if (parsed.type === "subscribe" || parsed.type === "event") {
      const update = coordinator.handleClientMessage(parsed);
      if (update) return update;
      if (parsed.type === "event") {
        return { type: "error", message: "session_not_subscribed" };
      }
      return { type: "error", message: "subscribe_failed" };
    }
    return { type: "error", message: "unknown_message_type" };
  } catch {
    return { type: "error", message: "invalid_json" };
  }
}
