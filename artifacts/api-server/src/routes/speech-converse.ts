import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, childrenTable, type Child } from "@workspace/db";
import { applyAiGuardrails } from "@workspace/learning-progress-engine";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger.js";
import { submitAiJobAndRespond } from "../lib/ai-queue-http.js";
import type { OpenAiChatPayload } from "../services/ai-job-handlers.js";
import {
  conversationTrialWindow,
  ensureConversationFirstUseUnix,
  FREE_CONVERSATION_TRIAL_DAYS,
  peekConversationFirstUseMs,
} from "../services/speechConversationFirstUse.js";
import {
  getFeatureUsage,
  getOrCreateSubscription,
  incrementFeatureUsage,
  isPremiumNow,
  nextResetAtFor,
} from "../services/subscriptionService.js";
import {
  buildPromptMemory,
  loadConversationMemory,
  recordConversationSession,
  type ConversationPromptMemory,
} from "../services/speechConversationMemoryService.js";
import {
  recordConvoLatencySamples,
  type ConvoLatencySample,
} from "../services/speechConverseMetrics.js";
import { asyncRoute } from "../middlewares/async-route.js";

/**
 * Amy Live Speech Coach — conversational "talk bot" for kids.
 *
 *   POST /api/speech/converse
 *
 * A turn-based, ChatGPT-style voice conversation that coaches children on
 * speaking clearly and confidently. The client owns mic (STT) + playback
 * (Amy voice engine); this route only produces the next spoken reply.
 *
 * Session shape — every session is ONE structured ~5 minute arc so the child
 * feels they completed a whole session, never an abrupt cut-off:
 *   warmup    → greet, recall last session, easy opener
 *   practice  → converse while gently targeting the child's weak sounds
 *   wind_down → one last question, start wrapping up
 *   closing   → warm goodbye + specific praise + a "next time" teaser, and a
 *               structured session `report` the client persists to the shared
 *               Speech Coach journey memory (so next session is better).
 *
 * Cost guard: every user (free AND premium) gets a hard daily TIME budget of
 * LIVE_CONVERSATION_DAILY_SECONDS. The client reports the wall-clock seconds
 * spent since the previous turn (`elapsedSeconds`); we accumulate it in the
 * `speech_conversation_seconds` daily usage bucket and refuse new turns once
 * the budget is exhausted (resets at UTC midnight).
 *
 * Free calendar access starts at first actual converse (including kickoff),
 * not subscription.createdAt. Premium users have no calendar expiry.
 */

const router: IRouter = Router();

const MODEL = "gpt-4o-mini";

/** Free-tier per-day live conversation cap (seconds). 5 minutes = one session. */
export const LIVE_CONVERSATION_DAILY_SECONDS = 300;

/** Premium per-day live conversation cap (seconds). 10 minutes. */
export const PREMIUM_CONVERSATION_DAILY_SECONDS = 600;

/** Max seconds a single turn may charge — defends against inflated client deltas. */
const MAX_TURN_SECONDS = 90;

/**
 * Resolve a user's live-talk budget:
 *   - Premium → 10 min/day, no calendar expiry.
 *   - Free → 5 min/day for {FREE_CONVERSATION_TRIAL_DAYS} from first actual
 *     converse (including kickoff). Unused accounts are not expired.
 *
 * `stampFirstUse` must be true only on POST /speech/converse (including kickoff).
 * Memory/status reads must peek — opening the screen must not start the clock.
 */
export async function resolveConversationBudget(
  userId: string,
  opts?: { stampFirstUse?: boolean },
): Promise<{
  dailyBudget: number;
  isPremium: boolean;
  trialExpired: boolean;
  trialDaysLeft: number;
}> {
  const sub = await getOrCreateSubscription(userId);
  if (isPremiumNow(sub)) {
    return {
      dailyBudget: PREMIUM_CONVERSATION_DAILY_SECONDS,
      isPremium: true,
      trialExpired: false,
      trialDaysLeft: 0,
    };
  }
  const firstUseMs = opts?.stampFirstUse
    ? (await ensureConversationFirstUseUnix(userId)) * 1000
    : await peekConversationFirstUseMs(userId);
  const window = conversationTrialWindow(firstUseMs, Date.now(), FREE_CONVERSATION_TRIAL_DAYS);
  return {
    dailyBudget: LIVE_CONVERSATION_DAILY_SECONDS,
    isPremium: false,
    trialExpired: window.trialExpired,
    trialDaysLeft: window.trialDaysLeft,
  };
}

