import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import {
  childrenTable,
  db,
  worksheetDownloadsTable,
} from "@workspace/db";
import { driveFilesListAll, getDriveApiKey } from "../lib/googleDrive";
import { getAuth } from "../lib/auth";
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

const ROOT_FOLDER_ID = "1vT-SG778TlLbgb64aCbZUO1y1hGq1Wyr";
const CACHE_TTL_MS = 5 * 60 * 1000;
const FREE_DAILY_LIMIT = HUB_CONTENT_QUOTAS.worksheetDaily;
const PREMIUM_DAILY_LIMIT = HUB_CONTENT_QUOTAS.premiumDownloadDaily;
const LIFETIME_LIMIT = HUB_CONTENT_QUOTAS.worksheetLifetime;

export type WorksheetCategory =
  | "coloring"
  | "math"
  | "tracing"
  | "alphabet"
  | "numbers"
  | "general";

interface WorksheetFile {
  id: string;
  name: string;
  mimeType: string;
  fileType: "pdf" | "image";
  category: WorksheetCategory;
  previewUrl: string;
}

interface WorksheetListItem extends WorksheetFile {
  downloaded: boolean;
}

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);

let cachedWorksheets: WorksheetFile[] = [];
let cacheTimestamp = 0;

function inferCategory(name: string, folderPath: string): WorksheetCategory {
  const text = `${name} ${folderPath}`.toLowerCase();
  if (/color|colour|colouring|coloring/.test(text)) return "coloring";
  if (/math|maths|addition|subtract|multiply|count/.test(text)) return "math";
  if (/trac|handwrit|writing/.test(text)) return "tracing";
  if (/alphabet|letter|abc|phonics/.test(text)) return "alphabet";
  if (/number|numeral|1-10|1-20/.test(text)) return "numbers";
  return "general";
}

