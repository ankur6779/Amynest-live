/**
 * Google Drive file proxy — streams PDFs/images for Parent Hub downloads.
 * Mounted before requireAuth so window.open / <a download> work without JWT.
 * File IDs are only issued by authenticated list/download endpoints.
 */
import { Router, type IRouter } from "express";
import {
  safeHubPdfFileName,
  streamDrivePdfToExpress,
} from "../lib/hubPdfStream";

const router: IRouter = Router();

router.get("/drive/download/:fileId", async (req, res): Promise<void> => {
  const fileId = String(req.params.fileId ?? "");
  if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    res.status(400).json({ error: "invalid_file_id" });
    return;
  }

  const fileName = safeHubPdfFileName(
    typeof req.query.name === "string" ? req.query.name : "download.pdf",
  );

  const ok = await streamDrivePdfToExpress(res, fileId, fileName);
  if (!ok && !res.headersSent) {
    res.status(403).json({ error: "file_not_accessible" });
  }
});

export default router;
