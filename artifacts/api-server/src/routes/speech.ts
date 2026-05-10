// ─────────────────────────────────────────────────────────────────────────────
// /api/speech — Amy Speech Coach (Parent Hub Module)
//
// Endpoints (all require auth via the global requireAuth gate):
//   GET  /speech/milestones?childId=                — milestones + statuses
//   POST /speech/milestones/:id/status              — upsert milestone status
//   GET  /speech/practice/prompts?childId=&kind=    — age-appropriate prompts
//   POST /speech/practice/log                       — log attempt (gated)
//   GET  /speech/progress?childId=&range=week       — weekly summary
//   POST /speech/expert-waitlist                    — join waitlist (idempotent)
//
// Content (milestone metadata, prompts, scorer) lives in the pure
// `@workspace/speech-coach` library — this route only handles per-user
// persistence and ownership checks.
// ─────────────────────────────────────────────────────────────────────────────

import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { and, eq, gte } from "drizzle-orm";

import {
  db,
  childrenTable,
  speechProgressTable,
  speechPracticeLogTable,
  speechExpertWaitlistTable,
  type SpeechProgressRow,
} from "@workspace/db";
import {
  SPEECH_MILESTONES,
  computeWeeklyProgressScore,
  getMilestonesForAgeMonths,
  getPromptsForAgeMonths,
  monthsToBand,
} from "@workspace/speech-coach";

import { getAuth } from "../lib/auth";
import { featureGate } from "../middlewares/featureGate";

const router: IRouter = Router();

const STATUS_ENUM = ["on_track", "needs_attention", "consult_expert"] as const;
const PROMPT_KIND_ENUM = ["letter", "phonic", "word", "sentence"] as const;

type ChildOwned = {
  id: number;
  age: number | null;
  ageMonths: number | null;
};

async function loadChildOwned(
  userId: string,
  childId: number,
): Promise<ChildOwned | null> {
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
  return rows[0] ?? null;
}

function ageMonthsOf(child: ChildOwned): number {
  if (typeof child.ageMonths === "number" && child.ageMonths > 0) {
    return child.ageMonths;
  }
  if (typeof child.age === "number" && child.age > 0) return child.age * 12;
  return 0;
}

// ───────────────────────────────── /speech/milestones (GET) ─────────────────
const MilestonesQuery = z.object({
  childId: z.coerce.number().int().positive(),
});

router.get("/speech/milestones", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = MilestonesQuery.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_query", issues: parsed.error.issues });
    return;
  }
  const child = await loadChildOwned(userId, parsed.data.childId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }
  const months = ageMonthsOf(child);
  const band = monthsToBand(months);
  const items = getMilestonesForAgeMonths(months);

  const statuses: SpeechProgressRow[] = await db
    .select()
    .from(speechProgressTable)
    .where(
      and(
        eq(speechProgressTable.childId, child.id),
        eq(speechProgressTable.userId, userId),
      ),
    );
  const byId = new Map<string, SpeechProgressRow>();
  for (const row of statuses) byId.set(row.milestoneId, row);

  res.json({
    ageBand: band,
    items: items.map((m) => {
      const row = byId.get(m.id);
      return {
        milestone: {
          id: m.id,
          ageBand: m.ageBand,
          category: m.category,
          i18nKeyLabel: m.i18nKeyLabel,
          i18nKeyHint: m.i18nKeyHint,
        },
        status: row?.status ?? null,
        updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
      };
    }),
  });
});

// ───────────────────────────── /speech/milestones/:id/status (POST) ─────────
const UpdateMilestoneBody = z.object({
  childId: z.number().int().positive(),
  status: z.enum(STATUS_ENUM),
});

router.post(
  "/speech/milestones/:id/status",
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const milestoneId = String(req.params["id"] ?? "");
    if (!milestoneId || !SPEECH_MILESTONES.some((m) => m.id === milestoneId)) {
      res.status(404).json({ error: "milestone_not_found" });
      return;
    }
    const parsed = UpdateMilestoneBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "invalid_body", issues: parsed.error.issues });
      return;
    }
    const child = await loadChildOwned(userId, parsed.data.childId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const now = new Date();
    const inserted = await db
      .insert(speechProgressTable)
      .values({
        userId,
        childId: child.id,
        milestoneId,
        status: parsed.data.status,
      })
      .onConflictDoUpdate({
        target: [
          speechProgressTable.childId,
          speechProgressTable.milestoneId,
        ],
        set: { status: parsed.data.status, updatedAt: now },
      })
      .returning();
    const row = inserted[0];
    if (!row) {
      res.status(500).json({ error: "upsert_failed" });
      return;
    }
    req.log?.info(
      { userId, childId: child.id, milestoneId, status: parsed.data.status },
      "speech_milestone_status_set",
    );
    res.json({
      childId: row.childId,
      milestoneId: row.milestoneId,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    });
  },
);

// ──────────────────────── /speech/practice/prompts (GET) ────────────────────
const PromptsQuery = z.object({
  childId: z.coerce.number().int().positive(),
  kind: z.enum(PROMPT_KIND_ENUM).optional(),
});

router.get("/speech/practice/prompts", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = PromptsQuery.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_query", issues: parsed.error.issues });
    return;
  }
  const child = await loadChildOwned(userId, parsed.data.childId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }
  const months = ageMonthsOf(child);
  const prompts = getPromptsForAgeMonths(months, parsed.data.kind);
  res.json(
    prompts.map((p) => ({
      id: p.id,
      kind: p.kind,
      text: p.text,
      ageBands: [...p.ageBands],
      i18nKeyHint: p.i18nKeyHint,
    })),
  );
});

