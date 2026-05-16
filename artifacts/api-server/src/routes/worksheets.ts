import { Router } from "express";
import { driveFilesListAll, driveProxyDownloadPath, getDriveApiKey } from "../lib/googleDrive";
import { logger } from "../lib/logger";

const router = Router();

const ROOT_FOLDER_ID = "1vT-SG778TlLbgb64aCbZUO1y1hGq1Wyr";
const CACHE_TTL_MS = 5 * 60 * 1000;

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
  downloadUrl: string;
  previewUrl: string;
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
      downloadUrl: driveProxyDownloadPath(file.id, file.name),
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
