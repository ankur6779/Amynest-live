import { Router, type IRouter } from "express";
import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger.js";
import {
  db,
  aiCacheTable,
  childrenTable,
  type Child,
} from "@workspace/db";
import { aiUsageGate } from "../middlewares/aiUsageGate.js";
import { submitAiJobAndRespond } from "../lib/ai-queue-http.js";
import type { OpenAiChatPayload } from "../services/ai-job-handlers.js";
import { incrementFeatureUsage } from "../services/subscriptionService.js";

/**
 * Amy AI Tutor — /api/ai-tutor/chat
 *
 * Single-turn structured tutor reply. Strict JSON contract so the client
 * can render rich blocks (teach text, example chips, an inline question
 * with multiple-choice options, plus the answer to verify against). The
 * shape never changes across modes — only what's populated does:
 *
 *   { type, content, examples, question, options, answer, mode, ageBand }
 *
 *   - teach    → content + examples; question/options omitted
 *   - practice → content + question + options + answer
 *   - quiz     → question + options + answer (terse content)
 *   - doubt    → content (full explanation), examples optional
 *
 * Caching: 7-day SHA-1 cache by (mode + age band + topic + question text)
 * via the shared `ai_cache` table. Daily AI gate via `aiUsageGate`
 * (shares the 10/day budget with the regular Assistant).
 */

const router: IRouter = Router();

// ─── Constants ────────────────────────────────────────────────────────────

const NAMESPACE = "ai_tutor_v1";
const MODEL = "gpt-4o-mini";

const MODES = ["teach", "practice", "quiz", "doubt"] as const;
type TutorMode = (typeof MODES)[number];

/**
 * Coarse age bands the system prompt adapts tone for. Toddlers get short
 * concrete sentences; older kids get full structure with worked examples.
 */
const AGE_BANDS = ["2-4", "5-7", "8-10", "11-14"] as const;
type AgeBand = (typeof AGE_BANDS)[number];

function ageBandFromMonths(totalMonths: number): AgeBand {
  if (totalMonths < 60) return "2-4";
  if (totalMonths < 96) return "5-7";
  if (totalMonths < 132) return "8-10";
  return "11-14";
}

// ─── Validation ──────────────────────────────────────────────────────────

const ChatBody = z.object({
  childId: z.number().int().positive().nullish(),
  /** Fallback when the caller doesn't have a stored child record (e.g. first-run). */
  childAge: z.number().int().min(1).max(18).nullish(),
  mode: z.enum(MODES).default("teach"),
  /** Subject hint — "math", "english", "gk", "logic", "general". */
  subject: z
    .enum(["math", "english", "gk", "logic", "general"])
    .default("general"),
  /** Topic the child is learning right now (e.g. "addition", "phonics-b"). */
  topic: z.string().trim().min(1).max(120).optional(),
  /** Free-form parent/child question. */
  message: z.string().trim().min(1).max(800),
  /** Optional override; otherwise derived from child's age. */
  ageBand: z.enum(AGE_BANDS).optional(),
  /** Up to the last few turns of this conversation, oldest first. */
  history: z
    .array(
      z.object({
        role: z.enum(["user", "tutor"]),
        text: z.string().trim().min(1).max(2000),
      }),
    )
    .max(10)
    .optional(),
});

const TutorJsonSchema = z.object({
  type: z.enum(["teach", "practice", "quiz", "doubt"]),
  content: z.string().trim().min(1).max(1500),
  examples: z.array(z.string().trim().min(1).max(120)).max(6).default([]),
  question: z.string().trim().max(400).nullable().default(null),
  options: z.array(z.string().trim().min(1).max(160)).max(6).default([]),
  /** Index into `options` for MCQ; or short string for fill-in. Null = no auto-check. */
  answer: z.union([z.number().int().min(0).max(5), z.string().max(160)]).nullable().default(null),
});
type TutorJson = z.infer<typeof TutorJsonSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────

