/**
 * Growth Intelligence + Growth Operating System APIs — admin only.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { getAuth } from "../lib/auth.js";
import { isGrowthAdminUser } from "../lib/growth-admin-access.js";
import { asyncRoute } from "../middlewares/async-route.js";
import { computeGrowthDashboard } from "../services/growth-dashboard/index.js";
import {
  answerCopilotQuestion,
  loadGosSection,
  type GosSection,
  updateAlertWorkflow,
  updateDecisionStatus,
  updateSettings,
  upsertExperiment,
} from "../services/growth-operating-system/index.js";

const router: IRouter = Router();

function requireGrowthAdmin(
  req: Request,
  res: Response,
  auth: ReturnType<typeof getAuth>,
): auth is ReturnType<typeof getAuth> & { userId: string } {
  if (!isGrowthAdminUser(auth.userId, auth.email)) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }
  if (!auth.userId) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

const GOS_SECTIONS = new Set<GosSection>([
  "overview",
  "executive",
  "acquisition",
  "activation",
  "retention",
  "revenue",
  "campaigns",
  "experiments",
  "intelligence",
  "recommendations",
  "alerts",
  "predictions",
  "settings",
  "attribution",
  "journey",
  "cohorts",
  "calendar",
  "feature-impact",
  "decisions",
  "copilot",
  "pre-signup",
]);

/** GET /api/admin/growth/dashboard?preset=last_7_days&start=&end= */
router.get(
  "/admin/growth/dashboard",
  asyncRoute(async (req, res) => {
    const auth = getAuth(req);
    if (!requireGrowthAdmin(req, res, auth)) return;

    const preset = typeof req.query["preset"] === "string" ? req.query["preset"] : undefined;
    const start = typeof req.query["start"] === "string" ? req.query["start"] : undefined;
    const end = typeof req.query["end"] === "string" ? req.query["end"] : undefined;

    const payload = await computeGrowthDashboard({ preset, start, end });
    res.json({ ok: true, ...payload });
  }),
);

/** GET /api/admin/growth/gos/:section */
router.get(
  "/admin/growth/gos/:section",
  asyncRoute(async (req, res) => {
    const auth = getAuth(req);
    if (!requireGrowthAdmin(req, res, auth)) return;

    const section = String(req.params.section ?? "") as GosSection;
    if (!GOS_SECTIONS.has(section)) {
      res.status(400).json({ error: "invalid_section" });
      return;
    }

    const q = req.query as Record<string, string | undefined>;
    const payload = await loadGosSection(section, {
      preset: q.preset,
      start: q.start,
      end: q.end,
      country: q.country,
      platform: q.platform,
      campaign: q.campaign,
      appVersion: q.appVersion,
      feature: q.feature,
      cohortType: q.cohortType,
      question: q.question,
    });
    res.json(payload);
  }),
);

const decisionBody = z.object({
  status: z.enum(["pending", "approved", "rejected", "executed"]),
  reason: z.string().max(500).optional(),
});

/** POST /api/admin/growth/decisions/:id/status */
router.post(
  "/admin/growth/decisions/:id/status",
  asyncRoute(async (req, res) => {
    const auth = getAuth(req);
    if (!requireGrowthAdmin(req, res, auth)) return;
    const userId = auth.userId;

    const parsed = decisionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const updated = await updateDecisionStatus({
      decisionId: String(req.params.id),
      status: parsed.data.status,
      userId,
      reason: parsed.data.reason,
    });
    if (!updated) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ ok: true, decision: updated });
  }),
);

const experimentBody = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(128),
  feature: z.string().min(1).max(64),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  variantA: z.string().min(1).max(128),
  variantB: z.string().min(1).max(128),
  usersA: z.number().int().nonnegative().default(0),
  usersB: z.number().int().nonnegative().default(0),
  winner: z.string().nullable().optional(),
  confidence: z.number().nullable().optional(),
  businessImpact: z.number().nullable().optional(),
  status: z.enum(["running", "completed", "paused", "cancelled"]),
});

/** POST /api/admin/growth/experiments */
router.post(
  "/admin/growth/experiments",
  asyncRoute(async (req, res) => {
    const auth = getAuth(req);
    if (!requireGrowthAdmin(req, res, auth)) return;
    const userId = auth.userId;

    const parsed = experimentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const experiment = await upsertExperiment(
      {
        ...parsed.data,
        endDate: parsed.data.endDate ?? null,
        winner: parsed.data.winner ?? null,
        confidence: parsed.data.confidence ?? null,
        businessImpact: parsed.data.businessImpact ?? null,
      },
      userId,
    );
    res.json({ ok: true, experiment });
  }),
);

const alertBody = z.object({
  status: z.enum(["open", "acknowledged", "resolved", "ignored"]).optional(),
  owner: z.string().max(128).nullable().optional(),
  rootCause: z.string().max(500).nullable().optional(),
  suggestedFix: z.string().max(500).nullable().optional(),
  note: z.string().max(500).optional(),
});

/** POST /api/admin/growth/alerts/:id/workflow */
router.post(
  "/admin/growth/alerts/:id/workflow",
  asyncRoute(async (req, res) => {
    const auth = getAuth(req);
    if (!requireGrowthAdmin(req, res, auth)) return;
    const userId = auth.userId;

    const parsed = alertBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const updated = await updateAlertWorkflow({
      workflowId: String(req.params.id),
      userId,
      ...parsed.data,
    });
    if (!updated) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ ok: true, workflow: updated });
  }),
);

const settingsBody = z.object({
  crashThresholdPct: z.number().min(0).max(100).optional(),
  growthScoreWarning: z.number().min(0).max(100).optional(),
  retentionD1TargetPct: z.number().min(0).max(100).optional(),
  alertRulesEnabled: z.boolean().optional(),
  predictionMomentumDays: z.number().int().min(7).max(180).optional(),
  futureAutomationEnabled: z.boolean().optional(),
});

/** POST /api/admin/growth/settings */
router.post(
  "/admin/growth/settings",
  asyncRoute(async (req, res) => {
    const auth = getAuth(req);
    if (!requireGrowthAdmin(req, res, auth)) return;
    const userId = auth.userId;

    const parsed = settingsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const settings = await updateSettings(parsed.data, userId);
    res.json({ ok: true, settings });
  }),
);

const copilotBody = z.object({ question: z.string().min(1).max(500) });

/** POST /api/admin/growth/copilot */
router.post(
  "/admin/growth/copilot",
  asyncRoute(async (req, res) => {
    const auth = getAuth(req);
    if (!requireGrowthAdmin(req, res, auth)) return;

    const parsed = copilotBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    res.json({ ok: true, ...answerCopilotQuestion(parsed.data) });
  }),
);

export default router;
