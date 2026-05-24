import type { Response } from "express";
import { fetchDriveStream } from "./googleDrive";
import { logger } from "./logger";

export function safeHubPdfFileName(raw: string): string {
  const trimmed = raw.trim().slice(0, 200);
  const cleaned = trimmed.replace(/[^\w\s.\-()]/g, "_").replace(/\s+/g, " ");
  return cleaned || "download.pdf";
}

export type HubQuotaHeaders = {
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  lifetimeLimit: number | null;
  lifetimeUsed: number;
  lifetimeRemaining: number | null;
};

export function setHubQuotaHeaders(res: Response, quota: HubQuotaHeaders): void {
  res.setHeader("X-Hub-Daily-Limit", String(quota.dailyLimit));
  res.setHeader("X-Hub-Daily-Used", String(quota.dailyUsed));
  res.setHeader("X-Hub-Daily-Remaining", String(quota.dailyRemaining));
  res.setHeader("X-Hub-Lifetime-Used", String(quota.lifetimeUsed));
  if (quota.lifetimeLimit != null) {
    res.setHeader("X-Hub-Lifetime-Limit", String(quota.lifetimeLimit));
    res.setHeader(
      "X-Hub-Lifetime-Remaining",
      String(quota.lifetimeRemaining ?? 0),
    );
  } else {
    res.setHeader("X-Hub-Lifetime-Limit", "");
    res.setHeader("X-Hub-Lifetime-Remaining", "");
  }
}

/** Stream a Drive PDF through the API — works in mobile WebViews (no window.open). */
export async function streamDrivePdfToExpress(
  res: Response,
  fileId: string,
  fileName: string,
  extraHeaders?: Record<string, string>,
): Promise<boolean> {
  const safeName = safeHubPdfFileName(fileName);

  try {
    const driveRes = await fetchDriveStream(fileId);

    if (!driveRes.ok && driveRes.status !== 206) {
      logger.warn(
        { fileId, status: driveRes.status },
        "Hub PDF stream: Drive fetch failed",
      );
      return false;
    }

    const contentType =
      driveRes.headers.get("content-type")?.split(";")[0]?.trim() ||
      "application/pdf";
    const contentLength = driveRes.headers.get("content-length");
    const contentRange = driveRes.headers.get("content-range");
    const acceptRanges = driveRes.headers.get("accept-ranges");

    res.status(200);
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    );
    res.setHeader("Accept-Ranges", acceptRanges || "bytes");
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    res.setHeader("Cache-Control", "private, no-store");

    if (extraHeaders) {
      for (const [key, value] of Object.entries(extraHeaders)) {
        res.setHeader(key, value);
      }
    }

    if (!driveRes.body) {
      res.end();
      return true;
    }

    const reader = driveRes.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.write(value)) {
          await new Promise<void>((resolve) => res.once("drain", resolve));
        }
      }
      res.end();
      return true;
    } catch (err) {
      reader.cancel();
      logger.error(
        { err, fileId, message: err instanceof Error ? err.message : String(err) },
        "Hub PDF stream pump failed",
      );
      if (!res.headersSent) return false;
      res.destroy();
      return false;
    }
  } catch (err) {
    logger.error(
      { err, fileId, message: err instanceof Error ? err.message : String(err) },
      "Hub PDF stream error",
    );
    return false;
  }
}
