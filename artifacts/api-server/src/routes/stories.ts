/**
 * Kids Story Hub — Drive-backed story catalog + per-child watch progress.
 *
 *   GET  /api/stories?childId=         → categorised rows for the hub
 *   POST /api/stories/sync             → re-fetch from Drive (idempotent)
 *   POST /api/stories/progress         → write resume position + completion
 *
 * Streaming is handled by the existing /api/reels/stream/:fileId proxy —
 * no need to reimplement Drive's range-request + virus-scan-token plumbing.
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  db,
  childrenTable,
  storyContentTable,
  storyWatchProgressTable,
  type StoryContent,
} from "@workspace/db";

const router: IRouter = Router();

// ─── Drive sync ──────────────────────────────────────────────────────────────

const FOLDER_IDS = [
  "1q4bvGXt7h2yug-gGgybNpnf9_Dx2QKaj",
  "1pSrec0X4nD3cTwf68qylNCFlKJbACjA4",
] as const;

const DRIVE_API = "https://www.googleapis.com/drive/v3/files";

// Same playable types the reels integration uses — keeps behaviour consistent.
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

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  videoMediaMetadata?: { durationMillis?: string };
}

/**
 * Title from "Lion_and_Mouse_story.mp4" → "Lion And Mouse Story".
 * Strips extension, swaps underscores/dashes for spaces, collapses
 * whitespace, drops short noise tokens (e.g. "v2", "final").
 */
