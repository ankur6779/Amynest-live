import {
  buildNotificationFingerprint,
  parseFingerprintChildId,
  scheduledDateFromFingerprint,
  sanitizeFingerprintSegment,
} from "./fingerprint.js";

export const MAX_NOTIFICATIONS_PER_CHILD_PER_DAY = 5;
export const MAX_NOTIFICATIONS_PER_ACCOUNT_PER_DAY = 15;
export const MAX_NOTIFICATIONS_PER_HOUR = 3;

/** Minimum cooldown before the same fingerprint may deliver again. */
export const COOLDOWN_MS_BY_TYPE: Record<string, number> = {
  vaccine: 24 * 60 * 60 * 1000,
  vaccine_due: 24 * 60 * 60 * 1000,
  milestone: 24 * 60 * 60 * 1000,
  milestone_tip: 24 * 60 * 60 * 1000,
  learning: 24 * 60 * 60 * 1000,
  learning_activity: 24 * 60 * 60 * 1000,
  phonics: 24 * 60 * 60 * 1000,
  engagement: 24 * 60 * 60 * 1000,
  engagement_sweep: 24 * 60 * 60 * 1000,
  parenting_tips: 24 * 60 * 60 * 1000,
  sleep_drift: 24 * 60 * 60 * 1000,
  routine_item: 5 * 60 * 1000,
  nap_window: 30 * 60 * 1000,
  feed_reminder: 30 * 60 * 1000,
};

export const DEFAULT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type NotificationSkipReason =
  | "duplicate"
  | "cooldown"
  | "rate_limit_child"
  | "rate_limit_account"
  | "rate_limit_hourly";

export type DeliveryHistoryRow = {
  dedupKey: string;
  status: string;
  sentAt: Date;
};

export type GuardDecision =
  | { allow: true }
  | { allow: false; reason: NotificationSkipReason; logEvent: string };

export function notificationTypeFromFingerprint(fingerprint: string): string {
  const parts = fingerprint.split("_");
  if (parts.length < 3) return "default";
  return parts[1] ?? "default";
}

export function cooldownMsForFingerprint(fingerprint: string): number {
  const type = notificationTypeFromFingerprint(fingerprint);
  return COOLDOWN_MS_BY_TYPE[type] ?? DEFAULT_COOLDOWN_MS;
}

export function infantFingerprint(
  childId: number,
  kind: string,
  entityId: string,
  localDate: string,
): string {
  return buildNotificationFingerprint({
    childId,
    notificationType: kind,
    entityId,
    scheduledDate: localDate,
  });
}

export function jobFingerprint(
  jobId: string,
  localDate: string,
  entityId = "daily",
): string {
  return buildNotificationFingerprint({
    notificationType: jobId,
    entityId,
    scheduledDate: localDate,
  });
}

export function legacyInfantDedupKey(
  childId: number,
  kind: string,
  bucket: string,
): string {
  return `infant:${childId}:${kind}:${bucket}`;
}

/** Map legacy infant dedup keys to canonical fingerprints when possible. */
export function resolveFingerprint(
  dedupKey: string | undefined | null,
  fallback?: {
    childId?: number | string | null;
    notificationType?: string;
    entityId?: string;
    scheduledDate?: string;
  },
): string | null {
  if (dedupKey && dedupKey.includes("_") && /\d{4}-\d{2}-\d{2}$/.test(dedupKey)) {
    return dedupKey;
  }
  if (fallback?.notificationType && fallback.scheduledDate) {
    return buildNotificationFingerprint({
      childId: fallback.childId,
      notificationType: fallback.notificationType,
      entityId: fallback.entityId ?? "daily",
      scheduledDate: fallback.scheduledDate,
    });
  }
  return dedupKey ?? null;
}

export function isWithinCooldown(
  fingerprint: string,
  lastSentAt: Date,
  now = new Date(),
): boolean {
  const elapsed = now.getTime() - lastSentAt.getTime();
  return elapsed < cooldownMsForFingerprint(fingerprint);
}

export function matchesFingerprintLocalDay(
  fingerprint: string,
  sentAt: Date,
  timezone: string,
): boolean {
  const scheduled = scheduledDateFromFingerprint(fingerprint);
  if (!scheduled) return false;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(sentAt) === scheduled;
}

/**
 * Pure guard: given prior delivery rows for this user, decide whether to skip.
 */
export function evaluateDeliveryGuard(input: {
  fingerprint: string;
  timezone: string;
  history: DeliveryHistoryRow[];
  childSentToday: number;
  accountSentToday: number;
  accountSentLastHour: number;
  now?: Date;
}): GuardDecision {
  const { fingerprint, timezone, history, now = new Date() } = input;
  const childId = parseFingerprintChildId(fingerprint);

  if (childId != null && input.childSentToday >= MAX_NOTIFICATIONS_PER_CHILD_PER_DAY) {
    return { allow: false, reason: "rate_limit_child", logEvent: "NOTIFICATION_RATE_LIMITED" };
  }
  if (input.accountSentToday >= MAX_NOTIFICATIONS_PER_ACCOUNT_PER_DAY) {
    return { allow: false, reason: "rate_limit_account", logEvent: "NOTIFICATION_RATE_LIMITED" };
  }
  if (input.accountSentLastHour >= MAX_NOTIFICATIONS_PER_HOUR) {
    return { allow: false, reason: "rate_limit_hourly", logEvent: "NOTIFICATION_RATE_LIMITED" };
  }

  const delivered = history.filter(
    (h) => h.dedupKey === fingerprint && h.status === "sent",
  );
  if (delivered.length === 0) return { allow: true };

  const latest = delivered.reduce((a, b) => (a.sentAt > b.sentAt ? a : b));

  if (matchesFingerprintLocalDay(fingerprint, latest.sentAt, timezone)) {
    return { allow: false, reason: "duplicate", logEvent: "NOTIFICATION_SKIPPED_DUPLICATE" };
  }

  if (isWithinCooldown(fingerprint, latest.sentAt, now)) {
    return { allow: false, reason: "cooldown", logEvent: "NOTIFICATION_SKIPPED_COOLDOWN" };
  }

  return { allow: true };
}

export function normalizeEntityId(label: string): string {
  return sanitizeFingerprintSegment(label);
}
