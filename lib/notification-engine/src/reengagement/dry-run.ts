import type { LocalDateTimeParts } from "../global/timezone.js";
import { REENGAGEMENT_POLICY } from "./policy.js";
import type { ReengagementDecision } from "./engine.js";

export type ReengagementDryRunAction =
  | "WOULD_SEND"
  | "SUPPRESSED_GLOBAL_DAILY_CAP"
  | "SUPPRESSED_GLOBAL_WEEKLY_CAP"
  | "SUPPRESSED_RECENT_NOTIFICATION"
  | "SUPPRESSED_RECENT_APP_OPEN"
  | "SUPPRESSED_PERMISSION"
  | "SUPPRESSED_NO_TOKEN"
  | "SUPPRESSED_STALE_TOKEN"
  | "SUPPRESSED_OPTED_OUT"
  | "SUPPRESSED_NO_CANDIDATE"
  | "DELAYED_QUIET_HOURS"
  | "DELAYED_SEND_WINDOW"
  | "SKIP";

export interface ReengagementDryRunRow {
  userId: string;
  segment: string;
  accountFlavor: string;
  activityTags: string[];
  neverActivated: boolean;
  candidate: string | null;
  priority: number | null;
  title: string | null;
  body: string | null;
  deepLink: string | null;
  variant: string | null;
  reason: string;
  scheduledLocal: string | null;
  timezone: string;
  action: "would_send" | "skip" | "delay";
  finalAction: ReengagementDryRunAction;
  skipCode: string | null;
  cooldown: "PASS" | "BLOCK";
  quietHours: "PASS" | "BLOCK";
  dailyCap: "PASS" | "BLOCK";
  weeklyCap: "PASS" | "BLOCK";
  recentOpen: "PASS" | "BLOCK";
  recentNotification: "PASS" | "BLOCK";
  token: "PASS" | "BLOCK";
  permission: "PASS" | "BLOCK";
  optedIn: "PASS" | "BLOCK";
  fingerprint: string | null;
  globalDailyCount: number;
  globalWeeklyCount: number;
  lastProactiveAt: string | null;
  minutesSinceLastProactive: number | null;
}

export function finalActionFromDecision(
  decision: ReengagementDecision,
): ReengagementDryRunAction {
  const code = decision.skipCode;
  if (decision.action === "would_send") return "WOULD_SEND";
  if (code === "global_daily_cap" || code === "daily_cap") return "SUPPRESSED_GLOBAL_DAILY_CAP";
  if (code === "global_weekly_cap" || code === "weekly_cap") return "SUPPRESSED_GLOBAL_WEEKLY_CAP";
  if (code === "recent_notification") return "SUPPRESSED_RECENT_NOTIFICATION";
  if (code === "recent_app_open") return "SUPPRESSED_RECENT_APP_OPEN";
  if (code === "permission_denied") return "SUPPRESSED_PERMISSION";
  if (code === "no_token") return "SUPPRESSED_NO_TOKEN";
  if (code === "stale_token") return "SUPPRESSED_STALE_TOKEN";
  if (code === "opted_out") return "SUPPRESSED_OPTED_OUT";
  if (code === "quiet_hours") return "DELAYED_QUIET_HOURS";
  if (code === "outside_send_window") return "DELAYED_SEND_WINDOW";
  if (code === "no_eligible_candidate" || code === "active_user_no_unfinished") {
    return "SUPPRESSED_NO_CANDIDATE";
  }
  return "SKIP";
}

export function formatDryRunRow(
  userId: string,
  decision: ReengagementDecision,
  counts: { daily: number; weekly: number } = {
    daily: decision.sentProactiveToday,
    weekly: decision.sentProactiveThisWeek,
  },
): ReengagementDryRunRow {
  const g = decision.gates;
  const mins =
    decision.minutesSinceLastProactive == null
      ? null
      : Math.round(decision.minutesSinceLastProactive);
  return {
    userId,
    segment: decision.segment,
    accountFlavor: decision.accountFlavor,
    activityTags: decision.activityTags,
    neverActivated: decision.neverActivated,
    candidate: decision.candidate?.category ?? null,
    priority: decision.candidate?.priority ?? null,
    title: decision.candidate?.copy.title ?? null,
    body: decision.candidate?.copy.body ?? null,
    deepLink: decision.candidate?.copy.deepLink ?? null,
    variant: decision.candidate?.copy.variant ?? null,
    reason: decision.candidate?.reason ?? decision.skipCode ?? decision.segmentReason,
    scheduledLocal: decision.candidate?.scheduledLocal ?? null,
    timezone: decision.timezone,
    action: decision.action,
    finalAction: finalActionFromDecision(decision),
    skipCode: decision.skipCode,
    cooldown: decision.skipCode === "cooldown" ? "BLOCK" : "PASS",
    quietHours: g.quietHours ? "BLOCK" : "PASS",
    dailyCap: g.dailyCapOk ? "PASS" : "BLOCK",
    weeklyCap: g.weeklyCapOk ? "PASS" : "BLOCK",
    recentOpen: g.recentAppOpen ? "BLOCK" : "PASS",
    recentNotification: g.recentNotification ? "BLOCK" : "PASS",
    token: g.tokenStale ? "BLOCK" : g.hasToken ? "PASS" : "BLOCK",
    permission: g.permissionOk ? "PASS" : "BLOCK",
    optedIn: g.optedIn ? "PASS" : "BLOCK",
    fingerprint: decision.candidate?.fingerprint ?? null,
    globalDailyCount: counts.daily,
    globalWeeklyCount: counts.weekly,
    lastProactiveAt: decision.lastProactiveAt?.toISOString() ?? null,
    minutesSinceLastProactive: mins,
  };
}

export function formatDryRunLine(row: ReengagementDryRunRow): string {
  const cand = row.candidate ?? "(none)";
  return [
    `User ${row.userId}`,
    `Segment: ${row.segment} (${row.accountFlavor})`,
    `Candidate: ${cand}`,
    `Priority: ${row.priority ?? "—"}`,
    `Reason: ${row.reason}`,
    `Action: ${row.action}`,
    `Final: ${row.finalAction}`,
    `Scheduled: ${row.scheduledLocal ?? "—"} ${row.timezone}`,
    `Deep link: ${row.deepLink ?? "—"}`,
    `Global daily: ${row.globalDailyCount}`,
    `Global weekly: ${row.globalWeeklyCount}`,
    `Last proactive: ${row.lastProactiveAt ?? "—"}`,
    `Minutes since last proactive: ${row.minutesSinceLastProactive ?? "—"}`,
    `Cooldown: ${row.cooldown}`,
    `Quiet hours: ${row.quietHours}`,
    `Daily cap: ${row.dailyCap}`,
    `Weekly cap: ${row.weeklyCap}`,
    `Recent open: ${row.recentOpen}`,
    `Recent notification: ${row.recentNotification}`,
    `Token: ${row.token}`,
    `Permission: ${row.permission}`,
    `Opt-in: ${row.optedIn}`,
  ].join("\n");
}

export function isReengagementSendSlot(
  local: LocalDateTimeParts,
  preferredHour: number | null,
): boolean {
  const hour =
    preferredHour != null && preferredHour >= 0 && preferredHour <= 23
      ? preferredHour
      : REENGAGEMENT_POLICY.preferredSendHour;
  return local.hour === hour && local.minute === REENGAGEMENT_POLICY.preferredSendMinute;
}
