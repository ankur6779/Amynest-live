/**
 * Crash intelligence API — capture, audit, launch gate.
 * Never auto-modifies production source code.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { getAuth } from "../lib/auth";
import {
  persistCrashEvent,
  safePersistCrashEvent,
  syncCrashRegressionRegistry,
} from "../services/crash-intelligence/ingest-service.js";
import { generateEngineeringAuditReport } from "../services/crash-intelligence/audit-report.js";
import { aggregateCrashFingerprints } from "../services/crash-intelligence/aggregation-service.js";
import { evaluateLaunchGate } from "../services/crash-intelligence/launch-gate.js";
import { computeGlobalRecoveryRate } from "../services/crash-intelligence/aggregation-service.js";
import { analyzeFingerprint } from "../services/crash-intelligence/fix-candidate-engine.js";
import { computeAllHeatmaps } from "../services/crash-intelligence/heatmap-service.js";
import {
  captureDeployBaseline,
  detectNewRegressions,
} from "../services/crash-intelligence/new-regression-detector.js";
import {
  markFingerprintFixed,
  verifyFingerprintFix,
} from "../services/crash-intelligence/deployment-verification.js";
import { writeAllReviewPackages } from "../services/crash-intelligence/review-package.js";
import {
  fingerprintToReviewSlug,
  getSourceMappingForFingerprint,
} from "../services/crash-intelligence/source-mappings.js";
import { getFixCandidateForFingerprint } from "../services/crash-intelligence/fix-candidates.js";

const router: IRouter = Router();

function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const list = (process.env["ADMIN_USER_IDS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

const CrashEventBody = z.object({
  errorId: z.string().min(1).max(64),
  fingerprint: z.string().min(1).max(64),
  readableFingerprint: z.string().max(256).optional(),
  route: z.string().max(256).optional(),
  message: z.string().min(1).max(4000),
  stack: z.string().max(8000).optional(),
  componentStack: z.string().max(8000).optional(),
  childId: z.string().max(64).nullable().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().optional(),
});

/** POST /api/crash-events — structured crash capture (auth required). */
router.post("/crash-events", async (req: Request, res: Response): Promise<void> => {
  const parsed = CrashEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId } = getAuth(req);
  const payload = {
    ...parsed.data,
    userId: userId ?? null,
    readableFingerprint: parsed.data.readableFingerprint ?? "",
    meta: parsed.data.meta ?? {},
  };

  await safePersistCrashEvent(payload);
  res.status(204).end();
});

/** GET /api/admin/crash-intelligence/audit — engineering audit report. */
router.get("/admin/crash-intelligence/audit", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  void syncCrashRegressionRegistry().catch(() => {});

  const limit = Math.min(Math.max(Number(req.query["limit"]) || 15, 5), 50);
  const report = await generateEngineeringAuditReport(limit);
  res.json({ ok: true, ...report });
});

/** GET /api/admin/crash-intelligence/fingerprints */
router.get("/admin/crash-intelligence/fingerprints", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const limit = Math.min(Math.max(Number(req.query["limit"]) || 25, 5), 100);
  const fingerprints = await aggregateCrashFingerprints(limit);
  res.json({ ok: true, fingerprints });
});

/** GET /api/admin/crash-intelligence/launch-gate */
router.get("/admin/crash-intelligence/launch-gate", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const aggregates = await aggregateCrashFingerprints(50);
  const globalRecoveryRate = await computeGlobalRecoveryRate();
  const result = evaluateLaunchGate({ aggregates, globalRecoveryRate });
  res.json({ ok: true, globalRecoveryRate, ...result });
});

/** GET /api/admin/crash-intelligence/heatmap */
router.get("/admin/crash-intelligence/heatmap", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const heatmaps = await computeAllHeatmaps();
  res.json({ ok: true, ...heatmaps });
});

/** GET /api/admin/crash-intelligence/review/:slug — fix candidate review package */
router.get("/admin/crash-intelligence/review/:slug", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const slug = req.params["slug"] ?? "";
  const readableFingerprint = slug.replace(/-/g, "|");
  const pkg = await analyzeFingerprint(readableFingerprint);
  res.json({ ok: true, ...pkg });
});

/** GET /api/admin/crash-intelligence/fix-candidates */
router.get("/admin/crash-intelligence/fix-candidates", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const aggregates = await aggregateCrashFingerprints(50);
  const candidates = aggregates
    .filter((a) => a.severity === "P0" || a.severity === "P1")
    .map((a) => ({
      readableFingerprint: a.readableFingerprint,
      aggregate: a,
      sourceMapping: getSourceMappingForFingerprint(a.readableFingerprint),
      fixCandidate: getFixCandidateForFingerprint(a.readableFingerprint),
    }));
  res.json({ ok: true, candidates });
});

/** GET /api/admin/crash-intelligence/new-regressions */
router.get("/admin/crash-intelligence/new-regressions", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const findings = await detectNewRegressions({
    appVersion: typeof req.query["appVersion"] === "string" ? req.query["appVersion"] : undefined,
  });
  res.json({ ok: true, findings });
});

/** POST /api/admin/crash-intelligence/deploy-baseline */
router.post("/admin/crash-intelligence/deploy-baseline", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const appVersion =
    typeof req.body?.appVersion === "string" ? req.body.appVersion : "unknown";
  const deployId =
    typeof req.body?.deployId === "string" ? req.body.deployId : undefined;
  const counts = await captureDeployBaseline({ appVersion, deployId });
  res.json({ ok: true, appVersion, fingerprintCount: Object.keys(counts).length });
});

/** POST /api/admin/crash-intelligence/mark-fixed */
router.post("/admin/crash-intelligence/mark-fixed", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const fp = typeof req.body?.readableFingerprint === "string"
    ? req.body.readableFingerprint
    : null;
  const deployVersion =
    typeof req.body?.deployVersion === "string" ? req.body.deployVersion : "unknown";
  if (!fp) {
    res.status(400).json({ error: "readableFingerprint required" });
    return;
  }
  await markFingerprintFixed({ readableFingerprint: fp, deployVersion });
  const verification = await verifyFingerprintFix(fp);
  res.json({ ok: true, verification });
});

/** POST /api/admin/crash-intelligence/generate-reviews — write artifacts/crash-review/*.md */
router.post("/admin/crash-intelligence/generate-reviews", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const paths = await writeAllReviewPackages({
    minSeverity: req.body?.minSeverity === "P0" ? "P0" : "P1",
  });
  res.json({
    ok: true,
    count: paths.length,
    paths: paths.map((p) => p.replace(/.*\/artifacts\//, "artifacts/")),
  });
});

export { persistCrashEvent, fingerprintToReviewSlug };
export default router;
