import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { computeAge } from "@workspace/content-orchestration";
import { db, childrenTable, parentProfilesTable } from "@workspace/db";
import { getAuth } from "../lib/auth";
import {
  getGlobalRealtimeCoordinator,
  handleRealtimeWireMessage,
  resolveRealtimeConfig,
  type RealtimeEvent,
} from "@workspace/content-orchestration";
import {
  fetchDailyPlanForChild,
  fetchDailyPlanV2ForChild,
  getContentAnalytics,
  submitSessionFeedback,
} from "../lib/contentOrchestrationService";
import { handleTutorTurn } from "../lib/tutorService.js";
import {
  fetchFamilyInsightsForUser,
  handleCooperativeTurn,
} from "../lib/familyLearningService.js";
import { fetchGlobalInsightsForUser } from "../lib/globalLearningService.js";
import {
  applyHumanOverride,
  fetchSystemHealth,
  readHumanOverride,
  resetHumanOverride,
  runMetaEcosystemTick,
} from "../lib/metaLearningService.js";

const router: IRouter = Router();

const countrySchema = z.enum(["IN", "US", "UK", "AU", "NZ", "CA", "AE", "BD"]);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
  .optional();

async function ownsChild(userId: string, childId: number): Promise<boolean> {
  const rows = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

async function resolveCountryCode(
  userId: string,
  override?: string,
): Promise<z.infer<typeof countrySchema>> {
  if (override) {
    const parsed = countrySchema.safeParse(override);
    if (parsed.success) return parsed.data;
  }
  const profiles = await db
    .select({ country: parentProfilesTable.country })
    .from(parentProfilesTable)
    .where(eq(parentProfilesTable.userId, userId))
    .limit(1);
  const raw = profiles[0]?.country?.toUpperCase();
  if (raw === "GB") return "UK";
  const parsed = countrySchema.safeParse(raw);
  return parsed.success ? parsed.data : "US";
}

// GET /api/content/daily-plan?childId=&countryCode=&date=
router.get("/content/daily-plan", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const querySchema = z.object({
    childId: z.coerce.number().int().positive(),
    countryCode: countrySchema.optional(),
    date: dateSchema,
    offline: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  if (!(await ownsChild(userId, parsed.data.childId))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const childRows = await db
    .select({
      id: childrenTable.id,
      dob: childrenTable.dob,
      ageMonths: childrenTable.ageMonths,
    })
    .from(childrenTable)
    .where(eq(childrenTable.id, parsed.data.childId))
    .limit(1);

  const child = childRows[0];
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const countryCode = await resolveCountryCode(userId, parsed.data.countryCode);
  const childId = String(child.id);
  const childDOB =
    child.dob ??
    new Date(
      Date.now() - (child.ageMonths ?? 0) * 30 * 24 * 60 * 60 * 1000,
    ).toISOString().slice(0, 10);

  const plan = await fetchDailyPlanForChild({
    childId,
    childDOB,
    countryCode,
    dateIso: parsed.data.date,
    offline: parsed.data.offline,
  });

  const age = computeAge({
    childDOB,
    countryCode,
    referenceDate: parsed.data.date ? new Date(parsed.data.date) : new Date(),
  });

  const analytics = getContentAnalytics(
    childId,
    plan.modules.map((m) => m.moduleId),
  );

  res.json({
    ok: true,
    plan,
    age,
    analytics,
  });
});

// GET /api/content/age?childId=&countryCode=
router.get("/content/age", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const querySchema = z.object({
    childId: z.coerce.number().int().positive(),
    countryCode: countrySchema.optional(),
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  if (!(await ownsChild(userId, parsed.data.childId))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const childRows = await db
    .select({
      dob: childrenTable.dob,
      ageMonths: childrenTable.ageMonths,
    })
    .from(childrenTable)
    .where(eq(childrenTable.id, parsed.data.childId))
    .limit(1);

  const child = childRows[0];
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const countryCode = await resolveCountryCode(userId, parsed.data.countryCode);
  const childDOB =
    child.dob ??
    new Date(
      Date.now() - (child.ageMonths ?? 0) * 30 * 24 * 60 * 60 * 1000,
    ).toISOString().slice(0, 10);

  const age = computeAge({ childDOB, countryCode });
  res.json({ ok: true, age });
});

async function loadChildContext(
  userId: string,
  childIdNum: number,
  countryOverride?: string,
) {
  const childRows = await db
    .select({
      id: childrenTable.id,
      dob: childrenTable.dob,
      ageMonths: childrenTable.ageMonths,
    })
    .from(childrenTable)
    .where(eq(childrenTable.id, childIdNum))
    .limit(1);

  const child = childRows[0];
  if (!child) return null;

  const countryCode = await resolveCountryCode(userId, countryOverride);
  const childId = String(child.id);
  const childDOB =
    child.dob ??
    new Date(
      Date.now() - (child.ageMonths ?? 0) * 30 * 24 * 60 * 60 * 1000,
    ).toISOString().slice(0, 10);

  return { childId, childDOB, countryCode };
}

// GET /api/content/daily-plan/v2?childId=&countryCode=&date=
router.get("/content/daily-plan/v2", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const querySchema = z.object({
    childId: z.coerce.number().int().positive(),
    countryCode: countrySchema.optional(),
    date: dateSchema,
    bypassCache: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  if (!(await ownsChild(userId, parsed.data.childId))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const ctx = await loadChildContext(
    userId,
    parsed.data.childId,
    parsed.data.countryCode,
  );
  if (!ctx) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const plan = await fetchDailyPlanV2ForChild({
    childId: ctx.childId,
    userId,
    childDOB: ctx.childDOB,
    countryCode: ctx.countryCode,
    dateIso: parsed.data.date,
    bypassCache: parsed.data.bypassCache,
  });

  res.json({ ok: true, ...plan });
});

// POST /api/content/session-feedback
router.post("/content/session-feedback", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const bodySchema = z.object({
    childId: z.coerce.number().int().positive(),
    moduleId: z.string(),
    contentId: z.string(),
    completionRate: z.number().min(0).max(1),
    timeSpentSec: z.number().min(0),
    skips: z.number().int().min(0).default(0),
    retries: z.number().int().min(0).default(0),
    completed: z.boolean(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  if (!(await ownsChild(userId, parsed.data.childId))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const childRows = await db
    .select({ dob: childrenTable.dob })
    .from(childrenTable)
    .where(eq(childrenTable.id, parsed.data.childId))
    .limit(1);
  const child = childRows[0];
  if (!child?.dob) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const countryCode = await resolveCountryCode(userId);

  const result = await submitSessionFeedback({
    userId,
    childDOB: child.dob,
    countryCode,
    feedback: {
      childId: String(parsed.data.childId),
      userId,
      moduleId: parsed.data.moduleId as import("@workspace/content-orchestration").ModuleId,
      contentId: parsed.data.contentId,
      completionRate: parsed.data.completionRate,
      timeSpentSec: parsed.data.timeSpentSec,
      skips: parsed.data.skips,
      retries: parsed.data.retries,
      completed: parsed.data.completed,
    },
  });

  res.json({
    ok: true,
    profile: result.profile,
    adjustments: result.adjustments,
    personalitySnapshot: {
      curiosity: result.personality.traits.curiosity,
      persistence: result.personality.traits.persistence,
      distractibility: result.personality.traits.distractibility,
    },
    learningPath: {
      currentGoal:
        result.learningPath.milestones.find((m) => !m.completed)?.goal ??
        result.learningPath.goals[0] ??
        "phonics_mastery",
      progress: Math.round(result.learningPath.progressScore * 1000) / 10,
    },
    prediction: result.prediction
      ? {
          dropOffRisk: Math.round(result.prediction.predictedDropOffRisk * 1000) / 10,
          recommendedDifficulty: result.prediction.recommendedDifficulty,
          sessionLength: result.prediction.recommendedSessionLength,
          nextMilestones: result.learningPath.milestones
            .filter((m) => !m.completed)
            .slice(0, 3)
            .map((m) => m.goal),
          predictedEngagement:
            Math.round(result.prediction.predictedEngagement * 1000) / 10,
          confidence: Math.round(result.prediction.confidence * 1000) / 10,
        }
      : undefined,
  });
});

// POST /api/content/realtime/event — HTTP fallback when WebSocket unavailable
router.post("/content/realtime/event", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const bodySchema = z.object({
    childId: z.coerce.number().int().positive(),
    event: z.object({
      type: z.enum([
        "CONTENT_STARTED",
        "CONTENT_COMPLETED",
        "CONTENT_SKIPPED",
        "USER_IDLE",
        "RAPID_INTERACTION",
        "SESSION_PAUSED",
      ]),
      contentId: z.string(),
      moduleId: z.string(),
      timestamp: z.number(),
      metadata: z
        .object({
          responseTime: z.number().optional(),
          tapCount: z.number().optional(),
          duration: z.number().optional(),
          correct: z.boolean().optional(),
        })
        .optional(),
    }),
    subscribe: z
      .object({
        sessionPlan: z.array(z.record(z.string(), z.unknown())),
      })
      .optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  if (!(await ownsChild(userId, parsed.data.childId))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const { fallback, experiments, ml } = resolveRealtimeConfig({
    realtimeEnabled: process.env.REALTIME_ENABLED,
    fallbackStatic: process.env.REALTIME_FALLBACK_STATIC,
    mlEnabled: process.env.ML_NBA_ENABLED,
    mlTraffic: process.env.ML_NBA_TRAFFIC,
  });

  if (fallback.realtimeDisabled || !experiments.realtimeEnabled) {
    res.json({
      ok: true,
      fallback: true,
      update: { action: "NOOP", payload: {} },
    });
    return;
  }

  const childId = String(parsed.data.childId);
  const coordinator = getGlobalRealtimeCoordinator();

  if (parsed.data.subscribe?.sessionPlan) {
    handleRealtimeWireMessage(
      coordinator,
      JSON.stringify({
        type: "subscribe",
        childId,
        sessionPlan: parsed.data.subscribe.sessionPlan,
      }),
    );
  }

  const event: RealtimeEvent = {
    ...parsed.data.event,
    childId,
    moduleId: parsed.data.event.moduleId as RealtimeEvent["moduleId"],
  };

  const update = coordinator.processEvent(event);
  res.json({ ok: true, update });
});

// POST /api/content/tutor/turn — Amy tutor voice + conversation
router.post("/content/tutor/turn", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const bodySchema = z.object({
    childId: z.coerce.number().int().positive(),
    action: z.enum(["start", "answer", "repeat", "next_content"]),
    childAnswer: z.string().optional(),
    audioInput: z.string().optional(),
    contentItem: z
      .object({
        slot: z.enum(["warmup", "core", "exploration", "reward"]),
        moduleId: z.string(),
        contentId: z.string(),
        contentType: z.enum(["learning", "interactive", "fun"]),
        difficulty: z.enum(["easy", "medium", "hard"]),
      })
      .optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  if (!(await ownsChild(userId, parsed.data.childId))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const childRows = await db
    .select({ dob: childrenTable.dob })
    .from(childrenTable)
    .where(eq(childrenTable.id, parsed.data.childId))
    .limit(1);
  const child = childRows[0];
  if (!child?.dob) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const countryCode = await resolveCountryCode(userId);

  const result = await handleTutorTurn({
    childId: String(parsed.data.childId),
    userId,
    action: parsed.data.action,
    childAnswer: parsed.data.childAnswer,
    audioInput: parsed.data.audioInput,
    contentItem: parsed.data.contentItem as import("@workspace/content-orchestration").SessionPlanItem,
    childDOB: child.dob,
    countryCode,
  });

  res.json({ ok: true, ...result });
});

// GET /api/content/family/insights — parent dashboard (multi-child)
router.get("/content/family/insights", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const querySchema = z.object({
    countryCode: countrySchema.optional(),
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  const countryCode = await resolveCountryCode(userId, parsed.data.countryCode);
  const payload = await fetchFamilyInsightsForUser(userId, countryCode);
  res.json({ ok: true, ...payload });
});

// POST /api/content/family/cooperative/turn — sibling quiz / verify mode
router.post("/content/family/cooperative/turn", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const bodySchema = z.object({
    taskId: z.string(),
    childId: z.coerce.number().int().positive(),
    partnerChildId: z.coerce.number().int().positive().optional(),
    answer: z.string().optional(),
    approved: z.boolean().optional(),
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  if (!(await ownsChild(userId, parsed.data.childId))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const result = handleCooperativeTurn({
    familyId: userId,
    taskId: parsed.data.taskId,
    childId: String(parsed.data.childId),
    partnerChildId: parsed.data.partnerChildId
      ? String(parsed.data.partnerChildId)
      : undefined,
    answer: parsed.data.answer,
    approved: parsed.data.approved,
  });

  if (!result) {
    res.status(404).json({ error: "cooperative_session_not_found" });
    return;
  }

  res.json({ ok: true, cooperative: result });
});

// GET /api/content/global/insights — anonymous community learning signals (V9)
router.get("/content/global/insights", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const querySchema = z.object({
    countryCode: countrySchema.optional(),
    childId: z.coerce.number().int().positive().optional(),
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  const countryCode = await resolveCountryCode(userId, parsed.data.countryCode);
  let ageBand: import("@workspace/content-orchestration").AgeBand = "36_48";
  let childIdStr: string | undefined;

  if (parsed.data.childId) {
    if (!(await ownsChild(userId, parsed.data.childId))) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const childRows = await db
      .select({ dob: childrenTable.dob })
      .from(childrenTable)
      .where(eq(childrenTable.id, parsed.data.childId))
      .limit(1);
    const child = childRows[0];
    if (!child?.dob) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const age = computeAge({
      childDOB: child.dob,
      countryCode,
      referenceDate: new Date(),
    });
    ageBand = age.ageBand;
    childIdStr = String(parsed.data.childId);
  }

  const payload = await fetchGlobalInsightsForUser(
    userId,
    countryCode,
    ageBand,
    childIdStr,
  );
  res.json({ ok: true, ...payload });
});

// GET /api/content/tutor/voice/mock — mock TTS placeholder (dev)
router.get("/content/tutor/voice/mock", async (req, res): Promise<void> => {
  const text = typeof req.query.text === "string" ? req.query.text : "Hello!";
  res.json({
    ok: true,
    audioUrl: `/api/content/tutor/voice/mock`,
    text: text.slice(0, 120),
    note: "Wire cloud TTS provider in production",
  });
});

// GET /api/content/system/health — V10 autonomous ecosystem dashboard
router.get("/content/system/health", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const health = await fetchSystemHealth();
  res.json({ ok: true, ...health, humanOverride: readHumanOverride() });
});

// POST /api/content/system/meta/tick — run meta-learning cycle (admin/cron)
router.post("/content/system/meta/tick", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const bodySchema = z.object({ force: z.boolean().optional() });
  const parsed = bodySchema.safeParse(req.body ?? {});
  const force = parsed.success ? parsed.data.force === true : false;
  const result = await runMetaEcosystemTick(force);
  res.json({ ok: true, ...result });
});

// POST /api/content/system/override — human override layer
router.post("/content/system/override", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const bodySchema = z.object({
    enabled: z.boolean(),
    freezeAutoTuning: z.boolean().optional(),
    forceRuleFallback: z.boolean().optional(),
    explorationRate: z.number().min(0).max(1).optional(),
    difficultyRamp: z.enum(["slow", "fast"]).optional(),
    rewardFrequency: z.enum(["low", "medium", "high"]).optional(),
    note: z.string().max(500).optional(),
    reset: z.boolean().optional(),
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  if (parsed.data.reset) {
    resetHumanOverride();
    res.json({ ok: true, override: readHumanOverride() });
    return;
  }

  applyHumanOverride(parsed.data);
  res.json({ ok: true, override: readHumanOverride() });
});

// GET /api/content/ml/metrics — model monitoring (internal / admin dashboards)
router.get("/content/ml/metrics", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { computeMlMetrics } = await import("@workspace/content-orchestration");
  res.json({ ok: true, ml_metrics: computeMlMetrics() });
});

export default router;
