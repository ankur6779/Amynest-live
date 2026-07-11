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
import { driveFilesListAll } from "../lib/googleDrive";
import { getQueueHealthSnapshot } from "../queue/bootstrap.js";
import { getTtsCacheStats } from "../services/ttsCacheStats";
import { ttsStorageBackend } from "../services/ttsAudioStore";
import { resolvePhonicsSessionSecret } from "../lib/phonicsSessionSecret.js";
import { isLastGcsProbeOk } from "../services/staticAudioMonitor.js";
import { isStaticAudioCircuitOpen } from "../services/staticAudioMetrics.js";
import { getTtsLatencyDashboard } from "../services/ttsLatencyMetrics.js";
import { getConvoLatencyDashboard } from "../services/speechConverseMetrics.js";
import { getAmyTtsModelId, getAmyTtsVoiceId } from "../lib/amy-tts-config.js";
import { fetchOpenAiTtsStream } from "../services/openaiTtsService.js";
import { getAdminOpsState } from "../services/admin-ops-store.js";
import { getApiDomainMetrics } from "../lib/api-domain-metrics.js";
import { getAnalyticsQuality } from "../services/analyticsIngestService.js";
import { getSchedulerSnapshot, SCHEDULER_JOB_CATALOG } from "../lib/single-active-scheduler.js";

const STORY_PROBE_FOLDER_ID = "1q4bvGXt7h2yug-gGgybNpnf9_Dx2QKaj";

function audioHealthShallowOk(): boolean {
  const openAiConfigured = !!getOpenAiApiKeyForFetch();
  const gcs = getGcsDiagnostics();
  const bucketSet = !!getGcsBucketId();
  const gcsReady = gcs.legacyGcsConfigured && bucketSet;
  return (
    openAiConfigured &&
    gcsReady &&
    isLastGcsProbeOk() &&
    !isStaticAudioCircuitOpen()
  );
}

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
  const schedulerSnap = getSchedulerSnapshot();
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
    scheduler: {
      ...schedulerSnap,
      schedulerOwner: schedulerSnap.owner,
      jobs: SCHEDULER_JOB_CATALOG.map((j) => j.id),
    },
    schedulerOwner: schedulerSnap.owner,
    BACKGROUND_TASKS_ENABLED: schedulerSnap.background_tasks_enabled,
    NOTIFICATIONS_ENABLED: schedulerSnap.notifications_enabled,
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
    amyTtsModel: getAmyTtsModelId(),
    amyTtsVoice: getAmyTtsVoiceId(),
    latency: {
      ...getTtsLatencyDashboard(),
      talk_with_amy: getConvoLatencyDashboard(),
    },
  });
});

/**
 * Audio stack readiness — static MP3 proxy + OpenAI TTS stream probe + playback flags.
 * Use after deploy: GET /api/healthz/audio (no secrets).
 *
 * HEAD is a fast config-only probe for uptime monitors (UptimeRobot, etc.) — no TTS stream.
 */
router.head("/healthz/audio", (_req, res) => {
  const ok = audioHealthShallowOk();
  res.status(ok ? 200 : 503).end();
});

