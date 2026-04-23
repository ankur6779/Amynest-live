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
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON env var is missing. " +
        "Add the Firebase service account JSON (single-line) to enable auth.",
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    logger.error({ kind: "firebase_admin_parse_error" }, "Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON");
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }

  // Firebase requires real newlines in the private key. When the JSON is
  // pasted into a secret editor, they often arrive as literal "\n". Normalize.
  if (typeof parsed.private_key === "string") {
    parsed.private_key = (parsed.private_key as string).replace(/\\n/g, "\n");
  }

  _app = initializeApp({
    credential: cert(parsed as any),
    projectId: (parsed.project_id as string) || process.env.FIREBASE_PROJECT_ID,
  });
  _auth = getAdminAuth(_app);
  logger.info(
    { kind: "firebase_admin_initialized", project_id: parsed.project_id },
    "Firebase Admin SDK initialized",
  );
  return { app: _app, auth: _auth };
}

export function adminAuth(): AdminAuth {
  return init().auth;
}

export function adminApp(): App {
  return init().app;
}
