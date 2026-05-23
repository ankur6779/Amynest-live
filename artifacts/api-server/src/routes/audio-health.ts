import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import {
  applyAdminOpsAction,
  getAdminOpsControlPanel,
  type AdminOpsAction,
} from "../services/admin-ops-store";
import {
  getAdminDashboard,
  getAudioHealthDashboard,
  ingestAudioHealthEvents,
} from "../services/audio-health-store";
import { getSystemHealthSnapshot } from "../services/system-health-store";
import { getPredictiveOpsState, getPredictedIncidents } from "../services/predictive-ops-store";
import { getMetricsHistory } from "../services/predictive-trend-store";

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
 * GET /api/audio-ops — live ops flags for all authenticated clients.
 */
router.get("/audio-ops", (_req, res): void => {
  res.json({
    ...getAdminOpsControlPanel(),
    ...getPredictiveOpsState(),
  });
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

export default router;
