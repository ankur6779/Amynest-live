import type { Server } from "node:http";
import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";
import {
  getGlobalRealtimeCoordinator,
  handleRealtimeWireMessage,
  resolveRealtimeConfig,
} from "@workspace/content-orchestration";
import { createPostgresLearningProfileStore } from "./learningProfileRepository.js";

let attached = false;

/**
 * WebSocket realtime learning at `/ws/content-realtime`.
 * Client: emit JSON `{ type: "event", payload }` / receive `session_update`.
 */
export function attachContentRealtimeGateway(httpServer: Server): void {
  if (attached) return;

  const { experiments, fallback, ml } = resolveRealtimeConfig({
    realtimeEnabled: process.env.REALTIME_ENABLED,
    fallbackStatic: process.env.REALTIME_FALLBACK_STATIC,
    mlEnabled: process.env.ML_NBA_ENABLED,
    mlTraffic: process.env.ML_NBA_TRAFFIC,
  });

  if (fallback.realtimeDisabled) {
    console.log("[realtime] disabled — static plan fallback");
    return;
  }

  const coordinator = getGlobalRealtimeCoordinator({
    experiments,
    ml,
    fallback,
    onProfileFlush: async (childId, profile) => {
      const userId = profile.userId;
      if (!userId) return;
      const store = createPostgresLearningProfileStore(userId);
      await store.upsert(profile);
    },
    onNbaLog: async (log) => {
      const { persistNbaDecisionLog } = await import("./nbaDecisionRepository.js");
      await persistNbaDecisionLog(log);
    },
  });

  const wss = new WebSocketServer({ server: httpServer, path: "/ws/content-realtime" });

  wss.on("connection", (socket: WebSocket, req) => {
    socket.send(JSON.stringify({ type: "connected" }));

    let boundChildId =
      new URL(req.url ?? "/", "http://localhost").searchParams.get("childId") ??
      undefined;

    socket.on("message", (data) => {
      const text = typeof data === "string" ? data : data.toString("utf8");
      try {
        const parsed = JSON.parse(text) as {
          type?: string;
          childId?: string;
          payload?: { childId?: string };
        };
        if (parsed.type === "subscribe" && parsed.childId) {
          boundChildId = parsed.childId;
        }
        if (parsed.type === "event" && parsed.payload?.childId) {
          boundChildId = parsed.payload.childId;
        }
      } catch {
        /* handled below */
      }
      const response = handleRealtimeWireMessage(coordinator, text);
      socket.send(JSON.stringify(response));
    });

    socket.on("close", () => {
      if (boundChildId) coordinator.endSession(boundChildId);
    });
  });

  attached = true;
  console.log("[realtime] WebSocket on /ws/content-realtime");
}
