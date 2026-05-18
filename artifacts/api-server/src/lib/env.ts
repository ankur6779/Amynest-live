/**
 * Production-safe environment helpers for Render and local dev.
 * Never logs secret values — only presence, length, and parse errors.
 */
import { logger } from "./logger";
import { amynestEnvLabel, resolveAmynestEnv } from "./loadEnv";

function readRaw(name: string): string | undefined {
  const v = process.env[name];
  if (v == null) return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** First non-empty value among `names` (Render often uses one of several aliases). */
export function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const v = readRaw(name);
    if (v) return v;
  }
  return undefined;
}

export type EnvPresence = "set" | "missing" | "empty";

export function envPresence(name: string): EnvPresence {
  const v = process.env[name];
  if (v == null) return "missing";
  if (v.trim().length === 0) return "empty";
  return "set";
}

export function envLengthHint(name: string): number | null {
  const v = readRaw(name);
  return v ? v.length : null;
}

const DRIVE_KEY_VARS = [
  "GOOGLE_API_KEY",
  "GOOGLE_DRIVE_API_KEY",
  "GOOGLE_DRIVE_KEY",
] as const;

export function getDriveApiKey(): string | undefined {
  return readEnv(...DRIVE_KEY_VARS);
}

export function getDriveKeyDiagnostics(): {
  resolved: boolean;
  activeVar: string | null;
  checked: Array<{ name: string; presence: EnvPresence; length: number | null }>;
  misplacedFrontendKey: boolean;
} {
  let activeVar: string | null = null;
  const checked = DRIVE_KEY_VARS.map((name) => {
    const presence = envPresence(name);
    const length = envLengthHint(name);
    if (presence === "set" && !activeVar) activeVar = name;
    return { name, presence, length };
  });
  const misplacedFrontendKey =
    envPresence("VITE_GOOGLE_API_KEY") === "set" && !getDriveApiKey();
  return {
    resolved: !!getDriveApiKey(),
    activeVar,
    checked,
    misplacedFrontendKey,
  };
}

export function getElevenLabsApiKey(): string | undefined {
  return readEnv("ELEVENLABS_API_KEY", "ELEVEN_LABS_API_KEY");
}

