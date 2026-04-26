import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  childrenTable,
  coloringDownloadsTable,
} from "@workspace/db";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── Config ──────────────────────────────────────────────────────────────────

/** Public Google Drive folder containing the Coloring Books library.
 *  We recurse into subfolders, picking up only PDFs. */
const ROOT_FOLDER_ID = "1n937xIi5gjhWMtVUaxuaSLHe96ZLSdkT";
const DRIVE_API = "https://www.googleapis.com/drive/v3/files";

/** Drive API responses are cached in memory for 10 minutes. */
const CACHE_TTL_MS = 10 * 60 * 1000;

/** UI shows this many PDFs per page; backend slices accordingly. */
const PAGE_SIZE = 4;

/** Maximum downloads a single child may make per calendar day (IST). */
const DAILY_LIMIT = 2;

/** Hard ceiling on recursion depth so a malformed Drive folder can't loop. */
const MAX_RECURSION_DEPTH = 8;

// ─── Types ──────────────────────────────────────────────────────────────────

interface ColoringFile {
  id: string;
  name: string;
  thumbnailUrl: string;
  previewUrl: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanFileName(raw: string): string {
  // Strip extension, normalize separators, title-case-ish.
  const noExt = raw.replace(/\.[^.]+$/, "");
  const spaced = noExt.replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
  // Capitalize first letter of each word but preserve existing caps.
  return spaced
    .split(" ")
    .map((w) => (w.length === 0 ? w : w[0]!.toUpperCase() + w.slice(1)))
    .join(" ");
}

async function loadOwnedChild(childId: number, userId: string) {
  const [child] = await db
    .select()
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return child ?? null;
}

async function listFolderContents(
  folderId: string,
  apiKey: string,
): Promise<{ id: string; name: string; mimeType: string }[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "nextPageToken,files(id,name,mimeType)",
    key: apiKey,
    pageSize: "1000",
  });

  const all: { id: string; name: string; mimeType: string }[] = [];
  let pageToken: string | undefined;

  do {
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`${DRIVE_API}?${params.toString()}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Drive API error ${res.status}: ${text}`);
    }
    const data = (await res.json()) as {
      files: { id: string; name: string; mimeType: string }[];
      nextPageToken?: string;
    };
    all.push(...(data.files || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return all;
}

async function collectPdfsRecursive(
  folderId: string,
  apiKey: string,
  depth = 0,
): Promise<ColoringFile[]> {
  if (depth > MAX_RECURSION_DEPTH) return [];

  const items = await listFolderContents(folderId, apiKey);

  const folders = items.filter(
    (i) => i.mimeType === "application/vnd.google-apps.folder",
  );
  const pdfs = items.filter((i) => i.mimeType === "application/pdf");

  const results: ColoringFile[] = pdfs.map((p) => ({
    id: p.id,
    name: cleanFileName(p.name),
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${p.id}&sz=w400`,
    previewUrl: `https://drive.google.com/file/d/${p.id}/preview`,
  }));

  const subResults = await Promise.all(
    folders.map((f) => collectPdfsRecursive(f.id, apiKey, depth + 1)),
  );
  for (const sub of subResults) results.push(...sub);

  return results;
}

// In-memory cache so we don't hit Drive on every list call.
let cachedFiles: ColoringFile[] = [];
let cacheTimestamp = 0;

async function getColoringCatalog(apiKey: string): Promise<ColoringFile[]> {
  const now = Date.now();
  if (cachedFiles.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedFiles;
  }
  const files = await collectPdfsRecursive(ROOT_FOLDER_ID, apiKey);
  // Deterministic order so pagination is stable across requests.
  files.sort((a, b) => a.name.localeCompare(b.name));
  cachedFiles = files;
  cacheTimestamp = now;
  logger.info(
    `coloring catalog rebuilt: ${files.length} PDFs from folder ${ROOT_FOLDER_ID}`,
  );
  return files;
}

/** Count downloads for this child today (Asia/Kolkata calendar day). */
async function getDailyDownloadCount(
  userId: string,
  childId: number,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(coloringDownloadsTable)
    .where(
      and(
        eq(coloringDownloadsTable.userId, userId),
        eq(coloringDownloadsTable.childId, childId),
        sql`(${coloringDownloadsTable.downloadedAt} AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date`,
      ),
    );
  return row?.count ?? 0;
}

// ─── GET /api/coloring/list ─────────────────────────────────────────────────
//
// Query: childId=N&page=K
// Returns: 4 PDFs at a time (already excluding the ones this child has
// downloaded), pagination metadata, and the child's daily quota.

const ListQuery = z.object({
  childId: z.coerce.number().int().positive(),
  page: z.coerce.number().int().nonnegative().optional().default(0),
});

router.get("/coloring/list", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = ListQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }
  const { childId, page } = parsed.data;

  const apiKey = process.env["GOOGLE_API_KEY"];
  if (!apiKey) {
    logger.error("GOOGLE_API_KEY not configured — coloring section unavailable");
    res.status(500).json({ error: "google_api_key_missing" });
    return;
  }

  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const allFiles = await getColoringCatalog(apiKey);

    // Filter out everything this child has already downloaded.
    const downloaded = await db
      .select({ fileId: coloringDownloadsTable.fileId })
      .from(coloringDownloadsTable)
      .where(
        and(
          eq(coloringDownloadsTable.userId, userId),
          eq(coloringDownloadsTable.childId, childId),
        ),
      );
    const downloadedSet = new Set(downloaded.map((d) => d.fileId));
    const available = allFiles.filter((f) => !downloadedSet.has(f.id));

    const total = available.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE);
    const safePage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
    const start = safePage * PAGE_SIZE;
    const slice = available.slice(start, start + PAGE_SIZE);

    const used = await getDailyDownloadCount(userId, childId);

    res.json({
      ok: true,
      files: slice,
      pagination: {
        page: safePage,
        pageSize: PAGE_SIZE,
        total,
        totalPages,
        hasNext: safePage + 1 < totalPages,
        hasPrev: safePage > 0,
      },
      dailyQuota: {
        limit: DAILY_LIMIT,
        used,
        remaining: Math.max(0, DAILY_LIMIT - used),
      },
    });
  } catch (err) {
    logger.error(
      `coloring list failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/coloring/download ────────────────────────────────────────────
//
// Body: { childId, fileId }
// Records the download (one row), enforces daily quota & "never repeat",
// and returns the actual Google Drive download URL.

const DownloadBody = z.object({
  childId: z.number().int().positive(),
  fileId: z.string().min(5).max(80),
});

router.post("/coloring/download", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = DownloadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const { childId, fileId } = parsed.data;

  const apiKey = process.env["GOOGLE_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "google_api_key_missing" });
    return;
  }

  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    // Verify the requested fileId is in our Drive catalog. This stops
    // anyone logging arbitrary fileIds and polluting the table.
    const allFiles = await getColoringCatalog(apiKey);
    const file = allFiles.find((f) => f.id === fileId);
    if (!file) {
      res.status(404).json({ error: "file_not_found" });
      return;
    }

    // Has this child already downloaded this file? If so, refuse — the
    // unique index would also catch it but a clean 409 is friendlier.
    const [existing] = await db
      .select({ id: coloringDownloadsTable.id })
      .from(coloringDownloadsTable)
      .where(
        and(
          eq(coloringDownloadsTable.userId, userId),
          eq(coloringDownloadsTable.childId, childId),
          eq(coloringDownloadsTable.fileId, fileId),
        ),
      )
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "already_downloaded" });
      return;
    }

    // Daily quota check.
    const used = await getDailyDownloadCount(userId, childId);
    if (used >= DAILY_LIMIT) {
      res.status(429).json({
        error: "daily_limit_reached",
        dailyQuota: { limit: DAILY_LIMIT, used, remaining: 0 },
      });
      return;
    }

    try {
      await db.insert(coloringDownloadsTable).values({
        userId,
        childId,
        fileId,
        fileName: file.name,
      });
    } catch (insertErr) {
      // Concurrent duplicate request lost the race past the pre-check —
      // the unique (child_id, file_id) index will throw Postgres 23505.
      // Surface it as a clean 409 instead of a generic 500.
      const pgCode = (insertErr as { code?: string }).code;
      if (pgCode === "23505") {
        res.status(409).json({ error: "already_downloaded" });
        return;
      }
      throw insertErr;
    }

    res.json({
      ok: true,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      dailyQuota: {
        limit: DAILY_LIMIT,
        used: used + 1,
        remaining: Math.max(0, DAILY_LIMIT - (used + 1)),
      },
    });
  } catch (err) {
    logger.error(
      `coloring download failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
