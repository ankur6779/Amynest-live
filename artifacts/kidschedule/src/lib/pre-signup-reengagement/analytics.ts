import { trackGrowthEvent, type GrowthEventName } from "@/lib/growth-analytics";
import { trackMarketingEvent } from "@/lib/marketing/ga4-analytics";
import { queueClientLog } from "@/lib/client-logs";
import { getOrCreateDeviceId } from "@/lib/device-id";
import type { AbVariant, PreSignupAnalyticsEvent } from "./types";

const PENDING_EVENTS_KEY = "amynest:pre_signup_analytics_pending:v1";
const DEDUPE_KEY = "amynest:pre_signup_analytics_dedupe:v1";

type PendingEvent = {
  event: PreSignupAnalyticsEvent;
  at: string;
  props: Record<string, string | number | boolean | undefined>;
};

function readPending(): PendingEvent[] {
  try {
    const raw = localStorage.getItem(PENDING_EVENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingEvent[];
  } catch {
    return [];
  }
}

function writePending(events: PendingEvent[]): void {
  try {
    localStorage.setItem(PENDING_EVENTS_KEY, JSON.stringify(events.slice(-100)));
  } catch {
    /* ignore */
  }
}

function readDedupeKeys(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DEDUPE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeDedupeKeys(keys: Set<string>): void {
  try {
    sessionStorage.setItem(DEDUPE_KEY, JSON.stringify([...keys].slice(-200)));
  } catch {
    /* ignore */
  }
}

function shouldEmitOnce(event: PreSignupAnalyticsEvent, dedupeKey: string): boolean {
  const keys = readDedupeKeys();
  const id = `${event}:${dedupeKey}`;
  if (keys.has(id)) return false;
  keys.add(id);
  writeDedupeKeys(keys);
  return true;
}

const GROWTH_MAP: Partial<Record<PreSignupAnalyticsEvent, GrowthEventName>> = {
  notification_scheduled: "pre_signup_notification_scheduled",
  notification_delivered: "pre_signup_notification_delivered",
  notification_opened: "pre_signup_notification_opened",
  notification_dismissed: "pre_signup_notification_dismissed",
  signup_started: "pre_signup_signup_started",
  signup_completed: "pre_signup_signup_completed",
  login_completed: "pre_signup_login_completed",
  signup_conversion_from_notification: "pre_signup_signup_conversion",
};

const GA4_EVENTS = new Set<PreSignupAnalyticsEvent>([
  "notification_scheduled",
  "notification_delivered",
  "notification_opened",
  "notification_dismissed",
  "signup_started",
  "signup_completed",
  "login_completed",
  "signup_conversion_from_notification",
]);

export function trackPreSignupEvent(
  event: PreSignupAnalyticsEvent,
  props: Record<string, string | number | boolean | undefined> = {},
  dedupeKey?: string,
): void {
  if (dedupeKey && !shouldEmitOnce(event, dedupeKey)) return;

  const at = new Date().toISOString();
  const payload = {
    ...props,
    at,
    device_id: getOrCreateDeviceId(),
    campaign: "pre_signup_reengagement",
  };

  queueClientLog({
    type: "growth_analytics",
    message: event,
    context: "pre_signup_reengagement",
    meta: payload,
  });

  const growthEvent = GROWTH_MAP[event];
  if (growthEvent) {
    trackGrowthEvent(growthEvent, payload);
  }

  if (GA4_EVENTS.has(event)) {
    trackMarketingEvent(
      event as Parameters<typeof trackMarketingEvent>[0],
      payload,
    );
  }

  writePending([...readPending(), { event, at, props: payload }]);

  if (import.meta.env.DEV) {
    console.info("[pre-signup]", event, payload);
  }
}

/** Flush buffered pre-signup events after authentication (server ingest). */
export function flushPendingPreSignupEventsOnSignup(): PendingEvent[] {
  const pending = readPending();
  writePending([]);
  return pending;
}

export function trackCampaignScheduled(input: {
  variant: AbVariant;
  count: number;
  milestones: string[];
  fingerprint: string;
}): void {
  trackPreSignupEvent(
    "notification_scheduled",
    {
      variant: input.variant,
      count: input.count,
      milestones: input.milestones.join(","),
    },
    input.fingerprint,
  );
}

export function trackSignupConversionFromNotification(input: {
  variant?: AbVariant;
  milestone?: string;
  notificationId?: string;
}): void {
  trackPreSignupEvent(
    "signup_conversion_from_notification",
    {
      variant: input.variant,
      milestone: input.milestone,
      notification_id: input.notificationId,
    },
    `conversion:${input.notificationId ?? "unknown"}`,
  );
}

export function handleNativePreSignupAnalyticsEvents(detail: {
  deliveries?: Array<{
    notificationId?: string;
    milestone?: string;
    variant?: string;
    deliveredAtMs?: number;
  }>;
  dismissals?: Array<{
    notificationId?: string;
    milestone?: string;
    variant?: string;
    dismissedAtMs?: number;
  }>;
}): void {
  for (const d of detail.deliveries ?? []) {
    if (!d.notificationId) continue;
    trackPreSignupEvent(
      "notification_delivered",
      {
        milestone: d.milestone,
        variant: d.variant,
        notification_id: d.notificationId,
        source: "local_android",
      },
      `delivered:${d.notificationId}`,
    );
  }
  for (const x of detail.dismissals ?? []) {
    if (!x.notificationId) continue;
    trackPreSignupEvent(
      "notification_dismissed",
      {
        milestone: x.milestone,
        variant: x.variant,
        notification_id: x.notificationId,
        source: "local_android",
      },
      `dismissed:${x.notificationId}`,
    );
  }
}
