/**
 * Infant smart notification scheduler — runs every minute via notification cron.
 */
import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  db,
  childrenTable,
  infantCareLogsTable,
  infantNotificationPrefsTable,
  napSessionsTable,
  pushTokensTable,
  vaccinationLogsTable,
  type InfantNotificationKind,
} from "@workspace/db";
import { logger } from "./logger.js";
import { listChildCaregiverUserIds } from "./child-access.js";
import {
  dispatchNotification,
  getOrCreatePreferences,
} from "../services/notificationDispatchService.js";
import {
  evaluateFeedReminderCandidate,
  evaluateMilestoneTipCandidate,
  evaluateNapWindowCandidate,
  evaluateSleepDriftCandidate,
  evaluateVaccineCandidates,
  isKindSnoozed,
  kindEnabled,
  pickBestCandidates,
  type InfantNotificationCandidate,
} from "./infantNotificationCandidates.js";
import type { NapHistoryEntry } from "./sleepPredict.js";
import type { VaxLogMap } from "@workspace/infant-hub";

const INFANT_CATEGORY = "infant_care" as const;

function timezoneOffsetMinutes(timezone: string, now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  }).formatToParts(now);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(tzName);
  if (!m) return -now.getTimezoneOffset();
  const sign = m[1] === "-" ? -1 : 1;
  const hours = parseInt(m[2]!, 10);
  const mins = m[3] ? parseInt(m[3], 10) : 0;
  return sign * (hours * 60 + mins);
}

function getLocalParts(timezone: string, now = new Date()) {
  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const localDate = dateFmt.format(now);
  const [hh, mm] = timeFmt.format(now).split(":").map((s) => parseInt(s, 10));
  return {
    localDate,
    localHour: Number.isFinite(hh) ? hh : 0,
    localMinute: Number.isFinite(mm) ? mm : 0,
  };
}

