import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  db,
  childrenTable,
  speechProgressTable,
  speechPracticeLogTable,
  speechExpertWaitlistTable,
} from "@workspace/db";
import {
  SPEECH_MILESTONES,
  PRONUNCIATION_PROMPTS,
  computeWeeklyProgressScore,
  getMilestonesForAgeMonths,
  getPromptsForAgeMonths,
  monthsToBand,
} from "@workspace/speech-coach";
import { ensureCompatibleFormat } from "@workspace/integrations-openai-ai-server";
import { submitRouteAiJob } from "../lib/route-ai-queue.js";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { featureGate } from "../middlewares/featureGate";

const router: IRouter = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

async function loadOwnedChild(
  userId: string,
  childId: number,
): Promise<{ id: number; ageMonths: number } | null> {
  const rows = await db
    .select({
      id: childrenTable.id,
      age: childrenTable.age,
      ageMonths: childrenTable.ageMonths,
    })
    .from(childrenTable)
    .where(
      and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const totalMonths = (row.age ?? 0) * 12 + (row.ageMonths ?? 0);
  return { id: row.id, ageMonths: totalMonths };
}

const STATUSES = ["on_track", "needs_attention", "consult_expert"] as const;
type SpeechStatus = (typeof STATUSES)[number];

const PROMPT_KINDS = ["letter", "phonic", "word", "sentence"] as const;
type PromptKind = (typeof PROMPT_KINDS)[number];

// ─── GET /speech/milestones ─────────────────────────────────────────────────

const milestonesQuerySchema = z.object({
  childId: z.coerce.number().int().positive(),
});

router.get("/speech/milestones", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = milestonesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query" });
    return;
  }
  const child = await loadOwnedChild(userId, parsed.data.childId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const ageBand = monthsToBand(child.ageMonths);
  const milestones = getMilestonesForAgeMonths(child.ageMonths);

  const statusRows = milestones.length
    ? await db
        .select()
        .from(speechProgressTable)
        .where(
          and(
            eq(speechProgressTable.childId, child.id),
            inArray(
              speechProgressTable.milestoneId,
              milestones.map((m) => m.id),
            ),
          ),
        )
    : [];

  const statusByMilestone = new Map(
    statusRows.map((r) => [r.milestoneId, r] as const),
  );

  req.log.info(
    { evt: "speech.milestones.list", userId, childId: child.id, ageBand },
    "speech milestones listed",
  );

  res.json({
    childId: child.id,
    ageMonths: child.ageMonths,
    ageBand,
    milestones: milestones.map((m) => {
      const saved = statusByMilestone.get(m.id);
      return {
        id: m.id,
        ageBand: m.ageBand,
        category: m.category,
        i18nKeyLabel: m.i18nKeyLabel,
        i18nKeyHint: m.i18nKeyHint,
        status: (saved?.status as SpeechStatus | undefined) ?? "on_track",
        updatedAt: saved?.updatedAt?.toISOString() ?? null,
      };
    }),
  });
});

// ─── POST /speech/milestones/:id/status ─────────────────────────────────────

const setStatusBodySchema = z.object({
  childId: z.coerce.number().int().positive(),
  status: z.enum(STATUSES),
});

router.post(
  "/speech/milestones/:id/status",
  async (req, res): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const milestoneId = String(req.params.id ?? "");
    if (
      !milestoneId ||
      !SPEECH_MILESTONES.some((m) => m.id === milestoneId)
    ) {
      res.status(404).json({ error: "milestone_not_found" });
      return;
    }
    const parsed = setStatusBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }
    const child = await loadOwnedChild(userId, parsed.data.childId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const [row] = await db
      .insert(speechProgressTable)
      .values({
        userId,
        childId: child.id,
        milestoneId,
        status: parsed.data.status,
      })
      .onConflictDoUpdate({
        target: [speechProgressTable.childId, speechProgressTable.milestoneId],
        set: { status: parsed.data.status, updatedAt: new Date() },
      })
      .returning();

    if (!row) {
      res.status(500).json({ error: "could_not_save_status" });
      return;
    }

    req.log.info(
      {
        evt: "speech.milestones.status_set",
        userId,
        childId: child.id,
        milestoneId,
        status: parsed.data.status,
      },
      "speech milestone status set",
    );

    res.json({
      childId: row.childId,
      milestoneId: row.milestoneId,
      status: row.status as SpeechStatus,
      updatedAt: row.updatedAt.toISOString(),
    });
  },
);

// ─── GET /speech/practice/prompts ───────────────────────────────────────────

