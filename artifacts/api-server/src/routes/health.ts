import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import {
  getDriveApiKey,
  getDriveKeyDiagnostics,
  getElevenLabsApiKey,
  getGcsDiagnostics,
  resolveApiPublicUrl,
} from "../lib/env";
import { amynestEnvLabel, resolveAmynestEnv } from "../lib/loadEnv";
import { driveFilesList } from "../lib/googleDrive";
import { getQueueHealthSnapshot } from "../queue/bootstrap.js";
import { getTtsCacheStats } from "../services/ttsCacheStats";
import { ttsStorageBackend } from "../services/ttsAudioStore";

const STORY_PROBE_FOLDER_ID = "1q4bvGXt7h2yug-gGgybNpnf9_Dx2QKaj";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/** Full env diagnostics (no secret values). */
router.get("/healthz/env", async (_req, res) => {
  const drive = getDriveKeyDiagnostics();
  const gcs = getGcsDiagnostics();
  const elevenlabsConfigured = !!getElevenLabsApiKey();
  const queue = await getQueueHealthSnapshot();

  const amynestEnv = resolveAmynestEnv();
  res.json({
    ok:
      drive.resolved &&
      elevenlabsConfigured &&
      (queue.queueMode === "memory" || queue.redis),
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
      elevenlabs: {
        configured: elevenlabsConfigured,
        vars: [
          { name: "ELEVENLABS_API_KEY", presence: elevenlabsConfigured ? "set" : "missing" },
        ],
      },
      ttsStorage: {
        backend: ttsStorageBackend(),
        ...gcs,
        hint: !gcs.legacyGcsConfigured
          ? "Without GCS, TTS uses Postgres (audio_data column). Set DEFAULT_OBJECT_STORAGE_BUCKET_ID + GCS_SERVICE_ACCOUNT_JSON to use GCS."
          : undefined,
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

/** Amy / ElevenLabs TTS + GCS storage probe. */
router.get("/healthz/tts", (_req, res) => {
  const elevenLabsConfigured = !!getElevenLabsApiKey();
  const legacyGcsConfigured = getGcsDiagnostics().legacyGcsConfigured;

  res.json({
    elevenLabsConfigured,
    legacyGcsConfigured,
    ok: elevenLabsConfigured,
    ttsStorage: ttsStorageBackend(),
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
