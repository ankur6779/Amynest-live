import { Router, type IRouter, type Request, type Response } from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  evaluateOtaCheck,
  resolveApiServerRoot,
  type CapgoOtaCheckBody,
} from "../services/otaService.js";
import { rejectIfIpRateLimited } from "../lib/endpoint-rate-limit.js";

const router: IRouter = Router();

const OTA_BUNDLES_DIR = resolve(resolveApiServerRoot(), "ota/bundles");

/** Serve published www zip bundles (upload same files to CDN in production). */
router.get("/app/ota/bundle/:filename", async (req: Request, res: Response): Promise<void> => {
  if (
    await rejectIfIpRateLimited(req, res, "ota-bundle", {
      windowMs: 60_000,
      maxPerWindow: 20,
    })
  ) {
    return;
  }

  const raw = String(req.params.filename ?? "");
  if (!/^amynest-www-\d+\.\d+\.\d+\.zip$/.test(raw)) {
    res.status(400).json({ error: "invalid_bundle_name" });
    return;
  }
  const filePath = resolve(OTA_BUNDLES_DIR, raw);
  if (!existsSync(filePath)) {
    res.status(404).json({ error: "bundle_not_found" });
    return;
  }
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.sendFile(filePath);
});

/**
 * Capgo CapacitorUpdater self-hosted check (POST).
 * Public — no auth. Only serves patch-level web bundle updates per Apple Guideline 2.5.2.
 *
 * Response when update available:
 *   { version, url, checksum }
 * Response when up to date / paused:
 *   { message: "..." }
 * Response when store upgrade required:
 *   { error, message }
 */
router.post("/app/ota/check", async (req: Request, res: Response): Promise<void> => {
  if (
    await rejectIfIpRateLimited(req, res, "ota-check", {
      windowMs: 60_000,
      maxPerWindow: 30,
    })
  ) {
    return;
  }

  const body = (req.body ?? {}) as CapgoOtaCheckBody;
  const builtin =
    process.env.OTA_BUILTIN_BUNDLE_VERSION?.trim() || "1.0.0";
  const result = evaluateOtaCheck(body, { builtinBundleVersion: builtin });

  if (result.kind === "update") {
    res.json({
      version: result.version,
      url: result.url,
      checksum: result.checksum,
      ...(result.releaseNotes ? { message: result.releaseNotes } : {}),
    });
    return;
  }

  if (result.kind === "blocked") {
    res.json({
      error: result.error,
      message: result.message,
    });
    return;
  }

  res.json({ message: result.message });
});

export default router;
