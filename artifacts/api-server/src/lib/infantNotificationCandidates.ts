/**
 * Pure evaluation of infant smart notification candidates.
 * Unit-tested without DB or push infrastructure.
 */
import {
  VACCINATIONS,
  getPendingVaccinations,
  getUpcomingVaccinationsWithLog,
  pickDailyActivity,
  suggestedFeedIntervalMin,
  type VaxLogMap,
} from "@workspace/infant-hub";
import type { InfantNotificationKind } from "@workspace/db";
import {
  infantFingerprint,
  normalizeEntityId,
} from "@workspace/notification-engine";
import type { NapHistoryEntry } from "../lib/sleepPredict";
import { predictNextSleep, buildPredictInputFromHistory } from "../lib/sleepPredict";

export type InfantNotificationCandidate = {
  kind: InfantNotificationKind;
  priority: number;
  title: string;
  body: string;
  deepLink: string;
  dedupKey: string;
  topicKey: string;
};

export const INFANT_NAP_LEAD_MINUTES = 15;
export const INFANT_MILESTONE_HOUR = 10;
export const INFANT_VACCINE_MORNING_HOUR = 9;
/** Daily infant reminders fire once at this local minute — not every minute in the hour. */
export const INFANT_DAILY_REMINDER_MINUTE = 0;

export function infantNotificationDedupKey(
  childId: number,
  kind: InfantNotificationKind,
  bucket: string,
  localDate?: string,
): string {
  if (localDate) {
    return infantFingerprint(childId, kind, bucket, localDate);
  }
  return `infant:${childId}:${kind}:${bucket}`;
}

export function infantHubDeepLink(section?: string): string {
  if (!section) return "/parenting-hub#tile-infant-hub";
  return `/parenting-hub#${section}`;
}

function fractionalAgeMonths(ageYears: number, ageMonthsPart: number): number {
  return ageYears * 12 + ageMonthsPart;
}

export function evaluateNapWindowCandidate(input: {
  childId: number;
  ageMonths: number;
  history: NapHistoryEntry[];
  nowMs: number;
  tzOffsetMin: number;
  localDate: string;
}): InfantNotificationCandidate | null {
  const predictInput = buildPredictInputFromHistory(
    input.history,
    input.ageMonths,
    input.nowMs,
    input.tzOffsetMin,
  );
  const prediction = predictNextSleep(predictInput);
  if (!prediction || prediction.flexible) return null;

  const leadMs = INFANT_NAP_LEAD_MINUTES * 60_000;
  const targetMs = prediction.windowStart - leadMs;
  const windowEnd = targetMs + 3 * 60_000;
  if (input.nowMs < targetMs || input.nowMs >= windowEnd) return null;

  const bucket = `${Math.floor(prediction.windowStart / 60_000)}`;
  return {
    kind: "nap_window",
    priority: 90,
    title: "Nap window soon",
    body: "Nap window starts in 15 minutes.",
    deepLink: infantHubDeepLink("infant-sleep"),
    dedupKey: infantNotificationDedupKey(
      input.childId,
      "nap_window",
      bucket,
      input.localDate,
    ),
    topicKey: "infant:nap_window",
  };
}

export function evaluateFeedReminderCandidate(input: {
  childId: number;
  ageMonths: number;
  lastFeedAtMs: number | null;
  nowMs: number;
  localDate: string;
}): InfantNotificationCandidate | null {
  if (input.lastFeedAtMs == null) return null;

  const intervalMin = suggestedFeedIntervalMin(input.ageMonths);
  const dueMs = input.lastFeedAtMs + intervalMin * 60_000;
  const graceStart = dueMs - 5 * 60_000;
  const graceEnd = dueMs + 45 * 60_000;
  if (input.nowMs < graceStart || input.nowMs >= graceEnd) return null;

  const bucket = `${Math.floor(dueMs / (30 * 60_000))}`;
  return {
    kind: "feed_reminder",
    priority: 80,
    title: "Feed reminder",
    body: "It may be time for the next feed.",
    deepLink: infantHubDeepLink("infant-feeding"),
    dedupKey: infantNotificationDedupKey(
      input.childId,
      "feed_reminder",
      bucket,
      input.localDate,
    ),
    topicKey: "infant:feed_reminder",
  };
}

