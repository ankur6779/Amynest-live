import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  speechCoachV2ActiveSessionsTable,
  speechCoachV2DailyUsageTable,
  speechCoachV2MonthlyUsageTable,
} from "@workspace/db";
import {
  SPEECH_COACH_V2_DAILY_LIMIT_SECONDS,
  SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS,
  utcDateKey,
  type PersistedSessionState,
} from "@workspace/speech-coach-v2";

const ACTIVE_STALE_MS = 45_000;
const HEARTBEAT_TICK_SECONDS = 15;

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function utcMonthKey(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

export class SpeechCoachV2SessionError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 400,
  ) {
    super(message);
  }
}

async function lockActiveSession(
  tx: DbExecutor,
  userId: string,
  childId: number,
): Promise<(typeof speechCoachV2ActiveSessionsTable.$inferSelect) | null> {
  const rows = await tx
    .select()
    .from(speechCoachV2ActiveSessionsTable)
    .where(
      and(
        eq(speechCoachV2ActiveSessionsTable.userId, userId),
        eq(speechCoachV2ActiveSessionsTable.childId, childId),
        eq(speechCoachV2ActiveSessionsTable.status, "active"),
      ),
    )
    .for("update")
    .limit(1);
  return rows[0] ?? null;
}

async function getDailyUsageLocked(
  tx: DbExecutor,
  userId: string,
  childId: number,
  day = utcDateKey(),
): Promise<number> {
  const rows = await tx
    .select()
    .from(speechCoachV2DailyUsageTable)
    .where(
      and(
        eq(speechCoachV2DailyUsageTable.userId, userId),
        eq(speechCoachV2DailyUsageTable.childId, childId),
        eq(speechCoachV2DailyUsageTable.day, day),
      ),
    )
    .for("update")
    .limit(1);
  return rows[0]?.secondsUsed ?? 0;
}

async function getMonthlyUsageLocked(
  tx: DbExecutor,
  userId: string,
  childId: number,
  month = utcMonthKey(),
): Promise<number> {
  const rows = await tx
    .select()
    .from(speechCoachV2MonthlyUsageTable)
    .where(
      and(
        eq(speechCoachV2MonthlyUsageTable.userId, userId),
        eq(speechCoachV2MonthlyUsageTable.childId, childId),
        eq(speechCoachV2MonthlyUsageTable.month, month),
      ),
    )
    .for("update")
    .limit(1);
  return rows[0]?.secondsUsed ?? 0;
}

async function addUsageLocked(
  tx: DbExecutor,
  userId: string,
  childId: number,
  deltaSeconds: number,
): Promise<{ dailyUsed: number; monthlyUsed: number; limitReached: boolean }> {
  const day = utcDateKey();
  const month = utcMonthKey();
  const cappedDelta = Math.max(0, Math.min(deltaSeconds, HEARTBEAT_TICK_SECONDS));

  const dailyRows = await tx
    .select()
    .from(speechCoachV2DailyUsageTable)
    .where(
      and(
        eq(speechCoachV2DailyUsageTable.userId, userId),
        eq(speechCoachV2DailyUsageTable.childId, childId),
        eq(speechCoachV2DailyUsageTable.day, day),
      ),
    )
    .for("update")
    .limit(1);

  let dailyUsed = dailyRows[0]?.secondsUsed ?? 0;
  if (dailyRows[0]) {
    dailyUsed = Math.min(SPEECH_COACH_V2_DAILY_LIMIT_SECONDS, dailyUsed + cappedDelta);
    await tx
      .update(speechCoachV2DailyUsageTable)
      .set({ secondsUsed: dailyUsed, updatedAt: new Date() })
      .where(eq(speechCoachV2DailyUsageTable.id, dailyRows[0].id));
  } else {
    dailyUsed = Math.min(SPEECH_COACH_V2_DAILY_LIMIT_SECONDS, cappedDelta);
    await tx.insert(speechCoachV2DailyUsageTable).values({
      userId,
      childId,
      day,
      secondsUsed: dailyUsed,
    });
  }

  const monthRows = await tx
    .select()
    .from(speechCoachV2MonthlyUsageTable)
    .where(
      and(
        eq(speechCoachV2MonthlyUsageTable.userId, userId),
        eq(speechCoachV2MonthlyUsageTable.childId, childId),
        eq(speechCoachV2MonthlyUsageTable.month, month),
      ),
    )
    .for("update")
    .limit(1);

  let monthlyUsed = monthRows[0]?.secondsUsed ?? 0;
  if (monthRows[0]) {
    monthlyUsed = Math.min(SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS, monthlyUsed + cappedDelta);
    await tx
      .update(speechCoachV2MonthlyUsageTable)
      .set({ secondsUsed: monthlyUsed, updatedAt: new Date() })
      .where(eq(speechCoachV2MonthlyUsageTable.id, monthRows[0].id));
  } else {
    monthlyUsed = Math.min(SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS, cappedDelta);
    await tx.insert(speechCoachV2MonthlyUsageTable).values({
      userId,
      childId,
      month,
      secondsUsed: monthlyUsed,
    });
  }

  const limitReached =
    dailyUsed >= SPEECH_COACH_V2_DAILY_LIMIT_SECONDS
    || monthlyUsed >= SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS;

  return { dailyUsed, monthlyUsed, limitReached };
}