const AGE_BANDS = ["2-4", "5-7", "8-10"] as const;
type AgeBand = (typeof AGE_BANDS)[number];

const PHASES = ["warmup", "practice", "wind_down", "closing"] as const;
type Phase = (typeof PHASES)[number];

function ageBandFromMonths(totalMonths: number): AgeBand {
  if (totalMonths < 60) return "2-4";
  if (totalMonths < 108) return "5-7";
  return "8-10";
}

const MemorySchema = z.object({
  isReturning: z.boolean().optional(),
  totalSessions: z.number().int().min(0).max(100_000).optional(),
  lastSummary: z.string().max(400).nullish(),
  lastNextFocus: z.string().max(200).nullish(),
  targetSounds: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  masteredSounds: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  tone: z.enum(["supportive", "balanced", "challenging"]).optional(),
  daysSinceLast: z.number().int().min(0).max(3650).nullish(),
});
type Memory = z.infer<typeof MemorySchema>;

const ConverseBody = z.object({
  childId: z.number().int().positive().nullish(),
  childAge: z.number().int().min(1).max(18).nullish(),
  /** The child's latest spoken transcript. Empty/omitted for the opening turn. */
  message: z.string().trim().max(800).optional(),
  /** True for the very first turn — Amy greets and opens the conversation. */
  kickoff: z.boolean().optional(),
  /** Session arc phase this reply should serve. */
  phase: z.enum(PHASES).optional(),
  /** Wall-clock seconds spent since the previous turn (this session). */
  elapsedSeconds: z.number().min(0).max(3600).optional(),
  /** Cross-session memory built from the Speech Coach journey engine. */
  memory: MemorySchema.optional(),
  /** Recent turns, oldest first. */
  history: z
    .array(
      z.object({
        role: z.enum(["child", "amy"]),
        text: z.string().trim().min(1).max(800),
      }),
    )
    .max(12)
    .optional(),
});

const ReportSchema = z.object({
  summary: z.string().trim().max(300).default(""),
  focusWords: z
    .array(
      z.object({
        word: z.string().trim().min(1).max(40),
        score: z.number().min(0).max(100),
      }),
    )
    .max(6)
    .default([]),
  nextFocus: z.string().trim().max(200).default(""),
  clarity: z.number().min(0).max(100).default(70),
});
type Report = z.infer<typeof ReportSchema>;

const ReplyJsonSchema = z.object({
  say: z.string().trim().min(1).max(400),
  question: z.string().trim().max(300).nullable().default(null),
  report: ReportSchema.nullable().optional(),
});
type ReplyJson = z.infer<typeof ReplyJsonSchema>;

/** Combine server-authoritative memory with optional client-sent enrichment. */
function mergeMemory(server: ConversationPromptMemory, client: Memory | undefined): Memory {
  const targetSounds = Array.from(
    new Set([...(server.targetSounds ?? []), ...(client?.targetSounds ?? [])]),
  ).slice(0, 8);
  const masteredSounds = Array.from(
    new Set([...(server.masteredSounds ?? []), ...(client?.masteredSounds ?? [])]),
  ).slice(0, 8);
  return {
    isReturning: server.isReturning || !!client?.isReturning,
    totalSessions: Math.max(server.totalSessions, client?.totalSessions ?? 0),
    lastSummary: server.lastSummary ?? client?.lastSummary ?? null,
    lastNextFocus: server.lastNextFocus ?? client?.lastNextFocus ?? null,
    targetSounds,
    masteredSounds,
    tone: server.isReturning ? server.tone : client?.tone ?? server.tone,
    daysSinceLast: server.daysSinceLast ?? client?.daysSinceLast ?? null,
  };
}