export function evaluateVaccineCandidates(input: {
  childId: number;
  childName: string;
  ageYears: number;
  ageMonthsPart: number;
  logMap: VaxLogMap;
  localDate: string;
  localHour: number;
  localMinute?: number;
}): InfantNotificationCandidate[] {
  if (
    input.localHour !== INFANT_VACCINE_MORNING_HOUR ||
    (input.localMinute ?? INFANT_DAILY_REMINDER_MINUTE) !== INFANT_DAILY_REMINDER_MINUTE
  ) {
    return [];
  }

  const ageMonths = fractionalAgeMonths(input.ageYears, input.ageMonthsPart);
  const out: InfantNotificationCandidate[] = [];

  const pending = getPendingVaccinations(ageMonths, input.logMap);
  if (pending.length > 0) {
    const v = pending[0]!;
    out.push({
      kind: "vaccine_due",
      priority: 100,
      title: `${input.childName} — vaccine overdue`,
      body: `${v.ageLabel} vaccines are overdue. Tap to review the schedule.`,
      deepLink: infantHubDeepLink("tile-infant-hub"),
      dedupKey: infantNotificationDedupKey(
        input.childId,
        "vaccine_due",
        `overdue_${normalizeEntityId(v.ageLabel)}`,
        input.localDate,
      ),
      topicKey: "infant:vaccine_overdue",
    });
  }

  const upcoming = getUpcomingVaccinationsWithLog(ageMonths, input.logMap);
  for (const v of upcoming) {
    const monthsUntil = v.ageMonths - ageMonths;
    if (monthsUntil <= 0.04) {
      out.push({
        kind: "vaccine_due",
        priority: 95,
        title: `${input.childName} — vaccine due today`,
        body: `${v.ageLabel} vaccines are due today.`,
        deepLink: infantHubDeepLink("tile-infant-hub"),
        dedupKey: infantNotificationDedupKey(
          input.childId,
          "vaccine_due",
          `today_${normalizeEntityId(v.ageLabel)}`,
          input.localDate,
        ),
        topicKey: "infant:vaccine_today",
      });
    } else if (monthsUntil <= 0.08) {
      out.push({
        kind: "vaccine_due",
        priority: 85,
        title: `${input.childName} — vaccine due tomorrow`,
        body: `${v.ageLabel} vaccines are due tomorrow.`,
        deepLink: infantHubDeepLink("tile-infant-hub"),
        dedupKey: infantNotificationDedupKey(
          input.childId,
          "vaccine_due",
          `tomorrow_${normalizeEntityId(v.ageLabel)}`,
          input.localDate,
        ),
        topicKey: "infant:vaccine_tomorrow",
      });
    }
  }

  return out.slice(0, 1);
}

export function evaluateMilestoneTipCandidate(input: {
  childId: number;
  childName: string;
  ageMonths: number;
  localDate: string;
  localHour: number;
  localMinute?: number;
}): InfantNotificationCandidate | null {
  if (
    input.localHour !== INFANT_MILESTONE_HOUR ||
    (input.localMinute ?? INFANT_DAILY_REMINDER_MINUTE) !== INFANT_DAILY_REMINDER_MINUTE
  ) {
    return null;
  }

  const activity = pickDailyActivity(
    input.ageMonths,
    `${input.childId}-${input.localDate}`,
  );
  if (!activity) return null;

  const shortTitle = activity.title.length > 40
    ? activity.title.slice(0, 37) + "…"
    : activity.title;

  return {
    kind: "milestone_tip",
    priority: 40,
    title: `Today for ${input.childName}`,
    body: `Try 5 minutes of ${shortTitle.toLowerCase()} today.`,
    deepLink: infantHubDeepLink("infant-milestones"),
    dedupKey: infantNotificationDedupKey(
      input.childId,
      "milestone_tip",
      "daily",
      input.localDate,
    ),
    topicKey: "infant:milestone_tip",
  };
}

export function evaluateSleepDriftCandidate(input: {
  childId: number;
  childName: string;
  dailySleepMinutes: number[];
  localDate: string;
}): InfantNotificationCandidate | null {
  if (input.dailySleepMinutes.length < 10) return null;

  const recent = input.dailySleepMinutes.slice(0, 3);
  const baseline = input.dailySleepMinutes.slice(3, 10);
  if (recent.some((m) => m <= 0) || baseline.length < 5) return null;

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const baselineAvg = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  if (baselineAvg <= 0) return null;

  const ratio = recentAvg / baselineAvg;
  if (ratio >= 0.85) return null;

  return {
    kind: "sleep_drift",
    priority: 50,
    title: `${input.childName}'s sleep pattern`,
    body: "Sleep has been shorter than usual for 3 days.",
    deepLink: infantHubDeepLink("infant-sleep"),
    dedupKey: infantNotificationDedupKey(
      input.childId,
      "sleep_drift",
      "weekly",
      input.localDate,
    ),
    topicKey: "infant:sleep_drift",
  };
}

export function isKindSnoozed(
  snoozeUntil: Record<string, string | undefined> | null | undefined,
  kind: InfantNotificationKind,
  nowMs: number,
): boolean {
  const iso = snoozeUntil?.[kind];
  if (!iso) return false;
  const until = Date.parse(iso);
  return Number.isFinite(until) && until > nowMs;
}

export function kindEnabled(
  prefs: {
    napReminders: boolean;
    feedReminders: boolean;
    vaccineReminders: boolean;
    milestoneTips: boolean;
    sleepDrift: boolean;
    weeklySleepReport?: boolean;
  },
  kind: InfantNotificationKind,
): boolean {
  switch (kind) {
    case "nap_window":
      return prefs.napReminders;
    case "feed_reminder":
      return prefs.feedReminders;
    case "vaccine_due":
      return prefs.vaccineReminders;
    case "milestone_tip":
      return prefs.milestoneTips;
    case "sleep_drift":
      return prefs.sleepDrift;
    case "sleep_weekly_report":
      return prefs.weeklySleepReport ?? false;
    default:
      return false;
  }
}

export function pickBestCandidates(
  candidates: InfantNotificationCandidate[],
  remainingQuota: number,
): InfantNotificationCandidate[] {
  return [...candidates]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, Math.max(0, remainingQuota));
}

/** Guard for fractional vaccine schedule lookups. */
export function vaccineScheduleSize(): number {
  return VACCINATIONS.length;
}
