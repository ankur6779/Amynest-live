import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  getLearningProgressStatus,
  completeLearningActivity,
  completeSessionStep,
  recordProgressAnalytics,
  isValidProgressEvent,
} from "../services/learningProgressService.js";
import { getOrCreateSubscription, isPremiumNow, maybeAutoGrantPremium } from "../services/subscriptionService.js";
import { infantExploreMutationGate } from "../middlewares/infantExploreMutationGate.js";

const router: IRouter = Router();

const ChildQuery = z.object({
  childId: z.coerce.number().int().positive(),
});

const SectionEnum = z.enum([
  "phonics",
  "math",
  "speech",
  "stories",
  "lifeSkills",
  "puzzles",
  "worksheets",
  "spelling",
  "memory",
  "creativity",
]);

const CompleteBody = z.object({
  childId: z.number().int().positive(),
  activityId: z.string().min(1).max(200),
  section: SectionEnum,
  correct: z.boolean().default(true),
});

async function requirePremiumLearningAction(
  userId: string,
  feature: "hub_phonics" | "hub_smart_study",
): Promise<{ ok: true } | { ok: false; body: Record<string, unknown> }> {
  const sub = await getOrCreateSubscription(userId);
  if (isPremiumNow(sub)) return { ok: true };
  return {
    ok: false,
    body: {
      error: "premium_required",
      feature,
      message: "Upgrade to save premium learning progress.",
    },
  };
}

function featureForCompletedSection(section: z.infer<typeof SectionEnum>): "hub_phonics" | "hub_smart_study" | null {
  if (section === "phonics") return "hub_phonics";
  if (section === "math") return "hub_smart_study";
  return null;
}

/**
 * GET /api/learning-progress/status?childId=
 * Unified progression: profile, unlocks, daily freshness, AI tutor context, weekly report.
 */
router.get("/learning-progress/status", async (req, res): Promise<void> => {
  const { userId, email, phoneNumber } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = ChildQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }
  try {
    try {
      await maybeAutoGrantPremium(userId, email, phoneNumber);
    } catch {
      /* best-effort — demo/reviewer premium must not block progress reads */
    }
    const status = await getLearningProgressStatus(userId, parsed.data.childId);
    if (!status) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    res.json(status);
  } catch (err) {
    logger.error(
      `learning-progress GET failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST /api/learning-progress/complete-activity
 * Records activity completion, updates mastery/XP/streaks.
 */
router.post("/learning-progress/complete-activity", infantExploreMutationGate(), async (req, res): Promise<void> => {
  const { userId, email, phoneNumber } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = CompleteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  try {
    const feature = featureForCompletedSection(parsed.data.section);
    if (feature) {
      const premium = await requirePremiumLearningAction(userId, feature);
      if (!premium.ok) {
        res.status(403).json(premium.body);
        return;
      }
    }
    try {
      await maybeAutoGrantPremium(userId, email, phoneNumber);
    } catch {
      /* best-effort */
    }
    const status = await completeLearningActivity(
      userId,
      parsed.data.childId,
      parsed.data.activityId,
      parsed.data.section,
      parsed.data.correct,
    );
    if (!status) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    res.json(status);
  } catch (err) {
    logger.error(
      `learning-progress POST failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

const ProgressEventEnum = z.enum([
  "journey_completed",
  "skill_unlocked",
  "daily_return",
  "next_session_opened",
  "worksheet_completed",
  "speech_improved",
  "phonics_mastered",
  "story_completion",
  "retention_day_1",
  "retention_day_7",
  "retention_day_30",
  "session_completed",
  "level_up",
  "comeback_started",
  "streak_recovered",
  "unlock_conversion",
  "session_quality_high",
  "fresh_lesson_assigned",
  "fresh_lesson_reopened",
  "fresh_lesson_advanced",
  "fresh_lesson_completed",
  "origami_model_completed",
  "origami_certificate_downloaded",
]);
const PREMIUM_PROGRESS_EVENTS = new Set<z.infer<typeof ProgressEventEnum>>([
  "journey_completed",
  "skill_unlocked",
  "worksheet_completed",
  "phonics_mastered",
  "session_completed",
  "level_up",
  "unlock_conversion",
  "session_quality_high",
  "fresh_lesson_advanced",
  "fresh_lesson_completed",
  "origami_certificate_downloaded",
]);

const AnalyticsBody = z.object({
  childId: z.number().int().positive(),
  event: ProgressEventEnum,
  metadata: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

/**
 * POST /api/learning-progress/analytics
 * Ingest retention / progression analytics events.
 */
router.post("/learning-progress/analytics", infantExploreMutationGate(), async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = AnalyticsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  if (!isValidProgressEvent(parsed.data.event)) {
    res.status(400).json({ error: "invalid_event" });
    return;
  }
  try {
    if (PREMIUM_PROGRESS_EVENTS.has(parsed.data.event)) {
      const premium = await requirePremiumLearningAction(userId, "hub_smart_study");
      if (!premium.ok) {
        res.status(403).json(premium.body);
        return;
      }
    }
    const ok = await recordProgressAnalytics(
      userId,
      parsed.data.childId,
      parsed.data.event,
      parsed.data.metadata,
    );
    if (!ok) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    logger.error(
      `learning-progress analytics failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

const SessionStepBody = z.object({
  childId: z.number().int().positive(),
  stepId: z.string().min(1).max(120),
});

router.post("/learning-progress/session-step", infantExploreMutationGate(), async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = SessionStepBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  try {
    const premium = await requirePremiumLearningAction(userId, "hub_smart_study");
    if (!premium.ok) {
      res.status(403).json(premium.body);
      return;
    }
    const result = await completeSessionStep(
      userId,
      parsed.data.childId,
      parsed.data.stepId,
    );
    if (!result) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    res.json(result);
  } catch (err) {
    logger.error(
      `session-step failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
