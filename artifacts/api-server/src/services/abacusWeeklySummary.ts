import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  childrenTable,
  abacusProgressTable,
  type AbacusBestScores,
} from "@workspace/db";
import {
  getLevel,
  highestUnlockedLevel,
  isAbacusEligible,
  LEVELS,
  type LevelId,
} from "@workspace/abacus";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const LEVEL_LABELS: Record<LevelId, string> = {
  1: "numbers & beads",
  2: "addition",
  3: "subtraction",
  4: "multi-digit addition",
  5: "mental maths",
};

export type AbacusWeeklyChildSummary = {
  childId: number;
  childName: string;
  childAge: number | null;
  /** True if the child has ever played the abacus zone. */
  hasProgress: boolean;
  /** Level the child should resume / continue with. */
  currentLevel: LevelId;
  currentLevelLabel: string;
  /** Highest level unlocked given completed history. */
  highestUnlocked: LevelId;
  /** Number of distinct levels the child has ever passed. */
  levelsCompletedTotal: number;
  /**
   * Levels the child *first cleared or improved on* in the trailing 7 days.
   * Derived from `bestScores[level].completedAt` — the schema doesn't store
   * per-session history so this is our best per-week proxy.
   */
  levelsCompletedThisWeek: number;
  /** Sum of best-score points for the levels above. */
  pointsThisWeek: number;
  /**
   * Average accuracy% of those weekly level completions. Falls back to
   * the lifetime accuracy (totalCorrect / totalAttempts) when there were
   * no qualifying completions.
   */
  accuracyPct: number;
  /** True when accuracyPct came from this-week best scores rather than the
   *  lifetime fallback — useful for UI labelling. */
  accuracyIsWeekly: boolean;
  /** Cumulative lifetime totals (for context / sparkline-style display). */
  totalCorrect: number;
  totalAttempts: number;
  totalPoints: number;
  /** ISO timestamp of the most recent abacus activity, or null. */
  lastActiveAt: string | null;
  /** Plain-English next step, e.g. "Practise Level 3 subtraction". */
  nextRecommendedAction: string;
};

export type AbacusWeeklySummary = {
  generatedAt: string;
  /** Children eligible for the abacus zone (age 4–10) with computed stats. */
  children: AbacusWeeklyChildSummary[];
  /** Eligible children with no abacus_progress row yet — useful for
   *  empty-state UI without a second query. */
  eligibleWithoutProgress: Array<{
    childId: number;
    childName: string;
    childAge: number | null;
  }>;
};

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

function pickNextAction(args: {
  currentLevel: LevelId;
  highestUnlocked: LevelId;
  completed: LevelId[];
  bestScores: AbacusBestScores;
}): string {
  const { currentLevel, highestUnlocked, completed, bestScores } = args;

  // All five levels passed — push toward the mental challenge.
  if (completed.length >= LEVELS.length) {
    return "Try a Level 5 mental-maths challenge to keep skills sharp";
  }

  // If the next unlocked level is past the current one, nudge to it.
  const target =
    highestUnlocked > currentLevel ? highestUnlocked : currentLevel;

  // If best score on `target` is weak, suggest practice; otherwise challenge.
  const best = bestScores[String(target)];
  const slug = LEVEL_LABELS[target] ?? `level ${target}`;
  const def = getLevel(target);
  if (!best || best.accuracyPct < def.unlockAccuracyPct) {
    return `Practise Level ${target} ${slug}`;
  }
  return `Take the Level ${target} ${slug} challenge`;
}

/** Exported for tests. Pure function — given a row + window, compute the
 *  per-child summary with no DB access. */
