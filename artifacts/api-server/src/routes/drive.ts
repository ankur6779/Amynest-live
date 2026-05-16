/**
 * Google Drive file proxy — streams PDFs/images for Parent Hub downloads.
 * Mounted before requireAuth so window.open / <a download> work without JWT.
 * File IDs are only issued by authenticated list/download endpoints.
 */
import { Router, type IRouter } from "express";
import { fetchDriveStream } from "../lib/googleDrive";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function safeAttachmentName(raw: string): string {
  const trimmed = raw.trim().slice(0, 200);
  const cleaned = trimmed.replace(/[^\w\s.\-()]/g, "_").replace(/\s+/g, " ");
  return cleaned || "download.pdf";
}

router.get("/drive/download/:fileId", async (req, res): Promise<void> => {
  const fileId = String(req.params.fileId ?? "");
  if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    res.status(400).json({ error: "invalid_file_id" });
    return;
  }

  const fileName = safeAttachmentName(
    typeof req.query.name === "string" ? req.query.name : "download.pdf",
  );

  try {
    const rangeHeader = req.headers.range;
    const driveRes = await fetchDriveStream(
      fileId,
      typeof rangeHeader === "string" ? rangeHeader : undefined,
    );

    if (!driveRes.ok && driveRes.status !== 206) {
      logger.warn(
        { fileId, status: driveRes.status },
        "Drive download proxy failed",
      );
      res.status(driveRes.status === 404 ? 404 : 403).json({ error: "file_not_accessible" });
      return;
    }

    const contentType =
      driveRes.headers.get("content-type")?.split(";")[0]?.trim() ||
      "application/octet-stream";
    const contentLength = driveRes.headers.get("content-length");
    const contentRange = driveRes.headers.get("content-range");
    const acceptRanges = driveRes.headers.get("accept-ranges");

    res.status(driveRes.status);
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    res.setHeader("Accept-Ranges", acceptRanges || "bytes");
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    res.setHeader("Cache-Control", "private, max-age=3600");

    if (!driveRes.body) {
      res.end();
      return;
    }

    const reader = driveRes.body.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!res.write(value)) {
            await new Promise<void>((resolve) => res.once("drain", resolve));
          }
        }
        res.end();
      } catch {
        reader.cancel();
        res.destroy();
      }
    };
    void pump();
  } catch (err) {
    logger.error(
      { err, fileId, message: err instanceof Error ? err.message : String(err) },
      "Drive download stream error",
    );
    if (!res.headersSent) res.status(500).json({ error: "stream_failed" });
  }
});

export default router;