async function loadOwnedChild(childId: number, userId: string): Promise<Child | null> {
  const rows = await db
    .select()
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Compact memory brief — capped to limit prompt tokens on every turn. */
function buildMemoryBrief(memory: Memory | undefined): string {
  if (!memory || !memory.isReturning) {
    return "First chat — be extra welcoming and gentle.";
  }
  const parts: string[] = [];
  if (memory.lastNextFocus) {
    parts.push(`Planned focus: ${memory.lastNextFocus.slice(0, 80)}.`);
  } else if (memory.lastSummary) {
    parts.push(`Last session: ${memory.lastSummary.slice(0, 100)}.`);
  }
  if (memory.targetSounds?.length) {
    parts.push(`Tricky sounds (weave in gently): ${memory.targetSounds.slice(0, 4).join(", ")}.`);
  }
  if (parts.length === 0 && typeof memory.totalSessions === "number" && memory.totalSessions > 0) {
    parts.push(`Returning visitor (${memory.totalSessions} prior chat(s)).`);
  }
  return parts.slice(0, 3).join(" ");
}

function buildSystemPrompt(args: {
  ageBand: AgeBand;
  childName: string | null;
  phase: Phase;
  memory: Memory | undefined;
  remainingSeconds: number;
}): string {
  const toneByBand: Record<AgeBand, string> = {
    "2-4": "Use ONE very short sentence. Tiny, concrete words a toddler knows.",
    "5-7": "Use 1-2 short, playful sentences a 5-7 year old can picture.",
    "8-10": "Use 2-3 warm, simple sentences. Light fun is good.",
  };

  const phaseBrief: Record<Phase, string> = {
    warmup:
      "PHASE: Warm-up. Greet the child warmly by name. If you remember them, mention ONE thing from last time (e.g. the sound you practiced) to show you remember. Then ask ONE easy, fun opening question to get them talking.",
    practice:
      "PHASE: Practice (the heart of the session). Keep a lively back-and-forth. Naturally steer the chat toward words that contain the child's tricky sounds so they get to say them. Warmly MODEL the correct word inside your reply if they slip. Praise specific good talking. Always end with ONE simple question.",
    wind_down:
      "PHASE: Wind-down. Time is almost up. Give warm praise, then ask ONE final easy question to round things off.",
    closing:
      "PHASE: Closing. Do NOT ask a question (set question to null). Warmly say goodbye with SPECIFIC praise about how they talked today, and a short, exciting one-line teaser about what you'll practice next time. ALSO fill the `report` object: summarise the session in one kid-friendly sentence, list up to 4 `focusWords` the child actually practiced today with an honest clarity `score` 0-100 each, set `nextFocus` to the sound/word to work on next time, and `clarity` as the overall talking clarity 0-100.",
  };

  return [
    `You are Amy, a warm, playful speech coach having a LIVE spoken conversation with a young child (age ${args.ageBand}).`,
    args.childName ? `The child's name is ${args.childName}. Use it sometimes.` : "",
    "Your mission: keep the child talking, help them speak clearly and confidently, and grow their skills a little more each session.",
    `Tone: ${toneByBand[args.ageBand]}`,
    buildMemoryBrief(args.memory),
    phaseBrief[args.phase],
    "Always: be encouraging and specific. Never scold or say they are wrong — model the correct word instead. Keep replies under about 40 words.",
    "Safety: never discuss scary, adult, violent, romantic, or unsafe topics. If the child says something upsetting, respond kindly, gently steer to a happy safe topic, and if it sounds serious suggest telling a grown-up. Reply in simple English.",
    'Respond ONLY as a single JSON object: { "say": "<warm reply>", "question": "<one simple question, or null>", "report": <null, or the closing report object> }',
    "Include `report` ONLY in the closing phase; otherwise set it to null. Do NOT include any text outside the JSON object.",
  ]
    .filter(Boolean)
    .join("\n");
}

function guardReport(report: Report): Report {
  const guard = (t: string): string => applyAiGuardrails(t).text;
  return {
    summary: report.summary ? guard(report.summary) : "",
    focusWords: report.focusWords,
    nextFocus: report.nextFocus ? guard(report.nextFocus) : "",
    clarity: report.clarity,
  };
}

function guardReply(reply: ReplyJson): ReplyJson {
  const guard = (t: string): string => applyAiGuardrails(t).text;
  return {
    say: guard(reply.say),
    question: reply.question == null ? null : guard(reply.question),
    report: reply.report ? guardReport(reply.report) : reply.report ?? null,
  };
}

function fallbackReply(childName: string | null, phase: Phase): ReplyJson {
  if (phase === "closing") {
    return {
      say: childName
        ? `You did such great talking today, ${childName}! See you next time for more fun words!`
        : "You did such great talking today! See you next time for more fun words!",
      question: null,
      report: {
        summary: "Had a friendly chat and practiced talking clearly.",
        focusWords: [],
        nextFocus: "saying new words slowly and clearly",
        clarity: 70,
      },
    };
  }
  return {
    say: childName
      ? `You're doing great talking with me, ${childName}!`
      : "You're doing great talking with me!",
    question: "What is your favourite animal?",
    report: null,
  };
}

router.post("/speech/converse", asyncRoute(async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = ConverseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;
  const phase: Phase = body.phase ?? (body.kickoff ? "warmup" : "practice");

  if (!body.kickoff && !(body.message && body.message.length > 0)) {
    res.status(400).json({ error: "empty_message" });
    return;
  }

  const hasChildId = body.childId != null;

  const [child, serverMemoryRow, budgetResult, usedBefore] = await Promise.all([
    hasChildId ? loadOwnedChild(body.childId!, userId) : Promise.resolve(null),
    hasChildId
      ? loadConversationMemory(userId, body.childId!).catch(() => null)
      : Promise.resolve(null),
    resolveConversationBudget(userId, { stampFirstUse: true }),
    getFeatureUsage(userId, "speech_conversation_seconds"),
  ]);

  if (hasChildId && !child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  let childName: string | null = child?.name ?? null;
  let derivedAgeBand: AgeBand | null = null;
  if (child) {
    derivedAgeBand = ageBandFromMonths((child.age ?? 0) * 12 + (child.ageMonths ?? 0));
  } else if (body.childAge != null) {
    derivedAgeBand = ageBandFromMonths(body.childAge * 12);
  }
  const ageBand: AgeBand = derivedAgeBand ?? "5-7";

  const effectiveMemory = mergeMemory(buildPromptMemory(serverMemoryRow), body.memory);

  const { dailyBudget, isPremium, trialExpired, trialDaysLeft } = budgetResult;

  if (trialExpired) {
    res.status(402).json({
      error: "trial_expired",
      feature: "speech_conversation_seconds",
      message:
        "Your 3 days of Talk with Amy have ended. Premium continues with 10 minutes of live talk every day.",
      limitSeconds: dailyBudget,
      usedSeconds: 0,
      remainingSeconds: 0,
      isPremium: false,
      trialExpired: true,
      resetsAt: null,
    });
    return;
  }

  if (usedBefore >= dailyBudget) {
    res.status(402).json({
      error: "conversation_limit_reached",
      feature: "speech_conversation_seconds",
      message: "Today's live talk time is used up. Come back tomorrow for more!",
      limitSeconds: dailyBudget,
      usedSeconds: usedBefore,
      remainingSeconds: 0,
      isPremium,
      trialDaysLeft,
      resetsAt: nextResetAtFor("speech_conversation_seconds"),
    });
    return;
  }

  // Charge the time spent since the previous turn (clamped). Kickoff = 0.
  const charge = Math.min(MAX_TURN_SECONDS, Math.max(0, Math.round(body.elapsedSeconds ?? 0)));
  let usedAfter = usedBefore;
  if (charge > 0) {
    usedAfter = await incrementFeatureUsage(userId, "speech_conversation_seconds", charge).catch(
      () => usedBefore + charge,
    );
  }
  const remainingSeconds = Math.max(0, dailyBudget - usedAfter);
  const resetsAt = nextResetAtFor("speech_conversation_seconds");

  const historyMessages = (body.history ?? []).slice(-4).map((h) => ({
    role: (h.role === "amy" ? "assistant" : "user") as "assistant" | "user",
    content: h.text,
  }));

  const turnInstruction = body.kickoff
    ? "[The child just joined. Open the session per the warm-up phase.]"
    : (body.message ?? "");

  const openAiPayload: OpenAiChatPayload = {
    namespace: `speech-converse:${body.childId ?? "anon"}:${ageBand}:${phase}`,
    model: MODEL,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt({ ageBand, childName, phase, memory: effectiveMemory, remainingSeconds }),
      },
      ...historyMessages,
      { role: "user", content: turnInstruction },
    ],
    max_completion_tokens: phase === "closing" ? 320 : 120,
    temperature: 0.7,
    json: true,
  };

  const buildReplyFromAi = (result: unknown) => {
    const raw = (result as { content: string | null; timedOut?: boolean }).content ?? "";
    let reply: ReplyJson;
    if (!raw || (result as { timedOut?: boolean }).timedOut) {
      reply = fallbackReply(childName, phase);
    } else {
      let parsedJson: unknown = null;
      try {
        parsedJson = JSON.parse(raw);
      } catch {
        logger.warn(`speech-converse: non-JSON model output (raw=${raw.slice(0, 160)})`);
      }
      const validated = ReplyJsonSchema.safeParse(parsedJson);
      reply = validated.success ? validated.data : fallbackReply(childName, phase);
    }
    // Reports only belong to the closing turn.
    if (phase !== "closing") reply.report = null;
    else if (!reply.report) reply.report = fallbackReply(childName, "closing").report;
    return {
      reply: guardReply(reply),
      phase,
      ageBand,
      limitSeconds: dailyBudget,
      isPremium,
      usedSeconds: usedAfter,
      remainingSeconds,
      resetsAt,
    };
  };

  await submitAiJobAndRespond({
    res,
    userId,
    type: "openai.chat_json",
    payload: openAiPayload,
    waitMs: 30_000,
    buildSyncBody: (result) => buildReplyFromAi(result),
    // Async (BullMQ) path: budget info is returned now; the spoken reply is
    // fetched by polling /api/result/:jobId and parsed client-side.
    buildAsyncBody: (jobId) => ({
      jobId,
      status: "processing",
      pollUrl: `/api/result/${jobId}`,
      legacyPollUrl: `/api/ai/jobs/${jobId}`,
      phase,
      ageBand,
      limitSeconds: dailyBudget,
      isPremium,
      usedSeconds: usedAfter,
      remainingSeconds,
      resetsAt,
    }),
  });
}));