router.get("/healthz/audio", async (_req, res) => {
  const gcs = getGcsDiagnostics();
  const openAiConfigured = !!getOpenAiApiKeyForFetch();
  const elevenLabsConfigured = !!getElevenLabsApiKey();
  const elevenLabsFallback = isElevenLabsFallbackEnabled();
  const bucketSet = !!getGcsBucketId();
  const gcsReady = gcs.legacyGcsConfigured && bucketSet;
  const gcsProbeOk = isLastGcsProbeOk();
  const staticCircuitOpen = isStaticAudioCircuitOpen();
  const adminOps = getAdminOpsState();
  const envMse =
    process.env.ENABLE_MSE_STREAMING?.trim().toLowerCase() === "true" ||
    process.env.ENABLE_MSE_STREAMING?.trim() === "1";

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

  let ttsStreamProbe: {
    ok: boolean;
    bytes?: number;
    latencyMs?: number;
    error?: string;
  } = { ok: false, error: "openai_not_configured" };

  if (openAiConfigured) {
    const probeStarted = Date.now();
    try {
      const streamRes = await fetchOpenAiTtsStream("ok", { mode: "default" });
      if (!streamRes.ok || !streamRes.body) {
        ttsStreamProbe = {
          ok: false,
          latencyMs: Date.now() - probeStarted,
          error: `openai_stream_${streamRes.status}`,
        };
      } else {
        const reader = streamRes.body.getReader();
        let bytes = 0;
        const deadline = Date.now() + 8_000;
        while (Date.now() < deadline) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value?.length) bytes += value.length;
          if (bytes >= 512) break;
        }
        try {
          await reader.cancel();
        } catch {
          /* best-effort */
        }
        ttsStreamProbe = {
          ok: bytes >= 256,
          bytes,
          latencyMs: Date.now() - probeStarted,
          error: bytes >= 256 ? undefined : "stream_too_short",
        };
      }
    } catch (err) {
      ttsStreamProbe = {
        ok: false,
        latencyMs: Date.now() - probeStarted,
        error: err instanceof Error ? err.message : "tts_probe_failed",
      };
    }
  }

  const playback = {
    mseStreamingEnvEnabled: envMse,
    mseStreamingAdminDisabled: adminOps.disableMseStreaming,
    mseStreamingActive: envMse && !adminOps.disableMseStreaming,
    phase1BlobFallback: adminOps.disableMseStreaming || !envMse,
  };

  const ok = openAiConfigured && gcsReady && ttsStreamProbe.ok;

  res.status(ok ? 200 : 503).json({
    ok,
    status: ok ? "PASS" : "FAIL",
    tts: {
      provider: getTtsProvider(),
      openAiConfigured,
      elevenLabsConfigured,
      elevenLabsFallback,
      cacheGcsEnabled: isTtsCacheGcsEnabled(),
      storageBackend: ttsStorageBackend(),
      openAiTts: getOpenAiTtsConfigSummary(),
      streamProbe: ttsStreamProbe,
    },
    playback,
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
      enableMseStreaming: envMse ? "true" : "false",
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
    const files = await driveFilesListAll(
      apiKey,
      `'${STORY_PROBE_FOLDER_ID}' in parents and mimeType contains 'video' and trashed = false`,
      "nextPageToken,files(id,name,mimeType)",
    );
    res.json({
      ok: true,
      driveConfigured: true,
      activeVar: driveDiag.activeVar,
      storyFolderVideoCount: files.length,
      sampleFileId: files[0]?.id ?? null,
      hint:
        files.length === 0
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

/** Art & Craft reels catalog health (lightweight — no full GCS object scan). */
router.get("/healthz/reels-catalog", async (_req, res) => {
  try {
    const { healthCheckReelsCatalogV1, REELS_CATALOG_V1_GCS_PATH } = await import(
      "../services/reelsCatalog.js"
    );
    const report = await healthCheckReelsCatalogV1();
    res.status(report.pass ? 200 : 503).json({
      ok: report.ok,
      pass: report.pass,
      catalogPath: REELS_CATALOG_V1_GCS_PATH,
      catalogExists: report.catalogExists,
      catalogReadable: report.catalogReadable,
      catalogEntries: report.catalogEntries,
      activeEntries: report.activeEntries,
      objectCount: report.objectCount,
      duplicateIds: report.duplicateIds,
      invalidReferences: report.invalidReferences,
      sampleChecked: report.sampleChecked,
      sampleMissing: report.sampleMissing,
      sampleIds: report.sampleIds,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message.slice(0, 500) });
  }
});

/** Phase 3 — production-critical API domain metrics (process-local). */
router.get("/healthz/stability-metrics", (_req, res) => {
  res.json({
    ok: true,
    apiDomains: getApiDomainMetrics(),
    analyticsQuality: getAnalyticsQuality(),
  });
});

export default router;
