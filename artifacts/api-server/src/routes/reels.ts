import { Router } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import {
  listActiveReelsForApi,
  resolveReelStreamPath,
} from "../services/reelsCatalog";
import { streamReelVideo } from "../services/reelsGcsMirror";

const router = Router();

const BATCH_SIZE = 5;

router.get("/videos", async (req, res) => {
  try {
    const videos = await listActiveReelsForApi();
    const offset = parseInt((req.query["offset"] as string) || "0", 10);
    const batch = parseInt((req.query["batch"] as string) || String(BATCH_SIZE), 10);

    const slice = videos.slice(offset, offset + batch).map((entry) => ({
      id: entry.id,
      title: entry.title,
      name: entry.title,
      mimeType: entry.contentType,
      streamUrl: resolveReelStreamPath(entry.id),
    }));

    res.json({
      videos: slice,
      total: videos.length,
      offset,
      nextOffset: offset + slice.length < videos.length ? offset + slice.length : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, message }, "Failed to list reels catalog videos");
    const status =
      message === "gcs_not_configured" || message === "catalog_not_found" ? 503 : 502;
    res.status(status).json({
      error:
        message === "gcs_not_configured"
          ? "gcs_not_configured"
          : message === "catalog_not_found"
            ? "catalog_not_found"
            : "catalog_list_failed",
    });
  }
});

/** Playback: Worker → GCS when REELS_GCS_ORIGIN=1; legacy Drive path otherwise. */
router.get("/stream/:fileId", async (req, res) => {
  const reelsGcsOrigin = process.env["REELS_GCS_ORIGIN"]?.trim().toLowerCase();
  if (reelsGcsOrigin === "1" || reelsGcsOrigin === "true") {
    res.status(410).json({
      error: "reels_stream_on_worker",
      hint: "Video bytes are served by Cloudflare Worker → GCS. Do not call Render for /api/reels/stream/*.",
    });
    return;
  }

  const { fileId } = req.params;
  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    res.status(400).json({ error: "Invalid file ID" });
    return;
  }

  try {
    await streamReelVideo(fileId, req, res);
  } catch (err) {
    logger.error({ err, fileId }, "Stream error");
    if (!res.headersSent) res.status(500).json({ error: "Stream failed" });
  }
});

/** Cron / scheduler — mounted before requireAuth (see routes/index.ts). */
router.post("/gcs-sync/cron", async (req, res) => {
  const expected =
    process.env["REELS_GCS_CRON_SECRET"] ??
    process.env["STORY_GCS_CRON_SECRET"] ??
    process.env["NOTIFICATION_CRON_SECRET"];
  const provided = req.headers["x-cron-secret"];
  if (!expected || provided !== expected) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const parsed = z
    .object({
      limit: z.coerce.number().int().min(1).max(20).optional(),
      force: z.coerce.boolean().optional(),
    })
    .safeParse(req.body ?? {});

  try {
    const { runReelsGcsMirrorPing } = await import("../lib/reelsGcsCron.js");
    const result = await runReelsGcsMirrorPing({
      limit: parsed.success ? parsed.data.limit : undefined,
      force: parsed.success ? parsed.data.force : undefined,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Reel GCS cron ping failed");
    res.status(500).json({ error: "cron_failed" });
  }
});

export default router;