const promptsQuerySchema = z.object({
  childId: z.coerce.number().int().positive(),
  kind: z.enum(PROMPT_KINDS).optional(),
});

router.get("/speech/practice/prompts", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = promptsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query" });
    return;
  }
  const child = await loadOwnedChild(userId, parsed.data.childId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const prompts = getPromptsForAgeMonths(child.ageMonths, parsed.data.kind);
  res.json({
    childId: child.id,
    ageMonths: child.ageMonths,
    ageBand: monthsToBand(child.ageMonths),
    prompts: prompts.map((p) => ({
      id: p.id,
      kind: p.kind,
      text: p.text,
      i18nKeyHint: p.i18nKeyHint,
    })),
  });
});

// ─── POST /speech/practice/log ──────────────────────────────────────────────

const logAttemptBodySchema = z.object({
  childId: z.coerce.number().int().positive(),
  promptId: z.string().min(1).max(64),
  clarityScore: z.number().int().min(0).max(100).nullable().optional(),
  parentNote: z.string().max(2000).nullable().optional(),
});

router.post(
  "/speech/practice/log",
  featureGate("hub_speech_pronounce"),
  async (req, res): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const parsed = logAttemptBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }
    if (!PRONUNCIATION_PROMPTS.some((p) => p.id === parsed.data.promptId)) {
      res.status(404).json({ error: "prompt_not_found" });
      return;
    }
    const child = await loadOwnedChild(userId, parsed.data.childId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const [row] = await db
      .insert(speechPracticeLogTable)
      .values({
        userId,
        childId: child.id,
        promptId: parsed.data.promptId,
        clarityScore: parsed.data.clarityScore ?? null,
        parentNote: parsed.data.parentNote ?? null,
      })
      .returning();

    if (!row) {
      res.status(500).json({ error: "could_not_log_attempt" });
      return;
    }

    req.log.info(
      {
        evt: "speech.practice.logged",
        userId,
        childId: child.id,
        promptId: row.promptId,
      },
      "speech practice attempt logged",
    );

    res.json({
      id: row.id,
      childId: row.childId,
      promptId: row.promptId,
      attemptedAt: row.attemptedAt.toISOString(),
      clarityScore: row.clarityScore ?? null,
      parentNote: row.parentNote ?? null,
    });
  },
);

// ─── GET /speech/progress ───────────────────────────────────────────────────

const progressQuerySchema = z.object({
  childId: z.coerce.number().int().positive(),
  range: z.enum(["week"]).optional().default("week"),
});

const CLEAR_SCORE_THRESHOLD = 70;

router.get("/speech/progress", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = progressQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query" });
    return;
  }
  const child = await loadOwnedChild(userId, parsed.data.childId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const now = new Date();
  const rangeStart = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  rangeStart.setUTCHours(0, 0, 0, 0);

  const attempts = await db
    .select({
      promptId: speechPracticeLogTable.promptId,
      attemptedAt: speechPracticeLogTable.attemptedAt,
      clarityScore: speechPracticeLogTable.clarityScore,
    })
    .from(speechPracticeLogTable)
    .where(
      and(
        eq(speechPracticeLogTable.childId, child.id),
        gte(speechPracticeLogTable.attemptedAt, rangeStart),
      ),
    )
    .orderBy(asc(speechPracticeLogTable.attemptedAt));

  const distinctDays = new Set<string>();
  let promptsClear = 0;
  for (const a of attempts) {
    distinctDays.add(a.attemptedAt.toISOString().slice(0, 10));
    if ((a.clarityScore ?? 0) >= CLEAR_SCORE_THRESHOLD) promptsClear += 1;
  }

  const milestones = getMilestonesForAgeMonths(child.ageMonths);
  const statusRows = milestones.length
    ? await db
        .select()
        .from(speechProgressTable)
        .where(
          and(
            eq(speechProgressTable.childId, child.id),
            inArray(
              speechProgressTable.milestoneId,
              milestones.map((m) => m.id),
            ),
          ),
        )
    : [];
  const statusMap = new Map(statusRows.map((r) => [r.milestoneId, r.status]));
  // Default unrated milestones to on_track to match the milestones list endpoint.
  const milestonesOnTrack = milestones.reduce(
    (n, m) => n + ((statusMap.get(m.id) ?? "on_track") === "on_track" ? 1 : 0),
    0,
  );
  const milestonesTotal = Math.max(1, milestones.length);

  const score = computeWeeklyProgressScore({
    daysActive: distinctDays.size,
    promptsAttempted: attempts.length,
    promptsClear,
    milestonesOnTrack,
    milestonesTotal,
  });

  res.json({
    childId: child.id,
    rangeStart: rangeStart.toISOString().slice(0, 10),
    rangeEnd: now.toISOString().slice(0, 10),
    score: score.score,
    pronunciationPct: score.pronunciationPct,
    consistencyPct: score.consistencyPct,
    milestonePct: score.milestonePct,
    streakDays: score.streakDays,
    daysActive: distinctDays.size,
    promptsAttempted: attempts.length,
    promptsClear,
    milestonesOnTrack,
    milestonesTotal: milestones.length,
  });
});

