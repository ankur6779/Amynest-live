import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { driveFilesList, getDriveApiKey } from "../lib/googleDrive";
import { ttsStorageBackend } from "../services/ttsAudioStore";

const STORY_PROBE_FOLDER_ID = "1q4bvGXt7h2yug-gGgybNpnf9_Dx2QKaj";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/** Config-only probe for Amy / ElevenLabs TTS (no secrets exposed). */
router.get("/healthz/tts", (_req, res) => {
  const elevenlabsConfigured = !!process.env.ELEVENLABS_API_KEY?.trim();
  const legacyGcsConfigured =
    !!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim() &&
    (!!process.env.GCS_SERVICE_ACCOUNT_JSON?.trim() ||
      !!process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim());

  res.json({
    ok: elevenlabsConfigured,
    elevenlabsConfigured,
    ttsStorage: ttsStorageBackend(),
    legacyGcsConfigured,
    hint: !elevenlabsConfigured
      ? "Set ELEVENLABS_API_KEY on the amynest-live API service (not the static web service)."
      : !legacyGcsConfigured
        ? "Optional: add DEFAULT_OBJECT_STORAGE_BUCKET_ID + GCS_SERVICE_ACCOUNT_JSON to reuse Replit TTS cache (Google Drive API key does not cover this)."
        : undefined,
  });
});

/** Probe Kids Story Hub Drive folders (no secrets). */
router.get("/healthz/drive", async (_req, res) => {
  const apiKey = getDriveApiKey();
  if (!apiKey) {
    res.status(503).json({
      ok: false,
      driveConfigured: false,
      hint: "Set GOOGLE_API_KEY on amynest-live. Use API key restrictions: None or IP (not HTTP referrers). Enable Google Drive API in Cloud Console.",
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
      storyFolderVideoCount: page.files.length,
      sampleFileId: page.files[0]?.id ?? null,
      hint:
        page.files.length === 0
          ? "Drive API works but folder returned no videos. Check folder sharing (Anyone with the link) and that videos are in the folder."
          : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({
      ok: false,
      driveConfigured: true,
      error: message.slice(0, 300),
      hint: "If you see PERMISSION_DENIED or API key invalid: enable Drive API, remove HTTP-referrer-only restrictions, and ensure story folders are link-shared.",
    });
  }
});

export default router;
