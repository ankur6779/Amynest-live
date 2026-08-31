/**
 * Signed-in re-engagement adapter — loads existing product data, runs the
 * deterministic selector, and either dry-runs or dispatches via the existing
 * FCM path. Live send requires NOTIF_REENGAGEMENT_MODE=live.
 */
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import {
  db,
  childrenTable,
  notificationLogTable,
  onboardingProfilesTable,
  pushTokensTable,
  routinesTable,
} from "@workspace/db";
import {
  decideReengagement,
  formatDryRunRow,
  isReengagementSendSlot,
  parseReengagementMode,
  getLocalDateTimeParts,
  type ReengagementCategory,
  type ReengagementDecision,
  type ReengagementDryRunRow,
  type ReengagementFacts,
  type ReengagementMode,
} from "@workspace/notification-engine";
import { logger } from "../lib/logger.js";
import { loadOutcomeSignals } from "./notificationOutcomeService.js";
import {
  dispatchNotification,
  getOrCreatePreferences,
} from "./notificationDispatchService.js";

export function reengagementMode(): ReengagementMode {
  return parseReengagementMode(process.env["NOTIF_REENGAGEMENT_MODE"]);
}

function localDateString(timezone: string, now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

async function loadFacts(
  userId: string,
  timezone: string,
  now: Date,
  prefs: Awaited<ReturnType<typeof getOrCreatePreferences>>,
): Promise<ReengagementFacts> {
  const localDate = localDateString(timezone, now);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const [tokens, onboarding, child, recent] = await Promise.all([
    db
      .select({ lastSeenAt: pushTokensTable.lastSeenAt, platform: pushTokensTable.platform })
      .from(pushTokensTable)
      .where(eq(pushTokensTable.userId, userId)),
    db
      .select({ onboardingComplete: onboardingProfilesTable.onboardingComplete })
      .from(onboardingProfilesTable)
      .where(eq(onboardingProfilesTable.userId, userId))
      .limit(1)
      .then((r) => r[0])
      .catch(() => undefined),
    db
      .select({ id: childrenTable.id })
      .from(childrenTable)
      .where(eq(childrenTable.userId, userId))
      .orderBy(desc(childrenTable.createdAt))
      .limit(1)
      .then((r) => r[0]),
    db
      .select({
        sentAt: notificationLogTable.sentAt,
        status: notificationLogTable.status,
        campaignId: notificationLogTable.campaignId,
        recommendationKey: notificationLogTable.recommendationKey,
        dedupKey: notificationLogTable.dedupKey,
      })
      .from(notificationLogTable)
      .where(
        and(
          eq(notificationLogTable.userId, userId),
          gte(notificationLogTable.sentAt, weekAgo),
          inArray(notificationLogTable.status, ["sent", "pending"]),
        ),
      ),
  ]);

  let todayPlanExists = false;
  let todayPlanOpened = false;
  let routineOpenedNotStarted = false;
  if (child) {
    const [routine] = await db
      .select({ items: routinesTable.items })
      .from(routinesTable)
      .where(and(eq(routinesTable.childId, child.id), eq(routinesTable.date, localDate)))
      .limit(1);
    if (routine) {
      todayPlanExists = true;
      const items = (routine.items ?? []) as Array<{ status?: string }>;
      const completed = items.filter((i) => i.status === "completed" || i.status === "done").length;
      todayPlanOpened = completed > 0;
      routineOpenedNotStarted = items.length > 0 && completed === 0;
    }
  }

  const proactive = recent.filter(
    (r) =>
      r.campaignId === "reengagement" ||
      (r.dedupKey != null && r.dedupKey.includes("_reengagement_")),
  );

  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const sentProactiveToday = proactive.filter((r) => fmt.format(r.sentAt) === localDate).length;

  const lastSentByCategory: Partial<Record<ReengagementCategory, Date>> = {};
  for (const row of proactive) {
    const key = row.recommendationKey as ReengagementCategory | null;
    if (!key) continue;
    const prev = lastSentByCategory[key];
    if (!prev || row.sentAt > prev) lastSentByCategory[key] = row.sentAt;
  }

  const lastSeen = tokens.reduce<Date | null>((acc, t) => {
    if (!t.lastSeenAt) return acc;
    if (!acc || t.lastSeenAt > acc) return t.lastSeenAt;
    return acc;
  }, null);

  return {
    todayPlanExists,
    todayPlanOpened,
    onboardingIncomplete: onboarding ? !onboarding.onboardingComplete : false,
    routineOpenedNotStarted,
    hasSpeechPracticeDue: false,
    lastActiveAt: lastSeen,
    sentProactiveToday,
    sentProactiveThisWeek: proactive.length,
    lastSentByCategory,
    hasPushToken: tokens.length > 0,
    permissionGranted: tokens.length > 0 ? true : undefined,
    engagementOptIn: prefs.engagementEnabled,
    timezone,
    quietHoursStart: prefs.quietHoursStart,
    quietHoursEnd: prefs.quietHoursEnd,
    preferredHour: prefs.preferredEngagementHour,
  };
}

export interface ReengagementEvalResult {
  userId: string;
  decision: ReengagementDecision;
  dryRun: ReengagementDryRunRow;
  dispatched: boolean;
}

export async function evaluateReengagementForUser(
  userId: string,
  opts: { now?: Date; ignoreSendWindow?: boolean; mode?: ReengagementMode } = {},
): Promise<ReengagementEvalResult | null> {
  const now = opts.now ?? new Date();
  const mode = opts.mode ?? reengagementMode();
  const prefs = await getOrCreatePreferences(userId);
  const signals = await loadOutcomeSignals(userId, prefs.timezone);
  if (!signals) return null;

  const facts = await loadFacts(userId, prefs.timezone, now, prefs);
  const decision = decideReengagement({
    signals,
    facts,
    now,
    ignoreSendWindow: opts.ignoreSendWindow,
  });
  const dryRun = formatDryRunRow(userId, decision);

  let dispatched = false;
  if (mode === "live" && decision.action === "would_send" && decision.candidate) {
    const c = decision.candidate;
    const result = await dispatchNotification({
      userId,
      category: "engagement",
      title: c.copy.title,
      body: c.copy.body,
      deepLink: c.copy.deepLink,
      dedupKey: c.fingerprint,
      data: {
        campaign: "reengagement",
        notificationType: c.category,
        fingerprint: c.fingerprint,
        variant: c.copy.variant,
      },
      contentMeta: {
        recommendationKey: c.category,
        topicKey: "reengagement",
        contentType: c.category.toLowerCase(),
      },
      outcomeMeta: {
        goal: c.category === "WINBACK" ? "GOAL_REACTIVATION" : "GOAL_PARENT_ENGAGEMENT",
        campaignId: "reengagement",
        experimentId: c.copy.experimentId,
        experimentVariant: c.copy.variant,
        segment: decision.segment,
      },
      globalMeta: {
        locale: prefs.locale,
        timezoneAtSend: prefs.timezone,
      },
    });
    dispatched = result.status === "sent";
    logger.info(
      {
        evt: "notification_reengagement_dispatch",
        userId,
        status: result.status,
        category: c.category,
        fingerprint: c.fingerprint,
      },
      "Re-engagement dispatch result",
    );
  } else {
    logger.info(
      {
        evt: "notification_reengagement_dry_run",
        mode,
        userId,
        action: decision.action,
        skipCode: decision.skipCode,
        category: decision.candidate?.category ?? null,
        segment: decision.segment,
        deepLink: decision.candidate?.copy.deepLink ?? null,
      },
      "Re-engagement dry-run",
    );
  }

  return { userId, decision, dryRun, dispatched };
}

export async function runReengagementTick(now = new Date()): Promise<{
  mode: ReengagementMode;
  evaluated: number;
  wouldSend: number;
  dispatched: number;
  skipped: number;
  delayed: number;
}> {
  const mode = reengagementMode();
  if (mode === "off") {
    return { mode, evaluated: 0, wouldSend: 0, dispatched: 0, skipped: 0, delayed: 0 };
  }

  const tokenUsers = await db
    .selectDistinct({ userId: pushTokensTable.userId })
    .from(pushTokensTable);

  let evaluated = 0;
  let wouldSend = 0;
  let dispatched = 0;
  let skipped = 0;
  let delayed = 0;

  for (const { userId } of tokenUsers) {
    try {
      const prefs = await getOrCreatePreferences(userId);
      const local = getLocalDateTimeParts(prefs.timezone, now);
      if (!isReengagementSendSlot(local, prefs.preferredEngagementHour)) {
        continue;
      }
      const result = await evaluateReengagementForUser(userId, { now, mode });
      if (!result) continue;
      evaluated++;
      if (result.dispatched) dispatched++;
      if (result.decision.action === "would_send") wouldSend++;
      else if (result.decision.action === "delay") delayed++;
      else skipped++;
    } catch (err) {
      logger.warn({ err, userId }, "Re-engagement tick failed for user");
    }
  }

  logger.info(
    { evt: "notification_reengagement_tick", mode, evaluated, wouldSend, dispatched, skipped, delayed },
    "Re-engagement tick summary",
  );
  return { mode, evaluated, wouldSend, dispatched, skipped, delayed };
}

export async function dryRunReengagementSnapshot(
  limit = 50,
  now = new Date(),
): Promise<ReengagementDryRunRow[]> {
  const tokenUsers = await db
    .selectDistinct({ userId: pushTokensTable.userId })
    .from(pushTokensTable)
    .limit(limit);

  const rows: ReengagementDryRunRow[] = [];
  for (const { userId } of tokenUsers) {
    const result = await evaluateReengagementForUser(userId, {
      now,
      ignoreSendWindow: true,
      mode: "dry_run",
    });
    if (result) rows.push(result.dryRun);
  }
  return rows;
}