function previewUrl(fileId: string, mimeType: string): string {
  if (mimeType === "application/pdf") {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w320`;
  }
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w320`;
}

async function listFolderContents(
  folderId: string,
  apiKey: string
): Promise<{ id: string; name: string; mimeType: string }[]> {
  return driveFilesListAll(
    apiKey,
    `'${folderId}' in parents and trashed = false`,
    "nextPageToken,files(id,name,mimeType)",
  );
}

async function collectFilesRecursive(
  folderId: string,
  apiKey: string,
  folderPath = "",
  depth = 0
): Promise<WorksheetFile[]> {
  if (depth > 8) return [];

  const items = await listFolderContents(folderId, apiKey);
  const results: WorksheetFile[] = [];

  const folderItems = items.filter(
    (i) => i.mimeType === "application/vnd.google-apps.folder"
  );
  const fileItems = items.filter((i) => ALLOWED_MIME.has(i.mimeType));

  for (const file of fileItems) {
    results.push({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      fileType: file.mimeType === "application/pdf" ? "pdf" : "image",
      category: inferCategory(file.name, folderPath),
      previewUrl: previewUrl(file.id, file.mimeType),
    });
  }

  const subResults = await Promise.all(
    folderItems.map((f) =>
      collectFilesRecursive(f.id, apiKey, `${folderPath} ${f.name}`.trim(), depth + 1)
    )
  );
  for (const sub of subResults) results.push(...sub);

  return results;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")   // strip extension
    .replace(/[_\-\s]+/g, " ") // normalize separators
    .trim();
}

async function getWorksheets(apiKey: string): Promise<WorksheetFile[]> {
  const now = Date.now();
  if (cachedWorksheets.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedWorksheets;
  }
  const files = await collectFilesRecursive(ROOT_FOLDER_ID, apiKey);

  // Deduplicate: prefer PDFs over images when names collide; keep first seen otherwise
  const seen = new Map<string, WorksheetFile>();
  for (const f of files) {
    const key = normalizeName(f.name);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, f);
    } else if (f.fileType === "pdf" && existing.fileType !== "pdf") {
      // Upgrade to PDF version
      seen.set(key, f);
    }
  }
  const unique = Array.from(seen.values());

  // PDFs first, then images — alphabetical within each group
  unique.sort((a, b) => {
    if (a.fileType !== b.fileType) return a.fileType === "pdf" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  cachedWorksheets = unique;
  cacheTimestamp = Date.now();
  logger.info({ total: files.length, unique: unique.length }, "Worksheets cache rebuilt");
  return unique;
}

function dailyLimitFor(premium: boolean): number {
  return premium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
}

async function loadOwnedChild(childId: number, userId: string) {
  const [child] = await db
    .select()
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return child ?? null;
}

async function getDailyDownloadCount(
  userId: string,
  childId: number,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(worksheetDownloadsTable)
    .where(
      and(
        eq(worksheetDownloadsTable.userId, userId),
        eq(worksheetDownloadsTable.childId, childId),
        sql`(${worksheetDownloadsTable.downloadedAt} AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date`,
      ),
    );
  return row?.count ?? 0;
}

async function getLifetimeDownloadCount(
  userId: string,
  childId: number,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(worksheetDownloadsTable)
    .where(
      and(
        eq(worksheetDownloadsTable.userId, userId),
        eq(worksheetDownloadsTable.childId, childId),
      ),
    );
  return row?.count ?? 0;
}

const ListQuery = z.object({
  childId: z.coerce.number().int().positive(),
});

router.get("/worksheets/list", async (req, res): Promise<void> => {
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
  const { childId } = parsed.data;

  const apiKey = getDriveApiKey();
  if (!apiKey) {
    res.status(500).json({
      error:
        "GOOGLE_API_KEY or GOOGLE_DRIVE_API_KEY not configured on the API server",
    });
    return;
  }

  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const allFiles = await getWorksheets(apiKey);
    const downloaded = await db
      .select({ fileId: worksheetDownloadsTable.fileId })
      .from(worksheetDownloadsTable)
      .where(
        and(
          eq(worksheetDownloadsTable.userId, userId),
          eq(worksheetDownloadsTable.childId, childId),
        ),
      );
    const downloadedSet = new Set(downloaded.map((d) => d.fileId));
    const worksheets: WorksheetListItem[] = allFiles.map((w) => ({
      ...w,
      downloaded: downloadedSet.has(w.id),
    }));

    const used = await getDailyDownloadCount(userId, childId);
    const lifetimeUsed = await getLifetimeDownloadCount(userId, childId);
    const sub = await getOrCreateSubscription(userId);
    const premium = isPremiumNow(sub);
    const downloadWallet = await getPremiumDownloadWallet(userId);
    const dailyLimit = downloadWallet.enabled ? downloadWallet.maxAvailable : dailyLimitFor(premium);

    res.json({
      ok: true,
      worksheets,
      total: worksheets.length,
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
    logger.error({ err }, "Failed to fetch worksheet list");
    res.status(500).json({ error: "server_error" });
  }
});

const DownloadBody = z.object({
  childId: z.number().int().positive(),
  fileId: z.string().min(5).max(80),
});

router.post("/worksheets/download", infantExploreMutationGate(), async (req, res): Promise<void> => {
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

    const allFiles = await getWorksheets(apiKey);
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
      .select({ id: worksheetDownloadsTable.id })
      .from(worksheetDownloadsTable)
      .where(
        and(
          eq(worksheetDownloadsTable.userId, userId),
          eq(worksheetDownloadsTable.childId, childId),
          eq(worksheetDownloadsTable.fileId, fileId),
        ),
      )
      .limit(1);

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
        .insert(worksheetDownloadsTable)
        .values({
          userId,
          childId,
          fileId,
          fileName: file.name,
        })
        .returning({ id: worksheetDownloadsTable.id });
      insertedId = row?.id ?? null;
    } catch (insertErr) {
      const pgCode = (insertErr as { code?: string }).code;
      if (pgCode === "23505") {
        if (premiumReservation?.ok && premiumReservation.source === "bank") {
          await refundPremiumDownloadBankDebit(userId);
        }
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
          .delete(worksheetDownloadsTable)
          .where(eq(worksheetDownloadsTable.id, insertedId));
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
    logger.error({ err }, "worksheet download failed");
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/worksheets", async (req, res) => {
  const apiKey = getDriveApiKey();
  if (!apiKey) {
    res.status(500).json({
      error:
        "GOOGLE_API_KEY or GOOGLE_DRIVE_API_KEY not configured on the API server",
    });
    return;
  }
  try {
    const worksheets = await getWorksheets(apiKey);
    res.set("Cache-Control", "public, max-age=300");
    res.json({ worksheets, total: worksheets.length });
  } catch (err) {
    logger.error({ err }, "Failed to fetch worksheets");
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
