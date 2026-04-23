import { Router, type IRouter } from "express";
import { adminAuth } from "../lib/firebase-admin";

/**
 * Diagnostic auth endpoint — does NOT require auth and never throws.
 * Decodes the bearer token without verification, then attempts Firebase
 * verification and reports the result. Use to debug 401s in production.
 *
 *   GET /api/auth/whoami        with Authorization: Bearer <firebase-id-token>
 */
const router: IRouter = Router();

function unsafeDecodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

router.get("/auth/whoami", async (req, res): Promise<void> => {
  const authHeader = req.headers["authorization"] || "";
  const hasBearer =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ");
  const token = hasBearer ? (authHeader as string).slice(7).trim() : "";

  const payload = token ? unsafeDecodeJwtPayload(token) : null;
  const now = Math.floor(Date.now() / 1000);

  let firebaseVerified = false;
  let firebaseUserId: string | null = null;
  let firebaseError: string | null = null;
  if (token) {
    try {
      const decoded = await adminAuth().verifyIdToken(token);
      firebaseVerified = true;
      firebaseUserId = decoded.uid;
    } catch (err) {
      firebaseError = err instanceof Error ? err.message : String(err);
    }
  }

  res.json({
    server_time: new Date().toISOString(),
    server_time_unix: now,
    has_authorization_header: hasBearer,
    token_length: token.length,
    firebase: {
      verified: firebaseVerified,
      user_id: firebaseUserId,
      error: firebaseError,
    },
    jwt_payload_unverified: payload
      ? {
          sub: payload.sub,
          iss: payload.iss,
          aud: payload.aud,
          exp: payload.exp,
          iat: payload.iat,
          expired:
            typeof payload.exp === "number" ? payload.exp < now : null,
          ttl_sec:
            typeof payload.exp === "number" ? payload.exp - now : null,
          age_sec:
            typeof payload.iat === "number" ? now - payload.iat : null,
        }
      : null,
    env: {
      node_env: process.env.NODE_ENV ?? "unknown",
      has_firebase_service_account: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
      firebase_project_id: process.env.FIREBASE_PROJECT_ID ?? null,
    },
  });
});

export default router;
