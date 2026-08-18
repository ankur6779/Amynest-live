import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger.js";
import { aiUsageGate } from "../middlewares/aiUsageGate.js";
import { hubModuleGate } from "../middlewares/hubModuleGate.js";
import {
  rejectInfantExploreMutationByBodyAge,
  userHasOnlyInfantChildren,
} from "../lib/infant-explore-guard.js";
import { submitAiJobAndRespond } from "../lib/ai-queue-http.js";
import type { OpenAiChatPayload } from "../services/ai-job-handlers.js";
import { resolveOpenAiChatModel } from "../services/openai-model-catalog.js";
import {
  generateAmyActionsLocal,
  generateAmyQuestionsLocal,
  parseAmyActionsResponse,
  parseAmyQuestionsResponse,
  type PtmNotes,
} from "@workspace/ptm-prep";
import { getPtmPrepSync, putPtmPrepSync } from "../services/ptmPrepService.js";

const router: IRouter = Router();
const NAMESPACE = "ptm_prep_v1";

const SessionSchema = z.object({
  id: z.string(),
  childId: z.string().optional(),
  childName: z.string().optional(),
  date: z.string(),
  teacherName: z.string().optional(),
  className: z.string().optional(),
  stage: z.enum(["prepare", "attend", "act", "done"]),
  questions: z.array(z.any()),
  notes: z.object({
    teacherFeedback: z.string(),
    weakAreas: z.string(),
    suggestions: z.string(),
  }),
  actions: z.array(z.any()),
  createdAt: z.number(),
  completedAt: z.number().optional(),
});

const ReminderSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  childId: z.string().optional(),
  childName: z.string().optional(),
  actionText: z.string(),
  dueDate: z.string(),
  dismissedAt: z.string().optional(),
});

const SyncBodySchema = z.object({
  draft: SessionSchema.nullable(),
  history: z.array(SessionSchema),
  reminders: z.array(ReminderSchema),
  clientUpdatedAt: z.number().int().nonnegative(),
});

const GenerateBodySchema = z.object({
  kind: z.enum(["questions", "actions"]),
  childAge: z.number().int().min(2).max(18).optional(),
  childName: z.string().max(40).optional(),
  teacherName: z.string().max(60).optional(),
  className: z.string().max(30).optional(),
  previousWeakAreas: z.string().max(400).optional(),
  notes: z
    .object({
      teacherFeedback: z.string().max(800),
      weakAreas: z.string().max(800),
      suggestions: z.string().max(800),
    })
    .optional(),
});

router.get("/ptm-prep/sync", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = await getPtmPrepSync(userId);
    res.json(data);
  } catch (err) {
    logger.error(`ptm-prep/sync GET failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/ptm-prep/sync", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = SyncBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (await userHasOnlyInfantChildren(userId)) {
    res.status(403).json({
      error: "infant_explore_preview_only",
      message:
        "PTM prep progress is preview-only for households with only children under 24 months.",
    });
    return;
  }
  try {
    const data = await putPtmPrepSync(userId, parsed.data);
    res.json(data);
  } catch (err) {
    logger.error(`ptm-prep/sync PUT failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

function buildQuestionsSystemPrompt(): string {
  return `You are Amy — a warm parenting assistant helping prepare for a Parent-Teacher Meeting.
Output ONLY valid JSON: { "questions": string[] }
Rules:
- 4–6 short, specific questions a parent can ask the teacher.
- Age-appropriate, practical, non-judgmental tone.
- Each question under 120 characters.
- No markdown. No extra keys.`;
}

function buildActionsSystemPrompt(): string {
  return `You are Amy — a warm parenting assistant turning PTM notes into a home action plan.
Output ONLY valid JSON: { "actions": string[] }
Rules:
- 3–8 bite-sized, actionable steps for parents (not the child directly).
- Start with a verb. Each under 140 characters.
- No markdown. No extra keys.
- Practical for Indian families.`;
}

router.post(
  "/ptm-prep/generate",
  hubModuleGate("hub_ptm_prep"),
  aiUsageGate,
  async (req, res): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const parsed = GenerateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    if (rejectInfantExploreMutationByBodyAge(res, parsed.data)) return;
    if (parsed.data.childAge == null && (await userHasOnlyInfantChildren(userId))) {
      res.status(403).json({
        error: "infant_explore_preview_only",
        message:
          "PTM prep AI is preview-only for households with only children under 24 months.",
      });
      return;
    }

    const { kind, childAge, childName, teacherName, className, previousWeakAreas, notes } =
      parsed.data;

    const questionsFallback = generateAmyQuestionsLocal({
      childAge,
      childName,
      teacherName,
      className,
      previousWeakAreas,
    });
    const actionsFallback = generateAmyActionsLocal(
      (notes ?? { teacherFeedback: "", weakAreas: "", suggestions: "" }) as PtmNotes,
    );
    const fallback = kind === "questions" ? questionsFallback : actionsFallback;

    const openAiPayload: OpenAiChatPayload = {
      namespace: `${NAMESPACE}:${kind}`,
      model: resolveOpenAiChatModel("legacy"),
      json: true,
      max_completion_tokens: 500,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: kind === "questions" ? buildQuestionsSystemPrompt() : buildActionsSystemPrompt(),
        },
        {
          role: "user",
          content: JSON.stringify({
            kind,
            childAge: childAge ?? null,
            childName: childName ?? null,
            teacherName: teacherName ?? null,
            className: className ?? null,
            previousWeakAreas: previousWeakAreas ?? null,
            notes: notes ?? null,
          }),
        },
      ],
    };

    await submitAiJobAndRespond({
      res,
      userId,
      type: "openai.chat_json",
      payload: openAiPayload,
      buildSyncBody: (result) => {
        const raw = (result as { content: string | null; timedOut?: boolean }).content;
        if (!raw || (result as { timedOut?: boolean }).timedOut) {
          return { ...fallback, usedFallback: true };
        }
        try {
          const json = JSON.parse(raw) as unknown;
          const parsedResult =
            kind === "questions"
              ? parseAmyQuestionsResponse(json, questionsFallback)
              : parseAmyActionsResponse(json, actionsFallback);
          return {
            ...parsedResult,
            usedFallback: parsedResult.source === "local",
          };
        } catch (err) {
          logger.warn(
            `ptm-prep/generate parse failed: ${err instanceof Error ? err.message : String(err)}`,
          );
          return { ...fallback, usedFallback: true };
        }
      },
      buildAsyncBody: (jobId) => ({
        jobId,
        status: "processing",
        pollUrl: `/api/ai/jobs/${jobId}`,
      }),
    });
  },
);

export default router;