export function computeChildSummary(args: {
  childId: number;
  childName: string;
  childAge: number | null;
  row: {
    currentLevel: number;
    completedLevels: unknown;
    bestScores: unknown;
    totalCorrect: number;
    totalAttempts: number;
    totalPoints: number;
    updatedAt: Date | string | null;
  };
  windowStart: number;
}): AbacusWeeklyChildSummary {
  const { childId, childName, childAge, row, windowStart } = args;
  const completed = asLevelList(row.completedLevels);
  const highest = highestUnlockedLevel(completed);
  const bestScores = (row.bestScores as AbacusBestScores) ?? {};

  let pointsThisWeek = 0;
  let weeklyAccuracySum = 0;
  let weeklyAccuracyCount = 0;
  for (const [, entry] of Object.entries(bestScores)) {
    if (!entry || typeof entry.completedAt !== "string") continue;
    const ts = Date.parse(entry.completedAt);
    if (!Number.isFinite(ts) || ts < windowStart) continue;
    pointsThisWeek += entry.points ?? 0;
    weeklyAccuracySum += entry.accuracyPct ?? 0;
    weeklyAccuracyCount += 1;
  }

  const lifetimeAccuracy =
    row.totalAttempts > 0
      ? Math.round((row.totalCorrect / row.totalAttempts) * 100)
      : 0;
  const accuracyIsWeekly = weeklyAccuracyCount > 0;
  const accuracyPct = accuracyIsWeekly
    ? Math.round(weeklyAccuracySum / weeklyAccuracyCount)
    : lifetimeAccuracy;

  const safeCurrent = (Math.min(
    Math.max(row.currentLevel, 1),
    LEVELS.length,
  ) as LevelId);

  const nextRecommendedAction = pickNextAction({
    currentLevel: safeCurrent,
    highestUnlocked: highest,
    completed,
    bestScores,
  });

  const lastActiveAt = row.updatedAt
    ? new Date(row.updatedAt).toISOString()
    : null;

  return {
    childId,
    childName,
    childAge,
    hasProgress:
      row.totalAttempts > 0 ||
      row.totalPoints > 0 ||
      completed.length > 0 ||
      Object.keys(bestScores).length > 0,
    currentLevel: safeCurrent,
    currentLevelLabel: LEVEL_LABELS[safeCurrent] ?? `level ${safeCurrent}`,
    highestUnlocked: highest,
    levelsCompletedTotal: completed.length,
    levelsCompletedThisWeek: weeklyAccuracyCount,
    pointsThisWeek,
    accuracyPct,
    accuracyIsWeekly,
    totalCorrect: row.totalCorrect,
    totalAttempts: row.totalAttempts,
    totalPoints: row.totalPoints,
    lastActiveAt,
    nextRecommendedAction,
  };
}

/**
 * Build the per-child weekly Abacus summary for the parent insights view
 * and the weekly recap email. The schema only keeps cumulative totals + the
 * last best-score per level (with a `completedAt` timestamp), so "this week"
 * here means: levels whose best score was set within the trailing 7 days.
 * It's an approximation — but it's the only signal we have without adding a
 * per-session history table.
 */
export async function buildAbacusWeeklySummary(args: {
  userId: string;
  now?: Date;
}): Promise<AbacusWeeklySummary> {
  const now = args.now ?? new Date();
  const windowStart = now.getTime() - WEEK_MS;

  const children = await db
    .select({
      id: childrenTable.id,
      name: childrenTable.name,
      age: childrenTable.age,
    })
    .from(childrenTable)
    .where(eq(childrenTable.userId, args.userId));

  const eligible = children.filter((c) => isAbacusEligible(c.age ?? 0));
  if (eligible.length === 0) {
    return { generatedAt: now.toISOString(), children: [], eligibleWithoutProgress: [] };
  }

  const ids = eligible.map((c) => c.id);
  const rows = await db
    .select()
    .from(abacusProgressTable)
    .where(
      and(
        eq(abacusProgressTable.userId, args.userId),
        inArray(abacusProgressTable.childId, ids),
      ),
    );

  const byChild = new Map<number, (typeof rows)[number]>();
  for (const r of rows) byChild.set(r.childId, r);

  const summaries: AbacusWeeklyChildSummary[] = [];
  const eligibleWithoutProgress: AbacusWeeklySummary["eligibleWithoutProgress"] =
    [];

  for (const c of eligible) {
    const row = byChild.get(c.id);
    if (!row) {
      // Surface eligible-but-untouched children as a full card too, so the
      // Insights UI can render a starter "no sessions yet" state for every
      // eligible child (not just those with a progress row).
      eligibleWithoutProgress.push({
        childId: c.id,
        childName: c.name,
        childAge: c.age ?? null,
      });
      summaries.push(
        computeChildSummary({
          childId: c.id,
          childName: c.name,
          childAge: c.age ?? null,
          row: {
            currentLevel: 1,
            completedLevels: [],
            bestScores: {},
            totalCorrect: 0,
            totalAttempts: 0,
            totalPoints: 0,
            updatedAt: null,
          },
          windowStart,
        }),
      );
      continue;
    }
    summaries.push(
      computeChildSummary({
        childId: c.id,
        childName: c.name,
        childAge: c.age ?? null,
        row,
        windowStart,
      }),
    );
  }

  // Children with the most recent activity first.
  summaries.sort((a, b) => {
    const at = a.lastActiveAt ? Date.parse(a.lastActiveAt) : 0;
    const bt = b.lastActiveAt ? Date.parse(b.lastActiveAt) : 0;
    return bt - at;
  });

  return {
    generatedAt: now.toISOString(),
    children: summaries,
    eligibleWithoutProgress,
  };
}
