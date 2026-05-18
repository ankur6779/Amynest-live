import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin";
import { logger } from "../lib/logger";
import { db, parentProfilesTable, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Per-process throttle for the fire-and-forget phone-number sync writes.
 * Without this every authenticated request issues 2 in-flight DB updates;
 * under any DB latency they accumulate in memory and the API OOMs on Render.
 *
 *   PHONE_SYNC_TTL_MS=86400000  (default 24h between writes per uid)
 *
 * The cap is bounded so we never grow this map without limit.
 */
const PHONE_SYNC_TTL_MS = Number(process.env["PHONE_SYNC_TTL_MS"] ?? "86400000");
const PHONE_SYNC_MAX_ENTRIES = 10_000;
const phoneSyncedAt = new Map<string, number>();

function shouldSyncPhoneNow(uid: string): boolean {
  const last = phoneSyncedAt.get(uid);
  if (!last) return true;
  return Date.now() - last >= PHONE_SYNC_TTL_MS;
}

function markPhoneSynced(uid: string): void {
  if (phoneSyncedAt.size >= PHONE_SYNC_MAX_ENTRIES) {
    // Evict oldest 1000 — simple bound to prevent unlimited growth.
    let n = 0;
    for (const k of phoneSyncedAt.keys()) {
      phoneSyncedAt.delete(k);
      if (++n >= 1000) break;
    }
  }
  phoneSyncedAt.set(uid, Date.now());
}

function clearPhoneSynced(uid: string): void {
  phoneSyncedAt.delete(uid);
}

/**
 * Decode a JWT payload without verifying — for diagnostic logging only.
 * Never trust the result for authorization decisions.
 */
function unsafeDecodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Verifies a Firebase ID token from the `Authorization: Bearer <token>`
 * header and attaches `{ userId, email, ... }` to `req.firebaseAuth`.
 * Call sites then read it via `getAuth(req)` from `lib/auth.ts`.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers["authorization"] || "";
  const hasBearer = typeof authHeader === "string" && authHeader.startsWith("Bearer ");
  const token = hasBearer ? (authHeader as string).slice(7).trim() : "";

  if (!token) {
    logger.warn(
      {
        kind: "require_auth_unauthorized",
        reason: "missing_bearer",
        url: req.originalUrl?.split("?")[0],
        method: req.method,
        user_agent: req.headers["user-agent"],
        origin: req.headers["origin"],
      },
      "requireAuth rejected request — no bearer token",
    );
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    const phoneNumber = (decoded.phone_number as string | undefined) ?? null;
    req.firebaseAuth = {
      userId: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified === true,
      phoneNumber,
      name: (decoded.name as string | undefined) ?? null,
      picture: (decoded.picture as string | undefined) ?? null,
    };

    // Throttled fire-and-forget: persist phone number to parent_profiles and
    // subscriptions at most once per user per PHONE_SYNC_TTL_MS so the writes
    // do not pile up under traffic (Render DB latency is non-zero, unlike
    // Replit's co-located DB). Skipped when already synced recently in this
    // process — clients can still backfill via the dedicated profile route.
    if (phoneNumber && shouldSyncPhoneNow(decoded.uid)) {
      markPhoneSynced(decoded.uid);
      Promise.all([
        db
          .update(parentProfilesTable)
          .set({ mobileNumber: phoneNumber, updatedAt: new Date() })
          .where(eq(parentProfilesTable.userId, decoded.uid)),
        db
          .update(subscriptionsTable)
          .set({ phoneNumber, updatedAt: new Date() })
          .where(eq(subscriptionsTable.userId, decoded.uid)),
      ]).catch((syncErr) => {
        // Drop the throttle marker so a subsequent request can retry.
        clearPhoneSynced(decoded.uid);
        logger.warn({ syncErr, uid: decoded.uid }, "requireAuth: phone sync write failed (non-fatal)");
      });
    }

    next();
    return;
  } catch (err) {
    const payload = unsafeDecodeJwtPayload(token);
    const now = Math.floor(Date.now() / 1000);
    logger.warn(
      {
        kind: "require_auth_unauthorized",
        reason: "verify_failed",
        url: req.originalUrl?.split("?")[0],
        method: req.method,
        token_len: token.length,
        verify_error: err instanceof Error ? err.message : String(err),
        jwt_sub: payload?.sub,
        jwt_iss: payload?.iss,
        jwt_aud: payload?.aud,
        jwt_exp: payload?.exp,
        jwt_expired:
          payload && typeof payload.exp === "number" ? payload.exp < now : null,
        user_agent: req.headers["user-agent"],
        origin: req.headers["origin"],
      },
      "requireAuth rejected request — token verification failed",
    );
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
}
