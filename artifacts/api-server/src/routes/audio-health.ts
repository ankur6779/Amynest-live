import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import {
  applyAdminOpsAction,
  getAdminOpsControlPanel,
  getClientAudioOpsFlags,
  type AdminOpsAction,
} from "../services/admin-ops-store";
import {
  getAdminDashboard,
  getAudioHealthDashboard,
  getAudioSloSnapshot,
  ingestAudioHealthEvents,
} from "../services/audio-health-store";
import { getSystemHealthSnapshot } from "../services/system-health-store";
import { getPredictiveOpsState, getPredictedIncidents } from "../services/predictive-ops-store";
import { getMetricsHistory } from "../services/predictive-trend-store";
import { getAdminAlerts } from "../services/admin-alert-system";
import {
  dispatchAdminHealthDigest,
  isAdminHealthDigestEnabled,
} from "../services/adminHealthDigestService";

const router: IRouter = Router();

const eventSchema = z.object({
  event: z.enum(["audio_success", "audio_failure", "audio_fallback", "audio_start"]),
  module: z.enum(["lesson", "parentHub", "phonics", "coach"]),
  layer: z.enum(["static", "cache", "api", "streaming", "emergency"]).optional(),
  success: z.boolean().optional(),
  fallbackUsed: z.boolean().optional(),
  ttfaMs: z.number().min(0).max(60_000).optional(),
  totalDurationMs: z.number().min(0).max(600_000).optional(),
  bufferingEvents: z.number().min(0).max(100).optional(),
  errorType: z.string().max(120).optional(),
  device: z.enum(["low", "mid", "high"]),
  network: z.enum(["slow", "fast"]),
  timestamp: z.number().optional(),
  sessionId: z.string().max(64).optional(),
  from: z.string().max(32).optional(),
  to: z.string().max(32).optional(),
});

const ingestSchema = z.object({
  events: z.array(eventSchema).min(1).max(20),
  sessionId: z.string().max(64).optional(),
});

const actionSchema = z.object({
  action: z.enum([
    "disable_streaming",
    "enable_streaming",
    "disable_api",
    "enable_api",
    "clear_cache",
    "force_emergency",
    "reset_emergency",
    "reset_all",
    "enable_safe_mode",
    "disable_safe_mode",
    "enable_self_heal",
    "disable_self_heal",
  ]),
});

function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const list = (process.env["ADMIN_USER_IDS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

/**
 * POST /api/audio-health — batched client audio telemetry.
 */
router.post("/audio-health", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = ingestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  const { accepted } = ingestAudioHealthEvents(
    parsed.data.events.map((e) => ({ ...e, timestamp: e.timestamp ?? Date.now() })),
  );
  res.status(202).json({ ok: true, accepted });
});

/**
 * GET /api/audio-ops — client-safe ops flags (no admin internals).
 */
router.get("/audio-ops", (_req, res): void => {
  const client = getClientAudioOpsFlags();
  const predictive = getPredictiveOpsState();
  res.json({
    ...client,
    degradedMode: predictive.degradedMode,
    apiUsageFactor: predictive.apiUsageFactor,
    streamingWeightFactor: predictive.streamingWeightFactor,
    prefetchDepth: predictive.prefetchDepth,
    layerWeights: predictive.layerWeights,
    updatedAt: Math.max(client.updatedAt, predictive.lastUpdated),
  });
});

/**
 * GET /api/admin/audio-ops-panel — full ops + predictive state (admin only).
 */
router.get("/admin/audio-ops-panel", (req, res): void => {
  const userId = getAuth(req).userId;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  res.json({
    ...getAdminOpsControlPanel(),
    ...getPredictiveOpsState(),
  });
});

/**
 * GET /api/admin/audio-jobs/failed — recent failed BullMQ audio jobs.
 */
router.get("/admin/audio-jobs/failed", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const { getRecentFailedAiJobDiagnostics } = await import(
    "../queue/failed-job-diagnostics.js"
  );
  const jobs = await getRecentFailedAiJobDiagnostics(10);
  const replayable = new Set<string>([
    "audio.warmup",
    "tts.pregenerate",
    "tts.synthesize",
    "static-audio.generate",
    "audio-lessons.pregenerate",
    "ai-coach.pregenerate_audio",
    "ai-coach.pregenerate_infant_audio",
  ]);
  res.json({
    jobs: jobs.filter((j) => replayable.has(j.type)),
  });
});

/**
 * POST /api/admin/audio-jobs/:jobId/replay — re-enqueue a failed audio job.
 */
router.post("/admin/audio-jobs/:jobId/replay", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const jobId = String(req.params.jobId ?? "").trim();
  if (!jobId) {
    res.status(400).json({ error: "invalid_job_id" });
    return;
  }
  const { replayFailedAudioJob } = await import("../services/audioJobReplayService.js");
  const result = await replayFailedAudioJob(jobId);
  if (!result.ok) {
    res.status(result.error === "job_not_found" ? 404 : 409).json(result);
    return;
  }
  res.json(result);
});

/**
 * POST /api/admin/tts-orphan-cleanup — manual GCS orphan purge (admin only).
 */
router.post("/admin/tts-orphan-cleanup", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const dryRun = req.body?.dryRun === true;
  const { runTtsOrphanCleanup } = await import("../services/ttsOrphanCleanup.js");
  const result = await runTtsOrphanCleanup({ dryRun });
  res.json({ ok: true, ...result });
});

/**
 * GET /api/admin/alerts — recent admin alert feed (dashboard-only INFO + all severities).
 */
router.get("/admin/alerts", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  res.json({ alerts: getAdminAlerts() });
});

/**
 * GET /api/admin/dashboard — unified system health dashboard.
 */
router.get("/admin/dashboard", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  res.json(getAdminDashboard());
});

/**
 * GET /api/admin/audio-slo — TTFA p50/p95/p99 SLO snapshot (admin only).
 */
router.get("/admin/audio-slo", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  res.json(getAudioSloSnapshot());
});

/**
 * GET /api/admin/system-health — global infra + audio health snapshot.
 */
router.get("/admin/system-health", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  res.json(await getSystemHealthSnapshot());
});

/**
 * GET /api/admin/predictive-health — trend history + predicted incidents.
 */
router.get("/admin/predictive-health", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  res.json({
    ops: getPredictiveOpsState(),
    trends: getMetricsHistory(),
    predictedIncidents: getPredictedIncidents(),
  });
});

/**
 * GET /api/admin/audio-health — back-compat alias.
 */
router.get("/admin/audio-health", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  res.json(getAudioHealthDashboard());
});

/**
 * POST /api/admin/dashboard/actions — quick incident controls.
 */
router.post("/admin/dashboard/actions", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  const ops = applyAdminOpsAction(parsed.data.action as AdminOpsAction, userId!);
  res.json({ ok: true, ops });
});

/**
 * POST /api/admin/health-digest/send — manually dispatch the health report now.
 * Bypasses the periodic-cron throttle so admins can verify Slack/email delivery
 * without waiting for the next scheduled run.
 */
router.post("/admin/health-digest/send", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  if (!isAdminHealthDigestEnabled()) {
    res.status(409).json({
      ok: false,
      error: "digest_disabled",
      hint: "Set ADMIN_HEALTH_DIGEST_ENABLED=true to enable the health report.",
    });
    return;
  }

  const result = await dispatchAdminHealthDigest(Date.now(), { force: true });
  res.status(result.sent ? 200 : 422).json({ ok: result.sent, result });
});

export default router;
