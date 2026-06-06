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

  if (dedupKey && fallback?.scheduledDate) {
    const legacy = parseLegacyDedupKey(dedupKey, fallback.scheduledDate);
    if (legacy) {
      return buildNotificationFingerprint({
        childId: fallback.childId ?? legacy.childId,
        notificationType: legacy.notificationType,
        entityId: legacy.entityId,
        scheduledDate: legacy.scheduledDate,
      });
    }
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

/** Parse `morning:2026-06-06`, `job:snack_time:2026-06-06`, `routine_item:1:2:date`, etc. */
export function parseLegacyDedupKey(
  dedupKey: string,
  defaultDate: string,
): {
  notificationType: string;
  entityId: string;
  scheduledDate: string;
  childId?: string;
} | null {
  if (dedupKey.startsWith("job:")) {
    const parts = dedupKey.split(":");
    const jobId = parts[1];
    const date = parts[2];
    if (jobId && date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { notificationType: jobId, entityId: "daily", scheduledDate: date };
    }
  }

  if (dedupKey.startsWith("routine_item:")) {
    const parts = dedupKey.split(":");
    const routineId = parts[1];
    const itemIndex = parts[2];
    const date = parts[3];
    if (routineId && itemIndex != null && date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        notificationType: "routine_item",
        entityId: `r${routineId}_i${itemIndex}`,
        scheduledDate: date,
        childId: undefined,
      };
    }
  }

  if (dedupKey.startsWith("referral_reward_")) {
    const suffix = dedupKey.slice("referral_reward_".length);
    return {
      notificationType: "referral_reward",
      entityId: sanitizeFingerprintSegment(suffix),
      scheduledDate: defaultDate,
    };
  }

  const colonIdx = dedupKey.indexOf(":");
  if (colonIdx <= 0) return null;

  const type = dedupKey.slice(0, colonIdx);
  const rest = dedupKey.slice(colonIdx + 1);

  if (/^\d{4}-\d{2}-\d{2}$/.test(rest)) {
    return { notificationType: type, entityId: "daily", scheduledDate: rest };
  }

  if (/^\d{4}-\d{2}$/.test(rest)) {
    return {
      notificationType: type,
      entityId: "monthly",
      scheduledDate: `${rest}-01`,
    };
  }

  const composite = rest.match(/^(.+):(\d{4}-\d{2}-\d{2})$/);
  if (composite) {
    return {
      notificationType: type,
      entityId: sanitizeFingerprintSegment(composite[1]!),
      scheduledDate: composite[2]!,
    };
  }

  return null;
}

export function contentFingerprint(
  childId: number | string | null | undefined,
  notificationType: string,
  entityId: string,
  localDate: string,
): string {
  return buildNotificationFingerprint({
    childId,
    notificationType,
    entityId,
    scheduledDate: localDate,
  });
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

  const active = history.filter(
    (h) =>
      h.dedupKey === fingerprint &&
      (h.status === "sent" || h.status === "pending"),
  );
  if (active.length === 0) return { allow: true };

  const latest = active.reduce((a, b) => (a.sentAt > b.sentAt ? a : b));

  if (latest.status === "pending") {
    const ageMs = now.getTime() - latest.sentAt.getTime();
    if (ageMs < 10 * 60 * 1000) {
      return { allow: false, reason: "duplicate", logEvent: "NOTIFICATION_SKIPPED_DUPLICATE" };
    }
  }

  const delivered = active.filter((h) => h.status === "sent");
  if (delivered.length === 0) return { allow: true };

  const latestSent = delivered.reduce((a, b) => (a.sentAt > b.sentAt ? a : b));

  if (matchesFingerprintLocalDay(fingerprint, latestSent.sentAt, timezone)) {
    return { allow: false, reason: "duplicate", logEvent: "NOTIFICATION_SKIPPED_DUPLICATE" };
  }

  if (isWithinCooldown(fingerprint, latestSent.sentAt, now)) {
    return { allow: false, reason: "cooldown", logEvent: "NOTIFICATION_SKIPPED_COOLDOWN" };
  }

  return { allow: true };
}

export function normalizeEntityId(label: string): string {
  return sanitizeFingerprintSegment(label);
}