export async function registerActiveSession(input: {
  userId: string;
  childId: number;
  sessionId: string;
  ageBand: string;
  sessionState: PersistedSessionState;
  tabLockToken: string;
  resume?: boolean;
}): Promise<PersistedSessionState> {
  return db.transaction(async (tx) => {
    const existing = await lockActiveSession(tx, input.userId, input.childId);
    if (existing) {
      const stale = Date.now() - existing.lastSeenAt.getTime() > ACTIVE_STALE_MS;
      if (!stale && existing.sessionId !== input.sessionId && !input.resume) {
        throw new SpeechCoachV2SessionError(
          "An active session already exists for this child.",
          "parallel_session_blocked",
          409,
        );
      }
      if (input.resume && existing.sessionId === input.sessionId) {
        return existing.sessionStateJson as unknown as PersistedSessionState;
      }
      if (!stale) {
        await tx
          .update(speechCoachV2ActiveSessionsTable)
          .set({ status: "terminated", updatedAt: new Date() })
          .where(eq(speechCoachV2ActiveSessionsTable.id, existing.id));
      }
    }

    const dailyUsed = await getDailyUsageLocked(tx, input.userId, input.childId);
    if (dailyUsed >= SPEECH_COACH_V2_DAILY_LIMIT_SECONDS) {
      throw new SpeechCoachV2SessionError(
        "Daily speech limit reached.",
        "daily_limit_reached",
        429,
      );
    }

    await tx.insert(speechCoachV2ActiveSessionsTable).values({
      sessionId: input.sessionId,
      userId: input.userId,
      childId: input.childId,
      ageBand: input.ageBand,
      sessionStateJson: input.sessionState,
      tabLockToken: input.tabLockToken,
      status: "active",
    });

    return input.sessionState;
  });
}