/** Public API base URL — explicit env, then Render service hostname. */
export function resolveApiPublicUrl(): string | null {
  const explicit = readEnv("API_PUBLIC_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  const renderService = readRaw("RENDER_SERVICE_NAME");
  if (renderService) {
    return `https://${renderService.toLowerCase()}.onrender.com`;
  }
  return null;
}

export interface GcsCredentialsParseResult {
  ok: boolean;
  projectId?: string;
  clientEmail?: string;
  credentials?: Record<string, unknown>;
  source?: "GCS_SERVICE_ACCOUNT_JSON" | "GCS_SERVICE_ACCOUNT_JSON_B64" | "GOOGLE_APPLICATION_CREDENTIALS";
  error?: string;
}

/** Parse service-account JSON from Render (plain, escaped newlines, or base64). */
export function parseGcsServiceAccountJson(): GcsCredentialsParseResult {
  const b64 = readRaw("GCS_SERVICE_ACCOUNT_JSON_B64");
  if (b64) {
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      const creds = JSON.parse(decoded) as Record<string, unknown>;
      return credsFromObject(creds, "GCS_SERVICE_ACCOUNT_JSON_B64", creds);
    } catch (err) {
      return {
        ok: false,
        error: `GCS_SERVICE_ACCOUNT_JSON_B64 decode failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  const raw = readRaw("GCS_SERVICE_ACCOUNT_JSON");
  if (raw) {
    const creds = tryParseJsonObject(raw);
    if (creds) return credsFromObject(creds, "GCS_SERVICE_ACCOUNT_JSON", creds);
    return { ok: false, error: "GCS_SERVICE_ACCOUNT_JSON is set but not valid JSON" };
  }

  const gac = readRaw("GOOGLE_APPLICATION_CREDENTIALS");
  if (gac) {
    return { ok: true, source: "GOOGLE_APPLICATION_CREDENTIALS" };
  }

  return { ok: false, error: "No GCS credentials env vars set" };
}

function tryParseJsonObject(raw: string): Record<string, unknown> | null {
  const candidates = [raw.trim()];
  if (raw.includes("\\n")) {
    candidates.push(raw.replace(/\\n/g, "\n"));
  }
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      candidates.push(JSON.parse(raw) as string);
    } catch {
      /* ignore */
    }
  }
  for (const s of candidates) {
    try {
      return JSON.parse(s) as Record<string, unknown>;
    } catch {
      /* try next */
    }
  }
  try {
    const decoded = Buffer.from(raw.trim(), "base64").toString("utf8");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function credsFromObject(
  creds: Record<string, unknown>,
  source: GcsCredentialsParseResult["source"],
  credentials: Record<string, unknown>,
): GcsCredentialsParseResult {
  const projectId = typeof creds.project_id === "string" ? creds.project_id : undefined;
  const clientEmail = typeof creds.client_email === "string" ? creds.client_email : undefined;
  if (!projectId || !clientEmail) {
    return { ok: false, error: "Service account JSON missing project_id or client_email" };
  }
  return { ok: true, projectId, clientEmail, credentials, source };
}

export function getGcsBucketId(): string | undefined {
  return readEnv(
    "DEFAULT_OBJECT_STORAGE_BUCKET_ID",
    "GCS_BUCKET_NAME",
    "GOOGLE_CLOUD_STORAGE_BUCKET",
  );
}

export type GcsPublicCredentials = {
  ok: boolean;
  projectId?: string;
  clientEmail?: string;
  source?: GcsCredentialsParseResult["source"];
  error?: string;
};

export function toPublicGcsCredentials(
  parsed: GcsCredentialsParseResult,
): GcsPublicCredentials {
  return {
    ok: parsed.ok,
    projectId: parsed.projectId,
    clientEmail: parsed.clientEmail,
    source: parsed.source,
    error: parsed.error,
  };
}

export function getGcsDiagnostics(): {
  bucketId: EnvPresence;
  bucketName: string | null;
  credentials: GcsPublicCredentials;
  legacyGcsConfigured: boolean;
  ttsStorageForced: string | null;
} {
  const bucketName = getGcsBucketId() ?? null;
  const parsed = parseGcsServiceAccountJson();
  const credentials = toPublicGcsCredentials(parsed);
  const legacyGcsConfigured =
    !!bucketName && (parsed.ok || parsed.source === "GOOGLE_APPLICATION_CREDENTIALS");
  return {
    bucketId: bucketName ? "set" : envPresence("DEFAULT_OBJECT_STORAGE_BUCKET_ID"),
    bucketName: bucketName ? `${bucketName.slice(0, 8)}…` : null,
    credentials,
    legacyGcsConfigured,
    ttsStorageForced: readEnv("TTS_STORAGE") ?? null,
  };
}

/** Log once at startup — safe for production (no secret values). */
export function logStartupEnvDiagnostics(): void {
  const amynestEnv = resolveAmynestEnv();
  logger.info(
    {
      evt: "env.profile",
      amynestEnv,
      profile: amynestEnvLabel(amynestEnv),
      nodeEnv: process.env.NODE_ENV ?? "unset",
      renderService: process.env.RENDER_SERVICE_NAME ?? null,
    },
    `AmyNest API profile: ${amynestEnvLabel(amynestEnv)}`,
  );

  const drive = getDriveKeyDiagnostics();
  const gcs = getGcsDiagnostics();
  const eleven = !!getElevenLabsApiKey();

  if (!drive.resolved) {
    logger.warn(
      {
        evt: "env.missing",
        service: "google_drive",
        checked: drive.checked,
        misplacedFrontendKey: drive.misplacedFrontendKey,
      },
      drive.misplacedFrontendKey
        ? "GOOGLE_API_KEY missing on API service — VITE_GOOGLE_API_KEY only applies to static web build"
        : "GOOGLE_API_KEY (or GOOGLE_DRIVE_API_KEY) not set on Amynest-backend",
    );
  } else {
    logger.info(
      { evt: "env.ok", service: "google_drive", activeVar: drive.activeVar },
      "Google Drive API key loaded",
    );
  }

  if (!eleven) {
    logger.warn(
      { evt: "env.missing", service: "elevenlabs" },
      "ELEVENLABS_API_KEY not set — Amy TTS will return 503",
    );
  } else {
    logger.info({ evt: "env.ok", service: "elevenlabs" }, "ElevenLabs API key loaded");
  }

  if (!gcs.legacyGcsConfigured) {
    logger.info(
      {
        evt: "env.gcs",
        legacyGcsConfigured: false,
        bucketId: gcs.bucketId,
        credentialsOk: gcs.credentials.ok,
        credentialsError: gcs.credentials.error,
        ttsStorageForced: gcs.ttsStorageForced,
      },
      "TTS will use Postgres bytea (GCS optional for legacy Replit cache)",
    );
  } else {
    logger.info(
      {
        evt: "env.ok",
        service: "gcs",
        bucketHint: gcs.bucketName,
        credentialsSource: gcs.credentials.source,
        projectId: gcs.credentials.projectId,
      },
      "GCS TTS storage configured",
    );
  }
}
