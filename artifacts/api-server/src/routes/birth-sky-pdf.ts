/**
 * Birth Sky premium PDF export — generate, download, history.
 * Does NOT touch AI insight quotas or subscription plan definitions.
 */

import { Router, type IRouter, type Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  db,
  birthSkyPdfExportsTable,
  childrenTable,
  skySnapshotsTable,
} from "@workspace/db";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { requireBirthSkyAllowlist } from "../services/birth-sky/require-birth-sky-allowlist";
import {
  loadOwnedProfile,
  mapProfileRow,
  mapSnapshotRow,
  plaintextBirthFields,
} from "../services/birth-sky/snapshot-service.js";
import { shouldExposeCurrentSnapshot } from "../services/birth-sky/snapshot-generation-status.js";
import { attachChartDetails, evaluateChartCompleteness } from "../services/birth-sky/chart-details.js";
import {
  base64ToBytes,
  bytesToBase64,
  generateBirthSkyPdf,
} from "../services/birth-sky/pdf-export-service.js";
import { getOrCreateSubscription } from "../services/subscriptionService.js";
import { isPremiumNow } from "../services/subscription-premium-gate.js";
import type { AstronomyData } from "../services/birth-sky/ephemeris-port.js";

const router: IRouter = Router();
router.use(requireBirthSkyAllowlist);

let pdfTableReady: boolean | null = null;

