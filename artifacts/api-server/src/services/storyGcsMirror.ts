/**
 * Mirror Kids Story Hub videos from Google Drive → GCS for CDN-fast playback.
 */
import { Readable } from "node:stream";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, storyContentTable, type StoryContent } from "@workspace/db";
import { fetchDriveStream } from "../lib/googleDrive";
import { getGcsBucketId, readEnv } from "../lib/env";
import { logger } from "../lib/logger";
import {
  gcsObjectExists,
  legacyGcsConfigured,
  pipeGcsObjectToResponse,
  uploadStreamToGcs,
} from "./ttsAudioStore";
import {
  isValidStoryGcsUrl,
  storyGcsObjectName,
  storyPublicGcsUrl,
} from "./storyGcsPaths";
import type { Request, Response } from "express";

export { resolveStoryStreamUrl } from "./storyGcsPaths";

export type StoryGcsSyncResult = {
  ok: boolean;
  synced: number;
  skipped: number;
  failed: number;
  pending: number;
  errors: Array<{ driveFileId: string; title: string; error: string }>;
  gcsConfigured: boolean;
};

export function isStoryGcsMirrorEnabled(): boolean {
  const forced = readEnv("STORY_GCS_MIRROR_ENABLED")?.trim().toLowerCase();
  if (forced === "0" || forced === "false" || forced === "off") return false;
  return legacyGcsConfigured();
}

async function loadStoriesPendingMirror(options: {
  limit: number;
  force: boolean;
  driveFileIds?: string[];
}): Promise<StoryContent[]> {
  const conditions = [eq(storyContentTable.active, true)];
  if (options.driveFileIds?.length) {
    conditions.push(inArray(storyContentTable.driveFileId, options.driveFileIds));
  } else if (!options.force) {
    conditions.push(isNull(storyContentTable.gcsUrl));
  }

  return db
    .select()
    .from(storyContentTable)
    .where(and(...conditions))
    .orderBy(sql`${storyContentTable.gcsSyncedAt} asc nulls first`, storyContentTable.id)
    .limit(options.limit);
}

async function countPendingMirror(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(storyContentTable)
    .where(and(eq(storyContentTable.active, true), isNull(storyContentTable.gcsUrl)));
  return rows[0]?.count ?? 0;
}

