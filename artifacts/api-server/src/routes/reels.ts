import { Router } from "express";
import {
  driveFilesListAll,
  fetchDriveStream,
  getDriveApiKey,
} from "../lib/googleDrive";
import { logger } from "../lib/logger";

const router = Router();

const FOLDER_ID = "1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3";
const BATCH_SIZE = 5;

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

let cachedVideoIds: DriveFile[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

const PLAYABLE_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-m4v",
  "video/3gpp",
  "video/3gpp2",
  "video/mpeg",
]);

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

async function fetchAllVideos(): Promise<DriveFile[]> {
  const apiKey = getDriveApiKey();
  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY or GOOGLE_DRIVE_API_KEY environment variable is not set",
    );
  }

  const now = Date.now();
  if (cachedVideoIds.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedVideoIds;
  }

  const raw = await driveFilesListAll(
    apiKey,
    `'${FOLDER_ID}' in parents and mimeType contains 'video' and trashed = false`,
    "nextPageToken,files(id,name,mimeType)",
  );
  const allFiles = raw.filter((f) => PLAYABLE_MIME_TYPES.has(f.mimeType));

  shuffle(allFiles);
  cachedVideoIds = allFiles;
  cacheTimestamp = Date.now();
  logger.info({ count: allFiles.length }, "Drive video cache built");
  return allFiles;
}

router.get("/videos", async (req, res) => {
  try {
    const videos = await fetchAllVideos();
    const offset = parseInt((req.query["offset"] as string) || "0", 10);
    const batch = parseInt((req.query["batch"] as string) || String(BATCH_SIZE), 10);

    const slice = videos.slice(offset, offset + batch).map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      streamUrl: `/api/reels/stream/${f.id}`,
    }));

    res.json({
      videos: slice,
      total: videos.length,
      offset,
      nextOffset: offset + slice.length < videos.length ? offset + slice.length : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, message }, "Failed to list videos");
    const status = message.includes("not set") ? 503 : 502;
    res.status(status).json({
      error: status === 503 ? "drive_not_configured" : "drive_list_failed",
    });
  }
});

router.get("/stream/:fileId", async (req, res) => {
  const { fileId } = req.params;
  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    res.status(400).json({ error: "Invalid file ID" });
    return;
  }

  try {
    const rangeHeader = req.headers["range"];
    const driveRes = await fetchDriveStream(fileId, rangeHeader);

    if (!driveRes.ok && driveRes.status !== 206) {
      logger.warn({ fileId, status: driveRes.status }, "Drive stream failed");
      res.status(driveRes.status === 404 ? 404 : 403).json({ error: "File not accessible" });
      return;
    }

    const contentType = driveRes.headers.get("content-type") || "video/mp4";
    const contentLength = driveRes.headers.get("content-length");
    const contentRange = driveRes.headers.get("content-range");
    const acceptRanges = driveRes.headers.get("accept-ranges");

    res.status(driveRes.status);
    res.set("Content-Type", contentType);
    res.set("Accept-Ranges", acceptRanges || "bytes");
    if (contentLength) res.set("Content-Length", contentLength);
    if (contentRange) res.set("Content-Range", contentRange);
    res.set("Cache-Control", "public, max-age=3600");

    if (!driveRes.body) { res.end(); return; }

    const reader = driveRes.body.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!res.write(value)) {
            await new Promise((resolve) => res.once("drain", resolve));
          }
        }
        res.end();
      } catch {
        reader.cancel();
        res.destroy();
      }
    };
    pump();
  } catch (err) {
    logger.error({ err }, "Stream error");
    if (!res.headersSent) res.status(500).json({ error: "Stream failed" });
  }
});

export default router;
