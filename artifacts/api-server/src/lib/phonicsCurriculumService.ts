import { and, eq } from "drizzle-orm";
import {
  db,
  phonicsCurriculumProgressTable,
  phonicsDailyPlansTable,
  type PhonicsCurriculumProgressRow,
} from "@workspace/db";
import {
  applyTestOutcome,
  defaultLevelForAgeMonths,
  generateDailyPlan,
  migrateCurriculumLevel,
  planCompletionPct,
  recordActivityDay,
  weakPhonemesFromSymbols,
  type ChildCurriculumProgress,
  type PhonicsDailyPlan,
  type TestOutcomeInput,
} from "@workspace/phonics-curriculum";
import { isMissingTableError, withSafeDb } from "./db-safe.js";
import { logger } from "./logger.js";

export function todayIsoUtc(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function rowToProgress(
  row: PhonicsCurriculumProgressRow,
): ChildCurriculumProgress {
  return {
    childId: row.childId,
    userId: row.userId,
    currentLevel: migrateCurriculumLevel(row.currentLevel),
    masteryScore: row.masteryScore,
    weakPhonemes: Array.isArray(row.weakPhonemes) ? row.weakPhonemes : [],
    streak: row.streak,
    lastPlayedAt: row.lastPlayedAt?.toISOString() ?? null,
    lastTestScore: row.lastTestScore,
    lastTestAt: row.lastTestAt?.toISOString() ?? null,
  };
}

function planSeed(childId: number, dateIso: string): number {
  let h = childId ^ 0x9e3779b9;
  for (let i = 0; i < dateIso.length; i++) {
    h = (h ^ dateIso.charCodeAt(i)) * 2654435761;
  }
  return h >>> 0;
}

export async function getOrCreateCurriculumProgress(
  childId: number,
  userId: string,
  totalAgeMonths: number,
): Promise<ChildCurriculumProgress | null> {
  return withSafeDb(
    "phonics.curriculum.getOrCreate",
    async () => {
    const existing = await db
      .select()
      .from(phonicsCurriculumProgressTable)
      .where(
        and(
          eq(phonicsCurriculumProgressTable.childId, childId),
          eq(phonicsCurriculumProgressTable.userId, userId),
        ),
      )
      .limit(1);

    if (existing[0]) return rowToProgress(existing[0]);

    const level = defaultLevelForAgeMonths(totalAgeMonths);
    const inserted = await db
      .insert(phonicsCurriculumProgressTable)
      .values({
        childId,
        userId,
        currentLevel: level,
        masteryScore: 0,
        weakPhonemes: [],
        streak: 0,
        completedToday: { date: "", ids: [] },
      })
      .returning();
    return rowToProgress(inserted[0]!);
  },
    null,
  );
}

export async function loadCurriculumProgress(
  childId: number,
  userId: string,
): Promise<ChildCurriculumProgress | null> {
  return withSafeDb(
    "phonics.curriculum.loadProgress",
    async () => {
      const existing = await db
        .select()
        .from(phonicsCurriculumProgressTable)
        .where(
          and(
            eq(phonicsCurriculumProgressTable.childId, childId),
            eq(phonicsCurriculumProgressTable.userId, userId),
          ),
        )
        .limit(1);

      return existing[0] ? rowToProgress(existing[0]) : null;
    },
    null,
  );
}

export async function getDailyPlanForChild(
  childId: number,
  userId: string,
  totalAgeMonths: number,
  dateIso = todayIsoUtc(),
): Promise<{ plan: PhonicsDailyPlan; completionPct: number } | null> {
  const progress = await getOrCreateCurriculumProgress(
    childId,
    userId,
    totalAgeMonths,
  );
  if (!progress) return null;

  const row = await withSafeDb(
    "phonics.curriculum.loadRow",
    () =>
      db
        .select()
        .from(phonicsCurriculumProgressTable)
        .where(eq(phonicsCurriculumProgressTable.childId, childId))
        .limit(1),
    [],
  );
  const dbRow = row[0];
  const completedToday = dbRow?.completedToday ?? { date: "", ids: [] };
  const completedIds =
    completedToday.date === dateIso ? completedToday.ids : [];

  const plan = generateDailyPlan({
    progress,
    dateIso,
    seed: planSeed(childId, dateIso),
    completedActivityIds: completedIds,
  });

  await persistDailyPlan(childId, userId, dateIso, plan);

  const completionPct = planCompletionPct(plan, new Set(completedIds));
  return { plan, completionPct };
}

async function persistDailyPlan(
  childId: number,
  userId: string,
  dateIso: string,
  plan: PhonicsDailyPlan,
): Promise<void> {
  await withSafeDb(
    "phonics.curriculum.persistDailyPlan",
    async () => {
      await db
        .insert(phonicsDailyPlansTable)
        .values({
          childId,
          userId,
          planDate: dateIso,
          planJson: plan as unknown as Record<string, unknown>,
        })
        .onConflictDoUpdate({
          target: [phonicsDailyPlansTable.childId, phonicsDailyPlansTable.planDate],
          set: {
            planJson: plan as unknown as Record<string, unknown>,
            updatedAt: new Date(),
          },
        });
    },
    undefined,
  );
}

export async function markPlanActivityComplete(
  childId: number,
  userId: string,
  activityId: string,
  dateIso = todayIsoUtc(),
): Promise<ChildCurriculumProgress | null> {
  return withSafeDb(
    "phonics.curriculum.markActivityComplete",
    async () => {
    const rows = await db
      .select()
      .from(phonicsCurriculumProgressTable)
      .where(
        and(
          eq(phonicsCurriculumProgressTable.childId, childId),
          eq(phonicsCurriculumProgressTable.userId, userId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;

    const prev = row.completedToday ?? { date: "", ids: [] };
    const ids =
      prev.date === dateIso
        ? [...new Set([...prev.ids, activityId])]
        : [activityId];

    const { streak, lastPlayedAt } = recordActivityDay(
      rowToProgress(row),
      dateIso,
    );

    const updated = await db
      .update(phonicsCurriculumProgressTable)
      .set({
        completedToday: { date: dateIso, ids },
        streak,
        lastPlayedAt: new Date(lastPlayedAt),
        updatedAt: new Date(),
      })
      .where(eq(phonicsCurriculumProgressTable.id, row.id))
      .returning();

    return rowToProgress(updated[0]!);
  },
    null,
  );
}

export async function applyCurriculumTestResult(
  childId: number,
  userId: string,
  input: TestOutcomeInput & { weakSymbols?: string[] },
): Promise<{
  progress: ChildCurriculumProgress;
  outcome: ReturnType<typeof applyTestOutcome>;
} | null> {
  return withSafeDb(
    "phonics.curriculum.applyTestResult",
    async () => {
    const rows = await db
      .select()
      .from(phonicsCurriculumProgressTable)
      .where(
        and(
          eq(phonicsCurriculumProgressTable.childId, childId),
          eq(phonicsCurriculumProgressTable.userId, userId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;

    const progress = rowToProgress(row);
    const weakFromSymbols = input.weakSymbols
      ? weakPhonemesFromSymbols(input.weakSymbols)
      : [];
    const outcome = applyTestOutcome(progress, {
      ...input,
      weakPhonemesFromContent: [
        ...(input.weakPhonemesFromContent ?? []),
        ...weakFromSymbols,
      ],
    });

    const updated = await db
      .update(phonicsCurriculumProgressTable)
      .set({
        currentLevel: outcome.currentLevel,
        masteryScore: outcome.masteryScore,
        weakPhonemes: outcome.weakPhonemes,
        lastTestScore: Math.round(input.scorePct),
        lastTestAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(phonicsCurriculumProgressTable.id, row.id))
      .returning();

    return {
      progress: rowToProgress(updated[0]!),
      outcome,
    };
  },
    null,
  );
}

/** Generate plans for all children (cron). */
export async function runDailyPlanCronForAllChildren(): Promise<{
  ok: number;
  skipped: number;
  failed: number;
}> {
  const dateIso = todayIsoUtc();
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  const rows = await withSafeDb(
    "phonics.curriculum.cronAllRows",
    () => db.select().from(phonicsCurriculumProgressTable),
    [],
  );

  if (!rows.length) {
    logger.info({ evt: "phonics.curriculum.cron", dateIso }, "no progress rows");
    return { ok: 0, skipped: 0, failed: 0 };
  }

  for (const row of rows) {
    try {
      const months = 48;
      const result = await getDailyPlanForChild(
        row.childId,
        row.userId,
        months,
        dateIso,
      );
      if (result) ok++;
      else skipped++;
    } catch (e) {
      failed++;
      if (!isMissingTableError(e)) {
        logger.warn(
          { evt: "phonics.curriculum.cron_child_fail", childId: row.childId, e },
          "daily plan cron child failed",
        );
      }
    }
  }

  return { ok, skipped, failed };
}
