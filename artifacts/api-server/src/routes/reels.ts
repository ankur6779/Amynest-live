import { Router } from "express";
import { logger } from "../lib/logger";
import {
  listActiveReelsForApi,
  resolveReelStreamPath,
} from "../services/reelsCatalog";

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

/** Playback bytes are served exclusively by Cloudflare Worker → GCS (Phase 2B). */
router.get("/stream/:fileId", (_req, res) => {
  res.status(410).json({
    error: "reels_stream_on_worker",
    hint: "Video bytes are served by Cloudflare Worker → GCS. Do not call Render for /api/reels/stream/*.",
  });
});

export default router;
