/**
 * Adaptive Family Intelligence — REST endpoints.
 *
 *   GET    /api/child-intelligence/:childId            → snapshot
 *   PUT    /api/child-intelligence/:childId/goals      → replace parent goals
 *   POST   /api/child-intelligence/:childId/signal     → upsert today's signal
 *
 * All endpoints verify ownership (child.userId === req userId).
 */

import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import {
  GetChildIntelligenceParams,
  GetChildIntelligenceResponse,
  UpdateChildGoalsParams,
  UpdateChildGoalsBody,
  UpdateChildGoalsResponse,
  LogChildDailySignalParams,
  LogChildDailySignalBody,
  LogChildDailySignalResponse,
  GetChildWeeklyReportParams,
  GetChildWeeklyReportResponse,
  GetChildIntelligenceInsightsParams,
  GetChildIntelligenceInsightsResponse,
} from "@workspace/api-zod";
import {
  loadOwnedChild,
  getChildIntelligenceSnapshot,
  setParentGoals,
  upsertChildDailySignal,
  recomputeAndPersistEnergyProfile,
  type ParentGoalCode,
} from "../services/childIntelligenceService.js";
import {
  computeWeeklyReport,
  computeRiskWindows,
  computeBehaviorCorrelation,
} from "../services/intelligenceAnalytics.js";

const router: IRouter = Router();

/**
 * Re-fetch the child after a write so the snapshot reflects the latest
 * parentGoals + energyProfile values.
 */
async function buildResponse(childId: number, userId: string) {
  const fresh = await loadOwnedChild(childId, userId);
  if (!fresh) return null;
  return getChildIntelligenceSnapshot(childId, {
    parentGoals: fresh.parentGoals,
    energyProfile: fresh.energyProfile,
  });
}

router.get("/child-intelligence/:childId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetChildIntelligenceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const child = await loadOwnedChild(params.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "Child not found" });
    return;
  }

  const snapshot = await getChildIntelligenceSnapshot(params.data.childId, {
    parentGoals: child.parentGoals,
    energyProfile: child.energyProfile,
  });
  res.json(GetChildIntelligenceResponse.parse(snapshot));
});

router.put("/child-intelligence/:childId/goals", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = UpdateChildGoalsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateChildGoalsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const child = await loadOwnedChild(params.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "Child not found" });
    return;
  }

  await setParentGoals(params.data.childId, body.data.parentGoals as ParentGoalCode[]);
  const snapshot = await buildResponse(params.data.childId, userId);
  if (!snapshot) {
    res.status(404).json({ error: "Child not found" });
    return;
  }
  res.json(UpdateChildGoalsResponse.parse(snapshot));
});

router.post("/child-intelligence/:childId/signal", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = LogChildDailySignalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = LogChildDailySignalBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const child = await loadOwnedChild(params.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "Child not found" });
    return;
  }

  await upsertChildDailySignal(params.data.childId, body.data);
  await recomputeAndPersistEnergyProfile(params.data.childId);

  const snapshot = await buildResponse(params.data.childId, userId);
  if (!snapshot) {
    res.status(404).json({ error: "Child not found" });
    return;
  }
  res.json(LogChildDailySignalResponse.parse(snapshot));
});

router.get("/child-intelligence/:childId/weekly-report", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = GetChildWeeklyReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const child = await loadOwnedChild(params.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "Child not found" });
    return;
  }
  const report = await computeWeeklyReport(params.data.childId);
  res.json(GetChildWeeklyReportResponse.parse(report));
});

router.get("/child-intelligence/:childId/insights", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = GetChildIntelligenceInsightsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const child = await loadOwnedChild(params.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "Child not found" });
    return;
  }
  const [riskWindows, correlations] = await Promise.all([
    computeRiskWindows(params.data.childId),
    computeBehaviorCorrelation(params.data.childId),
  ]);
  res.json(
    GetChildIntelligenceInsightsResponse.parse({
      childId: params.data.childId,
      riskWindows,
      correlations,
    }),
  );
});

export default router;
