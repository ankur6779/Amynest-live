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

/**
 * Parse a millisecond duration from env. Strips `_` separators (e.g. "30_000").
 * `Number("10_000")` is NaN — never use underscore literals in env string defaults.
 */
export function parseEnvMs(name: string, fallbackMs: number): number {
  const raw = readRaw(name);
  if (!raw) return fallbackMs;
  const normalized = raw.replace(/_/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : fallbackMs;
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

export type TtsProvider = "openai" | "elevenlabs";

function envFlagEnabled(name: string, defaultEnabled: boolean): boolean {
  const raw = readEnv(name);
  if (raw == null) return defaultEnabled;
  const v = raw.toLowerCase();
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  return defaultEnabled;
}

/** Dynamic TTS via ElevenLabs — temporarily off by default (use OpenAI streaming). */
export function isElevenLabsTtsEnabled(): boolean {
  return envFlagEnabled("TTS_ELEVENLABS_ENABLED", false);
}

/** Store dynamic TTS cache in GCS — temporarily off by default (no GCS reads/writes). */
export function isTtsCacheGcsEnabled(): boolean {
  return envFlagEnabled("TTS_USE_GCS", false);
}

/** Active TTS backend — OpenAI unless ElevenLabs is explicitly re-enabled. */
export function getTtsProvider(): TtsProvider {
  if (!isElevenLabsTtsEnabled()) return "openai";
  const raw = (readEnv("TTS_PROVIDER") ?? "openai").toLowerCase();
  return raw === "elevenlabs" ? "elevenlabs" : "openai";
}

export function getOpenAiApiKeyForFetch(): string | undefined {
  return readEnv("OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_API_KEY");
}

/** OpenAI speech endpoint (direct or Replit AI integration proxy). */
export function getOpenAiAudioSpeechUrl(): string {
  const base = readEnv("AI_INTEGRATIONS_OPENAI_BASE_URL");
  if (base) {
    return `${base.replace(/\/$/, "")}/audio/speech`;
  }
  return "https://api.openai.com/v1/audio/speech";
}

/** Direct OpenAI key or Replit AI integration proxy. */
export function getOpenAiCredentials(): {
  configured: boolean;
  source: "OPENAI_API_KEY" | "AI_INTEGRATIONS" | null;
} {
  if (readEnv("OPENAI_API_KEY")) {
    return { configured: true, source: "OPENAI_API_KEY" };
  }
  if (readEnv("AI_INTEGRATIONS_OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_BASE_URL")) {
    return { configured: true, source: "AI_INTEGRATIONS" };
  }
  return { configured: false, source: null };
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

/** Fail fast when DATABASE_URL is missing (Render dashboard must supply secrets). */
export function assertCriticalEnvAtBoot(): void {
  const hasDb = !!readEnv("DATABASE_URL");
  const hasFirebase =
    !!readEnv("FIREBASE_PRIVATE_KEY") || !!readEnv("FIREBASE_SERVICE_ACCOUNT_JSON");

  console.log("ENV CHECK:", {
    hasDB: hasDb,
    hasFirebase,
    hasRedis: !!readEnv("REDIS_URL"),
  });

  if (!hasDb) {
    console.error(
      "DATABASE_URL missing — set it in the Render Dashboard (Blueprint must use sync: false)",
    );
    process.exit(1);
  }
}

/** Log once at startup — safe for production (no secret values). */
export function logStartupEnvDiagnostics(): void {
  const hasDb = !!readEnv("DATABASE_URL");
  const hasFirebase =
    !!readEnv("FIREBASE_PRIVATE_KEY") || !!readEnv("FIREBASE_SERVICE_ACCOUNT_JSON");

  console.log("ENV CHECK:", {
    hasDB: hasDb,
    hasFirebase,
    hasRedis: !!readEnv("REDIS_URL"),
    hasOpenAI: !!readEnv("OPENAI_API_KEY"),
    hasRazorpay: !!readEnv("RAZORPAY_KEY_SECRET"),
  });

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

  const ttsProvider = getTtsProvider();
  logger.info(
    {
      evt: "env.tts_provider",
      ttsProvider,
      elevenLabsTtsEnabled: isElevenLabsTtsEnabled(),
      ttsCacheGcsEnabled: isTtsCacheGcsEnabled(),
      openAiConfigured: !!getOpenAiApiKeyForFetch(),
    },
    `TTS provider: ${ttsProvider} (elevenlabs=${isElevenLabsTtsEnabled()}, gcs_cache=${isTtsCacheGcsEnabled()})`,
  );

  const gcsProjectId = readEnv("GCS_PROJECT_ID", "GOOGLE_CLOUD_PROJECT");
  const gcsCredsFile = readEnv("GOOGLE_APPLICATION_CREDENTIALS");

  if (!gcs.legacyGcsConfigured) {
    logger.info(
      {
        evt: "env.gcs",
        legacyGcsConfigured: false,
        bucketId: gcs.bucketId,
        gcsBucketName: envPresence("GCS_BUCKET_NAME"),
        gcsProjectId: gcsProjectId ? "set" : envPresence("GCS_PROJECT_ID"),
        googleApplicationCredentials: gcsCredsFile ? "set" : envPresence("GOOGLE_APPLICATION_CREDENTIALS"),
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
        gcsBucketName: envPresence("GCS_BUCKET_NAME"),
        gcsProjectId: gcsProjectId ?? gcs.credentials.projectId ?? null,
        googleApplicationCredentials: gcsCredsFile ? "set" : gcs.credentials.source,
        credentialsSource: gcs.credentials.source,
        projectId: gcs.credentials.projectId,
      },
      "GCS TTS storage configured",
    );
  }
}