async function countInfantSentToday(userId: string, timezone: string): Promise<number> {
  const { localDate } = getLocalParts(timezone);
  const result = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count FROM notification_log
    WHERE user_id = ${userId}
      AND category = ${INFANT_CATEGORY}
      AND status = 'sent'
      AND (sent_at AT TIME ZONE ${timezone})::date = ${localDate}::date
  `);
  return Number(result.rows[0]?.count ?? 0);
}

function rowsToHistory(rows: Array<{ kind: string; startedAt: Date; endedAt: Date | null }>): NapHistoryEntry[] {
  return rows.map((r) => ({
    kind: (r.kind === "night" ? "night" : "nap") as "nap" | "night",
    startedAt: r.startedAt.getTime(),
    endedAt: r.endedAt ? r.endedAt.getTime() : undefined,
  }));
}

function dailySleepMinutesFromNaps(
  rows: Array<{ startedAt: Date; durationMs: number | null; endedAt: Date | null }>,
  tzOffsetMin: number,
): Map<string, number> {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    const localMs = row.startedAt.getTime() - tzOffsetMin * 60_000;
    const key = new Date(localMs).toISOString().slice(0, 10);
    const mins = (row.durationMs ?? 0) / 60_000;
    byDate.set(key, (byDate.get(key) ?? 0) + mins);
  }
  return byDate;
}

export async function loadOrCreateInfantPrefs(userId: string, childId: number) {
  const [existing] = await db
    .select()
    .from(infantNotificationPrefsTable)
    .where(
      and(
        eq(infantNotificationPrefsTable.userId, userId),
        eq(infantNotificationPrefsTable.childId, childId),
      ),
    )
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(infantNotificationPrefsTable)
    .values({ userId, childId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  const [retry] = await db
    .select()
    .from(infantNotificationPrefsTable)
    .where(
      and(
        eq(infantNotificationPrefsTable.userId, userId),
        eq(infantNotificationPrefsTable.childId, childId),
      ),
    )
    .limit(1);
  return retry!;
}

async function buildCandidatesForChild(input: {
  childId: number;
  childName: string;
  ageYears: number;
  ageMonthsPart: number;
  ageMonths: number;
  userId: string;
  timezone: string;
  tzOffsetMin: number;
  now: Date;
}): Promise<InfantNotificationCandidate[]> {
  const nowMs = input.now.getTime();
  const { localDate, localHour } = getLocalParts(input.timezone, input.now);

  const [napRows, feedRows, vaxRows] = await Promise.all([
    db
      .select()
      .from(napSessionsTable)
      .where(eq(napSessionsTable.childId, input.childId))
      .orderBy(desc(napSessionsTable.startedAt))
      .limit(30),
    db
      .select()
      .from(infantCareLogsTable)
      .where(
        and(
          eq(infantCareLogsTable.childId, input.childId),
          gte(infantCareLogsTable.loggedAt, new Date(nowMs - 7 * 24 * 60 * 60_000)),
        ),
      )
      .orderBy(desc(infantCareLogsTable.loggedAt))
      .limit(20),
    db
      .select()
      .from(vaccinationLogsTable)
      .where(eq(vaccinationLogsTable.childId, input.childId)),
  ]);

  const history = rowsToHistory(napRows);
  const lastFeed = feedRows.find((r) => r.logType.startsWith("feed_"));
  const logMap: Record<string, "done" | "missed"> = {};
  for (const v of vaxRows) logMap[v.ageLabel] = v.status as "done" | "missed";

  const sleepByDate = dailySleepMinutesFromNaps(napRows, input.tzOffsetMin);
  const sortedDates = [...sleepByDate.keys()].sort((a, b) => b.localeCompare(a));
  const dailySleepMinutes = sortedDates.map((d) => sleepByDate.get(d) ?? 0);

  const candidates: InfantNotificationCandidate[] = [];

  const nap = evaluateNapWindowCandidate({
    childId: input.childId,
    ageMonths: input.ageMonths,
    history,
    nowMs,
    tzOffsetMin: input.tzOffsetMin,
    localDate,
  });
  if (nap) candidates.push(nap);

  const feed = evaluateFeedReminderCandidate({
    childId: input.childId,
    ageMonths: input.ageMonths,
    lastFeedAtMs: lastFeed ? lastFeed.loggedAt.getTime() : null,
    nowMs,
    localDate,
  });
  if (feed) candidates.push(feed);

  candidates.push(
    ...evaluateVaccineCandidates({
      childId: input.childId,
      childName: input.childName,
      ageYears: input.ageYears,
      ageMonthsPart: input.ageMonthsPart,
      logMap,
      localDate,
      localHour,
    }),
  );

  const milestone = evaluateMilestoneTipCandidate({
    childId: input.childId,
    childName: input.childName,
    ageMonths: input.ageMonths,
    localDate,
    localHour,
  });
  if (milestone) candidates.push(milestone);

  const sleepDrift = evaluateSleepDriftCandidate({
    childId: input.childId,
    childName: input.childName,
    dailySleepMinutes,
    localDate,
  });
  if (sleepDrift) candidates.push(sleepDrift);

  return candidates;
}

export async function runInfantNotificationTick(now = new Date()): Promise<{
  attempted: number;
  sent: number;
  throttled: number;
  failed: number;
}> {
  let attempted = 0;
  let sent = 0;
  let throttled = 0;
  let failed = 0;

  const tokenUsers = await db
    .selectDistinct({ userId: pushTokensTable.userId })
    .from(pushTokensTable);
  const userSet = new Set(tokenUsers.map((r) => r.userId));

  const infantChildren = await db
    .select({
      id: childrenTable.id,
      name: childrenTable.name,
      age: childrenTable.age,
      ageMonths: childrenTable.ageMonths,
      userId: childrenTable.userId,
    })
    .from(childrenTable);

  for (const child of infantChildren) {
    const totalMonths = child.age * 12 + child.ageMonths;
    if (totalMonths < 0 || totalMonths >= 24) continue;

    const caregiverIds = await listChildCaregiverUserIds(child.id);
    const targets = caregiverIds.filter((id) => userSet.has(id));
    if (targets.length === 0) continue;

    for (const userId of targets) {
      const globalPrefs = await getOrCreatePreferences(userId);
      if (!globalPrefs.infantCareEnabled) continue;

      const infantPrefs = await loadOrCreateInfantPrefs(userId, child.id);
      const infantSentToday = await countInfantSentToday(userId, globalPrefs.timezone);
      const remaining = Math.max(0, infantPrefs.maxPerDay - infantSentToday);
      if (remaining <= 0) {
        throttled++;
        continue;
      }

      const tzOffsetMin = timezoneOffsetMinutes(globalPrefs.timezone, now);
      const rawCandidates = await buildCandidatesForChild({
        childId: child.id,
        childName: child.name,
        ageYears: child.age,
        ageMonthsPart: child.ageMonths,
        ageMonths: totalMonths,
        userId,
        timezone: globalPrefs.timezone,
        tzOffsetMin,
        now,
      });

      const filtered = rawCandidates.filter((c) => {
        if (!kindEnabled(infantPrefs, c.kind)) return false;
        if (isKindSnoozed(infantPrefs.snoozeUntil, c.kind, now.getTime())) return false;
        return true;
      });

      const toSend = pickBestCandidates(filtered, remaining);
      for (const candidate of toSend) {
        attempted++;
        const result = await dispatchNotification({
          userId,
          category: INFANT_CATEGORY,
          title: candidate.title,
          body: candidate.body,
          deepLink: candidate.deepLink,
          dedupKey: candidate.dedupKey,
          data: {
            infantKind: candidate.kind,
            childId: String(child.id),
            source: "infant_scheduler",
          },
          contentMeta: {
            topicKey: candidate.topicKey,
            contentType: "infant_care",
            relevanceScore: candidate.priority,
          },
        });

        if (result.status === "sent") {
          sent++;
          logger.info(
            {
              evt: "infant_notification.sent",
              userId,
              childId: child.id,
              kind: candidate.kind,
              dedupKey: candidate.dedupKey,
            },
            candidate.title,
          );
        } else if (result.status === "failed") {
          failed++;
        } else {
          throttled++;
        }
      }
    }
  }

  return { attempted, sent, throttled, failed };
}

export async function snoozeInfantNotification(
  userId: string,
  childId: number,
  kind: InfantNotificationKind,
  hours: number,
): Promise<void> {
  const until = new Date(Date.now() + hours * 60 * 60_000).toISOString();
  const prefs = await loadOrCreateInfantPrefs(userId, childId);
  const snoozeUntil = { ...(prefs.snoozeUntil ?? {}), [kind]: until };
  await db
    .update(infantNotificationPrefsTable)
    .set({ snoozeUntil, updatedAt: new Date() })
    .where(
      and(
        eq(infantNotificationPrefsTable.userId, userId),
        eq(infantNotificationPrefsTable.childId, childId),
      ),
    );
}