async function mirrorOneStory(story: StoryContent, force: boolean): Promise<"synced" | "skipped" | { error: string }> {
  const bucketId = getGcsBucketId();
  if (!bucketId) return { error: "gcs_bucket_missing" };

  const objectName = storyGcsObjectName(story.driveFileId, story.mimeType, story.originalName);
  const expectedUrl = storyPublicGcsUrl(
    story.driveFileId,
    story.mimeType,
    bucketId,
    story.originalName,
  );

  if (!force && isValidStoryGcsUrl(story.gcsUrl)) {
    const exists = await gcsObjectExists(objectName);
    if (exists) return "skipped";
  } else if (!force && !story.gcsUrl) {
    const exists = await gcsObjectExists(objectName);
    if (exists) {
      await db
        .update(storyContentTable)
        .set({ gcsUrl: expectedUrl, gcsSyncedAt: sql`now()`, updatedAt: sql`now()` })
        .where(eq(storyContentTable.id, story.id));
      return "skipped";
    }
  }

  const driveRes = await fetchDriveStream(story.driveFileId);
  if (!driveRes.ok && driveRes.status !== 206) {
    return { error: `drive_fetch_${driveRes.status}` };
  }
  if (!driveRes.body) {
    return { error: "drive_empty_body" };
  }

  const nodeStream = Readable.fromWeb(driveRes.body as import("stream/web").ReadableStream);
  const upload = await uploadStreamToGcs({
    objectName,
    stream: nodeStream,
    contentType: story.mimeType || "video/mp4",
    cacheControl: "public, max-age=31536000, immutable",
  });

  if (!upload.success) {
    return { error: upload.error };
  }

  await db
    .update(storyContentTable)
    .set({
      gcsUrl: upload.publicUrl,
      gcsSyncedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(eq(storyContentTable.id, story.id));

  return "synced";
}

/**
 * Copy pending story videos from Drive to GCS. Processes sequentially to
 * limit memory on Render. Safe to call repeatedly (idempotent).
 */
export async function syncStoriesToGcs(options?: {
  limit?: number;
  force?: boolean;
  driveFileIds?: string[];
}): Promise<StoryGcsSyncResult> {
  const limit = Math.min(Math.max(options?.limit ?? 3, 1), 20);
  const force = options?.force === true;
  const gcsConfigured = isStoryGcsMirrorEnabled();

  if (!gcsConfigured) {
    const pending = await countPendingMirror();
    return {
      ok: false,
      synced: 0,
      skipped: 0,
      failed: 0,
      pending,
      errors: [],
      gcsConfigured: false,
    };
  }

  const stories = await loadStoriesPendingMirror({
    limit,
    force,
    driveFileIds: options?.driveFileIds,
  });

  let synced = 0;
  let skipped = 0;
  let failed = 0;
  const errors: StoryGcsSyncResult["errors"] = [];

  for (const story of stories) {
    try {
      const result = await mirrorOneStory(story, force);
      if (result === "synced") synced += 1;
      else if (result === "skipped") skipped += 1;
      else {
        failed += 1;
        errors.push({
          driveFileId: story.driveFileId,
          title: story.title,
          error: result.error,
        });
        logger.warn(
          { evt: "story.gcs_mirror_failed", driveFileId: story.driveFileId, error: result.error },
          "Story GCS mirror failed",
        );
      }
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ driveFileId: story.driveFileId, title: story.title, error: message });
      logger.error(
        { evt: "story.gcs_mirror_error", driveFileId: story.driveFileId, err },
        "Story GCS mirror threw",
      );
    }
  }

  const pending = await countPendingMirror();
  logger.info(
    { evt: "story.gcs_mirror_batch", synced, skipped, failed, pending, limit, force },
    "Story GCS mirror batch complete",
  );

  return {
    ok: failed === 0,
    synced,
    skipped,
    failed,
    pending,
    errors,
    gcsConfigured: true,
  };
}

/** Fire-and-forget mirror kick — used after Drive catalog sync. */
export function scheduleStoryGcsMirror(limit = 2): void {
  if (!isStoryGcsMirrorEnabled()) return;
  void syncStoriesToGcs({ limit }).catch((err) => {
    logger.warn(
      { evt: "story.gcs_mirror_scheduled_failed", err },
      "Background story GCS mirror failed",
    );
  });
}

/** Stream a story video: GCS when mirrored, else Drive proxy. */
export async function streamStoryVideo(
  driveFileId: string,
  req: Request,
  res: Response,
): Promise<void> {
  const storyRows = await db
    .select()
    .from(storyContentTable)
    .where(and(eq(storyContentTable.driveFileId, driveFileId), eq(storyContentTable.active, true)))
    .limit(1);
  const story = storyRows[0];

  if (!story) {
    if (!res.headersSent) {
      res.status(404).json({ error: "story_not_found" });
    }
    return;
  }

  if (legacyGcsConfigured()) {
    const objectName = storyGcsObjectName(story.driveFileId, story.mimeType, story.originalName);
    const mirrored =
      isValidStoryGcsUrl(story.gcsUrl) || (await gcsObjectExists(objectName));
    if (mirrored) {
      const rangeHeader = req.headers.range;
      const result = await pipeGcsObjectToResponse({
        objectName,
        rangeHeader: typeof rangeHeader === "string" ? rangeHeader : undefined,
        res,
        contentType: story.mimeType || "video/mp4",
      });
      if (result === "streamed") return;
      if (result === "error" && res.headersSent) return;
    }
  }

  const rangeHeader = req.headers.range;
  const driveRes = await fetchDriveStream(
    driveFileId,
    typeof rangeHeader === "string" ? rangeHeader : undefined,
  );

  if (!driveRes.ok && driveRes.status !== 206) {
    logger.warn({ driveFileId, status: driveRes.status }, "Story Drive stream failed");
    if (!res.headersSent) {
      res.status(driveRes.status === 404 ? 404 : 403).json({ error: "file_not_accessible" });
    }
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
          await new Promise((resolve) => res.once("drain", resolve));
        }
      }
      res.end();
    } catch {
      reader.cancel();
      res.destroy();
    }
  };
  await pump();
}
