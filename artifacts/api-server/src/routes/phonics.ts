import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, asc, eq, sql } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  db,
  childrenTable,
  phonicsContentTable,
  phonicsDownloadsTable,
  phonicsProgressTable,
  type PhonicsContentRow,
  type PhonicsProgressRow,
} from "@workspace/db";

const router: IRouter = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AGE_GROUPS = ["12_24m", "2_3y", "3_4y", "4_5y", "5_6y"] as const;
type AgeGroup = (typeof AGE_GROUPS)[number];

/** Mirror of the frontend `getPhonicsAgeGroup` so server + client agree. */
function ageGroupForMonths(totalMonths: number): AgeGroup | null {
  if (totalMonths < 12) return null;
  if (totalMonths < 24) return "12_24m";
  if (totalMonths < 36) return "2_3y";
  if (totalMonths < 48) return "3_4y";
  if (totalMonths < 60) return "4_5y";
  if (totalMonths < 72) return "5_6y";
  return null;
}

/** Cap each daily session at 10 items (request: "5–10 max"). */
const DAILY_LIMIT = 10;

/** Verify the child belongs to the authenticated user. Returns row or null. */
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

/** Insight = same shape as the rule-based one the frontend already renders. */
type Insight = { tone: "good" | "warn" | "info"; emoji: string; text: string };

function buildInsights(
  ageGroup: AgeGroup,
  items: PhonicsContentRow[],
  progress: PhonicsProgressRow[],
): Insight[] {
  const ins: Insight[] = [];
  const byContent = new Map(progress.map((p) => [p.contentId, p]));
  const playedIds = progress.filter((p) => p.playCount > 0).map((p) => p.contentId);
  const masteredIds = progress.filter((p) => p.mastered).map((p) => p.contentId);
  const totalPlays = progress.reduce((sum, p) => sum + (p.playCount || 0), 0);

  if (playedIds.length === 0) {
    ins.push({
      tone: "info",
      emoji: "✨",
      text: `Tap any sound below to begin — this level is the perfect fit right now.`,
    });
    return ins;
  }

  // Coverage
  const coveragePct =
    items.length > 0 ? Math.round((playedIds.length / items.length) * 100) : 0;
  if (coveragePct >= 80) {
    ins.push({
      tone: "good",
      emoji: "🎉",
      text: `Strong coverage! Practised ${playedIds.length}/${items.length} sounds (${coveragePct}%). Time to introduce the next level soon.`,
    });
  } else if (coveragePct >= 40) {
    const unseen = items.filter((i) => {
      const p = byContent.get(i.id);
      return !p || p.playCount === 0;
    });
    const next = unseen.slice(0, 3).map((i) => i.symbol).join(", ");
    if (next) {
      ins.push({
        tone: "info",
        emoji: "🎯",
        text: `Halfway there! Try these next: ${next}.`,
      });
    }
  } else {
    ins.push({
      tone: "info",
      emoji: "🌱",
      text: `Just getting started — practise the same 2–3 sounds for a week before adding new ones.`,
    });
  }

  // Mastery
  if (masteredIds.length >= 3) {
    ins.push({
      tone: "good",
      emoji: "🌟",
      text: `${masteredIds.length} sound${masteredIds.length !== 1 ? "s" : ""} marked mastered — celebrate the win with your child!`,
    });
  }

  // Weak phonemes — items played 3+ times but not mastered
  const weak = progress
    .filter((p) => p.playCount >= 3 && !p.mastered)
    .map((p) => items.find((i) => i.id === p.contentId)?.symbol)
    .filter((s): s is string => Boolean(s))
    .slice(0, 3);
  if (weak.length > 0) {
    ins.push({
      tone: "warn",
      emoji: "🔁",
      text: `Needs more reps: ${weak.join(", ")}. Slow down and exaggerate the sound.`,
    });
  }

  // Engagement
  if (totalPlays >= 20 && masteredIds.length === 0) {
    ins.push({
      tone: "info",
      emoji: "💡",
      text: `Lots of practice (${totalPlays} plays) — when your child can say a sound back, tap "Mark mastered" to track progress.`,
    });
  }

  return ins;
}

