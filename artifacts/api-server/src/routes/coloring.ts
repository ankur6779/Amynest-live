import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  childrenTable,
  coloringDownloadsTable,
} from "@workspace/db";
import { getAuth } from "../lib/auth";
import { driveFilesListAll, getDriveApiKey } from "../lib/googleDrive";
import {
  setHubQuotaHeaders,
  streamDrivePdfToExpress,
  type HubQuotaHeaders,
} from "../lib/hubPdfStream";
import { logger } from "../lib/logger";
import { HUB_CONTENT_QUOTAS } from "@workspace/parent-hub-journey";
import {
  getOrCreateSubscription,
  isPremiumNow,
} from "../services/subscriptionService.js";
import { infantExploreMutationGate } from "../middlewares/infantExploreMutationGate.js";
import {
  getPremiumDownloadWallet,
  refundPremiumDownloadBankDebit,
  reservePremiumDownload,
  type PremiumDownloadWallet,
} from "../services/premiumDownloadBankService.js";

const router: IRouter = Router();

// ─── Config ──────────────────────────────────────────────────────────────────

/** Public Google Drive folder containing the Coloring Books library.
 *  We recurse into subfolders, picking up only PDFs. */
const ROOT_FOLDER_ID = "1n937xIi5gjhWMtVUaxuaSLHe96ZLSdkT";

/** Drive API responses are cached in memory for 10 minutes. */
const CACHE_TTL_MS = 10 * 60 * 1000;

/** UI shows this many PDFs per page; backend slices accordingly. */
const PAGE_SIZE = 4;

/** Maximum downloads per calendar day (IST). Free vs premium caps differ. */
const FREE_DAILY_LIMIT = HUB_CONTENT_QUOTAS.coloringDaily;
const PREMIUM_DAILY_LIMIT = HUB_CONTENT_QUOTAS.premiumDownloadDaily;
const LIFETIME_LIMIT = HUB_CONTENT_QUOTAS.coloringLifetime;

function dailyLimitFor(premium: boolean): number {
  return premium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
}

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