export async function getActiveSessionForChild(
  userId: string,
  childId: number,
): Promise<(typeof speechCoachV2ActiveSessionsTable.$inferSelect) | null> {
  const rows = await db
    .select()
    .from(speechCoachV2ActiveSessionsTable)
    .where(
      and(
        eq(speechCoachV2ActiveSessionsTable.userId, userId),
        eq(speechCoachV2ActiveSessionsTable.childId, childId),
        eq(speechCoachV2ActiveSessionsTable.status, "active"),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (Date.now() - row.lastSeenAt.getTime() > ACTIVE_STALE_MS) return null;
  return row;
}

export async function validateAndTouchSession(input: {
  userId: string;
  childId: number;
  sessionId: string;
  tabLockToken: string;
}): Promise<{
  sessionState: PersistedSessionState;
  secondsConsumed: number;
  limitReached: boolean;
  remainingSeconds: number;
}> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(speechCoachV2ActiveSessionsTable)
      .where(
        and(
          eq(speechCoachV2ActiveSessionsTable.sessionId, input.sessionId),
          eq(speechCoachV2ActiveSessionsTable.userId, input.userId),
          eq(speechCoachV2ActiveSessionsTable.childId, input.childId),
        ),
      )
      .for("update")
      .limit(1);

    const row = rows[0];
    if (!row || row.status !== "active") {
      throw new SpeechCoachV2SessionError("Unknown or inactive session.", "invalid_session", 404);
    }
    if (row.tabLockToken !== input.tabLockToken) {
      throw new SpeechCoachV2SessionError(
        "This session is active in another tab.",
        "tab_lock_violation",
        409,
      );
    }

    const now = Date.now();
    const elapsedSinceLastSeen = Math.max(
      0,
      Math.floor((now - row.lastSeenAt.getTime()) / 1000),
    );
    const tickSeconds = Math.min(
      HEARTBEAT_TICK_SECONDS,
      Math.max(elapsedSinceLastSeen, 1),
    );

    const totalSessionSeconds = Math.floor((now - row.startedAt.getTime()) / 1000);
    const nextConsumed = Math.max(row.secondsConsumed, totalSessionSeconds);

    const usage = await addUsageLocked(tx, input.userId, input.childId, tickSeconds);

    const limitReached = usage.limitReached || nextConsumed >= SPEECH_COACH_V2_DAILY_LIMIT_SECONDS;
    const status = limitReached ? "terminated" : "active";

    await tx
      .update(speechCoachV2ActiveSessionsTable)
      .set({
        lastSeenAt: new Date(now),
        secondsConsumed: nextConsumed,
        status,
        updatedAt: new Date(),
      })
      .where(eq(speechCoachV2ActiveSessionsTable.id, row.id));

    if (limitReached) {
      throw new SpeechCoachV2SessionError(
        "Daily or monthly speech limit reached.",
        "daily_limit_reached",
        429,
      );
    }

    return {
      sessionState: row.sessionStateJson as unknown as PersistedSessionState,
      secondsConsumed: nextConsumed,
      limitReached: false,
      remainingSeconds: Math.max(0, SPEECH_COACH_V2_DAILY_LIMIT_SECONDS - usage.dailyUsed),
    };
  });
}

export async function updateSessionState(input: {
  userId: string;
  childId: number;
  sessionId: string;
  tabLockToken: string;
  sessionState: PersistedSessionState;
}): Promise<void> {
  await db
    .update(speechCoachV2ActiveSessionsTable)
    .set({
      sessionStateJson: input.sessionState,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(speechCoachV2ActiveSessionsTable.sessionId, input.sessionId),
        eq(speechCoachV2ActiveSessionsTable.userId, input.userId),
        eq(speechCoachV2ActiveSessionsTable.childId, input.childId),
        eq(speechCoachV2ActiveSessionsTable.tabLockToken, input.tabLockToken),
        eq(speechCoachV2ActiveSessionsTable.status, "active"),
      ),
    );
}

export async function terminateActiveSession(input: {
  userId: string;
  childId: number;
  sessionId: string;
  status?: "completed" | "terminated";
}): Promise<number> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(speechCoachV2ActiveSessionsTable)
      .where(
        and(
          eq(speechCoachV2ActiveSessionsTable.sessionId, input.sessionId),
          eq(speechCoachV2ActiveSessionsTable.userId, input.userId),
          eq(speechCoachV2ActiveSessionsTable.childId, input.childId),
        ),
      )
      .for("update")
      .limit(1);

    const row = rows[0];
    if (!row) return 0;

    const now = Date.now();
    const duration = Math.floor((now - row.startedAt.getTime()) / 1000);
    const remaining = Math.max(0, duration - row.secondsConsumed);
    if (remaining > 0) {
      await addUsageLocked(tx, input.userId, input.childId, remaining);
    }

    await tx
      .update(speechCoachV2ActiveSessionsTable)
      .set({
        status: input.status ?? "completed",
        secondsConsumed: duration,
        lastSeenAt: new Date(now),
        updatedAt: new Date(),
      })
      .where(eq(speechCoachV2ActiveSessionsTable.id, row.id));

    return duration;
  });
}

export function generateTabLockToken(): string {
  return randomUUID();
}

export async function expireStaleSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - ACTIVE_STALE_MS);
  const result = await db
    .update(speechCoachV2ActiveSessionsTable)
    .set({ status: "expired", updatedAt: new Date() })
    .where(
      and(
        eq(speechCoachV2ActiveSessionsTable.status, "active"),
        sql`${speechCoachV2ActiveSessionsTable.lastSeenAt} < ${cutoff}`,
      ),
    );
  return result.rowCount ?? 0;
}
