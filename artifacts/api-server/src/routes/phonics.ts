import { existsSync } from "node:fs";
import path from "node:path";
import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getStaticAudioObjectKey } from "@workspace/static-audio";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  db,
  childrenTable,
  phonicsContentTable,
  phonicsDownloadsTable,
  phonicsProgressTable,
  phonicsTestResultsTable,
  type PhonicsContentRow,
  type PhonicsProgressRow,
} from "@workspace/db";
import { readCachedAudio } from "../services/ttsCacheService.js";
import { enqueueAiJob } from "../queue/ai-job-queue.js";
import {
  AGE_GROUP_LABEL,
  buildAiInsight,
  buildRuleBasedInsight,
  generateQuestions,
  isAvailable,
  scoreAnswers,
  signSession,
  toClientQuestions,
  verifySession,
  type TestType,
} from "../lib/phonicsTests";
import { getPhonicsSessionSecret } from "../lib/phonicsSessionSecret.js";
import {
  getPhonicsAudioText,
  getPhonicsAudioTextByLetter,
} from "@workspace/phonics-sounds";
import {
  getDailyPlanForChild,
  getOrCreateCurriculumProgress,
  markPlanActivityComplete,
  applyCurriculumTestResult,
  todayIsoUtc,
} from "../lib/phonicsCurriculumService.js";
import { generatePhonicsWordsCached } from "../lib/phonicsContentAi.js";
import { PHONICS_CURRICULUM_LEVELS } from "@workspace/phonics-curriculum";
import {
  getOrCreateSubscription,
  isPremiumNow,
} from "../services/subscriptionService.js";
import { getHubJourneyStatus } from "../services/parentHubJourneyService.js";
import {
  buildPhonicsJourneyMeta,
  buildPhonicsPremiumMeta,
  capPhonicsCatalog,
  capPhonicsPremiumCatalog,
  computePhonicsDripDay,
  pickPhonicsDailyItems,
} from "@workspace/parent-hub-journey";
import { infantExploreMutationGate } from "../middlewares/infantExploreMutationGate.js";

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
  /**
   * Optional override — if present, returns content for this stage instead
   * of the child's age-based default. Used by the parent-facing stage
   * selector ("show me Blending even though my kid is 2"). Progress and
   * insights are still scoped per child, so switching stages never
   * pollutes the child's mastery record (the POST /progress route still
   * enforces age-tier match — see architect fix #4).
   */
  ageGroup: z.enum(AGE_GROUPS).optional(),
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
  const { childId, ageGroup: ageGroupOverride } = parsed.data;

  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const totalMonths = (child.age ?? 0) * 12 + (child.ageMonths ?? 0);
    const childAgeGroup = ageGroupForMonths(totalMonths);

    const sub = await getOrCreateSubscription(userId);
    const premium = isPremiumNow(sub);
    const hubStatus = await getHubJourneyStatus(userId, childId);
    const journeyDay = hubStatus?.journeyDay ?? 1;
    const access = hubStatus?.access ?? {
      isPremium: premium,
      isFreePeriod: !premium,
      isLocked: false,
      lockReason: "none" as const,
      daysCompleted: 0,
      daysTotal: 3,
      currentDay: 1,
      calendarDaysLeft: 7,
      calendarDeadline: new Date().toISOString(),
    };

    // Free users stay on their child's natural stage during the 3-day journey.
    const ageGroup =
      !premium && ageGroupOverride && ageGroupOverride !== childAgeGroup
        ? childAgeGroup
        : ageGroupOverride ?? childAgeGroup;
    if (!ageGroup) {
      // Out of range (under 12m or 6+) — return empty session so client can
      // gracefully gate the UI without an error toast.
      res.json({ ageGroup: null, items: [], progress: [], insights: [] });
      return;
    }

    const allItems = (
      await db
        .select()
        .from(phonicsContentTable)
        .where(
          and(
            eq(phonicsContentTable.ageGroup, ageGroup),
            eq(phonicsContentTable.active, true),
          ),
        )
        .orderBy(asc(phonicsContentTable.level))
    ).filter((row) => row.symbol?.trim() && row.sound?.trim());

    const today = new Date();
    const todaySeed =
      today.getUTCFullYear() * 10000 +
      (today.getUTCMonth() + 1) * 100 +
      today.getUTCDate();

    const totalCatalog = allItems.length;

    const progress = await db
      .select()
      .from(phonicsProgressTable)
      .where(
        and(
          eq(phonicsProgressTable.childId, childId),
          eq(phonicsProgressTable.userId, userId),
        ),
      );

    const journeyMeta = buildPhonicsJourneyMeta({
      isPremium: premium,
      access,
      journeyDay,
      totalCatalog,
    });

    let visibleItems = allItems;
    let premiumMeta = null;

    if (premium) {
      const { dripDay, activePracticeDays } = computePhonicsDripDay(progress);
      premiumMeta = buildPhonicsPremiumMeta({
        dripDay,
        activePracticeDays,
        totalCatalog,
      });
      visibleItems = capPhonicsPremiumCatalog(allItems, dripDay);
      journeyMeta.itemLimit = premiumMeta.itemLimit;
      journeyMeta.lockedCount = premiumMeta.lockedCount;
      journeyMeta.unlocksTomorrow = premiumMeta.unlocksTomorrow;
    } else if (access.isLocked) {
      visibleItems = [];
    } else if (access.isFreePeriod) {
      visibleItems = capPhonicsCatalog(allItems, journeyDay);
    }

    const dailyItems = pickPhonicsDailyItems(visibleItems, todaySeed, DAILY_LIMIT);

    const insights = buildInsights(ageGroup, visibleItems, progress);

    res.json({
      ageGroup,
      defaultAgeGroup: childAgeGroup,
      stageOverrideIgnored:
        !premium &&
        !!ageGroupOverride &&
        ageGroupOverride !== childAgeGroup,
      child: { id: child.id, name: child.name },
      items: visibleItems,
      dailyItems,
      totalCatalog,
      progress,
      insights,
      dailyLimit: DAILY_LIMIT,
      journeyMeta,
      premiumMeta,
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
  "phonics-mastery-15-sets": {
    fileName: "Phonics-Mastery-15-Sets.pdf",
    publicBasename: "phonics-mastery-15-sets.pdf",
  },
} as const;
type PhonicsDownloadableKey = keyof typeof PHONICS_DOWNLOADABLE_FILES;

function resolvePhonicsWorkbookPath(meta: (typeof PHONICS_DOWNLOADABLE_FILES)[PhonicsDownloadableKey]): string | null {
  const envPath = process.env.PHONICS_WORKBOOK_PDF_PATH?.trim();
  if (envPath && existsSync(envPath)) return envPath;

  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "artifacts", "kidschedule", "public", meta.publicBasename),
    path.join(cwd, "public", meta.publicBasename),
    path.join(cwd, meta.publicBasename),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

const DownloadBody = z.object({
  fileKey: z.enum(
    Object.keys(PHONICS_DOWNLOADABLE_FILES) as [PhonicsDownloadableKey, ...PhonicsDownloadableKey[]],
  ),
  childId: z.number().int().positive().optional(),
});

const WorkbookDownloadQuery = z.object({
  fileKey: z
    .enum(
      Object.keys(PHONICS_DOWNLOADABLE_FILES) as [
        PhonicsDownloadableKey,
        ...PhonicsDownloadableKey[],
      ],
    )
    .default("phonics-mastery-15-sets"),
});

// ─── GET /api/phonics/workbook/download ──────────────────────────────────────
//
// Premium-only PDF download. Frontend must use this route — public static
// URLs are not a security boundary.

router.get("/phonics/workbook/download", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const sub = await getOrCreateSubscription(userId);
  if (!isPremiumNow(sub)) {
    res.status(403).json({ message: "Premium required" });
    return;
  }

  const parsed = WorkbookDownloadQuery.safeParse({
    fileKey:
      typeof req.query.fileKey === "string" ? req.query.fileKey : "phonics-mastery-15-sets",
  });
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  const meta = PHONICS_DOWNLOADABLE_FILES[parsed.data.fileKey];
  const filePath = resolvePhonicsWorkbookPath(meta);
  if (!filePath) {
    res.status(404).json({ error: "file_not_found" });
    return;
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${meta.fileName}"; filename*=UTF-8''${encodeURIComponent(meta.fileName)}`,
  );
  res.setHeader("Cache-Control", "private, no-store");
  res.sendFile(path.resolve(filePath));
});