// ─── GET /api/phonics?childId=123 ────────────────────────────────────────────
//
// Returns the daily phonics session for a child:
//   { ageGroup, items: [...], progress: [...], insights: [...] }
//
// `items` is capped to DAILY_LIMIT, picked deterministically by date so the
// child sees a stable rotation (matches the frontend's "today's pick" UX).

const GetQuery = z.object({
  childId: z.coerce.number().int().positive(),
});

router.get("/phonics", async (req, res): Promise<void> => {
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

    const totalMonths = (child.age ?? 0) * 12 + (child.ageMonths ?? 0);
    const ageGroup = ageGroupForMonths(totalMonths);
    if (!ageGroup) {
      // Out of range (under 12m or 6+) — return empty session so client can
      // gracefully gate the UI without an error toast.
      res.json({ ageGroup: null, items: [], progress: [], insights: [] });
      return;
    }

    const allItems = await db
      .select()
      .from(phonicsContentTable)
      .where(
        and(
          eq(phonicsContentTable.ageGroup, ageGroup),
          eq(phonicsContentTable.active, true),
        ),
      )
      .orderBy(asc(phonicsContentTable.level));

    // Deterministic daily window: rotate the start index by date so the same
    // child sees the same DAILY_LIMIT items all day, then a new slice tomorrow.
    const today = new Date();
    const todaySeed =
      today.getUTCFullYear() * 10000 +
      (today.getUTCMonth() + 1) * 100 +
      today.getUTCDate();
    const dailyItems =
      allItems.length <= DAILY_LIMIT
        ? allItems
        : Array.from(
            { length: DAILY_LIMIT },
            (_, i) => allItems[(todaySeed + i) % allItems.length]!,
          );

    const progress = await db
      .select()
      .from(phonicsProgressTable)
      .where(
        and(
          eq(phonicsProgressTable.childId, childId),
          eq(phonicsProgressTable.userId, userId),
        ),
      );

    const insights = buildInsights(ageGroup, allItems, progress);

    res.json({
      ageGroup,
      child: { id: child.id, name: child.name },
      // All items in the age group (frontend uses this for the grid + tracker).
      items: allItems,
      // Today's deterministic 10-item slice for short, focused sessions.
      dailyItems,
      progress,
      insights,
      dailyLimit: DAILY_LIMIT,
    });
  } catch (err) {
    logger.error(
      `phonics GET failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/phonics/downloads ─────────────────────────────────────────────
//
// Body: { fileKey, fileName, childId? }
//
// Records every download of a phonics resource (e.g. the Phonics Mastery PDF).
// One row per download — users can download as many times as they like and we
// keep the full history.

// Allowlist of downloadable phonics resources. Adding a new file means
// adding a row here so users can't pollute analytics with arbitrary keys.
const PHONICS_DOWNLOADABLE_FILES = {
  "phonics-mastery-15-sets": "Phonics-Mastery-15-Sets.pdf",
} as const;
type PhonicsDownloadableKey = keyof typeof PHONICS_DOWNLOADABLE_FILES;

const DownloadBody = z.object({
  fileKey: z.enum(
    Object.keys(PHONICS_DOWNLOADABLE_FILES) as [PhonicsDownloadableKey, ...PhonicsDownloadableKey[]],
  ),
  childId: z.number().int().positive().optional(),
});

router.post("/phonics/downloads", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = DownloadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const { fileKey, childId } = parsed.data;
  // Server is the source of truth for the file name — never trust the client.
  const fileName = PHONICS_DOWNLOADABLE_FILES[fileKey];

  try {
    // If a child is specified, ensure it belongs to this user — otherwise
    // refuse the write so we don't attribute downloads to children the
    // caller doesn't own.
    if (typeof childId === "number") {
      const child = await loadOwnedChild(childId, userId);
      if (!child) {
        res.status(404).json({ error: "child_not_found" });
        return;
      }
    }

    const userAgent =
      typeof req.headers["user-agent"] === "string"
        ? req.headers["user-agent"].slice(0, 500)
        : null;

    const [row] = await db
      .insert(phonicsDownloadsTable)
      .values({
        userId,
        childId: childId ?? null,
        fileKey,
        fileName,
        userAgent,
      })
      .returning();

    // Return the full row plus a cumulative count for this user+file so the
    // UI can show "downloaded N times" without a second round-trip.
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(phonicsDownloadsTable)
      .where(
        and(
          eq(phonicsDownloadsTable.userId, userId),
          eq(phonicsDownloadsTable.fileKey, fileKey),
        ),
      );

    res.json({ ok: true, download: row, totalDownloads: count });
  } catch (err) {
    logger.error(
      `phonics download log failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── GET /api/phonics/downloads ──────────────────────────────────────────────
//
// Returns the cumulative download count for the caller per file key. Used
// by the UI to show "Downloaded N times" alongside the button.

router.get("/phonics/downloads", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const rows = await db
      .select({
        fileKey: phonicsDownloadsTable.fileKey,
        count: sql<number>`count(*)::int`,
        lastDownloadedAt: sql<string>`max(${phonicsDownloadsTable.downloadedAt})`,
      })
      .from(phonicsDownloadsTable)
      .where(eq(phonicsDownloadsTable.userId, userId))
      .groupBy(phonicsDownloadsTable.fileKey);

    res.json({ ok: true, downloads: rows });
  } catch (err) {
    logger.error(
      `phonics downloads list failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/phonics/progress ──────────────────────────────────────────────
//
// Body: { childId, contentId, action: "play" | "mastered" | "unmastered" }
//
// Upserts the progress row. "play" bumps playCount and lastPlayedAt; "mastered"
// flips the flag and stamps masteredAt; "unmastered" clears it.

const PostBody = z.object({
  childId: z.number().int().positive(),
  contentId: z.number().int().positive(),
  action: z.enum(["play", "mastered", "unmastered"]),
});

router.post("/phonics/progress", async (req, res): Promise<void> => {
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
  const { childId, contentId, action } = parsed.data;

  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    // Make sure the contentId actually exists (and is active) before we write.
    const content = await db
      .select({
        id: phonicsContentTable.id,
        ageGroup: phonicsContentTable.ageGroup,
      })
      .from(phonicsContentTable)
      .where(
        and(
          eq(phonicsContentTable.id, contentId),
          eq(phonicsContentTable.active, true),
        ),
      )
      .limit(1);
    if (!content[0]) {
      res.status(404).json({ error: "content_not_found" });
      return;
    }

    // FIX (architect #4): refuse to write progress for content from a
    // different age tier — otherwise an off-tier item could pollute the
    // child's coverage % and skew insights.
    const childTotalMonths = (child.age ?? 0) * 12 + (child.ageMonths ?? 0);
    const childAgeGroup = ageGroupForMonths(childTotalMonths);
    if (childAgeGroup && content[0].ageGroup !== childAgeGroup) {
      res.status(400).json({
        error: "content_age_group_mismatch",
        childAgeGroup,
        contentAgeGroup: content[0].ageGroup,
      });
      return;
    }

    const now = sql`now()`;

    if (action === "play") {
      const [row] = await db
        .insert(phonicsProgressTable)
        .values({
          childId,
          userId,
          contentId,
          playCount: 1,
          firstPlayedAt: new Date(),
          lastPlayedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [phonicsProgressTable.childId, phonicsProgressTable.contentId],
          set: {
            playCount: sql`${phonicsProgressTable.playCount} + 1`,
            lastPlayedAt: now,
            updatedAt: now,
          },
        })
        .returning();
      res.json({ ok: true, progress: row });
      return;
    }

    if (action === "mastered") {
      const [row] = await db
        .insert(phonicsProgressTable)
        .values({
          childId,
          userId,
          contentId,
          mastered: true,
          masteredAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [phonicsProgressTable.childId, phonicsProgressTable.contentId],
          set: {
            mastered: true,
            masteredAt: now,
            updatedAt: now,
          },
        })
        .returning();
      res.json({ ok: true, progress: row });
      return;
    }

    // unmastered
    const [row] = await db
      .insert(phonicsProgressTable)
      .values({
        childId,
        userId,
        contentId,
        mastered: false,
      })
      .onConflictDoUpdate({
        target: [phonicsProgressTable.childId, phonicsProgressTable.contentId],
        set: {
          mastered: false,
          masteredAt: null,
          updatedAt: now,
        },
      })
      .returning();
    res.json({ ok: true, progress: row });
  } catch (err) {
    logger.error(
      `phonics POST failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