function cacheKey(input: {
  mode: TutorMode;
  ageBand: AgeBand;
  subject: string;
  topic: string;
  message: string;
}): string {
  const raw = `${NAMESPACE}|${input.mode}|${input.ageBand}|${input.subject}|${input.topic}|${input.message}`;
  return createHash("sha1").update(raw).digest("hex");
}

async function loadOwnedChild(
  childId: number,
  userId: string,
): Promise<Child | null> {
  const rows = await db
    .select()
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

function buildSystemPrompt(args: {
  mode: TutorMode;
  ageBand: AgeBand;
  subject: string;
  topic: string;
  childName: string | null;
}): string {
  const toneByBand: Record<AgeBand, string> = {
    "2-4":
      "Use 1 short sentence per idea. Tiny, concrete words. No abstractions. Lots of warmth.",
    "5-7":
      "Use 2-3 short sentences. Concrete examples a 5-7-year-old can picture. Friendly and playful.",
    "8-10":
      "Use plain English with one worked example. Light humour OK. Avoid jargon.",
    "11-14":
      "Be precise and a little more structured. Use proper terminology where it helps.",
  };

  const modeBrief: Record<TutorMode, string> = {
    teach:
      'Teach the topic in 3-5 sentences. Always provide 2-4 short concrete examples in the "examples" array. Leave question/options/answer null/empty.',
    practice:
      'Briefly remind the concept in 1-2 sentences ("content"). Then ask ONE multiple-choice question with 3-4 short options ("question"+"options"). Set "answer" to the index of the correct option.',
    quiz:
      'Ask ONE quiz question. Keep "content" to a single sentence framing only. Provide 4 options and the correct index in "answer".',
    doubt:
      "The child asked a doubt. Answer it directly and patiently in 2-5 sentences. Include 1-3 examples if helpful. Leave question/options/answer null/empty.",
  };

  return [
    `You are Amy, a warm, encouraging AI tutor for an Indian child aged ${args.ageBand}.`,
    args.childName ? `The child's name is ${args.childName}.` : "",
    `Subject: ${args.subject}. Topic: ${args.topic || "general"}.`,
    `Age tone: ${toneByBand[args.ageBand]}`,
    `Mode: ${args.mode}. ${modeBrief[args.mode]}`,
    "Cultural fit: Indian context. Examples can use Indian names (Aarav, Priya), rupees, mangoes, cricket, school, etc.",
    "Safety: never discuss adult topics, violence, or anything age-inappropriate. Refuse politely if asked.",
    'You MUST respond as a single JSON object matching this exact shape:',
    '  { "type": "teach"|"practice"|"quiz"|"doubt",',
    '    "content": "<short tutor text>",',
    '    "examples": ["<short example>", ...],   // up to 4',
    '    "question": "<question text or null>",',
    '    "options": ["<option>", ...],          // 0 or 3-4',
    '    "answer": <option index | short string | null>',
    "  }",
    'Set "type" equal to the requested mode. Do NOT include any text outside the JSON object.',
  ]
    .filter(Boolean)
    .join("\n");
}

function isStrictJson(value: unknown): value is TutorJson {
  return TutorJsonSchema.safeParse(value).success;
}

/** Cheap rule-based fallback so Amy always replies — even if OpenAI is down. */
function fallbackReply(args: {
  mode: TutorMode;
  ageBand: AgeBand;
  topic: string;
  message: string;
}): TutorJson {
  const topicLabel = args.topic || args.message.slice(0, 60);
  if (args.mode === "quiz" || args.mode === "practice") {
    return {
      type: args.mode,
      content: `Let's try a quick question about ${topicLabel}.`,
      examples: [],
      question: `Which one of these belongs with "${topicLabel}"?`,
      options: ["This one", "That one", "Both", "Neither"],
      answer: 2,
    };
  }
  return {
    type: args.mode === "doubt" ? "doubt" : "teach",
    content:
      "Amy is taking a short break. Try again in a moment — and meanwhile, ask your grown-up to read this with you.",
    examples: [],
    question: null,
    options: [],
    answer: null,
  };
}

// ─── POST /api/ai-tutor/chat ──────────────────────────────────────────────

router.post("/ai-tutor/chat", aiUsageGate, async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;

  // Load child if provided so we can derive an age-band default + name.
  let childName: string | null = null;
  let derivedAgeBand: AgeBand | null = null;
  if (body.childId != null) {
    const child = await loadOwnedChild(body.childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    childName = child.name ?? null;
    const totalMonths = (child.age ?? 0) * 12 + (child.ageMonths ?? 0);
    derivedAgeBand = ageBandFromMonths(totalMonths);
  } else if (body.childAge != null) {
    derivedAgeBand = ageBandFromMonths(body.childAge * 12);
  }
  const ageBand: AgeBand = body.ageBand ?? derivedAgeBand ?? "5-7";
  const topic = body.topic ?? "";

  const key = cacheKey({
    mode: body.mode,
    ageBand,
    subject: body.subject,
    topic,
    message: body.message,
  });

  // ── L1: ai_cache lookup ────────────────────────────────────────────────
  try {
    const cached = await db
      .select()
      .from(aiCacheTable)
      .where(eq(aiCacheTable.cacheKey, key))
      .limit(1);
    if (cached[0] && isStrictJson(cached[0].response)) {
      res.json({
        reply: cached[0].response as TutorJson,
        cached: true,
        ageBand,
        mode: body.mode,
      });
      return;
    }
  } catch (err) {
    logger.warn(
      `ai-tutor cache read failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const historyMessages = (body.history ?? []).slice(-6).map((h) => ({
    role: (h.role === "tutor" ? "assistant" : "user") as "assistant" | "user",
    content: h.text,
  }));

  const openAiPayload: OpenAiChatPayload = {
    namespace: `ai-tutor:${key}`,
    model: MODEL,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt({
          mode: body.mode,
          ageBand,
          subject: body.subject,
          topic,
          childName,
        }),
      },
      ...historyMessages,
      { role: "user", content: body.message },
    ],
    max_completion_tokens: 600,
    temperature: body.mode === "quiz" ? 0.3 : 0.6,
    json: true,
  };

  const buildTutorFromAiResult = (result: unknown) => {
    let usedFallback = false;
    let reply: TutorJson;
    const raw = (result as { content: string | null; timedOut?: boolean }).content ?? "";
    if (!raw || (result as { timedOut?: boolean }).timedOut) {
      reply = fallbackReply({ mode: body.mode, ageBand, topic, message: body.message });
      usedFallback = true;
    } else {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(raw);
      } catch {
        logger.warn(`ai-tutor: model returned non-JSON, using fallback (raw=${raw.slice(0, 200)})`);
        parsedJson = null;
      }
      const validated = TutorJsonSchema.safeParse(parsedJson);
      if (!validated.success) {
        reply = fallbackReply({ mode: body.mode, ageBand, topic, message: body.message });
        usedFallback = true;
      } else {
        reply = validated.data;
        reply.type = body.mode;
      }
    }

    if (usedFallback) {
      void incrementFeatureUsage(userId, "ai_query", -1).catch((err) => {
        logger.warn(
          `ai-tutor refund failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    } else {
      void db
        .insert(aiCacheTable)
        .values({
          cacheKey: key,
          namespace: NAMESPACE,
          input: {
            mode: body.mode,
            ageBand,
            subject: body.subject,
            topic,
            message: body.message,
          },
          response: reply,
        })
        .onConflictDoNothing({ target: aiCacheTable.cacheKey })
        .catch((err) => {
          logger.warn(
            `ai-tutor cache write failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
    }

    return { reply, cached: false, ageBand, mode: body.mode };
  };

  await submitAiJobAndRespond({
    res,
    userId,
    type: "openai.chat_json",
    payload: openAiPayload,
    buildSyncBody: (result) => buildTutorFromAiResult(result),
    buildAsyncBody: (jobId) => ({
      jobId,
      status: "processing",
      pollUrl: `/api/ai/jobs/${jobId}`,
      ageBand,
      mode: body.mode,
    }),
  });
});

export default router;