/** Total distinct downloads for this child (lifetime). */
async function getLifetimeDownloadCount(
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

  const apiKey = getDriveApiKey();
  if (!apiKey) {
    logger.error(
      "GOOGLE_API_KEY / GOOGLE_DRIVE_API_KEY not configured — coloring section unavailable",
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
    const lifetimeUsed = await getLifetimeDownloadCount(userId, childId);
    const sub = await getOrCreateSubscription(userId);
    const premium = isPremiumNow(sub);
    const downloadWallet = await getPremiumDownloadWallet(userId);
    const dailyLimit = downloadWallet.enabled ? downloadWallet.maxAvailable : dailyLimitFor(premium);

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
        limit: dailyLimit,
        used: downloadWallet.enabled ? downloadWallet.dailyUsed : used,
        remaining: downloadWallet.enabled
          ? downloadWallet.availableToday
          : Math.max(0, dailyLimit - used),
      },
      lifetimeQuota: premium
        ? { limit: null, used: lifetimeUsed, remaining: null }
        : {
            limit: LIFETIME_LIMIT,
            used: lifetimeUsed,
            remaining: Math.max(0, LIFETIME_LIMIT - lifetimeUsed),
          },
      downloadWallet: downloadWallet.enabled ? downloadWallet : null,
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

router.post("/coloring/download", infantExploreMutationGate(), async (req, res): Promise<void> => {
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

    // Verify the requested fileId is in our Drive catalog. This stops
    // anyone logging arbitrary fileIds and polluting the table.
    const allFiles = await getColoringCatalog(apiKey);
    const file = allFiles.find((f) => f.id === fileId);
    if (!file) {
      res.status(404).json({ error: "file_not_found" });
      return;
    }

    const sub = await getOrCreateSubscription(userId);
    const premium = isPremiumNow(sub);
    const downloadWallet = await getPremiumDownloadWallet(userId);
    const paidWalletEnabled = downloadWallet.enabled;
    const dailyLimit = paidWalletEnabled ? downloadWallet.maxAvailable : dailyLimitFor(premium);
    const used = await getDailyDownloadCount(userId, childId);
    const lifetimeUsed = await getLifetimeDownloadCount(userId, childId);

    const buildQuotaHeaders = (
      dailyUsed: number,
      lifetimeUsedCount: number,
      wallet?: PremiumDownloadWallet | null,
    ): HubQuotaHeaders => ({
      dailyLimit,
      dailyUsed: wallet?.enabled ? wallet.dailyUsed : dailyUsed,
      dailyRemaining: wallet?.enabled
        ? wallet.availableToday
        : Math.max(0, dailyLimit - dailyUsed),
      lifetimeLimit: premium ? null : LIFETIME_LIMIT,
      lifetimeUsed: lifetimeUsedCount,
      lifetimeRemaining: premium
        ? null
        : Math.max(0, LIFETIME_LIMIT - lifetimeUsedCount),
      downloadWallet: wallet?.enabled ? wallet : undefined,
    });

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

    // Re-download: stream again without consuming quota.
    if (existing) {
      setHubQuotaHeaders(res, buildQuotaHeaders(used, lifetimeUsed, downloadWallet));
      const streamed = await streamDrivePdfToExpress(res, fileId, file.name);
      if (!streamed && !res.headersSent) {
        res.status(502).json({ error: "stream_failed" });
      }
      return;
    }

    if (!premium && lifetimeUsed >= LIFETIME_LIMIT) {
      res.status(402).json({
        error: "lifetime_limit_reached",
        lifetimeQuota: {
          limit: LIFETIME_LIMIT,
          used: lifetimeUsed,
          remaining: 0,
        },
      });
      return;
    }

    let premiumReservation:
      | Awaited<ReturnType<typeof reservePremiumDownload>>
      | null = null;

    if (paidWalletEnabled) {
      premiumReservation = await reservePremiumDownload(userId);
      if (!premiumReservation.ok) {
        res.status(429).json({
          error: "daily_limit_reached",
          dailyQuota: {
            limit: premiumReservation.wallet.maxAvailable,
            used: premiumReservation.wallet.dailyUsed,
            remaining: premiumReservation.wallet.availableToday,
          },
          downloadWallet: premiumReservation.wallet,
        });
        return;
      }
    } else if (used >= dailyLimit) {
      res.status(429).json({
        error: "daily_limit_reached",
        dailyQuota: { limit: dailyLimit, used, remaining: 0 },
      });
      return;
    }

    let insertedId: number | null = null;
    try {
      const [row] = await db
        .insert(coloringDownloadsTable)
        .values({
          userId,
          childId,
          fileId,
          fileName: file.name,
        })
        .returning({ id: coloringDownloadsTable.id });
      insertedId = row?.id ?? null;
    } catch (insertErr) {
      const pgCode = (insertErr as { code?: string }).code;
      if (pgCode === "23505") {
        setHubQuotaHeaders(res, buildQuotaHeaders(used, lifetimeUsed));
        const streamed = await streamDrivePdfToExpress(res, fileId, file.name);
        if (!streamed && !res.headersSent) {
          res.status(502).json({ error: "stream_failed" });
        }
        return;
      }
      throw insertErr;
    }

    const dailyUsedAfter = used + 1;
    const lifetimeUsedAfter = lifetimeUsed + 1;
    setHubQuotaHeaders(
      res,
      buildQuotaHeaders(
        dailyUsedAfter,
        lifetimeUsedAfter,
        premiumReservation?.ok ? premiumReservation.wallet : downloadWallet,
      ),
    );

    const streamed = await streamDrivePdfToExpress(res, fileId, file.name);
    if (!streamed) {
      if (insertedId != null) {
        await db
          .delete(coloringDownloadsTable)
          .where(eq(coloringDownloadsTable.id, insertedId));
      }
      if (premiumReservation?.ok && premiumReservation.source === "bank") {
        await refundPremiumDownloadBankDebit(userId);
      }
      if (!res.headersSent) {
        res.status(502).json({ error: "stream_failed" });
      }
      return;
    }
  } catch (err) {
    logger.error(
      `coloring download failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
