// ─────────────────────────────────────────────────────────────────────────────
// /api/explain — Explainability Engine routes (Module 3)
//
// POST /api/explain/routine   — why was this routine generated?
// POST /api/explain/meal      — why was this meal suggested?
// GET  /api/explain/history   — per-user audit log (in-memory ring buffer)
// ─────────────────────────────────────────────────────────────────────────────

import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { randomUUID } from "node:crypto";

import { getAuth } from "../lib/auth";
import {
  explainRoutine,
  explainMeal,
  type ExplanationContext,
  type ExplanationAuditEntry,
} from "@workspace/explainability";


const router: IRouter = Router();

// ── In-memory audit log (per-process; 50 entries per user, FIFO) ──────────
const auditLog = new Map<string, ExplanationAuditEntry[]>();
const AUDIT_LIMIT = 50;

function logEntry(userId: string, entry: ExplanationAuditEntry) {
  const list = auditLog.get(userId) ?? [];
  list.unshift(entry);
  if (list.length > AUDIT_LIMIT) list.length = AUDIT_LIMIT;
  auditLog.set(userId, list);
}

// ── Shared context schema ─────────────────────────────────────────────────

const ContextSchema = z.object({
  childId:                     z.number().int().optional(),
  childAgeMonths:              z.number().optional(),
  ageGroup:                    z.string().optional(),
  mood:                        z.string().optional(),
  sleepQuality:                z.enum(["good", "average", "poor"]).optional(),
  sleepDurationHours:          z.number().optional(),
  energyLevel:                 z.enum(["high", "medium", "low"]).optional(),
  weatherOutdoor:              z.enum(["yes", "no", "limited"]).optional(),
  caregiver:                   z.string().optional(),
  adaptations:                 z.array(z.string()).optional(),
  activityCategory:            z.string().optional(),
  previousDayCompletionRate:   z.number().min(0).max(1).optional(),
  learningSuccessRate:         z.number().min(0).max(1).optional(),
  mealType:                    z.string().optional(),
  dietType:                    z.string().optional(),
  allergyFlags:                z.array(z.string()).optional(),
  fridgeItems:                 z.array(z.string()).optional(),
  culturalRegion:              z.string().optional(),
  householdConflicts:          z.array(z.string()).optional(),
  specialPlans:                z.string().optional(),
});

const ExplainRoutineBody = z.object({
  context:       ContextSchema,
  sourceEngine:  z.enum(["rule_based", "ai_generated", "hybrid"]).optional(),
  withNarrative: z.boolean().optional(),
});

const ExplainMealBody = z.object({
  context:       ContextSchema,
  sourceEngine:  z.enum(["rule_based", "ai_generated", "hybrid"]).optional(),
  withNarrative: z.boolean().optional(),
});

// ── Optional AI narrative generation ─────────────────────────────────────

async function generateNarrative(
  summary: string,
  factors: Array<{ label: string; detail: string }>,
): Promise<string | undefined> {
  try {
    const { openai: ai } = await import("@workspace/integrations-openai-ai-server");
    const factorText = factors
      .slice(0, 4)
      .map((f) => `• ${f.label}: ${f.detail}`)
      .join("\n");
    const prompt = `You are AmyNest AI, a warm parenting assistant. Write a 2–3 sentence friendly explanation for this recommendation.
Summary: ${summary}
Key factors:
${factorText}
Keep it conversational, empathetic, and under 80 words. No bullet points.`;

    const resp = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 120,
      temperature: 0.6,
    });
    return resp.choices[0]?.message?.content?.trim() ?? undefined;
  } catch {
    return undefined;
  }
}

// ── POST /api/explain/routine ─────────────────────────────────────────────
router.post("/explain/routine", async (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId) return res.status(401).json({ error: "Unauthorized" });

  const parsed = ExplainRoutineBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
  }

  const { context, sourceEngine = "hybrid", withNarrative = false } = parsed.data;
  const result = explainRoutine(context as ExplanationContext, sourceEngine);

  if (withNarrative && result.factors.length > 0) {
    result.aiNarrative = await generateNarrative(result.summary, result.factors);
  }

  logEntry(auth.userId, {
    id: randomUUID(),
    recommendationType: "routine",
    summary: result.summary,
    confidenceValue: result.confidence.value,
    confidenceTier: result.confidence.tier,
    primaryFactor: result.trace.primaryFactor,
    generatedAt: result.metadata.generatedAt,
    childId: context.childId,
  });

  return res.json(result);
});

// ── POST /api/explain/meal ────────────────────────────────────────────────
router.post("/explain/meal", async (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId) return res.status(401).json({ error: "Unauthorized" });

  const parsed = ExplainMealBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
  }

  const { context, sourceEngine = "rule_based", withNarrative = false } = parsed.data;
  const result = explainMeal(context as ExplanationContext, sourceEngine);

  if (withNarrative && result.factors.length > 0) {
    result.aiNarrative = await generateNarrative(result.summary, result.factors);
  }

  logEntry(auth.userId, {
    id: randomUUID(),
    recommendationType: "meal",
    summary: result.summary,
    confidenceValue: result.confidence.value,
    confidenceTier: result.confidence.tier,
    primaryFactor: result.trace.primaryFactor,
    generatedAt: result.metadata.generatedAt,
    childId: context.childId,
  });

  return res.json(result);
});

// ── GET /api/explain/history ──────────────────────────────────────────────
router.get("/explain/history", (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId) return res.status(401).json({ error: "Unauthorized" });

  const rawLimit = req.query["limit"];
  const limit = Math.min(
    50,
    Math.max(1, Number.isNaN(Number(rawLimit)) ? 20 : Number(rawLimit)),
  );

  const entries = (auditLog.get(auth.userId) ?? []).slice(0, limit);
  return res.json(entries);
});

export default router;
