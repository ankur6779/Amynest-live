import type { IncomingMessage, Server } from "node:http";
import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";
import { and, eq } from "drizzle-orm";
import {
  getGlobalRealtimeCoordinator,
  handleRealtimeWireMessage,
  resolveRealtimeConfig,
  type LearningProfile,
} from "@workspace/content-orchestration";
import { db, childrenTable } from "@workspace/db";
import { adminAuth } from "./firebase-admin.js";
import { createPostgresLearningProfileStore } from "./learningProfileRepository.js";
import { logger } from "./logger.js";

let attached = false;

/**
 * Extract Firebase ID token from WS upgrade.
 * Browsers cannot set Authorization on WS, so `?token=` / `?access_token=` are also accepted.
 */
export function extractRealtimeWsToken(req: IncomingMessage): string | null {
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const fromQuery =
      url.searchParams.get("token")?.trim() ||
      url.searchParams.get("access_token")?.trim() ||
      "";
    return fromQuery || null;
  } catch {
    return null;
  }
}

/** Parse a positive integer child id from subscribe/event payloads. */
export function parseRealtimeChildId(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const n = Number(raw.trim());
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  return null;
}

/**
 * Never trust client-supplied profile.userId — bind the authenticated uid.
 * Returns undefined when no profile was provided (subscribe without profile).
 */
export function bindRealtimeProfileToAuthUser(
  profile: LearningProfile | undefined,
  authUserId: string,
  childId: string,
): LearningProfile | undefined {
  if (!profile) return undefined;
  return {
    ...profile,
    childId,
    userId: authUserId,
  };
}

async function isChildOwner(userId: string, childId: number): Promise<boolean> {
  const rows = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

async function resolveChildOwnerUserId(childId: number): Promise<string | null> {
  const rows = await db
    .select({ userId: childrenTable.userId })
    .from(childrenTable)
    .where(eq(childrenTable.id, childId))
    .limit(1);
  return rows[0]?.userId ?? null;
}

type WireEnvelope = {
  type?: string;
  childId?: unknown;
  payload?: { childId?: unknown };
  profile?: LearningProfile;
  sessionPlan?: unknown;
};

/**
 * WebSocket realtime learning at `/ws/content-realtime`.
 * Requires Firebase auth (Bearer or ?token=) and child ownership — same bar as
 * POST /api/content/realtime/event. Unauthenticated clients previously could
 * subscribe as any childId and flush poisoned learning profiles into Postgres.
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
      const numericId = Number(childId);
      if (!Number.isFinite(numericId) || numericId <= 0) return;
      // Resolve owner from DB — never trust profile.userId from the wire.
      const ownerId = await resolveChildOwnerUserId(numericId);
      if (!ownerId) return;
      const store = createPostgresLearningProfileStore(ownerId);
      await store.upsert({ ...profile, childId: String(numericId), userId: ownerId });
    },
    onNbaLog: async (log) => {
      const { persistNbaDecisionLog } = await import("./nbaDecisionRepository.js");
      await persistNbaDecisionLog(log);
    },
  });

  const wss = new WebSocketServer({ server: httpServer, path: "/ws/content-realtime" });

  wss.on("connection", (socket: WebSocket, req) => {
    void (async () => {
      const token = extractRealtimeWsToken(req);
      if (!token) {
        socket.close(1008, "unauthorized");
        return;
      }

      let authUserId: string;
      try {
        const decoded = await adminAuth().verifyIdToken(token);
        authUserId = decoded.uid;
      } catch (err) {
        logger.warn(
          {
            evt: "realtime.ws_auth_failed",
            error: err instanceof Error ? err.message : String(err),
          },
          "content-realtime WS rejected — token verification failed",
        );
        socket.close(1008, "unauthorized");
        return;
      }

      if (socket.readyState !== socket.OPEN) return;
      socket.send(JSON.stringify({ type: "connected" }));

      let boundChildId: string | undefined;

      socket.on("message", (data) => {
        void (async () => {
          const text = typeof data === "string" ? data : data.toString("utf8");
          let parsed: WireEnvelope;
          try {
            parsed = JSON.parse(text) as WireEnvelope;
          } catch {
            socket.send(JSON.stringify({ type: "error", message: "invalid_json" }));
            return;
          }

          const rawChildId =
            parsed.type === "subscribe"
              ? parsed.childId
              : parsed.type === "event"
                ? parsed.payload?.childId
                : undefined;
          const childIdNum = parseRealtimeChildId(rawChildId);
          if (childIdNum == null) {
            socket.send(JSON.stringify({ type: "error", message: "invalid_child_id" }));
            return;
          }

          if (!(await isChildOwner(authUserId, childIdNum))) {
            socket.send(JSON.stringify({ type: "error", message: "forbidden" }));
            return;
          }

          boundChildId = String(childIdNum);

          let wireText = text;
          if (parsed.type === "subscribe") {
            const safeProfile = bindRealtimeProfileToAuthUser(
              parsed.profile,
              authUserId,
              boundChildId,
            );
            wireText = JSON.stringify({
              ...parsed,
              childId: boundChildId,
              profile: safeProfile,
            });
          } else if (parsed.type === "event" && parsed.payload) {
            wireText = JSON.stringify({
              ...parsed,
              payload: { ...parsed.payload, childId: boundChildId },
            });
          }

          const response = handleRealtimeWireMessage(coordinator, wireText);
          if (socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify(response));
          }
        })().catch((err) => {
          logger.warn(
            { evt: "realtime.ws_message_failed", err },
            "content-realtime WS message handler failed",
          );
          if (socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify({ type: "error", message: "server_error" }));
          }
        });
      });

      socket.on("close", () => {
        if (boundChildId) coordinator.endSession(boundChildId);
      });
    })().catch((err) => {
      logger.warn(
        { evt: "realtime.ws_connection_failed", err },
        "content-realtime WS connection setup failed",
      );
      try {
        socket.close(1011, "server_error");
      } catch {
        /* ignore */
      }
    });
  });

  attached = true;
  console.log("[realtime] WebSocket on /ws/content-realtime (auth required)");
}
