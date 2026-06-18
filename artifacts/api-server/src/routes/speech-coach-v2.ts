import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, childrenTable } from "@workspace/db";
import {
  ageBandFromMonths,
  buildAmyRealtimeInstructions,
  canStartSession,
  createInitialSessionState,
  DAILY_LIMIT_MESSAGE,
  isDailyLimitReached,
  remainingDailySeconds,
  SPEECH_COACH_V2_DAILY_LIMIT_SECONDS,
  SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS,
  toFullSessionState,
  utcDateKey,
  validateAmyResponse,
} from "@workspace/speech-coach-v2";
import { getAuth } from "../lib/auth";
import { asyncRoute } from "../middlewares/async-route.js";
import { getFeatureUsage, nextResetAtFor } from "../services/subscriptionService.js";
import { getSpeechCoachV2RemoteConfig } from "../services/speechCoachV2RemoteConfig.js";
import {
  assertActiveSessionForToken,
  generateTabLockToken,
  getActiveSessionForChild,
  registerActiveSession,
  SpeechCoachV2SessionError,
  validateAndTouchSession,
} from "../services/speechCoachV2ActiveSessionService.js";
import {
  mintRealtimeClientSecret,
} from "../services/speechCoachV2RealtimeService.js";
import {
  completeSessionServerAuthoritative,
  getDailyUsageSeconds,
  getMonthlyUsageSeconds,
  getParentDashboard,
  recordTurnEvaluation,
} from "../services/speechCoachV2Service.js";

/**
 * Amy Speech Coach V2 — OpenAI Realtime voice sessions.
 * Isolated from V1 /api/speech/* routes.
 */
const router: IRouter = Router();

function assertV2Enabled(): void {
  if (!getSpeechCoachV2RemoteConfig().speechCoachV2Enabled) {
    const err = new Error("Speech Coach V2 is not enabled");
    (err as Error & { status: number }).status = 404;
    throw err;
  }
}

async function loadChild(userId: string, childId: number) {
  const rows = await db
    .select()
    .from(childrenTable)
    .where(and(eq(childrenTable.userId, userId), eq(childrenTable.id, childId)))
    .limit(1);
  return rows[0] ?? null;
}

