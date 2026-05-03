import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  db,
  childrenTable,
  abacusProgressTable,
  type AbacusBestScores,
} from "@workspace/db";
import {
  buildAbacusTutorPrompt,
  highestUnlockedLevel,
  isAbacusEligible,
  LEVELS,
  type LevelId,
} from "@workspace/abacus";

const router: IRouter = Router();

/** Verify the child belongs to the authenticated user. Returns row or null.
 *  Mirrors the helper used in `phonics.ts` so auth behaviour is consistent
 *  across learning modules. */
async function loadOwnedChild(childId: number, userId: string) {
  const rows = await db
    .select({
      id: childrenTable.id,
      name: childrenTable.name,
      age: childrenTable.age,
      ageMonths: childrenTable.ageMonths,
    })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Coerce the jsonb completedLevels column into a strongly-typed list. */
function asLevelList(raw: unknown): LevelId[] {
  if (!Array.isArray(raw)) return [];
  const valid: LevelId[] = [];
  for (const v of raw) {
    if (typeof v !== "number") continue;
    if (v < 1 || v > LEVELS.length) continue;
    valid.push(v as LevelId);
  }
  return Array.from(new Set(valid)).sort((a, b) => a - b) as LevelId[];
}

/** Read a child's progress row, or fabricate a fresh-zeroed one. */
async function loadOrInitProgress(childId: number, userId: string) {
  const rows = await db
    .select()
    .from(abacusProgressTable)
    .where(eq(abacusProgressTable.childId, childId))
    .limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db
    .insert(abacusProgressTable)
    .values({
      childId,
      userId,
      currentLevel: 1,
      lastMode: "learn",
      completedLevels: [],
      bestScores: {},
      totalCorrect: 0,
      totalAttempts: 0,
      totalPoints: 0,
    })
    .returning();
  return created;
}

// ─── GET /api/abacus/progress?childId=123 ────────────────────────────────

const GetQuery = z.object({
  childId: z.coerce.number().int().positive(),
});

router.get("/abacus/progress", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = GetQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }
  const { childId } = parsed.data;

  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    if (!isAbacusEligible(child.age ?? 0)) {
      res.json({
        eligible: false,
        child: { id: child.id, name: child.name, age: child.age },
      });
      return;
    }

    const row = await loadOrInitProgress(childId, userId);
    const completed = asLevelList(row.completedLevels);
    const highest = highestUnlockedLevel(completed);

    res.json({
      eligible: true,
      child: { id: child.id, name: child.name, age: child.age },
      progress: {
        currentLevel: row.currentLevel,
        lastMode: row.lastMode,
        completedLevels: completed,
        highestUnlocked: highest,
        bestScores: (row.bestScores as AbacusBestScores) ?? {},
        totalCorrect: row.totalCorrect,
        totalAttempts: row.totalAttempts,
        totalPoints: row.totalPoints,
        updatedAt: row.updatedAt,
      },
    });
  } catch (err) {
    logger.error(
      `abacus GET failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/abacus/progress ───────────────────────────────────────────
//
// Body: { childId, action: "set_mode" | "complete_level" | "log_session" }
//
// `set_mode`        — { mode } updates `lastMode` & `currentLevel?`. Cheap.
// `complete_level`  — { level, accuracyPct, points } adds `level` to
//                     `completedLevels`, refreshes `bestScores[level]` if the
//                     new score is higher, and unlocks the next level by
//                     bumping `currentLevel` to `level + 1` when applicable.
// `log_session`     — { totalCorrect, totalAttempts, totalPoints } accumulates
//                     lifetime totals (used for badges + tile previews).

const PostBodyBase = z.object({
  childId: z.number().int().positive(),
});

const SetModeBody = PostBodyBase.extend({
  action: z.literal("set_mode"),
  mode: z.enum(["learn", "practice", "challenge", "mental", "tutor"]),
  level: z.number().int().min(1).max(LEVELS.length).optional(),
});

const CompleteLevelBody = PostBodyBase.extend({
  action: z.literal("complete_level"),
  level: z.number().int().min(1).max(LEVELS.length),
  accuracyPct: z.number().int().min(0).max(100),
  points: z.number().int().min(0).max(1000),
});

const LogSessionBody = PostBodyBase.extend({
  action: z.literal("log_session"),
  totalCorrect: z.number().int().min(0).max(1000),
  totalAttempts: z.number().int().min(0).max(1000),
  totalPoints: z.number().int().min(0).max(10000),
});

const PostBody = z.discriminatedUnion("action", [
  SetModeBody,
  CompleteLevelBody,
  LogSessionBody,
]);

router.post("/abacus/progress", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = PostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;

  try {
    const child = await loadOwnedChild(body.childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    if (!isAbacusEligible(child.age ?? 0)) {
      res.status(400).json({ error: "child_age_not_eligible" });
      return;
    }

    const row = await loadOrInitProgress(body.childId, userId);
    const now = sql`now()`;

    if (body.action === "set_mode") {
      const update: Record<string, unknown> = { lastMode: body.mode, updatedAt: now };
      if (typeof body.level === "number") update.currentLevel = body.level;
      const [updated] = await db
        .update(abacusProgressTable)
        .set(update)
        .where(eq(abacusProgressTable.childId, body.childId))
        .returning();
      res.json({ ok: true, progress: updated });
      return;
    }

    if (body.action === "complete_level") {
      const completed = asLevelList(row.completedLevels);
      const next = new Set<LevelId>(completed);
      next.add(body.level as LevelId);
      const newCompleted = Array.from(next).sort((a, b) => a - b);

      const prevBest = (row.bestScores as AbacusBestScores) ?? {};
      const key = String(body.level);
      const existing = prevBest[key];
      const isNewBest = !existing || body.points > existing.points;
      const newBestScores: AbacusBestScores = {
        ...prevBest,
        [key]: isNewBest
          ? {
              points: body.points,
              accuracyPct: body.accuracyPct,
              completedAt: new Date().toISOString(),
            }
          : existing,
      };

      // Auto-advance currentLevel to the just-unlocked next level (capped
      // at the highest defined level).
      const advancedTo = Math.min(LEVELS.length, body.level + 1);

      const [updated] = await db
        .update(abacusProgressTable)
        .set({
          completedLevels: newCompleted,
          bestScores: newBestScores,
          currentLevel: advancedTo,
          updatedAt: now,
        })
        .where(eq(abacusProgressTable.childId, body.childId))
        .returning();

      res.json({
        ok: true,
        progress: updated,
        unlocked: advancedTo > body.level ? advancedTo : null,
        newBest: isNewBest,
      });
      return;
    }

    // log_session
    const [updated] = await db
      .update(abacusProgressTable)
      .set({
        totalCorrect: sql`${abacusProgressTable.totalCorrect} + ${body.totalCorrect}`,
        totalAttempts: sql`${abacusProgressTable.totalAttempts} + ${body.totalAttempts}`,
        totalPoints: sql`${abacusProgressTable.totalPoints} + ${body.totalPoints}`,
        updatedAt: now,
      })
      .where(eq(abacusProgressTable.childId, body.childId))
      .returning();
    res.json({ ok: true, progress: updated });
  } catch (err) {
    logger.error(
      `abacus POST failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/abacus/tutor ─────────────────────────────────────────────
//
// Body: { childId, level, language, question }
//
// Returns Amy's short, kid-friendly answer for the AI Tutor sub-mode. We
// keep responses tight (≤200 tokens) so they're snappy and TTS-friendly.

const TutorBody = z.object({
  childId: z.number().int().positive(),
  level: z.number().int().min(1).max(LEVELS.length),
  language: z.enum(["en", "hi", "hinglish"]),
  question: z.string().min(1).max(500),
});

router.post("/abacus/tutor", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = TutorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const { childId, level, language, question } = parsed.data;

  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    if (!isAbacusEligible(child.age ?? 0)) {
      res.status(400).json({ error: "child_age_not_eligible" });
      return;
    }

    const { system, user } = buildAbacusTutorPrompt({
      level: level as LevelId,
      ageYears: child.age ?? 6,
      language,
      question,
    });

    const { openai } = await import("@workspace/integrations-openai-ai-server");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.6,
      max_tokens: 220,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!reply) {
      res.status(502).json({ error: "empty_ai_reply" });
      return;
    }

    res.json({ ok: true, reply });
  } catch (err) {
    logger.error(
      `abacus tutor failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
