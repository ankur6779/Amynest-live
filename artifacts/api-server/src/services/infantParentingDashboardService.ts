/**
 * Infant Parenting product analytics dashboard — admin aggregation.
 */
import {
  and,
  eq,
  gte,
  lte,
  sql,
  inArray,
  or,
} from "drizzle-orm";
import {
  db,
  childrenTable,
  infantProductAnalyticsEventsTable,
  infantCareLogsTable,
  infantGrowthMeasurementsTable,
  napSessionsTable,
  crySessionsTable,
  notificationLogTable,
  childCaregiversTable,
} from "@workspace/db";
import {
  buildAlerts,
  computeRetentionCohorts,
  countDistinctUsers,
  countEvents,
  type DashboardAlert,
} from "./infantParentingDashboardMetrics.js";

export type { DashboardAlert };

export type FunnelStep = {
  key: string;
  label: string;
  count: number;
  dropOffPct: number | null;
  conversionFromStartPct: number;
};

export type InfantParentingDashboard = {
  windowDays: number;
  generatedAt: string;
  acquisition: {
    infantHubOpens: number;
    newInfantProfiles: number;
    activationStarts: number;
    activationCompletionRate: number;
  };
  engagement: {
    babyTodayViews: number;
    cryInsightUsage: number;
    avgFeedLogsPerUser: number;
    avgSleepLogsPerUser: number;
    avgGrowthEntriesPerUser: number;
  };
  retention: {
    d1: number;
    d7: number;
    d30: number;
    cohortSize: number;
  };
  notifications: Record<
    string,
    { sent: number; opened: number; dismissed: number; openRate: number }
  >;
  sharing: {
    weeklyCardsGenerated: number;
    weeklyCardsShared: number;
    milestoneCardsShared: number;
    byMethod: Record<string, number>;
  };
  coParent: {
    inviteStarted: number;
    inviteSent: number;
    inviteAccepted: number;
  };
  funnel: FunnelStep[];
  featureRanking: Array<{
    feature: string;
    label: string;
    dau: number;
    wau: number;
    retentionImpactScore: number;
  }>;
  ageBandActivity: Array<{ band: string; activeUsers: number; events: number }>;
  alerts: DashboardAlert[];
};

const INFANT_MAX_AGE_MONTHS = 24;

const FUNNEL_DEFINITION: Array<{ key: string; label: string; events: string[] }> = [
  { key: "hub_opened", label: "Hub Opened", events: ["infant_hub_opened"] },
  { key: "activation_started", label: "Activation Started", events: ["infant_activation_started"] },
  { key: "first_feed", label: "First Feed Logged", events: ["feed_logged", "first_log_created"] },
  { key: "first_sleep", label: "First Sleep Logged", events: ["sleep_log_added"] },
  { key: "cry_insight", label: "Cry Insight Used", events: ["cry_analysis_completed", "cry_recording_completed"] },
  { key: "activation_completed", label: "Activation Completed", events: ["infant_activation_completed"] },
  { key: "weekly_report_viewed", label: "Weekly Report Viewed", events: ["weekly_report_viewed"] },
  { key: "weekly_report_shared", label: "Weekly Report Shared", events: ["weekly_share_card_shared", "weekly_report_shared"] },
];

const NOTIFICATION_KINDS = [
  "nap_window",
  "feed_reminder",
  "vaccine_due",
  "milestone_tip",
  "sleep_drift",
] as const;

const FEATURE_RANKING: Array<{ feature: string; label: string; events: string[] }> = [
  { feature: "baby_today", label: "Baby Today", events: ["baby_today_viewed"] },
  { feature: "cry_insight", label: "Cry Insight", events: ["cry_analysis_completed", "cry_recording_completed"] },
  { feature: "feeding", label: "Feed Logging", events: ["feed_logged"] },
  { feature: "sleep", label: "Sleep Logging", events: ["sleep_log_added"] },
  { feature: "growth", label: "Growth Tracking", events: ["growth_measurement_added"] },
  { feature: "milestones", label: "Milestones", events: ["milestone_completed"] },
  { feature: "weekly_share", label: "Weekly Share", events: ["weekly_share_card_shared"] },
  { feature: "wellbeing", label: "Parent Wellbeing", events: ["wellbeing_checkin_completed"] },
];

function topicKeyToKind(topicKey: string | null): string | null {
  if (!topicKey) return null;
  const match = topicKey.match(/^infant:([a-z_]+)$/);
  return match?.[1] ?? null;
}