router.post("/phonics/downloads", infantExploreMutationGate(), async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const sub = await getOrCreateSubscription(userId);
  if (!isPremiumNow(sub)) {
    res.status(403).json({ message: "Premium required" });
    return;
  }

  const parsed = DownloadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const { fileKey, childId } = parsed.data;
  // Server is the source of truth for the file name — never trust the client.
  const fileName = PHONICS_DOWNLOADABLE_FILES[fileKey].fileName;

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

router.post("/phonics/progress", infantExploreMutationGate(), async (req, res): Promise<void> => {
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

// ─── Phonics Tests (Daily 5Q + Weekly 20Q) ───────────────────────────────────
//
// `GET    /api/phonics/tests/availability/:childId` — what's takeable now
// `POST   /api/phonics/tests/start`                 — issues a signed session
// `POST   /api/phonics/tests/submit`                — scores answers + insight
// `GET    /api/phonics/tests/history/:childId`      — recent results
//
// The test engine itself lives in `lib/phonicsTests.ts` (pure functions,
// covered by unit tests). DB access stays here.

const DAILY_COUNT = 5;
const WEEKLY_COUNT = 20;
/**
 * Phonics test session tokens are AES-256-GCM encrypted (see
 * `lib/phonicsTests.ts > signSession`). The secret MUST be at least 32
 * characters in every environment — there is no insecure fallback. The
 * actual length check happens inside `assertSessionSecret` at call time, so
 * a missing/short secret causes /tests/start to fail loudly rather than
 * silently producing forgeable tokens.
 */
const TestTypeSchema = z.enum(["daily", "weekly", "practice"]);
const GameModeSchema = z.enum([
  "hear_tap",
  "missing_letter",
  "build_word",
  "speed_challenge",
  "mixed",
]);

async function loadLastResult(
  childId: number,
  userId: string,
  testType: TestType,
) {
  const rows = await db
    .select()
    .from(phonicsTestResultsTable)
    .where(
      and(
        eq(phonicsTestResultsTable.childId, childId),
        eq(phonicsTestResultsTable.userId, userId),
        eq(phonicsTestResultsTable.testType, testType),
      ),
    )
    .orderBy(desc(phonicsTestResultsTable.completedAt))
    .limit(1);
  return rows[0] ?? null;
}

async function loadActiveContent(ageGroup: string): Promise<PhonicsContentRow[]> {
  return db
    .select()
    .from(phonicsContentTable)
    .where(
      and(
        eq(phonicsContentTable.ageGroup, ageGroup),
        eq(phonicsContentTable.active, true),
      ),
    )
    .orderBy(asc(phonicsContentTable.level));
}

// ─── GET /api/phonics/test-config/:childId ─────────────────────────────────────
//
// Lightweight config for the test UI — availability + counts. Only surfaces
// errors when the child lookup actually fails (no fake misconfiguration).

router.get("/phonics/test-config/:childId", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const childId = Number(req.params.childId);
  if (!Number.isFinite(childId) || childId <= 0) {
    res.status(400).json({ error: "invalid_child_id" });
    return;
  }
  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const totalMonths = (child.age ?? 0) * 12 + (child.ageMonths ?? 0);
    const ageGroup = ageGroupForMonths(totalMonths);
    if (!ageGroup) {
      res.json({
        ok: true,
        eligible: false,
        ageGroup: null,
        daily: { questionCount: DAILY_COUNT, available: false },
        weekly: { questionCount: WEEKLY_COUNT, available: false },
        gameModes: ["hear_tap", "missing_letter", "build_word", "speed_challenge", "mixed"],
      });
      return;
    }
    const [dailyLast, weeklyLast] = await Promise.all([
      loadLastResult(childId, userId, "daily"),
      loadLastResult(childId, userId, "weekly"),
    ]);
    const dailyState = isAvailable("daily", dailyLast?.completedAt ?? null);
    const weeklyState = isAvailable("weekly", weeklyLast?.completedAt ?? null);
    const contentRows = await loadActiveContent(ageGroup);
    res.json({
      ok: true,
      eligible: true,
      ageGroup,
      ageGroupLabel: AGE_GROUP_LABEL[ageGroup],
      hasContent: contentRows.length > 0,
      daily: {
        questionCount: DAILY_COUNT,
        available: dailyState.available,
        nextAvailableAt: dailyState.nextAvailableAt,
      },
      weekly: {
        questionCount: WEEKLY_COUNT,
        available: weeklyState.available,
        nextAvailableAt: weeklyState.nextAvailableAt,
      },
      gameModes: ["hear_tap", "missing_letter", "build_word", "speed_challenge", "mixed"],
    });
  } catch (err) {
    logger.error(
      `phonics test-config failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── GET /api/phonics/tests/availability/:childId ────────────────────────────

router.get("/phonics/tests/availability/:childId", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const childId = Number(req.params.childId);
  if (!Number.isFinite(childId) || childId <= 0) {
    res.status(400).json({ error: "invalid_child_id" });
    return;
  }
  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const totalMonths = (child.age ?? 0) * 12 + (child.ageMonths ?? 0);
    const ageGroup = ageGroupForMonths(totalMonths);
    if (!ageGroup) {
      res.json({
        ageGroup: null,
        eligible: false,
        daily: { available: false, lastCompletedAt: null, nextAvailableAt: null },
        weekly: { available: false, lastCompletedAt: null, nextAvailableAt: null },
      });
      return;
    }
    const [daily, weekly] = await Promise.all([
      loadLastResult(childId, userId, "daily"),
      loadLastResult(childId, userId, "weekly"),
    ]);
    const dailyState = isAvailable("daily", daily?.completedAt ?? null);
    const weeklyState = isAvailable("weekly", weekly?.completedAt ?? null);
    res.json({
      ageGroup,
      eligible: true,
      child: { id: child.id, name: child.name },
      daily: {
        available: dailyState.available,
        lastCompletedAt: daily?.completedAt ?? null,
        nextAvailableAt: dailyState.nextAvailableAt,
        lastScore: daily ? { accuracyPct: daily.accuracyPct, label: daily.performanceLabel } : null,
      },
      weekly: {
        available: weeklyState.available,
        lastCompletedAt: weekly?.completedAt ?? null,
        nextAvailableAt: weeklyState.nextAvailableAt,
        lastScore: weekly ? { accuracyPct: weekly.accuracyPct, label: weekly.performanceLabel } : null,
      },
    });
  } catch (err) {
    logger.error(
      `phonics tests availability failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/phonics/tests/start ───────────────────────────────────────────

const StartBody = z.object({
  childId: z.number().int().positive(),
  testType: TestTypeSchema,
  /** Optional flavor — defaults to `hear_tap` for backwards compat. */
  gameMode: GameModeSchema.optional(),
});

router.post("/phonics/tests/start", infantExploreMutationGate(), async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = StartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const { childId, testType, gameMode = "hear_tap" } = parsed.data;
  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const totalMonths = (child.age ?? 0) * 12 + (child.ageMonths ?? 0);
    const ageGroup = ageGroupForMonths(totalMonths);
    if (!ageGroup) {
      res.status(400).json({ error: "age_not_supported" });
      return;
    }
    if (testType !== "practice") {
      const last = await loadLastResult(childId, userId, testType);
      const state = isAvailable(testType, last?.completedAt ?? null);
      if (!state.available) {
        res.status(429).json({
          error: "cooldown_active",
          nextAvailableAt: state.nextAvailableAt,
        });
        return;
      }
    }
    const contentRows = await loadActiveContent(ageGroup);
    if (contentRows.length === 0) {
      res.status(409).json({ error: "no_content_for_age_group" });
      return;
    }
    // De-duplication across back-to-back tests is handled inside the
    // generator (it falls back when the recency filter would starve the pool).
    // Do not pass weakConcepts here — those are wrong answers, not recently
    // asked items, and excluding them can block question generation.
    const recentItemIds: number[] = [];
    const count = testType === "daily" ? DAILY_COUNT : WEEKLY_COUNT;
    const seed = Date.now() ^ (childId * 2654435761);
    const curriculum = await getOrCreateCurriculumProgress(
      childId,
      userId,
      totalMonths,
    );
    const questions = generateQuestions({
      ageGroup,
      contentRows,
      count,
      recentItemIds,
      seed,
      gameMode,
      testType,
      curriculumLevel: curriculum?.currentLevel,
      weakPhonemes: curriculum?.weakPhonemes,
    });
    if (questions.length < count) {
      // Not enough variety to form a full test — degrade gracefully by
      // returning whatever we managed to build (or 409 if nothing).
      if (questions.length === 0) {
        req.log.warn(
          { childId, ageGroup, gameMode, testType, contentRows: contentRows.length },
          "phonics tests start: not_enough_content — generator returned 0 questions",
        );
        res.status(409).json({ error: "not_enough_content" });
        return;
      }
      req.log.warn(
        {
          childId,
          ageGroup,
          gameMode,
          testType,
          requested: count,
          got: questions.length,
        },
        "phonics tests start: partial fill — fewer questions than requested",
      );
    }
    const issuedAt = Date.now();
    let sessionToken: string;
    try {
      sessionToken = signSession(
        { userId, childId, testType, ageGroup, questions, issuedAt, gameMode },
        getPhonicsSessionSecret(),
      );
    } catch (err) {
      // Misconfiguration (missing/short SESSION_SECRET) — never silently
      // issue insecure tokens. Log loudly so ops can fix the deploy.
      logger.error(
        `phonics tests start: refusing to issue session — ${err instanceof Error ? err.message : String(err)}`,
      );
      res.status(500).json({ error: "session_misconfigured" });
      return;
    }
    res.json({
      sessionToken,
      testType,
      gameMode,
      ageGroup,
      ageGroupLabel: AGE_GROUP_LABEL[ageGroup],
      questions: toClientQuestions(questions),
      expiresAt: new Date(issuedAt + 30 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    logger.error(
      `phonics tests start failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/phonics/tests/submit ──────────────────────────────────────────

const SubmitBody = z.object({
  sessionToken: z.string().min(10),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedIndex: z.number().int().min(0).max(10),
      }),
    )
    .min(0)
    .max(50),
});

router.post("/phonics/tests/submit", infantExploreMutationGate(), async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = SubmitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const { sessionToken, answers } = parsed.data;
  const session = verifySession(sessionToken, getPhonicsSessionSecret());
  if (!session) {
    res.status(400).json({ error: "invalid_or_expired_session" });
    return;
  }
  // Bind the token to the user it was issued to. Without this check, a token
  // issued for user A could be exfiltrated and submitted by user B.
  if (session.userId !== userId) {
    res.status(403).json({ error: "session_user_mismatch" });
    return;
  }
  try {
    const child = await loadOwnedChild(session.childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    // Replay protection: refuse to score the same session token twice. The
    // unique index `phonics_test_results_user_jti_uniq_idx` is the
    // authoritative guard at INSERT time; this lookup just produces a clean
    // 409 instead of a 500 on the duplicate-key path.
    const replay = await db
      .select({ id: phonicsTestResultsTable.id })
      .from(phonicsTestResultsTable)
      .where(
        and(
          eq(phonicsTestResultsTable.userId, userId),
          eq(phonicsTestResultsTable.sessionJti, session.jti),
        ),
      )
      .limit(1);
    if (replay[0]) {
      res.status(409).json({ error: "session_already_submitted" });
      return;
    }
    // Re-hydrate the questions to score against. The session token already
    // carries the correct indices and concept ids — that's enough.
    const fakeQuestions = session.questions.map((q) => ({
      id: q.id,
      conceptId: q.conceptId,
      type: q.type,
      // `options`/`prompt` are unused by scoreAnswers — only correctIndex/id matter.
      prompt: { instruction: "" },
      options: [],
      correctIndex: q.correctIndex,
    }));
    const breakdown = scoreAnswers(fakeQuestions as any, answers);

    // Look up symbols for the weak concept ids so the insight can name them.
    let weakRows: PhonicsContentRow[] = [];
    if (breakdown.weakConceptIds.length > 0) {
      weakRows = await db
        .select()
        .from(phonicsContentTable)
        .where(inArray(phonicsContentTable.id, breakdown.weakConceptIds));
    }

    let insight = buildRuleBasedInsight(breakdown, weakRows, child.name);
    let aiMessage = "";
    let aiSuggestion = "";
    if (session.testType === "weekly" && process.env.OPENAI_API_KEY) {
      try {
        const { wrapJobInput } = await import("../queue/ai-job-payload.js");
        const prompt = `Weekly phonics insight for ${child.name}, age ${AGE_GROUP_LABEL[session.ageGroup]}, accuracy ${breakdown.accuracyPct}%, weak: ${weakRows.map((r) => r.symbol).join(", ")}. JSON: { "message": "...", "suggestion": "..." }`;
        const enqueued = await enqueueAiJob(
          "phonics.weekly_insight",
          userId,
          wrapJobInput("phonics/weekly-insight", { prompt }),
        );
        if (enqueued.jobId) {
          const { waitForJobResult } = await import("../queue/index.js");
          const { waitForJob } = await import("../queue/ai-job-store.js");
          const { isBullMqActive } = await import("../queue/ai-job-queue.js");
          const finished = isBullMqActive()
            ? await waitForJobResult(enqueued.jobId, 12_000)
            : await waitForJob(enqueued.jobId, 12_000);
          if (finished?.status === "completed" && finished.result) {
            const ai = finished.result as { message: string; suggestion: string };
            aiMessage = ai.message;
            aiSuggestion = ai.suggestion;
          }
        }
      } catch (err) {
        logger.warn(
          `phonics weekly AI insight failed, falling back: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    const finalInsightText = aiMessage || insight.insightText;
    const finalSuggestion = aiSuggestion || insight.insightSuggestion;

    let resultRow;
    try {
      [resultRow] = await db
        .insert(phonicsTestResultsTable)
        .values({
          childId: session.childId,
          userId,
          testType: session.testType,
          ageGroup: session.ageGroup,
          score: breakdown.correct,
          total: breakdown.total,
          accuracyPct: breakdown.accuracyPct,
          performanceLabel: insight.performanceLabel,
          weakConcepts: breakdown.weakConceptIds,
          typeBreakdown: breakdown.perType,
          insightText: finalInsightText,
          insightSuggestion: finalSuggestion,
          // CRITICAL: persist the session's jti so the unique
          // (user_id, session_jti) index actually fires on replay.
          // Without this, sessionJti would stay NULL and Postgres treats
          // multiple NULLs as distinct, defeating replay protection.
          sessionJti: session.jti,
          completedAt: new Date(),
        })
        .returning();
    } catch (err) {
      // Race-safety net: if two parallel submits raced past the SELECT
      // replay-check, the unique (user_id, session_jti) index will reject
      // the second INSERT with Postgres SQLSTATE 23505 (unique_violation).
      // Different drivers expose this in different places, so we check
      // err.code, err.cause.code, and the message text.
      const e = err as Record<string, unknown> | null;
      const code =
        (e?.code as string | undefined) ??
        ((e?.cause as Record<string, unknown> | undefined)?.code as
          | string
          | undefined);
      const message = String((e as { message?: unknown } | null)?.message ?? "");
      if (
        code === "23505" ||
        /duplicate key|unique constraint|phonics_test_results_user_jti_uniq_idx/i.test(
          message,
        )
      ) {
        res.status(409).json({ error: "session_already_submitted" });
        return;
      }
      throw err;
    }

    const childTotalMonths =
      (child.age ?? 0) * 12 + (child.ageMonths ?? 0);
    const curriculumUpdate = await applyCurriculumTestResult(
      session.childId,
      userId,
      {
        scorePct: breakdown.accuracyPct,
        weakConceptIds: breakdown.weakConceptIds,
        weakSymbols: weakRows.map((r) => r.symbol),
      },
    );

    res.json({
      result: resultRow,
      breakdown,
      weakConcepts: weakRows.map((r) => ({
        id: r.id,
        symbol: r.symbol,
        emoji: r.emoji,
        example: r.example,
      })),
      insight: {
        performanceLabel: insight.performanceLabel,
        text: curriculumUpdate?.outcome.insight ?? finalInsightText,
        suggestion: finalSuggestion,
      },
      curriculum: curriculumUpdate
        ? {
            currentLevel: curriculumUpdate.progress.currentLevel,
            masteryScore: curriculumUpdate.progress.masteryScore,
            weakPhonemes: curriculumUpdate.progress.weakPhonemes,
            levelChanged: curriculumUpdate.outcome.levelChanged,
            repeatLevel: curriculumUpdate.outcome.repeatLevel,
          }
        : undefined,
    });
  } catch (err) {
    logger.error(
      `phonics tests submit failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── GET /api/phonics/tests/history/:childId ─────────────────────────────────

router.get("/phonics/tests/history/:childId", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const childId = Number(req.params.childId);
  if (!Number.isFinite(childId) || childId <= 0) {
    res.status(400).json({ error: "invalid_child_id" });
    return;
  }
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const rows = await db
      .select()
      .from(phonicsTestResultsTable)
      .where(
        and(
          eq(phonicsTestResultsTable.childId, childId),
          eq(phonicsTestResultsTable.userId, userId),
        ),
      )
      .orderBy(desc(phonicsTestResultsTable.completedAt))
      .limit(limit);
    res.json({ results: rows });
  } catch (err) {
    logger.error(
      `phonics tests history failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── Phoneme audio (T001) ────────────────────────────────────────────────────
//
// `GET /api/phonics/sound/:letter.mp3` — returns the *phoneme* sound for a
// single letter or common digraph (e.g. /b/ "buh", not the letter name "bee").
// Public and unauthenticated on purpose:
//   • input is bounded to a fixed enum (a-z + curated digraphs) so abuse can
//     never inflate ElevenLabs cost beyond ~36 generations TOTAL across the
//     entire user base — first call generates, every subsequent call is a
//     content-hash GCS hit forever.
//   • response is plain audio bytes; no PII; no per-user state read or written.
//
// Uses `mode: "phonics"` voice settings (high stability, no style) tuned for
// crisp, repeatable phoneme renders. See elevenLabsService VOICE_SETTINGS.

/**
 * Letter/digraph → instructional TTS line (e.g. "i as in igloo").
 * Never bare letter names — ensures phoneme sounds, not alphabet pronunciation.
 */
export const PHONEME_PROMPTS: Record<string, string> = getPhonicsAudioTextByLetter();

/** Allowed letter param values — exposed for tests + the public route guard. */
export const PHONEME_LETTERS = Object.keys(PHONEME_PROMPTS);

/**
 * Synthesize the phoneme sound for a single letter / digraph using the
 * shared ElevenLabs cache. Returns the same envelope as `synthesize()` so
 * callers can stream via /api/tts/audio/:key.mp3 if they prefer.
 */
/** @deprecated Use worker job `phonics.sound` — kept for tests that mock the queue. */
export async function synthesizePhonicsSound(letter: string) {
  const key = letter.toLowerCase();
  if (!PHONEME_PROMPTS[key]) throw new Error("invalid_letter");
  const { wrapJobInput } = await import("../queue/ai-job-payload.js");
  const enqueued = await enqueueAiJob(
    "phonics.sound",
    "anonymous",
    wrapJobInput("phonics/sound", { letter: key }),
  );
  if (!enqueued.jobId) throw new Error("audio_unavailable");
  const { waitForJobResult } = await import("../queue/index.js");
  const { waitForJob } = await import("../queue/ai-job-store.js");
  const { isBullMqActive } = await import("../queue/ai-job-queue.js");
  const finished = isBullMqActive()
    ? await waitForJobResult(enqueued.jobId, 30_000)
    : await waitForJob(enqueued.jobId, 30_000);
  if (finished?.status !== "completed") throw new Error("audio_unavailable");
  const body = finished.result as { cacheKey: string };
  return { cacheKey: body.cacheKey, audioUrl: `/api/tts/audio/${body.cacheKey}.mp3`, cached: false, charCount: 0, contentType: "audio/mpeg" };
}

export const phonicsPublicRouter: IRouter = Router();

phonicsPublicRouter.get("/phonics/sound/:letter.mp3", async (req, res): Promise<void> => {
  const raw = String(req.params.letter ?? "").toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(PHONEME_PROMPTS, raw)) {
    res.status(400).json({ error: "invalid_letter" });
    return;
  }

  const audioText = getPhonicsAudioText(raw);
  if (audioText) {
    const hash = getStaticAudioObjectKey(audioText, "phonics");
    res.redirect(302, `/api/static-audio/${hash}.mp3`);
    return;
  }

  logger.warn({ evt: "phonics.sound_placeholder", letter: raw }, "phonics sound missing corpus text");
  const { getPlaceholderMp3 } = await import("../services/staticAudioPlaceholder.js");
  const { serveStaticAudioBuffer } = await import("../services/staticAudioServe.js");
  serveStaticAudioBuffer(req, res, raw, getPlaceholderMp3(), "memory");
});

// ─── Phonics curriculum engine ───────────────────────────────────────────────

const CurriculumPlanBody = z.object({
  childId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.post("/phonics/curriculum/daily-plan", infantExploreMutationGate(), async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = CurriculumPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  try {
    const child = await loadOwnedChild(parsed.data.childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const months = (child.age ?? 0) * 12 + (child.ageMonths ?? 0);
    const dateIso = parsed.data.date ?? todayIsoUtc();
    const result = await getDailyPlanForChild(
      parsed.data.childId,
      userId,
      months,
      dateIso,
    );
    if (!result) {
      res.status(503).json({
        error: "curriculum_unavailable",
        message: "Run lib/db/sql/phonics_curriculum_schema.sql to enable the curriculum engine.",
      });
      return;
    }
    const progress = await getOrCreateCurriculumProgress(
      parsed.data.childId,
      userId,
      months,
    );
    res.json({
      plan: result.plan,
      completionPct: result.completionPct,
      progress,
      levels: PHONICS_CURRICULUM_LEVELS,
    });
  } catch (err) {
    logger.error(
      `phonics curriculum daily-plan failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

const CompleteActivityBody = z.object({
  childId: z.number().int().positive(),
  activityId: z.string().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.post("/phonics/curriculum/complete-activity", infantExploreMutationGate(), async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = CompleteActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  try {
    const child = await loadOwnedChild(parsed.data.childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const progress = await markPlanActivityComplete(
      parsed.data.childId,
      userId,
      parsed.data.activityId,
      parsed.data.date ?? todayIsoUtc(),
    );
    if (!progress) {
      res.status(503).json({ error: "curriculum_unavailable" });
      return;
    }
    res.json({ ok: true, progress });
  } catch (err) {
    logger.error(
      `phonics curriculum complete-activity failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/phonics/curriculum/progress/:childId", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const childId = Number(req.params.childId);
  if (!Number.isFinite(childId) || childId <= 0) {
    res.status(400).json({ error: "invalid_child_id" });
    return;
  }
  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const months = (child.age ?? 0) * 12 + (child.ageMonths ?? 0);
    const progress = await getOrCreateCurriculumProgress(childId, userId, months);
    if (!progress) {
      res.status(503).json({ error: "curriculum_unavailable" });
      return;
    }
    res.json({ progress, levels: PHONICS_CURRICULUM_LEVELS });
  } catch (err) {
    logger.error(
      `phonics curriculum progress failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

const AiWordsQuery = z.object({
  level: z.coerce.number().int().min(1).max(6).default(2),
  vowel: z.string().min(1).max(8).default("a"),
});

router.get("/phonics/curriculum/ai-words", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = AiWordsQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query" });
    return;
  }
  try {
    const words = await generatePhonicsWordsCached(
      parsed.data.level,
      parsed.data.vowel,
    );
    res.json({ words, level: parsed.data.level, vowel: parsed.data.vowel });
  } catch (err) {
    logger.error(
      `phonics ai-words failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