// ────────────────────────── /speech/practice/log (POST, gated) ──────────────
const LogPracticeBody = z.object({
  childId: z.number().int().positive(),
  promptId: z.string().min(1).max(120),
  clarityScore: z.number().int().min(0).max(100).nullish(),
  parentNote: z.string().max(500).nullish(),
});

router.post(
  "/speech/practice/log",
  featureGate("hub_speech_pronounce"),
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      // featureGate already returns 401 in this case, but guard for types.
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const parsed = LogPracticeBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "invalid_body", issues: parsed.error.issues });
      return;
    }
    const child = await loadChildOwned(userId, parsed.data.childId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const inserted = await db
      .insert(speechPracticeLogTable)
      .values({
        userId,
        childId: child.id,
        promptId: parsed.data.promptId,
        clarityScore: parsed.data.clarityScore ?? null,
        parentNote: parsed.data.parentNote ?? null,
      })
      .returning();
    const row = inserted[0];
    if (!row) {
      res.status(500).json({ error: "insert_failed" });
      return;
    }
    req.log?.info(
      { userId, childId: child.id, promptId: parsed.data.promptId },
      "speech_practice_logged",
    );
    res.status(201).json({
      id: row.id,
      childId: row.childId,
      promptId: row.promptId,
      attemptedAt: row.attemptedAt.toISOString(),
      clarityScore: row.clarityScore,
      parentNote: row.parentNote,
    });
  },
);

// ─────────────────────────────── /speech/progress (GET) ─────────────────────
const ProgressQuery = z.object({
  childId: z.coerce.number().int().positive(),
  range: z.enum(["week"]).optional().default("week"),
});

router.get("/speech/progress", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = ProgressQuery.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_query", issues: parsed.error.issues });
    return;
  }
  const child = await loadChildOwned(userId, parsed.data.childId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }
  const months = ageMonthsOf(child);
  const milestones = getMilestonesForAgeMonths(months);
  const milestonesTotal = Math.max(1, milestones.length);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [statuses, weekLogs] = await Promise.all([
    db
      .select()
      .from(speechProgressTable)
      .where(
        and(
          eq(speechProgressTable.childId, child.id),
          eq(speechProgressTable.userId, userId),
        ),
      ),
    db
      .select()
      .from(speechPracticeLogTable)
      .where(
        and(
          eq(speechPracticeLogTable.childId, child.id),
          eq(speechPracticeLogTable.userId, userId),
          gte(speechPracticeLogTable.attemptedAt, sevenDaysAgo),
        ),
      ),
  ]);

  const milestoneIds = new Set(milestones.map((m) => m.id));
  const milestonesOnTrack = statuses.filter(
    (s) => milestoneIds.has(s.milestoneId) && s.status === "on_track",
  ).length;

  const promptsAttempted = weekLogs.length;
  // "Clear" threshold = parent self-rated >= 70/100. When clarityScore is null
  // we conservatively count it as not-clear.
  const promptsClear = weekLogs.filter(
    (l) => (l.clarityScore ?? 0) >= 70,
  ).length;

  const days = new Set<string>();
  for (const l of weekLogs) {
    days.add(l.attemptedAt.toISOString().slice(0, 10));
  }

  const score = computeWeeklyProgressScore({
    daysActive: days.size,
    promptsAttempted,
    promptsClear,
    milestonesOnTrack,
    milestonesTotal,
  });

  res.json({
    childId: child.id,
    range: parsed.data.range,
    score: score.score,
    pronunciationPct: score.pronunciationPct,
    consistencyPct: score.consistencyPct,
    milestonePct: score.milestonePct,
    streakDays: score.streakDays,
    promptsAttempted,
    promptsClear,
    milestonesOnTrack,
    milestonesTotal,
  });
});

// ─────────────────────── /speech/expert-waitlist (POST) ─────────────────────
const WaitlistBody = z.object({
  childId: z.number().int().positive().nullish(),
  notes: z.string().max(1000).nullish(),
});

router.post("/speech/expert-waitlist", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = WaitlistBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_body", issues: parsed.error.issues });
    return;
  }

  if (parsed.data.childId != null) {
    const child = await loadChildOwned(userId, parsed.data.childId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
  }

  const existing = await db
    .select()
    .from(speechExpertWaitlistTable)
    .where(eq(speechExpertWaitlistTable.userId, userId))
    .limit(1);

  if (existing[0]) {
    req.log?.info({ userId }, "speech_expert_waitlist_already_joined");
    res.json({
      id: existing[0].id,
      childId: existing[0].childId,
      notes: existing[0].notes,
      joinedAt: existing[0].joinedAt.toISOString(),
      alreadyJoined: true,
    });
    return;
  }

  const inserted = await db
    .insert(speechExpertWaitlistTable)
    .values({
      userId,
      childId: parsed.data.childId ?? null,
      notes: parsed.data.notes ?? null,
    })
    .onConflictDoUpdate({
      target: [speechExpertWaitlistTable.userId],
      set: {
        childId: parsed.data.childId ?? null,
        notes: parsed.data.notes ?? null,
      },
    })
    .returning();
  const row = inserted[0];
  if (!row) {
    res.status(500).json({ error: "insert_failed" });
    return;
  }
  req.log?.info(
    { userId, childId: row.childId },
    "speech_expert_waitlist_joined",
  );
  res.json({
    id: row.id,
    childId: row.childId,
    notes: row.notes,
    joinedAt: row.joinedAt.toISOString(),
    alreadyJoined: false,
  });
});

export default router;