export async function computeInfantParentingDashboard(
  windowDays = 30,
): Promise<InfantParentingDashboard> {
  const now = Date.now();
  const windowMs = windowDays * 86400000;
  const cutoff = new Date(now - windowMs);
  const prevCutoff = new Date(now - windowMs * 2);
  const dauCutoff = new Date(now - 86400000);
  const wauCutoff = new Date(now - 7 * 86400000);

  const infantChildren = await db
    .select({ id: childrenTable.id, userId: childrenTable.userId, ageMonths: childrenTable.ageMonths, createdAt: childrenTable.createdAt })
    .from(childrenTable)
    .where(lte(childrenTable.ageMonths, INFANT_MAX_AGE_MONTHS));

  const infantChildIds = infantChildren.map((c) => c.id);

  const [eventRows, prevEventRows, feedAgg, sleepAgg, growthAgg] = await Promise.all([
    db
      .select({
        userId: infantProductAnalyticsEventsTable.userId,
        childId: infantProductAnalyticsEventsTable.childId,
        event: infantProductAnalyticsEventsTable.event,
        infantAgeBand: infantProductAnalyticsEventsTable.infantAgeBand,
        properties: infantProductAnalyticsEventsTable.properties,
        createdAt: infantProductAnalyticsEventsTable.createdAt,
      })
      .from(infantProductAnalyticsEventsTable)
      .where(gte(infantProductAnalyticsEventsTable.createdAt, cutoff)),
    db
      .select({
        userId: infantProductAnalyticsEventsTable.userId,
        event: infantProductAnalyticsEventsTable.event,
        properties: infantProductAnalyticsEventsTable.properties,
        createdAt: infantProductAnalyticsEventsTable.createdAt,
      })
      .from(infantProductAnalyticsEventsTable)
      .where(
        and(
          gte(infantProductAnalyticsEventsTable.createdAt, prevCutoff),
          lte(infantProductAnalyticsEventsTable.createdAt, cutoff),
        ),
      ),
    infantChildIds.length > 0
      ? db
          .select({
            userId: infantCareLogsTable.userId,
            count: sql<number>`count(*)::int`,
          })
          .from(infantCareLogsTable)
          .where(
            and(
              gte(infantCareLogsTable.loggedAt, cutoff),
              inArray(infantCareLogsTable.childId, infantChildIds),
              or(
                eq(infantCareLogsTable.logType, "feed_breast"),
                eq(infantCareLogsTable.logType, "feed_bottle"),
                eq(infantCareLogsTable.logType, "feed_solid"),
              ),
            ),
          )
          .groupBy(infantCareLogsTable.userId)
      : Promise.resolve([]),
    infantChildIds.length > 0
      ? db
          .select({
            userId: napSessionsTable.userId,
            count: sql<number>`count(*)::int`,
          })
          .from(napSessionsTable)
          .where(
            and(
              gte(napSessionsTable.startedAt, cutoff),
              inArray(napSessionsTable.childId, infantChildIds),
            ),
          )
          .groupBy(napSessionsTable.userId)
      : Promise.resolve([]),
    infantChildIds.length > 0
      ? db
          .select({
            userId: infantGrowthMeasurementsTable.userId,
            count: sql<number>`count(*)::int`,
          })
          .from(infantGrowthMeasurementsTable)
          .where(
            and(
              gte(infantGrowthMeasurementsTable.measuredAt, cutoff),
              inArray(infantGrowthMeasurementsTable.childId, infantChildIds),
            ),
          )
          .groupBy(infantGrowthMeasurementsTable.userId)
      : Promise.resolve([]),
  ]);

  const notifRows = await db
    .select({
      topicKey: notificationLogTable.topicKey,
      status: notificationLogTable.status,
      openedAt: notificationLogTable.openedAt,
      dismissedAt: notificationLogTable.dismissedAt,
      sentAt: notificationLogTable.sentAt,
    })
    .from(notificationLogTable)
    .where(
      and(
        eq(notificationLogTable.category, "infant_care"),
        gte(notificationLogTable.sentAt, cutoff),
      ),
    );

  const prevNotifRows = await db
    .select({
      openedAt: notificationLogTable.openedAt,
      sentAt: notificationLogTable.sentAt,
      status: notificationLogTable.status,
    })
    .from(notificationLogTable)
    .where(
      and(
        eq(notificationLogTable.category, "infant_care"),
        gte(notificationLogTable.sentAt, prevCutoff),
        lte(notificationLogTable.sentAt, cutoff),
      ),
    );

  const coParentRows = await db
    .select({
      status: childCaregiversTable.status,
      invitedAt: childCaregiversTable.invitedAt,
      acceptedAt: childCaregiversTable.acceptedAt,
    })
    .from(childCaregiversTable)
    .where(gte(childCaregiversTable.createdAt, cutoff));

  const cryDbCount =
    infantChildIds.length > 0
      ? await db
          .select({ count: sql<number>`count(*)::int` })
          .from(crySessionsTable)
          .where(
            and(
              gte(crySessionsTable.createdAt, cutoff),
              inArray(crySessionsTable.childId, infantChildIds),
            ),
          )
      : [{ count: 0 }];

  const eventPayload = eventRows.map((r) => ({
    userId: r.userId,
    event: r.event,
    infantAgeBand: r.infantAgeBand,
    properties: r.properties ?? {},
    createdAt: r.createdAt,
  }));

  const prevPayload = prevEventRows.map((r) => ({
    userId: r.userId,
    event: r.event,
    properties: r.properties ?? {},
  }));

  const newInfantProfiles = infantChildren.filter(
    (c) => c.createdAt && c.createdAt >= cutoff,
  ).length;

  const activationStarts = countEvents(eventPayload, ["infant_activation_started"]);
  const activationCompleted = countEvents(eventPayload, ["infant_activation_completed"]);
  const activationCompletionRate =
    activationStarts > 0
      ? Math.round((activationCompleted / activationStarts) * 100)
      : 0;

  const prevActivationStarts = countEvents(prevPayload, ["infant_activation_started"]);
  const prevActivationCompleted = countEvents(prevPayload, ["infant_activation_completed"]);
  const prevActivationRate =
    prevActivationStarts > 0
      ? Math.round((prevActivationCompleted / prevActivationStarts) * 100)
      : 0;

  const cryEventUsage = countEvents(eventPayload, [
    "cry_analysis_completed",
    "cry_recording_completed",
  ]);
  const cryUsageTotal = cryEventUsage + (cryDbCount[0]?.count ?? 0);
  const prevCryUsage =
    countEvents(prevPayload, ["cry_analysis_completed", "cry_recording_completed"]);

  const avg = (rows: Array<{ count: number }>) => {
    if (rows.length === 0) return 0;
    const sum = rows.reduce((s, r) => s + Number(r.count), 0);
    return Math.round((sum / rows.length) * 10) / 10;
  };

  const notifications: InfantParentingDashboard["notifications"] = {};
  for (const kind of NOTIFICATION_KINDS) {
    notifications[kind] = { sent: 0, opened: 0, dismissed: 0, openRate: 0 };
  }
  let totalSent = 0;
  let totalOpened = 0;
  for (const row of notifRows) {
    const kind = topicKeyToKind(row.topicKey) ?? "other";
    if (!notifications[kind]) {
      notifications[kind] = { sent: 0, opened: 0, dismissed: 0, openRate: 0 };
    }
    if (row.status === "sent") {
      notifications[kind].sent++;
      totalSent++;
    }
    if (row.openedAt) {
      notifications[kind].opened++;
      totalOpened++;
    }
    if (row.dismissedAt) notifications[kind].dismissed++;
  }
  for (const kind of Object.keys(notifications)) {
    const n = notifications[kind]!;
    n.openRate = n.sent > 0 ? Math.round((n.opened / n.sent) * 100) : 0;
  }

  let prevSent = 0;
  let prevOpened = 0;
  for (const row of prevNotifRows) {
    if (row.status === "sent") prevSent++;
    if (row.openedAt) prevOpened++;
  }
  const notifOpenRateCurrent = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const notifOpenRatePrevious = prevSent > 0 ? Math.round((prevOpened / prevSent) * 100) : 0;

  const shareByMethod: Record<string, number> = {};
  for (const row of eventPayload) {
    if (
      row.event === "weekly_share_card_shared" ||
      row.event === "milestone_card_shared"
    ) {
      const method = String(row.properties.shareMethod ?? "unknown");
      shareByMethod[method] = (shareByMethod[method] ?? 0) + 1;
    }
  }

  const funnel: FunnelStep[] = [];
  let prevCount = 0;
  const hubCount = countDistinctUsers(eventPayload, ["infant_hub_opened"]);
  for (const step of FUNNEL_DEFINITION) {
    const count = countDistinctUsers(eventPayload, step.events);
    funnel.push({
      key: step.key,
      label: step.label,
      count,
      dropOffPct:
        prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : null,
      conversionFromStartPct:
        hubCount > 0 ? Math.round((count / hubCount) * 100) : 0,
    });
    prevCount = count;
  }

  const dauRows = eventPayload.filter((r) => r.createdAt >= dauCutoff);
  const wauRows = eventPayload.filter((r) => r.createdAt >= wauCutoff);
  const retainedUserSet = new Set(
    eventPayload
      .filter((r) => r.createdAt >= wauCutoff)
      .map((r) => r.userId),
  );

  const featureRanking = FEATURE_RANKING.map((f) => {
    const dau = countDistinctUsers(dauRows, f.events);
    const wau = countDistinctUsers(wauRows, f.events);
    const featureUsers = new Set(
      wauRows.filter((r) => f.events.includes(r.event)).map((r) => r.userId),
    );
    let overlap = 0;
    for (const uid of featureUsers) {
      if (retainedUserSet.has(uid)) overlap++;
    }
    const retentionImpactScore =
      featureUsers.size > 0 ? Math.round((overlap / featureUsers.size) * 100) : 0;
    return {
      feature: f.feature,
      label: f.label,
      dau,
      wau,
      retentionImpactScore,
    };
  }).sort((a, b) => b.wau - a.wau || b.dau - a.dau);

  const bandMap = new Map<string, { users: Set<string>; events: number }>();
  for (const row of eventPayload) {
    const band = row.infantAgeBand ?? "unknown";
    if (!bandMap.has(band)) bandMap.set(band, { users: new Set(), events: 0 });
    const entry = bandMap.get(band)!;
    entry.users.add(row.userId);
    entry.events++;
  }
  const ageBandActivity = [...bandMap.entries()]
    .map(([band, v]) => ({
      band,
      activeUsers: v.users.size,
      events: v.events,
    }))
    .sort((a, b) => b.activeUsers - a.activeUsers);

  const retention = computeRetentionCohorts(eventPayload, windowDays);

  const coParentFromEvents = {
    inviteStarted: countEvents(eventPayload, ["coparent_invite_started"]),
    inviteSent: countEvents(eventPayload, ["coparent_invite_sent"]),
    inviteAccepted: countEvents(eventPayload, ["coparent_invite_accepted"]),
  };

  return {
    windowDays,
    generatedAt: new Date().toISOString(),
    acquisition: {
      infantHubOpens: countDistinctUsers(eventPayload, ["infant_hub_opened"]),
      newInfantProfiles,
      activationStarts,
      activationCompletionRate,
    },
    engagement: {
      babyTodayViews: countDistinctUsers(eventPayload, ["baby_today_viewed"]),
      cryInsightUsage: cryUsageTotal,
      avgFeedLogsPerUser: avg(feedAgg),
      avgSleepLogsPerUser: avg(sleepAgg),
      avgGrowthEntriesPerUser: avg(growthAgg),
    },
    retention,
    notifications,
    sharing: {
      weeklyCardsGenerated: countEvents(eventPayload, ["weekly_share_card_generated"]),
      weeklyCardsShared: countEvents(eventPayload, ["weekly_share_card_shared"]),
      milestoneCardsShared: countEvents(eventPayload, ["milestone_card_shared"]),
      byMethod: shareByMethod,
    },
    coParent: {
      inviteStarted: Math.max(coParentFromEvents.inviteStarted, coParentRows.filter((r) => r.invitedAt).length),
      inviteSent: Math.max(coParentFromEvents.inviteSent, coParentRows.length),
      inviteAccepted: Math.max(
        coParentFromEvents.inviteAccepted,
        coParentRows.filter((r) => r.status === "active" && r.acceptedAt).length,
      ),
    },
    funnel,
    featureRanking,
    ageBandActivity,
    alerts: buildAlerts({
      activationRateCurrent: activationCompletionRate,
      activationRatePrevious: prevActivationRate,
      cryUsageCurrent: cryUsageTotal,
      cryUsagePrevious: prevCryUsage,
      notifOpenRateCurrent: notifOpenRateCurrent,
      notifOpenRatePrevious: notifOpenRatePrevious,
    }),
  };
}