async function ensurePdfExportsTable(): Promise<boolean> {
  if (pdfTableReady === true) return true;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS birth_sky_pdf_exports (
        id text PRIMARY KEY,
        profile_id text NOT NULL,
        user_id text NOT NULL,
        snapshot_id text NOT NULL,
        snapshot_version text NOT NULL,
        engine_version text NOT NULL,
        file_name text NOT NULL,
        content_type text NOT NULL DEFAULT 'application/pdf',
        pdf_base64 text NOT NULL,
        byte_size integer NOT NULL,
        chart_details_version text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS birth_sky_pdf_exports_profile_idx
      ON birth_sky_pdf_exports (profile_id)
    `);
    pdfTableReady = true;
    return true;
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "birth_sky.pdf_table_ensure_failed",
    );
    pdfTableReady = false;
    return false;
  }
}

async function requirePremium(userId: string): Promise<boolean> {
  const sub = await getOrCreateSubscription(userId);
  return isPremiumNow(sub);
}

/** Reject stale isCurrent rows after profile edits (COMPUTING/FAILED generationStatus). */
function snapshotNotReadyResponse(res: Response, generationStatus: string): void {
  res.status(409).json({
    error: "snapshot_not_ready",
    generationStatus,
    detail: "Birth details changed — regenerate the sky before exporting PDF.",
  });
}

function mapExportMeta(row: typeof birthSkyPdfExportsTable.$inferSelect) {
  return {
    exportId: row.id,
    profileId: row.profileId,
    snapshotId: row.snapshotId,
    snapshotVersion: row.snapshotVersion,
    engineVersion: row.engineVersion,
    fileName: row.fileName,
    contentType: row.contentType,
    byteSize: row.byteSize,
    chartDetailsVersion: row.chartDetailsVersion,
    createdAt: row.createdAt.toISOString(),
  };
}

/** GET readiness / completeness for current snapshot (any authenticated Birth Sky user). */
router.get(
  "/birth-sky/profiles/:profileId/pdf/status",
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const profileId = String(req.params.profileId);
    const profile = await loadOwnedProfile(userId, profileId);
    if (!profile) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const mappedProfile = mapProfileRow(profile);
    const snaps = await db
      .select()
      .from(skySnapshotsTable)
      .where(
        and(eq(skySnapshotsTable.profileId, profileId), eq(skySnapshotsTable.isCurrent, true)),
      )
      .limit(1);
    const snap = snaps[0];
    if (!shouldExposeCurrentSnapshot(mappedProfile.generationStatus, Boolean(snap))) {
      snapshotNotReadyResponse(res, mappedProfile.generationStatus);
      return;
    }
    if (!snap) {
      res.status(404).json({ error: "snapshot_not_found" });
      return;
    }
    const astronomy = attachChartDetails(snap.astronomy as AstronomyData);
    const completeness = evaluateChartCompleteness(astronomy);
    const premium = await requirePremium(userId);
    res.json({
      premium,
      completeness,
      snapshotId: snap.id,
      snapshotVersion: snap.snapshotVersion,
      engineVersion: snap.engineVersion,
      mode: snap.mode,
    });
  },
);

/** GET export history (premium). */
router.get(
  "/birth-sky/profiles/:profileId/pdf/exports",
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (!(await requirePremium(userId))) {
      res.status(402).json({ error: "premium_required", feature: "birth_sky_pdf" });
      return;
    }
    const profileId = String(req.params.profileId);
    const profile = await loadOwnedProfile(userId, profileId);
    if (!profile) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    await ensurePdfExportsTable();
    const rows = await db
      .select()
      .from(birthSkyPdfExportsTable)
      .where(
        and(
          eq(birthSkyPdfExportsTable.profileId, profileId),
          eq(birthSkyPdfExportsTable.userId, userId),
        ),
      )
      .orderBy(desc(birthSkyPdfExportsTable.createdAt))
      .limit(50);
    res.json({ exports: rows.map(mapExportMeta) });
  },
);

/**
 * POST generate PDF for current snapshot.
 * ?force=1 regenerates even if a PDF already exists for this snapshot.
 * Without force, returns the cached export for the same snapshotId.
 */
router.post(
  "/birth-sky/profiles/:profileId/pdf/generate",
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (!(await requirePremium(userId))) {
      res.status(402).json({ error: "premium_required", feature: "birth_sky_pdf" });
      return;
    }
    const profileId = String(req.params.profileId);
    const force = String(req.query.force ?? "") === "1";
    const profile = await loadOwnedProfile(userId, profileId);
    if (!profile) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const mappedProfile = mapProfileRow(profile);

    const snaps = await db
      .select()
      .from(skySnapshotsTable)
      .where(
        and(eq(skySnapshotsTable.profileId, profileId), eq(skySnapshotsTable.isCurrent, true)),
      )
      .limit(1);
    const snap = snaps[0];
    if (!shouldExposeCurrentSnapshot(mappedProfile.generationStatus, Boolean(snap))) {
      snapshotNotReadyResponse(res, mappedProfile.generationStatus);
      return;
    }
    if (!snap) {
      res.status(404).json({ error: "snapshot_not_found" });
      return;
    }

    await ensurePdfExportsTable();

    if (!force) {
      const existing = await db
        .select()
        .from(birthSkyPdfExportsTable)
        .where(
          and(
            eq(birthSkyPdfExportsTable.profileId, profileId),
            eq(birthSkyPdfExportsTable.snapshotId, snap.id),
            eq(birthSkyPdfExportsTable.userId, userId),
          ),
        )
        .orderBy(desc(birthSkyPdfExportsTable.createdAt))
        .limit(1);
      if (existing[0]) {
        res.json({ ...mapExportMeta(existing[0]), cached: true });
        return;
      }
    }

    const children = await db
      .select({ name: childrenTable.name })
      .from(childrenTable)
      .where(and(eq(childrenTable.id, profile.childId), eq(childrenTable.userId, userId)))
      .limit(1);
    const childName = children[0]?.name?.trim() || "Child";
    const fields = plaintextBirthFields(profile);
    const astronomy = attachChartDetails(snap.astronomy as AstronomyData);
    const completeness = evaluateChartCompleteness(astronomy);
    if (!completeness.canExportPdf) {
      res.status(409).json({
        error: "chart_incomplete",
        completeness,
      });
      return;
    }

    try {
      const pdf = await generateBirthSkyPdf({
        childFirstName: childName,
        birthDate: profile.birthDate,
        birthTime: fields.birthTime,
        timePrecision: profile.timePrecision,
        placeLabel: fields.birthPlace?.label ?? null,
        snapshotId: snap.id,
        snapshotVersion: snap.snapshotVersion,
        engineVersion: snap.engineVersion,
        mode: snap.mode,
        astronomy,
      });
      const id = randomUUID();
      const [row] = await db
        .insert(birthSkyPdfExportsTable)
        .values({
          id,
          profileId,
          userId,
          snapshotId: snap.id,
          snapshotVersion: snap.snapshotVersion,
          engineVersion: snap.engineVersion,
          fileName: pdf.fileName,
          contentType: "application/pdf",
          pdfBase64: bytesToBase64(pdf.bytes),
          byteSize: pdf.bytes.byteLength,
          chartDetailsVersion: pdf.chartDetailsVersion,
        })
        .returning();
      if (!row) {
        res.status(500).json({ error: "persist_failed" });
        return;
      }
      logger.info(
        {
          event: "birth_sky.pdf_generated",
          exportId: id,
          profileId,
          snapshotId: snap.id,
          byteSize: pdf.bytes.byteLength,
        },
        "birth_sky.pdf_generated",
      );
      res.status(201).json({ ...mapExportMeta(row), cached: false });
    } catch (err) {
      logger.error(
        { err: err instanceof Error ? err.message : String(err), profileId },
        "birth_sky.pdf_generate_failed",
      );
      res.status(500).json({
        error: "pdf_generate_failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  },
);

/** GET download stored PDF bytes (premium). */
router.get(
  "/birth-sky/profiles/:profileId/pdf/exports/:exportId/download",
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (!(await requirePremium(userId))) {
      res.status(402).json({ error: "premium_required", feature: "birth_sky_pdf" });
      return;
    }
    const profileId = String(req.params.profileId);
    const exportId = String(req.params.exportId);
    const profile = await loadOwnedProfile(userId, profileId);
    if (!profile) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    await ensurePdfExportsTable();
    const rows = await db
      .select()
      .from(birthSkyPdfExportsTable)
      .where(
        and(
          eq(birthSkyPdfExportsTable.id, exportId),
          eq(birthSkyPdfExportsTable.profileId, profileId),
          eq(birthSkyPdfExportsTable.userId, userId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      res.status(404).json({ error: "export_not_found" });
      return;
    }
    const bytes = base64ToBytes(row.pdfBase64);
    res.setHeader("Content-Type", row.contentType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${row.fileName.replace(/"/g, "")}"`,
    );
    res.setHeader("Content-Length", String(bytes.byteLength));
    res.send(Buffer.from(bytes));
  },
);

