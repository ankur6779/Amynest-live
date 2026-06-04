import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  getNutritionLibraryBookByFileName,
  NUTRITION_LIBRARY_BOOKS,
  nutritionLibraryGcsCandidates,
  type NutritionLibraryBook,
} from "../services/nutritionLibraryCatalog.js";
import {
  getOrCreateSubscription,
  isPremiumNow,
} from "../services/subscriptionService.js";
import {
  gcsObjectExists,
  getGcsSignedReadUrl,
  legacyGcsConfigured,
} from "../services/ttsAudioStore.js";

const router: IRouter = Router();

const PREVIEW_TTL_MS = 30 * 60 * 1000;
const DOWNLOAD_TTL_MS = 10 * 60 * 1000;

const FileQuery = z.object({
  file: z.string().min(1).max(256),
});

async function resolveNutritionLibraryObject(
  fileName: string,
): Promise<string | null> {
  if (!legacyGcsConfigured()) return null;
  for (const objectName of nutritionLibraryGcsCandidates(fileName)) {
    if (await gcsObjectExists(objectName)) return objectName;
  }
  return null;
}

function bookToApi(book: NutritionLibraryBook, available: boolean) {
  return {
    id: book.id,
    title: book.title,
    fileName: book.fileName,
    category: book.category,
    sizeBytes: book.sizeBytes,
    sizeLabel: book.sizeLabel,
    available,
  };
}

// ??? GET /api/nutrition-library/books ?????????????????????????????????????????

router.get("/nutrition-library/books", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  if (!legacyGcsConfigured()) {
    res.json({ books: [], gcsConfigured: false });
    return;
  }

  try {
    const books = await Promise.all(
      NUTRITION_LIBRARY_BOOKS.map(async (book) => {
        const objectName = await resolveNutritionLibraryObject(book.fileName);
        return bookToApi(book, Boolean(objectName));
      }),
    );
    const available = books.filter((b) => b.available);
    res.json({
      books: available.length > 0 ? available : books,
      gcsConfigured: true,
      total: NUTRITION_LIBRARY_BOOKS.length,
    });
  } catch (err) {
    logger.error(
      { evt: "nutrition_library.books_failed", err },
      "nutrition library books list failed",
    );
    res.status(500).json({ error: "list_failed" });
  }
});

// ??? GET /api/nutrition-library/preview-url ???????????????????????????????????

router.get("/nutrition-library/preview-url", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = FileQuery.safeParse({ file: req.query.file });
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  const book = getNutritionLibraryBookByFileName(parsed.data.file);
  if (!book) {
    res.status(404).json({ error: "book_not_found" });
    return;
  }

  const objectName = await resolveNutritionLibraryObject(book.fileName);
  if (!objectName) {
    res.status(404).json({ error: "file_not_found" });
    return;
  }

  const url = await getGcsSignedReadUrl(objectName, PREVIEW_TTL_MS);
  if (!url) {
    res.status(503).json({ error: "storage_unavailable" });
    return;
  }

  res.json({
    url,
    fileName: book.fileName,
    title: book.title,
    expiresAt: new Date(Date.now() + PREVIEW_TTL_MS).toISOString(),
  });
});

// ??? GET /api/nutrition-library/download ??????????????????????????????????????

router.get("/nutrition-library/download", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const sub = await getOrCreateSubscription(userId);
  if (!isPremiumNow(sub)) {
    res.status(403).json({
      error: "premium_required",
      message: "Nutrition Library downloads are available for Premium Families.",
    });
    return;
  }

  const parsed = FileQuery.safeParse({ file: req.query.file });
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  const book = getNutritionLibraryBookByFileName(parsed.data.file);
  if (!book) {
    res.status(404).json({ error: "book_not_found" });
    return;
  }

  const objectName = await resolveNutritionLibraryObject(book.fileName);
  if (!objectName) {
    res.status(404).json({ error: "file_not_found" });
    return;
  }

  const url = await getGcsSignedReadUrl(objectName, DOWNLOAD_TTL_MS);
  if (!url) {
    res.status(503).json({ error: "storage_unavailable" });
    return;
  }

  res.json({
    url,
    fileName: book.fileName,
    title: book.title,
    expiresAt: new Date(Date.now() + DOWNLOAD_TTL_MS).toISOString(),
  });
});

export default router;
