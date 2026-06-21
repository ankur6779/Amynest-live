import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { applyFeatureGate } from "../middlewares/featureGate.js";
import { getKidsHowLibraryEntry } from "../services/kidsHowLibraryCatalog.js";
import {
  gcsObjectExists,
  getGcsSignedReadUrl,
  legacyGcsConfigured,
} from "../services/ttsAudioStore.js";

const router: IRouter = Router();

const PREVIEW_TTL_MS = 30 * 60 * 1000;

const BookIdQuery = z.object({
  bookId: z.string().min(1).max(128),
});

router.get("/kids-how-library/preview-url", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = BookIdQuery.safeParse({ bookId: req.query.bookId });
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  const entry = getKidsHowLibraryEntry(parsed.data.bookId);
  if (!entry) {
    res.status(404).json({ error: "book_not_found" });
    return;
  }

  if (!legacyGcsConfigured()) {
    res.status(503).json({ error: "storage_unavailable" });
    return;
  }

  const exists = await gcsObjectExists(entry.gcsPath);
  if (!exists) {
    res.status(404).json({ error: "file_not_found" });
    return;
  }

  const url = await getGcsSignedReadUrl(entry.gcsPath, PREVIEW_TTL_MS);
  if (!url) {
    res.status(503).json({ error: "storage_unavailable" });
    return;
  }

  let allowed = false;
  await applyFeatureGate(req, res, "kids_how_pdf", () => {
    allowed = true;
  });
  if (!allowed) return;

  res.json({
    url,
    bookId: entry.id,
    expiresAt: new Date(Date.now() + PREVIEW_TTL_MS).toISOString(),
  });
});

export default router;
