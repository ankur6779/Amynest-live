import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  db,
  childrenTable,
  nutritionDailyLogTable,
  type NutritionDailyLogRow,
} from "@workspace/db";
import {
  buildWeeklyTrend,
  computeCurrentStreak,
  computeMinDayMet,
  type WeeklyTrendDay,
} from "../lib/nutritionTrackLogic.js";

const SCORE_CHECKLIST_IDS = [
  "breakfast",
  "protein",
  "dairy",
  "greens",
  "fruit",
  "water",
  "noJunk",
  "wholegrains",
] as const;

export function sanitizeChecklist(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, boolean> = {};
  for (const id of SCORE_CHECKLIST_IDS) {
    if (Object.prototype.hasOwnProperty.call(raw, id) && (raw as Record<string, unknown>)[id] === true) {
      out[id] = true;
    }
  }
  return out;
}

export function computeScoreFromChecklist(checklist: Record<string, boolean>): {
  score: number;
  checked: number;
  total: number;
  minDayMet: boolean;
} {
  const total = SCORE_CHECKLIST_IDS.length;
  const checked = SCORE_CHECKLIST_IDS.filter((id) => checklist[id]).length;
  const score = Math.round((checked / total) * 100);
  return { score, checked, total, minDayMet: computeMinDayMet(checked) };
}

async function verifyChildOwner(childId: number, userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

function rowToPayload(row: NutritionDailyLogRow) {
  return {
    childId: row.childId,
    dateKey: row.dateKey,
    checklist: row.checklist,
    score: row.score,
    minDayMet: row.minDayMet,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getDailyScore(
  childId: number,
  userId: string,
  dateKey: string,
): Promise<{ ok: false; error: "forbidden" } | { ok: true; log: ReturnType<typeof rowToPayload> | null }> {
  if (!(await verifyChildOwner(childId, userId))) {
    return { ok: false, error: "forbidden" };
  }

  const rows = await db
    .select()
    .from(nutritionDailyLogTable)
    .where(
      and(
        eq(nutritionDailyLogTable.childId, childId),
        eq(nutritionDailyLogTable.userId, userId),
        eq(nutritionDailyLogTable.dateKey, dateKey),
      ),
    )
    .limit(1);

  return { ok: true, log: rows[0] ? rowToPayload(rows[0]) : null };
}

export async function saveDailyScore(
  childId: number,
  userId: string,
  dateKey: string,
  checklist: Record<string, boolean>,
  clientUpdatedAtMs?: number,
): Promise<
  | { ok: false; error: "forbidden" }
  | { ok: true; log: ReturnType<typeof rowToPayload>; keptServer?: boolean }
> {
  if (!(await verifyChildOwner(childId, userId))) {
    return { ok: false, error: "forbidden" };
  }

  const sanitized = sanitizeChecklist(checklist);
  const { score, minDayMet } = computeScoreFromChecklist(sanitized);

  if (
    typeof clientUpdatedAtMs === "number" &&
    Number.isFinite(clientUpdatedAtMs) &&
    clientUpdatedAtMs > 0
  ) {
    const existing = await db
      .select()
      .from(nutritionDailyLogTable)
      .where(
        and(
          eq(nutritionDailyLogTable.childId, childId),
          eq(nutritionDailyLogTable.dateKey, dateKey),
        ),
      )
      .limit(1);

    const row = existing[0];
    if (row && row.updatedAt.getTime() > clientUpdatedAtMs) {
      // Stale offline flush / migration must not overwrite a newer multi-device write.
      return { ok: true, log: rowToPayload(row), keptServer: true };
    }
  }

  const [row] = await db
    .insert(nutritionDailyLogTable)
    .values({
      childId,
      userId,
      dateKey,
      checklist: sanitized,
      score,
      minDayMet,
    })
    .onConflictDoUpdate({
      target: [nutritionDailyLogTable.childId, nutritionDailyLogTable.dateKey],
      set: {
        checklist: sanitized,
        score,
        minDayMet,
        userId,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return { ok: true, log: rowToPayload(row!) };
}

function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

async function loadRecentLogs(
  childId: number,
  userId: string,
  fromDateKey: string,
): Promise<NutritionDailyLogRow[]> {
  return db
    .select()
    .from(nutritionDailyLogTable)
    .where(
      and(
        eq(nutritionDailyLogTable.childId, childId),
        eq(nutritionDailyLogTable.userId, userId),
        gte(nutritionDailyLogTable.dateKey, fromDateKey),
      ),
    )
    .orderBy(desc(nutritionDailyLogTable.dateKey));
}

export async function getWeeklyTrend(
  childId: number,
  userId: string,
  endDateKey: string,
): Promise<{ ok: false; error: "forbidden" } | { ok: true; days: WeeklyTrendDay[] }> {
  if (!(await verifyChildOwner(childId, userId))) {
    return { ok: false, error: "forbidden" };
  }

  const fromDateKey = shiftDateKey(endDateKey, -6);
  const rows = await loadRecentLogs(childId, userId, fromDateKey);
  const days = buildWeeklyTrend(
    rows.map((r) => ({
      dateKey: r.dateKey,
      score: r.score,
      minDayMet: r.minDayMet,
      checklist: r.checklist,
      updatedAt: r.updatedAt.toISOString(),
    })),
    endDateKey,
  );

  return { ok: true, days };
}

export async function getCurrentStreak(
  childId: number,
  userId: string,
  todayKey: string,
): Promise<{ ok: false; error: "forbidden" } | { ok: true; streak: number }> {
  if (!(await verifyChildOwner(childId, userId))) {
    return { ok: false, error: "forbidden" };
  }

  const fromDateKey = shiftDateKey(todayKey, -365);
  const rows = await loadRecentLogs(childId, userId, fromDateKey);
  const streak = computeCurrentStreak(
    rows.map((r) => ({ dateKey: r.dateKey, score: r.score, minDayMet: r.minDayMet })),
    todayKey,
  );

  return { ok: true, streak };
}