// ─── POST /speech/expert-waitlist ───────────────────────────────────────────

const waitlistBodySchema = z.object({
  childId: z.coerce.number().int().positive().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

router.post("/speech/expert-waitlist", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = waitlistBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  let childId: number | null = null;
  if (parsed.data.childId != null) {
    const child = await loadOwnedChild(userId, parsed.data.childId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    childId = child.id;
  }

  // Idempotency: always SELECT first before inserting. Postgres NULL values
  // are not considered equal in a UNIQUE index, so we cannot rely on
  // ON CONFLICT DO NOTHING for null childId rows. We use a uniform
  // select-first strategy for both cases so no DB unique constraint is needed.
  const existingCheck = await db
    .select()
    .from(speechExpertWaitlistTable)
    .where(
      and(
        eq(speechExpertWaitlistTable.userId, userId),
        childId == null
          ? sql`${speechExpertWaitlistTable.childId} IS NULL`
          : eq(speechExpertWaitlistTable.childId, childId),
      ),
    )
    .orderBy(desc(speechExpertWaitlistTable.joinedAt))
    .limit(1);

  if (existingCheck[0]) {
    res.json({
      id: existingCheck[0].id,
      childId: existingCheck[0].childId,
      joinedAt: existingCheck[0].joinedAt.toISOString(),
      notes: existingCheck[0].notes ?? null,
      alreadyOnWaitlist: true,
    });
    return;
  }

  const inserted = await db
    .insert(speechExpertWaitlistTable)
    .values({
      userId,
      childId,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  const row = inserted[0];
  if (!row) {
    res.status(500).json({ error: "could_not_join_waitlist" });
    return;
  }
  const alreadyOnWaitlist = false;

  req.log.info(
    {
      evt: "speech.expert_waitlist.joined",
      userId,
      childId,
      alreadyOnWaitlist,
    },
    "speech expert waitlist join",
  );

  res.json({
    id: row.id,
    childId: row.childId,
    joinedAt: row.joinedAt.toISOString(),
    notes: row.notes ?? null,
    alreadyOnWaitlist,
  });
});

// ─── POST /speech/transcribe ─────────────────────────────────────────────────
//
// Accepts a base64-encoded audio blob from the client (web MediaRecorder
// fallback or mobile expo-audio), transcribes it with Whisper, and returns
// the plain-text transcript. The caller is responsible for comparing the
// result against the expected prompt text.
//
// Auth: required (bearer token).  Rate-limit: 20 calls per user per day via
// the usage_daily table (shared bucket "speech_transcribe").
// No additional feature-gate consume — the hub section already gated.

const transcribeBodySchema = z.object({
  audioBase64: z.string().min(1),
});

router.post("/speech/transcribe", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = transcribeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }

  const rawBuffer = Buffer.from(parsed.data.audioBase64, "base64");
  if (rawBuffer.length < 100) {
    res.status(422).json({ error: "audio_too_short" });
    return;
  }

  let compatBuffer: Buffer;
  let compatFormat: "wav" | "mp3";
  try {
    const result = await ensureCompatibleFormat(rawBuffer);
    compatBuffer = result.buffer;
    compatFormat = result.format;
  } catch (err) {
    req.log.warn({ err, userId }, "speech.transcribe format conversion failed");
    res.status(422).json({ error: "audio_format_unsupported" });
    return;
  }

  await submitRouteAiJob({
    routeName: "speech/transcribe",
    type: "speech.transcribe",
    userId,
    input: {
      audioBase64: compatBuffer.toString("base64"),
      mimeType: compatFormat === "wav" ? "audio/wav" : "audio/mpeg",
    },
    waitMs: 30_000,
    buildSyncBody: (result) => {
      const body = result as { text: string };
      req.log.info({ userId, chars: body.text.length }, "speech.transcribe ok");
      return { transcript: body.text };
    },
    res,
  });
});

export default router;