function requireUserId(req: Parameters<typeof getAuth>[0]): string {
  const userId = getAuth(req).userId;
  if (!userId) {
    const err = new Error("unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return userId;
}

function handleSessionError(err: unknown, res: import("express").Response): boolean {
  if (err instanceof SpeechCoachV2SessionError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return true;
  }
  if (err instanceof Error) {
    if (err.message === "unsafe_transcript") {
      res.status(400).json({ error: "unsafe_transcript", message: "Input blocked for safety." });
      return true;
    }
    if (err.message === "exercise_mismatch") {
      res.status(409).json({ error: "exercise_mismatch", message: "Exercise out of sync." });
      return true;
    }
    if (err.message === "session_not_found") {
      res.status(404).json({ error: "session_not_found" });
      return true;
    }
  }
  return false;
}

router.get(
  "/speech/v2/config",
  asyncRoute(async (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=60");
    res.json(getSpeechCoachV2RemoteConfig());
  }),
);

router.get(
  "/speech/v2/usage",
  asyncRoute(async (req, res) => {
    assertV2Enabled();
    const userId = requireUserId(req);
    const childId = z.coerce.number().int().positive().parse(req.query.childId);
    const child = await loadChild(userId, childId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const [secondsUsed, monthUsed] = await Promise.all([
      getDailyUsageSeconds(userId, childId),
      getMonthlyUsageSeconds(userId, childId),
    ]);
    res.json({
      speechSecondsUsed: secondsUsed,
      speechMinutesToday: Math.floor(secondsUsed / 60),
      dailyLimitSeconds: SPEECH_COACH_V2_DAILY_LIMIT_SECONDS,
      monthlyLimitSeconds: SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS,
      monthSecondsUsed: monthUsed,
      remainingSeconds: remainingDailySeconds(secondsUsed),
      limitReached: isDailyLimitReached(secondsUsed),
      dateKey: utcDateKey(),
    });
  }),
);

router.get(
  "/speech/v2/session/active",
  asyncRoute(async (req, res) => {
    assertV2Enabled();
    const userId = requireUserId(req);
    const childId = z.coerce.number().int().positive().parse(req.query.childId);
    const child = await loadChild(userId, childId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const active = await getActiveSessionForChild(userId, childId);
    if (!active) {
      res.json({ hasActiveSession: false });
      return;
    }

    const sessionState = active.sessionStateJson;
    res.json({
      hasActiveSession: true,
      sessionId: active.sessionId,
      tabLockToken: active.tabLockToken,
      ageBand: active.ageBand,
      secondsConsumed: active.secondsConsumed,
      sessionState,
      instructions: buildAmyRealtimeInstructions(sessionState as unknown as Parameters<typeof buildAmyRealtimeInstructions>[0]),
    });
  }),
);

router.post(
  "/speech/v2/session/start",
  asyncRoute(async (req, res) => {
    assertV2Enabled();
    const userId = requireUserId(req);
    const body = z
      .object({
        childId: z.number().int().positive(),
        resume: z.boolean().optional(),
        sessionId: z.string().uuid().optional(),
        tabLockToken: z.string().uuid().optional(),
      })
      .parse(req.body);

    const child = await loadChild(userId, body.childId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const secondsUsed = await getDailyUsageSeconds(userId, body.childId);
    if (!canStartSession(secondsUsed)) {
      res.status(429).json({
        error: "daily_limit_reached",
        message: DAILY_LIMIT_MESSAGE,
        speechSecondsUsed: secondsUsed,
      });
      return;
    }

    const totalMonths = (child.age ?? 0) * 12 + (child.ageMonths ?? 0);
    const ageBand = ageBandFromMonths(totalMonths);
    const tabLockToken = body.tabLockToken ?? generateTabLockToken();

    let sessionId = body.sessionId ?? randomUUID();
    let state = createInitialSessionState({
      sessionId,
      childId: body.childId,
      childName: child.name ?? "friend",
      ageBand,
      sessionSeed: Date.now() % 10_000,
    });

    if (body.resume && body.sessionId && body.tabLockToken) {
      const existing = await getActiveSessionForChild(userId, body.childId);
      if (existing && existing.sessionId === body.sessionId) {
        sessionId = existing.sessionId;
        state = existing.sessionStateJson as unknown as typeof state;
      }
    }

    try {
      state = await registerActiveSession({
        userId,
        childId: body.childId,
        sessionId,
        ageBand,
        sessionState: state,
        tabLockToken,
        resume: body.resume,
      });
    } catch (err) {
      if (handleSessionError(err, res)) return;
      throw err;
    }

    res.json({
      sessionId,
      tabLockToken,
      ageBand,
      phase: state.phase,
      exercises: state.exercises,
      sessionState: state,
      remainingSeconds: remainingDailySeconds(secondsUsed),
      instructions: buildAmyRealtimeInstructions(state),
    });
  }),
);

router.post(
  "/speech/v2/session/heartbeat",
  asyncRoute(async (req, res) => {
    assertV2Enabled();
    const userId = requireUserId(req);
    const body = z
      .object({
        childId: z.number().int().positive(),
        sessionId: z.string().uuid(),
        tabLockToken: z.string().uuid(),
      })
      .parse(req.body);

    try {
      const result = await validateAndTouchSession({
        userId,
        childId: body.childId,
        sessionId: body.sessionId,
        tabLockToken: body.tabLockToken,
      });
      res.json({
        ok: true,
        secondsConsumed: result.secondsConsumed,
        remainingSeconds: result.remainingSeconds,
        sessionState: result.sessionState,
      });
    } catch (err) {
      if (handleSessionError(err, res)) return;
      throw err;
    }
  }),
);

router.post(
  "/speech/v2/realtime/token",
  asyncRoute(async (req, res) => {
    assertV2Enabled();
    const userId = requireUserId(req);
    const body = z
      .object({
        childId: z.number().int().positive(),
        sessionId: z.string().uuid(),
        tabLockToken: z.string().uuid(),
        instructions: z.string().min(20).max(12_000),
      })
      .parse(req.body);

    const child = await loadChild(userId, body.childId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    try {
      await assertActiveSessionForToken({
        userId,
        childId: body.childId,
        sessionId: body.sessionId,
        tabLockToken: body.tabLockToken,
      });
    } catch (err) {
      if (handleSessionError(err, res)) return;
      throw err;
    }

    const safeInstructions = validateAmyResponse(body.instructions);
    const minted = await mintRealtimeClientSecret({
      userId,
      instructions: safeInstructions.text || body.instructions,
    });

    const secondsUsed = await getDailyUsageSeconds(userId, body.childId);

    res.json({
      clientSecret: minted.clientSecret,
      expiresAt: minted.expiresAt,
      model: minted.model,
      voice: minted.voice,
      callsUrl: minted.callsUrl,
      sessionId: minted.sessionId,
      mintResponse: minted.mintResponse,
      remainingSeconds: remainingDailySeconds(secondsUsed),
    });
  }),
);

router.post(
  "/speech/v2/evaluate",
  asyncRoute(async (req, res) => {
    assertV2Enabled();
    const userId = requireUserId(req);
    const body = z
      .object({
        childId: z.number().int().positive(),
        sessionId: z.string().uuid(),
        tabLockToken: z.string().uuid(),
        exerciseId: z.string().max(64),
        expected: z.string().min(1).max(500),
        transcript: z.string().max(2000),
        rawTranscript: z.string().max(2000).optional(),
        responseSeconds: z.number().min(0).max(120).optional(),
        pauseCount: z.number().int().min(0).max(50).optional(),
        speechRateWpm: z.number().min(0).max(400).optional(),
      })
      .parse(req.body);

    const child = await loadChild(userId, body.childId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    try {
      const result = await recordTurnEvaluation({
        userId,
        childId: body.childId,
        sessionId: body.sessionId,
        tabLockToken: body.tabLockToken,
        exerciseId: body.exerciseId,
        expected: body.expected,
        transcript: body.transcript,
        rawTranscript: body.rawTranscript,
        timing: {
          responseSeconds: body.responseSeconds,
          pauseCount: body.pauseCount,
          speechRateWpm: body.speechRateWpm,
          wordCount: body.transcript.split(/\s+/).filter(Boolean).length,
        },
      });

      const fullState = toFullSessionState(result.sessionState);
      res.json({
        ...result.evaluation,
        sessionState: result.sessionState,
        starsEarned: result.starsEarned,
        pointsEarned: result.pointsEarned,
        instructions: buildAmyRealtimeInstructions(fullState),
      });
    } catch (err) {
      if (handleSessionError(err, res)) return;
      throw err;
    }
  }),
);

router.post(
  "/speech/v2/session/complete",
  asyncRoute(async (req, res) => {
    assertV2Enabled();
    const userId = requireUserId(req);
    const body = z
      .object({
        childId: z.number().int().positive(),
        sessionId: z.string().uuid(),
        tabLockToken: z.string().uuid(),
      })
      .parse(req.body);

    const child = await loadChild(userId, body.childId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    try {
      const result = await completeSessionServerAuthoritative({
        userId,
        childId: body.childId,
        sessionId: body.sessionId,
        tabLockToken: body.tabLockToken,
      });

      res.json({
        ok: true,
        dailyStreak: result.dailyStreak,
        weeklyStreak: result.weeklyStreak,
        badgesEarned: result.badgesEarned,
        durationSeconds: result.durationSeconds,
        starsEarned: result.starsEarned,
        pointsEarned: result.pointsEarned,
      });
    } catch (err) {
      if (handleSessionError(err, res)) return;
      throw err;
    }
  }),
);

router.get(
  "/speech/v2/dashboard",
  asyncRoute(async (req, res) => {
    assertV2Enabled();
    const userId = requireUserId(req);
    const childId = z.coerce.number().int().positive().parse(req.query.childId);
    const child = await loadChild(userId, childId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const dashboard = await getParentDashboard(userId, childId);
    res.json(dashboard);
  }),
);

router.get(
  "/speech/v2/budget",
  asyncRoute(async (req, res) => {
    assertV2Enabled();
    const userId = requireUserId(req);
    const used = await getFeatureUsage(userId, "speech_coach_v2_seconds");
    res.json({
      usedSeconds: used,
      resetsAt: nextResetAtFor("speech_coach_v2_seconds"),
    });
  }),
);

export default router;
