import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  speechCoachV2ActiveSessionsTable,
  speechCoachV2DailyUsageTable,
  speechCoachV2MonthlyUsageTable,
} from "@workspace/db";
import {
  SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS,
  SPEECH_COACH_V2_SESSION_SECONDS,
  remainingSpeechCoachSeconds,
  utcDateKey,
  type PersistedSessionState,
} from "@workspace/speech-coach-v2";
import { resolveSpeechCoachV2UsagePolicy } from "./speechCoachV2UsagePolicy.js";

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
  dailyLimitSeconds: number,
): Promise<{
  dailyUsed: number;
  monthlyUsed: number;
  chargedSeconds: number;
  dailyLimitReached: boolean;
  monthlyLimitReached: boolean;
  limitReached: boolean;
}> {
  const day = utcDateKey();
  const month = utcMonthKey();
  const requestedDelta = Math.max(0, Math.min(deltaSeconds, HEARTBEAT_TICK_SECONDS));

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
  const cappedDelta = Math.min(
    requestedDelta,
    Math.max(0, dailyLimitSeconds - dailyUsed),
    Math.max(0, SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS - monthlyUsed),
  );

  if (dailyRows[0]) {
    dailyUsed = Math.min(dailyLimitSeconds, dailyUsed + cappedDelta);
    await tx
      .update(speechCoachV2DailyUsageTable)
      .set({ secondsUsed: dailyUsed, updatedAt: new Date() })
      .where(eq(speechCoachV2DailyUsageTable.id, dailyRows[0].id));
  } else {
    dailyUsed = Math.min(dailyLimitSeconds, cappedDelta);
    await tx.insert(speechCoachV2DailyUsageTable).values({
      userId,
      childId,
      day,
      secondsUsed: dailyUsed,
    });
  }

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

  const dailyLimitReached = dailyUsed >= dailyLimitSeconds;
  const monthlyLimitReached = monthlyUsed >= SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS;
  const limitReached = dailyLimitReached || monthlyLimitReached;

  return {
    dailyUsed,
    monthlyUsed,
    chargedSeconds: cappedDelta,
    dailyLimitReached,
    monthlyLimitReached,
    limitReached,
  };
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
  const policy = await resolveSpeechCoachV2UsagePolicy(input.userId);
  if (policy.dailyLimitSeconds <= 0) {
    throw new SpeechCoachV2SessionError(
      "Speech Coach V2 is not available on your plan.",
      "daily_limit_reached",
      429,
    );
  }

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
        const resumeStale = Date.now() - existing.lastSeenAt.getTime() > ACTIVE_STALE_MS;
        await tx
          .update(speechCoachV2ActiveSessionsTable)
          .set({
            lastSeenAt: new Date(),
            tabLockToken: input.tabLockToken,
            sessionStateJson: input.sessionState,
            status: "active",
            ...(resumeStale
              ? { startedAt: new Date(), secondsConsumed: 0, updatedAt: new Date() }
              : { updatedAt: new Date() }),
          })
          .where(eq(speechCoachV2ActiveSessionsTable.id, existing.id));
        return input.sessionState;
      }
      await tx
        .update(speechCoachV2ActiveSessionsTable)
        .set({
          status: stale ? "expired" : "terminated",
          updatedAt: new Date(),
        })
        .where(eq(speechCoachV2ActiveSessionsTable.id, existing.id));
    }

    const dailyUsed = await getDailyUsageLocked(tx, input.userId, input.childId);
    if (dailyUsed >= policy.dailyLimitSeconds) {
      throw new SpeechCoachV2SessionError(
        "Daily speech limit reached.",
        "daily_limit_reached",
        429,
      );
    }

    const monthlyUsed = await getMonthlyUsageLocked(tx, input.userId, input.childId);
    if (monthlyUsed >= SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS) {
      throw new SpeechCoachV2SessionError(
        "Monthly speech limit reached.",
        "monthly_limit_reached",
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

export async function assertActiveSessionForToken(input: {
  userId: string;
  childId: number;
  sessionId: string;
  tabLockToken: string;
}): Promise<void> {
  const rows = await db
    .select()
    .from(speechCoachV2ActiveSessionsTable)
    .where(
      and(
        eq(speechCoachV2ActiveSessionsTable.sessionId, input.sessionId),
        eq(speechCoachV2ActiveSessionsTable.userId, input.userId),
        eq(speechCoachV2ActiveSessionsTable.childId, input.childId),
      ),
    )
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

  await db
    .update(speechCoachV2ActiveSessionsTable)
    .set({ lastSeenAt: new Date(), updatedAt: new Date() })
    .where(eq(speechCoachV2ActiveSessionsTable.id, row.id));
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
  const policy = await resolveSpeechCoachV2UsagePolicy(input.userId);
  if (policy.dailyLimitSeconds <= 0) {
    throw new SpeechCoachV2SessionError(
      "Speech Coach V2 is not available on your plan.",
      "daily_limit_reached",
      429,
    );
  }

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

    const usage = await addUsageLocked(
      tx,
      input.userId,
      input.childId,
      tickSeconds,
      policy.dailyLimitSeconds,
    );

    const nextConsumed = row.secondsConsumed + usage.chargedSeconds;
    const sessionCapSeconds = Math.min(
      SPEECH_COACH_V2_SESSION_SECONDS,
      policy.dailyLimitSeconds,
    );
    const sessionCapReached = nextConsumed >= sessionCapSeconds;
    const limitReached = usage.limitReached || sessionCapReached;
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
        sessionCapReached
          ? "Session time limit reached."
          : usage.monthlyLimitReached
            ? "Monthly speech limit reached."
            : "Daily speech limit reached.",
        sessionCapReached
          ? "session_limit_reached"
          : usage.monthlyLimitReached
            ? "monthly_limit_reached"
            : "daily_limit_reached",
        429,
      );
    }

    return {
      sessionState: row.sessionStateJson as unknown as PersistedSessionState,
      secondsConsumed: nextConsumed,
      limitReached: false,
      remainingSeconds: remainingSpeechCoachSeconds({
        dailyUsedSeconds: usage.dailyUsed,
        dailyLimitSeconds: policy.dailyLimitSeconds,
        monthlyUsedSeconds: usage.monthlyUsed,
        monthlyLimitSeconds: SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS,
      }),
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
  const policy = await resolveSpeechCoachV2UsagePolicy(input.userId);

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
    const elapsedSinceLastSeen = Math.max(
      0,
      Math.floor((now - row.lastSeenAt.getTime()) / 1000),
    );
    const finalTick = Math.min(HEARTBEAT_TICK_SECONDS, elapsedSinceLastSeen);
    let chargedFinalTick = 0;

    if (finalTick > 0 && policy.dailyLimitSeconds > 0) {
      const usage = await addUsageLocked(
        tx,
        input.userId,
        input.childId,
        finalTick,
        policy.dailyLimitSeconds,
      );
      chargedFinalTick = usage.chargedSeconds;
    }
    const nextConsumed = row.secondsConsumed + chargedFinalTick;

    await tx
      .update(speechCoachV2ActiveSessionsTable)
      .set({
        status: input.status ?? "completed",
        secondsConsumed: nextConsumed,
        lastSeenAt: new Date(now),
        updatedAt: new Date(),
      })
      .where(eq(speechCoachV2ActiveSessionsTable.id, row.id));

    return nextConsumed;
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
