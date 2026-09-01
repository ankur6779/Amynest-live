import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  db,
  notificationFatigueStateTable,
  notificationLogTable,
  notificationPreferencesTable,
} from "@workspace/db";
import {
  computeFatigueState,
  getLocalDateTimeParts,
  type FatigueState,
  type HistoryEntry,
  type UserContentHistory,
} from "@workspace/notification-engine";

const HISTORY_LIMIT = 120;
const HISTORY_WINDOW_DAYS = 45;

export async function loadUserContentHistory(
  userId: string,
  timezone: string,
): Promise<UserContentHistory> {
  const cutoff = new Date(Date.now() - HISTORY_WINDOW_DAYS * 86400000);

  const [prefs] = await db
    .select({ engagementScore: notificationPreferencesTable.engagementScore })
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);

  const [fatigueRow] = await db
    .select()
    .from(notificationFatigueStateTable)
    .where(eq(notificationFatigueStateTable.userId, userId))
    .limit(1);

  const rows = await db
    .select()
    .from(notificationLogTable)
    .where(
      and(
        eq(notificationLogTable.userId, userId),
        gte(notificationLogTable.sentAt, cutoff),
        eq(notificationLogTable.status, "sent"),
      ),
    )
    .orderBy(desc(notificationLogTable.sentAt))
    .limit(HISTORY_LIMIT);

  const entries: HistoryEntry[] = rows.map((r) => ({
    category: r.category,
    title: r.title,
    body: r.body,
    contentHash: r.contentHash ?? null,
    topicKey: r.topicKey ?? null,
    recommendationKey: r.recommendationKey ?? null,
    theme: r.theme ?? null,
    contentType: r.contentType ?? null,
    sentAt: r.sentAt,
    openedAt: r.openedAt ?? null,
    dismissedAt: r.dismissedAt ?? null,
  }));

  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const sentToday = entries.filter(
    (e) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(e.sentAt) === localDate,
  );

  const fatigue: FatigueState = fatigueRow
    ? computeFatigueState(
        fatigueRow.consecutiveIgnores,
        fatigueRow.rollingIgnores30d,
        fatigueRow.lastOpenedAt,
      )
    : computeFatigueState(0, 0, null);

  return {
    entries,
    fatigue,
    engagementScore: prefs?.engagementScore ?? 50,
    sentToday,
  };
}

export async function recordNotificationOpened(
  userId: string,
  opts: { fingerprint?: string | null; notificationId?: string | null } = {},
): Promise<void> {
  const now = new Date();
  const [prefs] = await db
    .select({ timezone: notificationPreferencesTable.timezone })
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);

  const tz = prefs?.timezone ?? "UTC";
  const localHour = getLocalDateTimeParts(tz, now).hour;
  const fingerprint = (opts.fingerprint ?? opts.notificationId ?? "").trim();

  if (fingerprint.length > 0) {
    await db.execute(sql`
      UPDATE notification_log
      SET opened_at = ${now}
      WHERE id = (
        SELECT id FROM notification_log
        WHERE user_id = ${userId}
          AND status = 'sent'
          AND opened_at IS NULL
          AND (
            dedup_key = ${fingerprint}
            OR provider_message_id = ${fingerprint}
          )
        ORDER BY sent_at DESC
        LIMIT 1
      )
    `);
  } else {
    await db.execute(sql`
      UPDATE notification_log
      SET opened_at = ${now}
      WHERE id = (
        SELECT id FROM notification_log
        WHERE user_id = ${userId}
          AND status = 'sent'
          AND opened_at IS NULL
        ORDER BY sent_at DESC
        LIMIT 1
      )
    `);
  }

  await db
    .insert(notificationFatigueStateTable)
    .values({
      userId,
      consecutiveIgnores: 0,
      frequencyMultiplierPct: 100,
      highValueOnly: false,
      lastOpenedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: notificationFatigueStateTable.userId,
      set: {
        consecutiveIgnores: 0,
        frequencyMultiplierPct: 100,
        highValueOnly: false,
        lastOpenedAt: now,
        updatedAt: now,
      },
    });

  await db
    .update(notificationPreferencesTable)
    .set({
      preferredEngagementHour: localHour,
      updatedAt: now,
    })
    .where(eq(notificationPreferencesTable.userId, userId));

  const { updateEngagementScore } = await import("./notificationDispatchService.js");
  await updateEngagementScore(userId, true);
}

export async function recordNotificationDismissed(userId: string): Promise<void> {
  const now = new Date();
  await db.execute(sql`
    UPDATE notification_log
    SET dismissed_at = ${now}
    WHERE id = (
      SELECT id FROM notification_log
      WHERE user_id = ${userId}
        AND status = 'sent'
        AND dismissed_at IS NULL
      ORDER BY sent_at DESC
      LIMIT 1
    )
  `);
  await incrementFatigueIgnore(userId);
  const { updateEngagementScore } = await import("./notificationDispatchService.js");
  await updateEngagementScore(userId, false);
}

async function incrementFatigueIgnore(userId: string): Promise<void> {
  const now = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [row] = await db
    .select()
    .from(notificationFatigueStateTable)
    .where(eq(notificationFatigueStateTable.userId, userId))
    .limit(1);

  const consecutive = (row?.consecutiveIgnores ?? 0) + 1;

  const ignoreCount = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count FROM notification_log
    WHERE user_id = ${userId}
      AND status = 'sent'
      AND opened_at IS NULL
      AND sent_at >= ${thirtyDaysAgo}
  `);
  const rolling = Number(ignoreCount.rows[0]?.count ?? consecutive);

  const fatigue = computeFatigueState(consecutive, rolling, row?.lastOpenedAt ?? null);

  await db
    .insert(notificationFatigueStateTable)
    .values({
      userId,
      consecutiveIgnores: consecutive,
      rollingIgnores30d: rolling,
      frequencyMultiplierPct: Math.round(fatigue.frequencyMultiplier * 100),
      highValueOnly: fatigue.highValueOnly,
      lastOpenedAt: row?.lastOpenedAt ?? null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: notificationFatigueStateTable.userId,
      set: {
        consecutiveIgnores: consecutive,
        rollingIgnores30d: rolling,
        frequencyMultiplierPct: Math.round(fatigue.frequencyMultiplier * 100),
        highValueOnly: fatigue.highValueOnly,
        updatedAt: now,
      },
    });
}

/** Called after a successful send — track unopened chain for fatigue. */
export async function touchFatigueLastSent(userId: string): Promise<void> {
  const now = new Date();
  await db
    .insert(notificationFatigueStateTable)
    .values({ userId, lastSentAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: notificationFatigueStateTable.userId,
      set: { lastSentAt: now, updatedAt: now },
    });
}
