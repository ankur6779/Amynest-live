import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import {
  getDriveApiKey,
  getDriveKeyDiagnostics,
  getElevenLabsApiKey,
  getGcsBucketId,
  getGcsDiagnostics,
  getOpenAiApiKeyForFetch,
  getOpenAiCredentials,
  getTtsProvider,
  isElevenLabsFallbackEnabled,
  isTtsCacheGcsEnabled,
  resolveApiPublicUrl,
} from "../lib/env";
import { getOpenAiTtsConfigSummary } from "../lib/openai-tts-config.js";
import { amynestEnvLabel, resolveAmynestEnv } from "../lib/loadEnv";
import { driveFilesList } from "../lib/googleDrive";
import { getQueueHealthSnapshot } from "../queue/bootstrap.js";
import { getTtsCacheStats } from "../services/ttsCacheStats";
import { ttsStorageBackend } from "../services/ttsAudioStore";
import { resolvePhonicsSessionSecret } from "../lib/phonicsSessionSecret.js";
import { isLastGcsProbeOk } from "../services/staticAudioMonitor.js";
import { isStaticAudioCircuitOpen } from "../services/staticAudioMetrics.js";

const STORY_PROBE_FOLDER_ID = "1q4bvGXt7h2yug-gGgybNpnf9_Dx2QKaj";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/** Heartbeat for crash detection poller. */
router.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

/** Full env diagnostics (no secret values). Production requires x-health-secret. */
router.get("/healthz/env", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    const expected = process.env.INTERNAL_HEALTH_SECRET?.trim();
    const provided = String(req.headers["x-health-secret"] ?? "").trim();
    if (!expected || provided !== expected) {
      res.status(404).json({ error: "not_found" });
      return;
    }
  }

  const drive = getDriveKeyDiagnostics();
  const gcs = getGcsDiagnostics();
  const openai = getOpenAiCredentials();
  const queue = await getQueueHealthSnapshot();

  let phonicsSession: { ok: boolean; source?: string; error?: string } = { ok: false };
  try {
    const { source } = resolvePhonicsSessionSecret();
    phonicsSession = { ok: true, source };
  } catch (err) {
    phonicsSession = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const amynestEnv = resolveAmynestEnv();
  const aiQueueOk =
    queue.queueMode === "bullmq"
      ? queue.redis
      : queue.queueMode === "inline" || queue.queueMode === "memory";
  const openAiTtsConfigured = !!getOpenAiApiKeyForFetch();
  res.json({
    ok: drive.resolved && openAiTtsConfigured && openai.configured && aiQueueOk,
    amynestEnv,
    profile: amynestEnvLabel(amynestEnv),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    render: !!process.env.RENDER,
    renderServiceName: process.env.RENDER_SERVICE_NAME ?? null,
    apiPublicUrl: resolveApiPublicUrl(),
    queue: {
      mode: queue.queueMode,
      redis: queue.redis,
      redisPing: queue.redisPing ?? false,
      workerExpected: queue.workerExpected,
      status: queue.status,
      bullmq: queue.bullmq,
    },
    services: {
      googleDrive: {
        configured: drive.resolved,
        activeVar: drive.activeVar,
        vars: drive.checked,
        misplacedFrontendKey: drive.misplacedFrontendKey,
        hint: drive.misplacedFrontendKey
          ? "Move key to Amynest-backend as GOOGLE_API_KEY (not VITE_GOOGLE_API_KEY on static site)"
          : !drive.resolved
            ? "Set GOOGLE_API_KEY on Amynest-backend in Render → Environment"
            : undefined,
      },
      tts: {
        provider: getTtsProvider(),
        openAiTtsConfigured,
        cacheGcsEnabled: isTtsCacheGcsEnabled(),
      },
      openai: {
        configured: openai.configured,
        source: openai.source,
        hint: !openai.configured
          ? "Set OPENAI_API_KEY on Amynest-backend (and amynest-ai-worker if using BullMQ)"
          : undefined,
      },
      ttsStorage: {
        backend: ttsStorageBackend(),
        ...gcs,
        hint: !gcs.legacyGcsConfigured
          ? "Without GCS, TTS uses Postgres (audio_data column). Set DEFAULT_OBJECT_STORAGE_BUCKET_ID + GCS_SERVICE_ACCOUNT_JSON to use GCS."
          : undefined,
      },
      phonicsTests: {
        sessionSecretReady: phonicsSession.ok,
        source: phonicsSession.source ?? null,
        hint: !phonicsSession.ok
          ? "Set SESSION_SECRET (32+ chars) on Amynest-backend, or ensure DATABASE_URL is configured for derived session keys"
          : undefined,
        error: phonicsSession.error ?? null,
      },
    },
  });
});

