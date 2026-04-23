import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin";
import { logger } from "../lib/logger";

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
    req.firebaseAuth = {
      userId: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified === true,
      name: (decoded.name as string | undefined) ?? null,
      picture: (decoded.picture as string | undefined) ?? null,
    };
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