export function normalizeTitle(rawName: string): string {
  const noExt = rawName.replace(/\.[a-zA-Z0-9]{2,5}$/, "");
  const cleaned = noExt
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Title-case each word but keep small connector words lowercase mid-string.
  const minor = new Set(["a", "an", "and", "the", "of", "in", "for", "to"]);
  return cleaned
    .split(" ")
    .map((w, i) => {
      if (!w) return w;
      const lower = w.toLowerCase();
      if (i > 0 && minor.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/** Light keyword classifier — bedtime/moral/fun/general. */
export function classifyCategory(title: string): string {
  const t = title.toLowerCase();
  if (
    /\b(bedtime|sleep|goodnight|lullaby|night|moon|dream)\b/.test(t)
  )
    return "bedtime";
  if (
    /\b(moral|fable|aesop|panchatantra|lesson|virtue|honesty|kind|brave|patience)\b/.test(
      t,
    )
  )
    return "moral";
  if (
    /\b(funny|fun|silly|laugh|joke|dance|adventure|monkey|jungle|party)\b/.test(
      t,
    )
  )
    return "fun";
  return "general";
}

/** In-process cache so we don't spam Drive on every request. */
let lastSyncAt = 0;
const SYNC_TTL_MS = 30 * 60 * 1000; // 30 min

async function fetchDriveFolder(folderId: string): Promise<DriveFile[]> {
  const apiKey = process.env["GOOGLE_API_KEY"];
  if (!apiKey) throw new Error("GOOGLE_API_KEY environment variable is not set");

  const all: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and mimeType contains 'video' and trashed = false`,
      fields:
        "nextPageToken,files(id,name,mimeType,thumbnailLink,videoMediaMetadata(durationMillis))",
      key: apiKey,
      pageSize: "1000",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${DRIVE_API}?${params.toString()}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Drive API ${res.status} on folder ${folderId}: ${text}`);
    }
    const data = (await res.json()) as {
      files: DriveFile[];
      nextPageToken?: string;
    };
    const playable = (data.files || []).filter((f) =>
      PLAYABLE_MIME_TYPES.has(f.mimeType),
    );
    all.push(...playable);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return all;
}

/**
 * Fetch all configured folders → upsert into story_content. Idempotent and
 * cheap to call repeatedly thanks to the upsert. Returns the number of
 * rows currently active.
 */
export async function syncStoriesFromDrive(force = false): Promise<{
  inserted: number;
  total: number;
}> {
  if (!force && Date.now() - lastSyncAt < SYNC_TTL_MS) {
    const rows = await db
      .select({ id: storyContentTable.id })
      .from(storyContentTable)
      .where(eq(storyContentTable.active, true));
    return { inserted: 0, total: rows.length };
  }

  let allFiles: { file: DriveFile; folderId: string }[] = [];
  for (const fid of FOLDER_IDS) {
    try {
      const files = await fetchDriveFolder(fid);
      for (const f of files) allFiles.push({ file: f, folderId: fid });
    } catch (err) {
      logger.error({ err, folderId: fid }, "Drive folder fetch failed");
    }
  }

  // Dedupe: same Drive file id may live in multiple folders — keep the first.
  const seen = new Set<string>();
  allFiles = allFiles.filter(({ file }) => {
    if (seen.has(file.id)) return false;
    seen.add(file.id);
    return true;
  });

  let inserted = 0;
  for (const { file, folderId } of allFiles) {
    const title = normalizeTitle(file.name);
    const category = classifyCategory(title);
    const durationSec = file.videoMediaMetadata?.durationMillis
      ? Math.round(Number(file.videoMediaMetadata.durationMillis) / 1000)
      : null;

    const result = await db
      .insert(storyContentTable)
      .values({
        driveFileId: file.id,
        title,
        originalName: file.name,
        category,
        mimeType: file.mimeType,
        thumbnailUrl: file.thumbnailLink ?? null,
        folderId,
        durationSec,
        active: true,
      })
      .onConflictDoUpdate({
        target: storyContentTable.driveFileId,
        set: {
          title,
          originalName: file.name,
          category,
          mimeType: file.mimeType,
          thumbnailUrl: file.thumbnailLink ?? null,
          folderId,
          durationSec,
          active: true,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: storyContentTable.id });
    if (result[0]) inserted += 1;
  }

  lastSyncAt = Date.now();
  logger.info({ inserted, folders: FOLDER_IDS.length }, "Stories synced");
  return { inserted, total: allFiles.length };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Verify the child belongs to the authenticated user. */
async function loadOwnedChild(childId: number, userId: string) {
  const rows = await db
    .select({ id: childrenTable.id, name: childrenTable.name })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

interface StoryDto {
  id: number;
  driveFileId: string;
  title: string;
  category: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  streamUrl: string;
  /** Per-child fields, only populated when the child has played this story. */
  positionSec?: number;
  playCount?: number;
  completed?: boolean;
}

function toDto(
  s: StoryContent,
  progress?: {
    positionSec: number;
    playCount: number;
    completed: boolean;
  } | null,
): StoryDto {
  return {
    id: s.id,
    driveFileId: s.driveFileId,
    title: s.title,
    category: s.category,
    thumbnailUrl: s.thumbnailUrl,
    durationSec: s.durationSec,
    streamUrl: `/api/reels/stream/${s.driveFileId}`,
    ...(progress
      ? {
          positionSec: progress.positionSec,
          playCount: progress.playCount,
          completed: progress.completed,
        }
      : {}),
  };
}

// ─── GET /api/stories?childId= ───────────────────────────────────────────────

const listQuery = z.object({
  childId: z.coerce.number().int().positive(),
});

router.get("/", async (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const userId = auth.uid;

  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", details: parsed.error.flatten() });
    return;
  }
  const { childId } = parsed.data;

  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    // Lazy-sync: if the catalog is empty, populate it before returning.
    let stories = await db
      .select()
      .from(storyContentTable)
      .where(eq(storyContentTable.active, true))
      .orderBy(desc(storyContentTable.createdAt));

    if (stories.length === 0) {
      try {
        await syncStoriesFromDrive(true);
        stories = await db
          .select()
          .from(storyContentTable)
          .where(eq(storyContentTable.active, true))
          .orderBy(desc(storyContentTable.createdAt));
      } catch (err) {
        logger.error({ err }, "Lazy story sync failed");
      }
    } else {
      // Background refresh — best-effort, non-blocking.
      void syncStoriesFromDrive(false).catch(() => {});
    }

    // Per-child progress map
    const progressRows = await db
      .select()
      .from(storyWatchProgressTable)
      .where(
        and(
          eq(storyWatchProgressTable.childId, childId),
          eq(storyWatchProgressTable.userId, userId),
        ),
      );
    const progressByStory = new Map(progressRows.map((p) => [p.storyId, p]));

    const allStories = stories.map((s) => toDto(s, progressByStory.get(s.id) ?? null));

    // Continue Watching: started but not completed, sorted by recency
    const continueWatching = progressRows
      .filter((p) => p.positionSec > 5 && !p.completed)
      .sort(
        (a, b) =>
          new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime(),
      )
      .map((p) => stories.find((s) => s.id === p.storyId))
      .filter((s): s is StoryContent => Boolean(s))
      .slice(0, 12)
      .map((s) => toDto(s, progressByStory.get(s.id) ?? null));

    // Trending: globally most-played across this user's children. We aggregate
    // over THIS user only to avoid leaking data across accounts.
    const playCounts = await db
      .select({
        storyId: storyWatchProgressTable.storyId,
        plays: sql<number>`sum(${storyWatchProgressTable.playCount})`.as("plays"),
      })
      .from(storyWatchProgressTable)
      .where(eq(storyWatchProgressTable.userId, userId))
      .groupBy(storyWatchProgressTable.storyId)
      .orderBy(sql`plays desc`)
      .limit(12);
    const trending = playCounts
      .map((p) => stories.find((s) => s.id === p.storyId))
      .filter((s): s is StoryContent => Boolean(s))
      .map((s) => toDto(s, progressByStory.get(s.id) ?? null));

    // Recommended: prefer categories the child has played most + fill with
    // unplayed stories so we always have ≥6 items.
    const watchedCategoryCounts: Record<string, number> = {};
    for (const p of progressRows) {
      const story = stories.find((s) => s.id === p.storyId);
      if (story) {
        watchedCategoryCounts[story.category] =
          (watchedCategoryCounts[story.category] ?? 0) + p.playCount;
      }
    }
    const topCategories = Object.entries(watchedCategoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([cat]) => cat);

    const playedIds = new Set(progressRows.map((p) => p.storyId));
    const sameCategoryUnplayed = stories.filter(
      (s) => topCategories.includes(s.category) && !playedIds.has(s.id),
    );
    const otherUnplayed = stories.filter((s) => !playedIds.has(s.id));
    const recommendedRaw =
      sameCategoryUnplayed.length >= 6
        ? sameCategoryUnplayed
        : [
            ...sameCategoryUnplayed,
            ...otherUnplayed.filter(
              (s) => !sameCategoryUnplayed.some((x) => x.id === s.id),
            ),
          ];
    const recommended = recommendedRaw
      .slice(0, 12)
      .map((s) => toDto(s, progressByStory.get(s.id) ?? null));

    res.json({
      activeChildId: childId,
      child: { id: child.id, name: child.name },
      catalogSize: stories.length,
      rows: {
        continueWatching,
        recommended,
        trending,
        allStories,
      },
    });
  } catch (err) {
    logger.error({ err }, "GET /api/stories failed");
    res.status(500).json({ error: "internal_error" });
  }
});

// ─── POST /api/stories/sync ──────────────────────────────────────────────────

/**
 * Per-user rate limit: forced re-sync hits Drive's API and burns quota, so
 * we throttle to once every 10 minutes. The catalog is also lazy-synced on
 * the read path, so users rarely need to call this manually.
 */
const SYNC_COOLDOWN_MS = 10 * 60 * 1000;
const lastForcedSyncByUser = new Map<string, number>();

router.post("/sync", async (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const userId = auth.uid;
  const now = Date.now();
  const last = lastForcedSyncByUser.get(userId) ?? 0;
  const elapsed = now - last;
  if (elapsed < SYNC_COOLDOWN_MS) {
    const retryAfterSec = Math.ceil((SYNC_COOLDOWN_MS - elapsed) / 1000);
    res.setHeader("Retry-After", String(retryAfterSec));
    res.status(429).json({
      error: "rate_limited",
      retryAfterSec,
    });
    return;
  }
  lastForcedSyncByUser.set(userId, now);
  try {
    const result = await syncStoriesFromDrive(true);
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "Story sync failed");
    res.status(500).json({ error: "sync_failed" });
  }
});

// ─── POST /api/stories/progress ──────────────────────────────────────────────

const progressBody = z.object({
  childId: z.number().int().positive(),
  storyId: z.number().int().positive(),
  positionSec: z.number().int().nonnegative().max(60 * 60 * 12),
  durationSec: z.number().int().positive().max(60 * 60 * 12).optional(),
  completed: z.boolean().optional(),
  /** Set true when starting a fresh play (after close/complete). */
  startedSession: z.boolean().optional(),
});

router.post("/progress", async (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const userId = auth.uid;

  const parsed = progressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }
  const { childId, storyId, positionSec, durationSec, completed, startedSession } =
    parsed.data;

  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const story = await db
      .select({ id: storyContentTable.id })
      .from(storyContentTable)
      .where(
        and(
          eq(storyContentTable.id, storyId),
          eq(storyContentTable.active, true),
        ),
      )
      .limit(1);
    if (!story[0]) {
      res.status(404).json({ error: "story_not_found" });
      return;
    }

    const isCompleted =
      completed ??
      (durationSec !== undefined && positionSec / Math.max(1, durationSec) >= 0.95);

    await db
      .insert(storyWatchProgressTable)
      .values({
        childId,
        userId,
        storyId,
        positionSec: isCompleted ? 0 : positionSec,
        durationSec: durationSec ?? null,
        playCount: 1,
        completed: isCompleted,
        lastWatchedAt: sql`now()`,
      })
      .onConflictDoUpdate({
        target: [
          storyWatchProgressTable.childId,
          storyWatchProgressTable.storyId,
        ],
        set: {
          positionSec: isCompleted ? 0 : positionSec,
          ...(durationSec !== undefined ? { durationSec } : {}),
          completed: isCompleted,
          // Bump play_count only when the client signals a new session.
          ...(startedSession
            ? { playCount: sql`${storyWatchProgressTable.playCount} + 1` }
            : {}),
          lastWatchedAt: sql`now()`,
          updatedAt: sql`now()`,
        },
      });

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "POST /api/stories/progress failed");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
