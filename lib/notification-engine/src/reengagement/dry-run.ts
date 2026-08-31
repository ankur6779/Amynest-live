import type { LocalDateTimeParts } from "../global/timezone.js";
import { REENGAGEMENT_POLICY } from "./policy.js";
import type { ReengagementDecision } from "./engine.js";

export interface ReengagementDryRunRow {
  userId: string;
  segment: string;
  accountFlavor: string;
  activityTags: string[];
  neverActivated: boolean;
  candidate: string | null;
  title: string | null;
  body: string | null;
  deepLink: string | null;
  variant: string | null;
  reason: string;
  scheduledLocal: string | null;
  action: "would_send" | "skip" | "delay";
  skipCode: string | null;
  cooldown: "PASS" | "BLOCK";
  quietHours: "PASS" | "BLOCK";
  dailyCap: "PASS" | "BLOCK";
  weeklyCap: "PASS" | "BLOCK";
  recentOpen: "PASS" | "BLOCK";
  token: "PASS" | "BLOCK";
  permission: "PASS" | "BLOCK";
  optedIn: "PASS" | "BLOCK";
  fingerprint: string | null;
}

export function formatDryRunRow(
  userId: string,
  decision: ReengagementDecision,
): ReengagementDryRunRow {
  const g = decision.gates;
  return {
    userId,
    segment: decision.segment,
    accountFlavor: decision.accountFlavor,
    activityTags: decision.activityTags,
    neverActivated: decision.neverActivated,
    candidate: decision.candidate?.category ?? null,
    title: decision.candidate?.copy.title ?? null,
    body: decision.candidate?.copy.body ?? null,
    deepLink: decision.candidate?.copy.deepLink ?? null,
    variant: decision.candidate?.copy.variant ?? null,
    reason: decision.candidate?.reason ?? decision.skipCode ?? decision.segmentReason,
    scheduledLocal: decision.candidate?.scheduledLocal ?? null,
    action: decision.action,
    skipCode: decision.skipCode,
    cooldown: decision.skipCode === "cooldown" ? "BLOCK" : "PASS",
    quietHours: g.quietHours ? "BLOCK" : "PASS",
    dailyCap: g.dailyCapOk ? "PASS" : "BLOCK",
    weeklyCap: g.weeklyCapOk ? "PASS" : "BLOCK",
    recentOpen: g.recentAppOpen ? "BLOCK" : "PASS",
    token: g.hasToken ? "PASS" : "BLOCK",
    permission: g.permissionOk ? "PASS" : "BLOCK",
    optedIn: g.optedIn ? "PASS" : "BLOCK",
    fingerprint: decision.candidate?.fingerprint ?? null,
  };
}

export function formatDryRunLine(row: ReengagementDryRunRow): string {
  const cand = row.candidate ?? "(none)";
  return [
    `User ${row.userId}`,
    `Segment: ${row.segment} (${row.accountFlavor})`,
    `Candidate: ${cand}`,
    `Reason: ${row.reason}`,
    `Action: ${row.action}`,
    `Scheduled: ${row.scheduledLocal ?? "—"} local`,
    `Deep link: ${row.deepLink ?? "—"}`,
    `Cooldown: ${row.cooldown}`,
    `Quiet hours: ${row.quietHours}`,
    `Daily cap: ${row.dailyCap}`,
    `Weekly cap: ${row.weeklyCap}`,
    `Recent open: ${row.recentOpen}`,
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