// ─── GET /api/speech/converse/memory ──────────────────────────────────────
// Cross-device memory for the welcome-back screen + adaptive targeting.
router.get("/speech/converse/memory", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const childId = Number(req.query.childId);
  if (!Number.isInteger(childId) || childId <= 0) {
    res.status(400).json({ error: "invalid_child_id" });
    return;
  }
  const child = await loadOwnedChild(childId, userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }
  const row = await loadConversationMemory(userId, childId).catch(() => null);
  const { dailyBudget, isPremium, trialExpired, trialDaysLeft } =
    await resolveConversationBudget(userId);
  res.json({
    memory: buildPromptMemory(row),
    childName: child.name ?? null,
    limitSeconds: dailyBudget,
    isPremium,
    trialExpired,
    trialDaysLeft,
  });
});

// ─── POST /api/speech/converse/complete ────────────────────────────────────
// Persist a finished session's report into cross-device memory.
const CompleteBody = z.object({
  childId: z.number().int().positive(),
  report: z.object({
    summary: z.string().trim().max(300).optional(),
    focusWords: z
      .array(z.object({ word: z.string().trim().min(1).max(40), score: z.number().min(0).max(100) }))
      .max(8)
      .optional(),
    nextFocus: z.string().trim().max(200).optional(),
    clarity: z.number().min(0).max(100).optional(),
  }),
});

router.post("/speech/converse/complete", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = CompleteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const child = await loadOwnedChild(parsed.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }
  try {
    const row = await recordConversationSession(userId, parsed.data.childId, parsed.data.report);
    res.json({ ok: true, memory: buildPromptMemory(row) });
  } catch (err) {
    logger.warn(`speech-converse complete failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "could_not_save_memory" });
  }
});

const ConvoMetricsBody = z.object({
  samples: z
    .array(
      z.object({
        platform: z.enum(["ios", "android", "web"]),
        sttMs: z.number().int().min(0).nullable(),
        llmMs: z.number().int().min(0).nullable(),
        ttsMs: z.number().int().min(0).nullable(),
        ttfaMs: z.number().int().min(0).nullable(),
        e2eMs: z.number().int().min(0),
        error: z.string().max(120).optional(),
      }),
    )
    .min(1)
    .max(20),
});

router.post("/speech/converse/metrics", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = ConvoMetricsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const accepted = recordConvoLatencySamples(parsed.data.samples as ConvoLatencySample[]);
  res.status(202).json({ ok: true, accepted });
});

export default router;