/** Postgres TTS cache stats (global, not per-user). */
router.get("/healthz/tts-cache", async (_req, res) => {
  try {
    const stats = await getTtsCacheStats();
    res.json({
      ok: true,
      totalAudios: stats.totalAudios,
      lastSaved: stats.lastSaved,
      storageBackend: stats.storageBackend,
      withPostgresBytes: stats.withPostgresBytes,
      totalEntries: stats.totalEntries,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({
      ok: false,
      totalAudios: 0,
      lastSaved: null,
      error: message.slice(0, 300),
    });
  }
});

/** Amy TTS + GCS storage probe. */
router.get("/healthz/tts", (_req, res) => {
  const openAiConfigured = !!getOpenAiApiKeyForFetch();
  const ttsProvider = getTtsProvider();
  const legacyGcsConfigured = getGcsDiagnostics().legacyGcsConfigured;

  res.json({
    ttsProvider,
    ttsCacheGcsEnabled: isTtsCacheGcsEnabled(),
    openAiConfigured,
    openAiTts: getOpenAiTtsConfigSummary(),
    legacyGcsConfigured,
    ok: openAiConfigured,
    ttsStorage: ttsStorageBackend(),
  });
});

/**
 * Audio stack readiness — static MP3 proxy + OpenAI TTS + optional ElevenLabs fallback.
 * Use after deploy: GET /api/healthz/audio (no secrets).
 */
router.get("/healthz/audio", (_req, res) => {
  const gcs = getGcsDiagnostics();
  const openAiConfigured = !!getOpenAiApiKeyForFetch();
  const elevenLabsConfigured = !!getElevenLabsApiKey();
  const elevenLabsFallback = isElevenLabsFallbackEnabled();
  const bucketSet = !!getGcsBucketId();
  const gcsReady = gcs.legacyGcsConfigured && bucketSet;
  const gcsProbeOk = isLastGcsProbeOk();
  const staticCircuitOpen = isStaticAudioCircuitOpen();

  const missing: string[] = [];
  if (!openAiConfigured) missing.push("OPENAI_API_KEY");
  if (!bucketSet) missing.push("DEFAULT_OBJECT_STORAGE_BUCKET_ID or GCS_BUCKET_NAME");
  if (!gcs.credentials.ok && gcs.credentials.source !== "GOOGLE_APPLICATION_CREDENTIALS") {
    missing.push("GCS_SERVICE_ACCOUNT_JSON or GCS_SERVICE_ACCOUNT_JSON_B64");
  }
  if (!elevenLabsConfigured) {
    missing.push("ELEVENLABS_API_KEY (optional fallback)");
  }
  if (!isTtsCacheGcsEnabled()) {
    missing.push("TTS_USE_GCS=true (recommended in production)");
  }

  const ok = openAiConfigured && gcsReady;

  res.status(ok ? 200 : 503).json({
    ok,
    tts: {
      provider: getTtsProvider(),
      openAiConfigured,
      elevenLabsConfigured,
      elevenLabsFallback,
      cacheGcsEnabled: isTtsCacheGcsEnabled(),
      storageBackend: ttsStorageBackend(),
      openAiTts: getOpenAiTtsConfigSummary(),
    },
    staticAudio: {
      gcsConfigured: gcsReady,
      gcsProbeOk,
      serverCircuitOpen: staticCircuitOpen,
      bucketHint: gcs.bucketName,
    },
    env: {
      openAiApiKey: openAiConfigured ? "set" : "missing",
      elevenLabsApiKey: elevenLabsConfigured ? "set" : "missing",
      gcsCredentials: gcs.credentials.ok ? "set" : "missing",
      bucketId: bucketSet ? "set" : "missing",
      ttsUseGcs: isTtsCacheGcsEnabled(),
    },
    missingEnv: missing.filter((m) => !m.includes("optional") && !m.includes("recommended")),
    hints: missing,
  });
});

/** Google Drive API + story folder probe. */
router.get("/healthz/drive", async (_req, res) => {
  const driveDiag = getDriveKeyDiagnostics();
  const apiKey = getDriveApiKey();

  if (!apiKey) {
    res.status(503).json({
      ok: false,
      driveConfigured: false,
      env: driveDiag,
      hint: driveDiag.misplacedFrontendKey
        ? "VITE_GOOGLE_API_KEY is on the static site only. Add GOOGLE_API_KEY to the Amynest-backend API service."
        : "Set GOOGLE_API_KEY on Amynest-backend. Enable Drive API in Cloud Console. Key restrictions: None or IP (not HTTP referrers).",
    });
    return;
  }

  try {
    const page = await driveFilesList({
      apiKey,
      q: `'${STORY_PROBE_FOLDER_ID}' in parents and mimeType contains 'video' and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType)",
      pageSize: 3,
    });
    res.json({
      ok: true,
      driveConfigured: true,
      activeVar: driveDiag.activeVar,
      storyFolderVideoCount: page.files.length,
      sampleFileId: page.files[0]?.id ?? null,
      hint:
        page.files.length === 0
          ? "API key works but folder has no videos. Share folders as Anyone with the link can view."
          : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({
      ok: false,
      driveConfigured: true,
      activeVar: driveDiag.activeVar,
      error: message.slice(0, 500),
      env: driveDiag,
      hint:
        "Key is loaded but Drive API rejected the request. Enable Google Drive API, fix key restrictions, and link-share content folders.",
    });
  }
});

export default router;
