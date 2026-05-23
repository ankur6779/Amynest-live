import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger.js";
import { aiUsageGate } from "../middlewares/aiUsageGate.js";
import { submitAiJobAndRespond } from "../lib/ai-queue-http.js";
import type { OpenAiChatPayload } from "../services/ai-job-handlers.js";
import {
  findSchoolEvent,
  generateQuickActionLocal,
  parseQuickActionAiResponse,
  type QuickActionType,
} from "@workspace/event-prep";

const router: IRouter = Router();

const MODEL = "gpt-4o-mini";
const NAMESPACE = "event_prep_v1";

const BodySchema = z.object({
  type: z.enum(["speech", "costume", "checklist"]),
  eventId: z.string().min(1).max(80),
  childAge: z.number().int().min(2).max(15),
  childName: z.string().max(40).optional(),
  country: z.string().max(8).optional(),
  customTheme: z.string().max(120).optional(),
});

function buildSystemPrompt(type: QuickActionType): string {
  const focus =
    type === "speech"
      ? "2–3 short speech lines a child can memorize (plain English, age-appropriate)."
      : type === "costume"
      ? "3–5 bullet steps for a low-cost DIY costume using household items."
      : "5–7 checklist items parents can tick off before the event.";

  return `You are Amy — a warm parenting assistant helping with school event prep.
Output ONLY valid JSON: { "title": string, "intro": string, "items": string[] }
Rules:
- ${focus}
- Keep each item under 120 characters.
- No markdown. No extra keys.
- Be practical and encouraging.`;
}

function buildUserPrompt(
  type: QuickActionType,
  eventName: string,
  childAge: number,
  childName: string | undefined,
  country: string | undefined,
  customTheme: string | undefined,
  eventContext: {
    overview: string;
    whatToPrepare: string[];
    speechIdeas: string[];
    activities: string[];
    checklist: string[];
  },
): string {
  return JSON.stringify({
    task: type,
    event: eventName,
    customTheme: customTheme ?? null,
    childAge,
    childName: childName ?? null,
    country: country ?? null,
    context: eventContext,
  });
}

router.post("/event-prep/generate", aiUsageGate, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, eventId, childAge, childName, country, customTheme } = parsed.data;
  const event = findSchoolEvent(eventId);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const fallback = generateQuickActionLocal({
    type,
    event,
    childAge,
    childName,
    country: country as never,
    customTheme,
  });

  const openAiPayload: OpenAiChatPayload = {
    namespace: `${NAMESPACE}:${type}:${eventId}`,
    model: MODEL,
    json: true,
    max_completion_tokens: 500,
    temperature: 0.7,
    messages: [
      { role: "system", content: buildSystemPrompt(type) },
      {
        role: "user",
        content: buildUserPrompt(
          type,
          event.name,
          childAge,
          childName,
          country,
          customTheme,
          {
            overview: event.overview,
            whatToPrepare: event.whatToPrepare,
            speechIdeas: event.speechIdeas,
            activities: event.activities,
            checklist: event.checklist,
          },
        ),
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
        const action = parseQuickActionAiResponse(type, json, fallback);
        return { ...action, usedFallback: action.source === "local" };
      } catch (err) {
        logger.warn(`event-prep/generate parse failed: ${err instanceof Error ? err.message : String(err)}`);
        return { ...fallback, usedFallback: true };
      }
    },
    buildAsyncBody: (jobId) => ({
      jobId,
      status: "processing",
      pollUrl: `/api/ai/jobs/${jobId}`,
    }),
  });
});

export default router;
