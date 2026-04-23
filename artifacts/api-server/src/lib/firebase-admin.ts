import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getAuth as getAdminAuth, type Auth as AdminAuth } from "firebase-admin/auth";
import { logger } from "./logger";

let _app: App | null = null;
let _auth: AdminAuth | null = null;

function init(): { app: App; auth: AdminAuth } {
  if (_app && _auth) return { app: _app, auth: _auth };

  if (getApps().length > 0) {
    _app = getApps()[0]!;
    _auth = getAdminAuth(_app);
    return { app: _app, auth: _auth };
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  // Try full service-account credential first (needed for admin operations like
  // custom tokens). If the JSON is missing or malformed, fall back to
  // project-ID-only mode — verifyIdToken() still works because it uses Google's
  // public RSA keys, not the service-account private key.
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      // Firebase requires real newlines in the private key. When the JSON is
      // pasted into a secret editor they often arrive as literal "\n". Normalise.
      if (typeof parsed.private_key === "string") {
        parsed.private_key = (parsed.private_key as string).replace(/\\n/g, "\n");
      }
      _app = initializeApp({
        credential: cert(parsed as any),
        projectId: (parsed.project_id as string) || projectId,
      });
      _auth = getAdminAuth(_app);
      logger.info(
        { kind: "firebase_admin_initialized_with_cert", project_id: parsed.project_id },
        "Firebase Admin SDK initialized with service account",
      );
      return { app: _app, auth: _auth };
    } catch (err) {
      logger.warn(
        {
          kind: "firebase_admin_cert_fallback",
          error: err instanceof Error ? err.message : String(err),
        },
        "FIREBASE_SERVICE_ACCOUNT_JSON is invalid — falling back to project-ID-only mode (token verification still works)",
      );
    }
  } else {
    logger.warn(
      { kind: "firebase_admin_no_json" },
      "FIREBASE_SERVICE_ACCOUNT_JSON not set — using project-ID-only mode",
    );
  }

  // Project-ID-only fallback: verifyIdToken() fetches Google's public certs
  // automatically — no private key needed for this operation.
  if (!projectId) {
    throw new Error(
      "FIREBASE_PROJECT_ID env var is missing — cannot initialize Firebase Admin SDK.",
    );
  }

  _app = initializeApp({ projectId });
  _auth = getAdminAuth(_app);
  logger.info(
    { kind: "firebase_admin_initialized_no_cert", project_id: projectId },
    "Firebase Admin SDK initialized in verify-only mode (no service account)",
  );
  return { app: _app, auth: _auth };
}

export function adminAuth(): AdminAuth {
  return init().auth;
}

export function adminApp(): App {
  return init().app;
}
