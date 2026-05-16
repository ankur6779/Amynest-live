import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import {
  getDriveApiKey,
  getDriveKeyDiagnostics,
  getElevenLabsApiKey,
  getGcsDiagnostics,
} from "../lib/env";
import { driveFilesList } from "../lib/googleDrive";
import { ttsStorageBackend } from "../services/ttsAudioStore";

const STORY_PROBE_FOLDER_ID = "1q4bvGXt7h2yug-gGgybNpnf9_Dx2QKaj";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/** Full env diagnostics (no secret values). */
router.get("/healthz/env", (_req, res) => {
  const drive = getDriveKeyDiagnostics();
  const gcs = getGcsDiagnostics();
  const elevenlabsConfigured = !!getElevenLabsApiKey();

  res.json({
    ok: drive.resolved && elevenlabsConfigured,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    render: !!process.env.RENDER,
    services: {
      googleDrive: {
        configured: drive.resolved,
        activeVar: drive.activeVar,
        vars: drive.checked,
        misplacedFrontendKey: drive.misplacedFrontendKey,
        hint: drive.misplacedFrontendKey
          ? "Move key to amynest-live as GOOGLE_API_KEY (not VITE_GOOGLE_API_KEY on static site)"
          : !drive.resolved
            ? "Set GOOGLE_API_KEY on amynest-live in Render → Environment"
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

/** Amy / ElevenLabs TTS + GCS storage probe. */
router.get("/healthz/tts", (_req, res) => {
  const elevenlabsConfigured = !!getElevenLabsApiKey();
  const gcs = getGcsDiagnostics();

  res.json({
    ok: elevenlabsConfigured,
    elevenlabsConfigured,
    ttsStorage: ttsStorageBackend(),
    legacyGcsConfigured: gcs.legacyGcsConfigured,
    gcs: {
      bucketConfigured: gcs.bucketId === "set",
      bucketHint: gcs.bucketName,
      credentialsOk: gcs.credentials.ok,
      credentialsSource: gcs.credentials.source,
      credentialsError: gcs.credentials.error,
      projectId: gcs.credentials.projectId,
      clientEmail: gcs.credentials.clientEmail,
    },
    hint: !elevenlabsConfigured
      ? "Set ELEVENLABS_API_KEY on amynest-live (not amynest-web)."
      : !gcs.legacyGcsConfigured
        ? "GCS optional: add DEFAULT_OBJECT_STORAGE_BUCKET_ID + GCS_SERVICE_ACCOUNT_JSON (single-line JSON or GCS_SERVICE_ACCOUNT_JSON_B64). TTS falls back to Postgres."
        : undefined,
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
        ? "VITE_GOOGLE_API_KEY is on the static site only. Add GOOGLE_API_KEY to the amynest-live API service."
        : "Set GOOGLE_API_KEY on amynest-live. Enable Drive API in Cloud Console. Key restrictions: None or IP (not HTTP referrers).",
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