/** GET JSON preview payload (premium) — no regeneration. */
router.get(
  "/birth-sky/profiles/:profileId/pdf/preview",
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (!(await requirePremium(userId))) {
      res.status(402).json({ error: "premium_required", feature: "birth_sky_pdf" });
      return;
    }
    const profileId = String(req.params.profileId);
    const profile = await loadOwnedProfile(userId, profileId);
    if (!profile) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const mappedProfile = mapProfileRow(profile);
    const snaps = await db
      .select()
      .from(skySnapshotsTable)
      .where(
        and(eq(skySnapshotsTable.profileId, profileId), eq(skySnapshotsTable.isCurrent, true)),
      )
      .limit(1);
    const snap = snaps[0];
    if (!shouldExposeCurrentSnapshot(mappedProfile.generationStatus, Boolean(snap))) {
      snapshotNotReadyResponse(res, mappedProfile.generationStatus);
      return;
    }
    if (!snap) {
      res.status(404).json({ error: "snapshot_not_found" });
      return;
    }
    const astronomy = attachChartDetails(snap.astronomy as AstronomyData);
    const completeness = evaluateChartCompleteness(astronomy);
    res.json({
      snapshot: mapSnapshotRow(snap),
      completeness,
      houseDetails: astronomy.houseDetails ?? [],
      planetDetails: astronomy.planetDetails ?? [],
      lagna: astronomy.lagna ?? null,
    });
  },
);

export default router;
