import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  childrenTable,
  funsheetDownloadsTable,
} from "@workspace/db";
import { getAuth } from "../lib/auth";
import { driveFilesListAll, driveProxyDownloadPath, getDriveApiKey } from "../lib/googleDrive";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── Config ──────────────────────────────────────────────────────────────────

/** Two Google Drive folders containing the Fun Sheets library. */
const ROOT_FOLDER_IDS = [
  "1G0KcIN8otcleOOBqosFyg_k4o9GK4eRz",
  "1f-H6WufGb3Q7F8jJHXC13UrdooV1bBab",
];

/** Drive API responses are cached in memory for 10 minutes. */
const CACHE_TTL_MS = 10 * 60 * 1000;

/** UI shows this many PDFs per page. */
const PAGE_SIZE = 4;

/** Maximum downloads a single child may make per calendar day (IST). */
const DAILY_LIMIT = 2;

/** Hard ceiling on recursion depth. */
const MAX_RECURSION_DEPTH = 8;

// ─── Types ──────────────────────────────────────────────────────────────────

interface FunsheetFile {
  id: string;
  name: string;
  thumbnailUrl: string;
  previewUrl: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanFileName(raw: string): string {
  const noExt = raw.replace(/\.[^.]+$/, "");
  const spaced = noExt.replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
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
  return driveFilesListAll(
    apiKey,
    `'${folderId}' in parents and trashed = false`,
    "nextPageToken,files(id,name,mimeType)",
  );
}

async function collectPdfsRecursive(
  folderId: string,
  apiKey: string,
  depth = 0,
): Promise<FunsheetFile[]> {
  if (depth > MAX_RECURSION_DEPTH) return [];

  const items = await listFolderContents(folderId, apiKey);

  const folders = items.filter(
    (i) => i.mimeType === "application/vnd.google-apps.folder",
  );
  const pdfs = items.filter((i) => i.mimeType === "application/pdf");

  const results: FunsheetFile[] = pdfs.map((p) => ({
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

// In-memory cache.
let cachedFiles: FunsheetFile[] = [];
let cacheTimestamp = 0;

async function getFunsheetCatalog(apiKey: string): Promise<FunsheetFile[]> {
  const now = Date.now();
  if (cachedFiles.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedFiles;
  }
  // Collect from all root folders in parallel.
  const results = await Promise.all(
    ROOT_FOLDER_IDS.map((fid) => collectPdfsRecursive(fid, apiKey)),
  );
  const allFiles = results.flat();
  // Deduplicate by fileId (in case the same PDF appears in both folders).
  const seen = new Set<string>();
  const deduped: FunsheetFile[] = [];
  for (const f of allFiles) {
    if (!seen.has(f.id)) {
      seen.add(f.id);
      deduped.push(f);
    }
  }
  deduped.sort((a, b) => a.name.localeCompare(b.name));
  cachedFiles = deduped;
  cacheTimestamp = now;
  logger.info(`funsheet catalog rebuilt: ${deduped.length} PDFs from ${ROOT_FOLDER_IDS.length} folders`);
  return deduped;
}

/** Count downloads for this child today (Asia/Kolkata calendar day). */
async function getDailyDownloadCount(
  userId: string,
  childId: number,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(funsheetDownloadsTable)
    .where(
      and(
        eq(funsheetDownloadsTable.userId, userId),
        eq(funsheetDownloadsTable.childId, childId),
        sql`(${funsheetDownloadsTable.downloadedAt} AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date`,
      ),
    );
  return row?.count ?? 0;
}

// ─── GET /api/funsheets/list ─────────────────────────────────────────────────

const ListQuery = z.object({
  childId: z.coerce.number().int().positive(),
  page: z.coerce.number().int().nonnegative().optional().default(0),
});

router.get("/funsheets/list", async (req, res): Promise<void> => {
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

  const apiKey = getDriveApiKey();
  if (!apiKey) {
    logger.error(
      "GOOGLE_API_KEY / GOOGLE_DRIVE_API_KEY not configured — funsheets section unavailable",
    );
    res.status(500).json({ error: "google_api_key_missing" });
    return;
  }

  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const allFiles = await getFunsheetCatalog(apiKey);

    // Sort: not-yet-downloaded first, already-downloaded last.
    const downloaded = await db
      .select({ fileId: funsheetDownloadsTable.fileId })
      .from(funsheetDownloadsTable)
      .where(
        and(
          eq(funsheetDownloadsTable.userId, userId),
          eq(funsheetDownloadsTable.childId, childId),
        ),
      );
    const downloadedSet = new Set(downloaded.map((d) => d.fileId));
    const notDownloaded = allFiles.filter((f) => !downloadedSet.has(f.id));
    const alreadyDownloaded = allFiles.filter((f) => downloadedSet.has(f.id));
    const sortedFiles = [...notDownloaded, ...alreadyDownloaded];

    const total = sortedFiles.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE);
    const safePage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
    const start = safePage * PAGE_SIZE;
    const slice = sortedFiles.slice(start, start + PAGE_SIZE).map((f) => ({
      ...f,
      downloaded: downloadedSet.has(f.id),
    }));

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
    logger.error(`funsheets list failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/funsheets/download ────────────────────────────────────────────

const DownloadBody = z.object({
  childId: z.number().int().positive(),
  fileId: z.string().min(5).max(80),
});

router.post("/funsheets/download", async (req, res): Promise<void> => {
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

  const apiKey = getDriveApiKey();
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

    // Verify the fileId is in our catalog.
    const allFiles = await getFunsheetCatalog(apiKey);
    const file = allFiles.find((f) => f.id === fileId);
    if (!file) {
      res.status(404).json({ error: "file_not_found" });
      return;
    }

    // Check if already downloaded (per spec: "downloaded files sort to bottom"
    // but a re-download is still allowed — we just record it again only if
    // within daily limit). The unique index prevents double-counting the same
    // file across days, so we skip the "already downloaded" 409 here.
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
      await db.insert(funsheetDownloadsTable).values({
        userId,
        childId,
        fileId,
        fileName: file.name,
      });
    } catch (insertErr) {
      // Duplicate (child already downloaded this file) — unique index 23505.
      // Still return the download URL so they can re-download.
      const pgCode = (insertErr as { code?: string }).code;
      if (pgCode !== "23505") throw insertErr;
    }

    res.json({
      ok: true,
      downloadUrl: driveProxyDownloadPath(fileId, file.name),
      dailyQuota: {
        limit: DAILY_LIMIT,
        used: used + 1,
        remaining: Math.max(0, DAILY_LIMIT - (used + 1)),
      },
    });
  } catch (err) {
    logger.error(`funsheets download failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
