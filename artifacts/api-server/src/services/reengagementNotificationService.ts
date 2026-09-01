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
  isProactiveNotificationCategory,
  isStalePushToken,
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
  dryRunDefaultPreferences,
  getOrCreatePreferences,
  getPreferencesIfExists,
  type DispatchResult,
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
        category: notificationLogTable.category,
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

  const reengagementRows = recent.filter(
    (r) =>
      r.campaignId === "reengagement" ||
      (r.dedupKey != null && r.dedupKey.includes("_reengagement_")),
  );
  const proactive = recent.filter((r) => isProactiveNotificationCategory(r.category));

  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const sentProactiveToday = proactive.filter((r) => fmt.format(r.sentAt) === localDate).length;
  const lastProactiveAt = proactive.reduce<Date | null>((acc, r) => {
    if (!acc || r.sentAt > acc) return r.sentAt;
    return acc;
  }, null);

  const lastSentByCategory: Partial<Record<ReengagementCategory, Date>> = {};
  for (const row of reengagementRows) {
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
  const tokenStale =
    tokens.length > 0 && tokens.every((t) => isStalePushToken(t.lastSeenAt, now));

  return {
    todayPlanExists,
    todayPlanOpened,
    onboardingIncomplete: onboarding ? !onboarding.onboardingComplete : false,
    routineOpenedNotStarted,
    hasSpeechPracticeDue: false,
    lastActiveAt: lastSeen,
    sentProactiveToday,
    sentProactiveThisWeek: proactive.length,
    lastProactiveAt,
    lastSentByCategory,
    hasPushToken: tokens.length > 0,
    tokenStale,
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

export const SINGLE_USER_CANARY_CONFIRM = "single-user-canary";

/** If `NOTIF_CANARY_USER_IDS` is set, the canary may target only those uids. Empty = admin may pass any one uid. */
export function canaryUserIdAllowed(
  targetUserId: string,
  rawEnv: string | undefined = process.env["NOTIF_CANARY_USER_IDS"],
): boolean {
  const list = (rawEnv ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return true;
  return list.includes(targetUserId);
}

async function dispatchReengagementCandidate(
  userId: string,
  decision: ReengagementDecision,
  prefs: Awaited<ReturnType<typeof getOrCreatePreferences>>,
): Promise<DispatchResult | null> {
  const c = decision.candidate;
  if (!c || decision.action !== "would_send") return null;
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
  return result;
}

export async function evaluateReengagementForUser(
  userId: string,
  opts: {
    now?: Date;
    ignoreSendWindow?: boolean;
    mode?: ReengagementMode;
    /** When true, never INSERT/UPDATE preferences or other user state. */
    readOnly?: boolean;
  } = {},
): Promise<ReengagementEvalResult | null> {
  const now = opts.now ?? new Date();
  const mode = opts.mode ?? reengagementMode();
  const readOnly = opts.readOnly === true || mode !== "live";
  const prefs = readOnly
    ? ((await getPreferencesIfExists(userId)) ?? dryRunDefaultPreferences(userId))
    : await getOrCreatePreferences(userId);
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
    const result = await dispatchReengagementCandidate(userId, decision, prefs);
    dispatched = result?.status === "sent";
  } else {
    if (decision.skipCode) {
      logger.info(
        {
          evt: "notification_suppressed",
          reason: decision.skipCode,
          userId,
          category: decision.candidate?.category ?? null,
          mode,
        },
        "Re-engagement candidate suppressed",
      );
    }
    logger.info(
      {
        evt: "notification_reengagement_dry_run",
        mode,
        userId,
        action: decision.action,
        skipCode: decision.skipCode,
        finalAction: dryRun.finalAction,
        category: decision.candidate?.category ?? null,
        segment: decision.segment,
        deepLink: decision.candidate?.copy.deepLink ?? null,
      },
      "Re-engagement dry-run",
    );
  }

  return { userId, decision, dryRun, dispatched };
}

export interface SingleUserCanaryResult {
  evaluated: boolean;
  dryRun: ReengagementDryRunRow | null;
  dispatched: boolean;
  dispatch: DispatchResult | null;
  globalMode: ReengagementMode;
  liveSendEnabled: false;
}

/**
 * Founder-approved single-user exception: evaluate in dry_run (respect quiet
 * hours, caps, tokens) and dispatch via existing dispatchNotification only if
 * finalAction is WOULD_SEND. Does not set NOTIF_REENGAGEMENT_MODE=live.
 */
export async function runApprovedSingleUserCanary(
  userId: string,
  now = new Date(),
): Promise<SingleUserCanaryResult> {
  const globalMode = reengagementMode();
  const evalResult = await evaluateReengagementForUser(userId, {
    now,
    mode: "dry_run",
    readOnly: true,
    ignoreSendWindow: false,
  });
  if (!evalResult) {
    return {
      evaluated: false,
      dryRun: null,
      dispatched: false,
      dispatch: null,
      globalMode,
      liveSendEnabled: false,
    };
  }
  if (evalResult.dryRun.finalAction !== "WOULD_SEND" || !evalResult.decision.candidate) {
    return {
      evaluated: true,
      dryRun: evalResult.dryRun,
      dispatched: false,
      dispatch: null,
      globalMode,
      liveSendEnabled: false,
    };
  }
  const prefs =
    (await getPreferencesIfExists(userId)) ?? dryRunDefaultPreferences(userId);
  const dispatch = await dispatchReengagementCandidate(
    userId,
    evalResult.decision,
    prefs,
  );
  return {
    evaluated: true,
    dryRun: evalResult.dryRun,
    dispatched: dispatch?.status === "sent",
    dispatch,
    globalMode,
    liveSendEnabled: false,
  };
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
      const prefs =
        (await getPreferencesIfExists(userId)) ?? dryRunDefaultPreferences(userId);
      const local = getLocalDateTimeParts(prefs.timezone, now);
      if (!isReengagementSendSlot(local, prefs.preferredEngagementHour)) {
        continue;
      }
      const result = await evaluateReengagementForUser(userId, {
        now,
        mode,
        readOnly: mode !== "live",
      });
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
      readOnly: true,
    });
    if (result) rows.push(result.dryRun);
  }
  return rows;
}

export async function dryRunReengagementForUserId(
  userId: string,
  now = new Date(),
): Promise<ReengagementDryRunRow | null> {
  const result = await evaluateReengagementForUser(userId, {
    now,
    ignoreSendWindow: false,
    mode: "dry_run",
    readOnly: true,
  });
  return result?.dryRun ?? null;
}
