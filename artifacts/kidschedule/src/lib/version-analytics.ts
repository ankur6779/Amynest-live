import { getApiUrl } from "@/lib/api";
import type { AppUpdatePlatform } from "@/lib/version-service";

export type VersionAnalyticsEventName =
  | "app_version_policy_fetched"
  | "force_update_displayed"
  | "force_update_update_clicked"
  | "optional_update_displayed"
  | "optional_update_dismissed"
  | "version_policy_fetch_failed"
  | "cached_policy_used";

export type VersionAnalyticsProps = {
  platform?: AppUpdatePlatform;
  installedVersion?: string | null;
  minimumVersion?: string;
  latestVersion?: string;
  forceUpdate?: boolean;
  source?: "network" | "cache";
  reason?: string;
  updateType?: "hard" | "soft";
};

type QueuedVersionEvent = VersionAnalyticsProps & {
  eventId: string;
  name: VersionAnalyticsEventName;
  clientTs: string;
  sessionId: string;
};

const QUEUE_KEY = "amynest:version-analytics:queue:v1";
const DELIVERED_KEY = "amynest:version-analytics:delivered:v1";
const SESSION_KEY = "amynest:version-analytics:session:v1";
const MAX_QUEUE = 50;
const MAX_DELIVERED = 200;

let flushInFlight = false;
let retryInstalled = false;

function safeRandomId(prefix: string): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `${prefix}_${crypto.randomUUID()}`;
    }
  } catch {
    /* fall through */
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getVersionAnalyticsSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = safeRandomId("vas");
    window.sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return safeRandomId("vas");
  }
}

function readQueue(): QueuedVersionEvent[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedVersionEvent[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_QUEUE) : [];
  } catch {
    return [];
  }
}

function writeQueue(events: QueuedVersionEvent[]): void {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUE)));
  } catch {
    /* telemetry must never block app startup */
  }
}

function readDeliveredIds(): string[] {
  try {
    const raw = window.localStorage.getItem(DELIVERED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_DELIVERED) : [];
  } catch {
    return [];
  }
}

function writeDeliveredIds(ids: string[]): void {
  try {
    window.localStorage.setItem(DELIVERED_KEY, JSON.stringify(ids.slice(-MAX_DELIVERED)));
  } catch {
    /* best-effort */
  }
}

function hasEventId(eventId: string): boolean {
  return readDeliveredIds().includes(eventId) || readQueue().some((event) => event.eventId === eventId);
}

function markDelivered(events: QueuedVersionEvent[]): void {
  const delivered = readDeliveredIds();
  const next = new Set(delivered);
  for (const event of events) next.add(event.eventId);
  writeDeliveredIds([...next].slice(-MAX_DELIVERED));

  const deliveredIds = new Set(events.map((event) => event.eventId));
  writeQueue(readQueue().filter((event) => !deliveredIds.has(event.eventId)));
}

function eventIdFor(name: VersionAnalyticsEventName, onceKey: string): string {
  return `v1:${name}:${onceKey}`.slice(0, 160);
}

export function trackVersionAnalytics(
  name: VersionAnalyticsEventName,
  props: VersionAnalyticsProps = {},
  options: { onceKey?: string } = {},
): void {
  if (typeof window === "undefined") return;
  const sessionId = getVersionAnalyticsSessionId();
  const eventId = eventIdFor(name, options.onceKey ?? sessionId);
  if (hasEventId(eventId)) return;

  const event: QueuedVersionEvent = {
    eventId,
    name,
    clientTs: new Date().toISOString(),
    sessionId,
    ...props,
  };

  writeQueue([...readQueue(), event]);
  void flushVersionAnalyticsQueue();
}

export async function flushVersionAnalyticsQueue(): Promise<void> {
  if (typeof window === "undefined") return;
  if (flushInFlight) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  const events = readQueue();
  if (events.length === 0) return;

  flushInFlight = true;
  try {
    const response = await fetch(getApiUrl("/api/app-version-analytics/events"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    });

    if (response.ok) {
      markDelivered(events);
    }
  } catch {
    /* queued events retry on the next online/visibility/app boot signal */
  } finally {
    flushInFlight = false;
  }
}

export function installVersionAnalyticsRetry(): void {
  if (typeof window === "undefined" || retryInstalled) return;
  retryInstalled = true;
  window.addEventListener("online", () => {
    void flushVersionAnalyticsQueue();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void flushVersionAnalyticsQueue();
    }
  });
  window.setTimeout(() => {
    void flushVersionAnalyticsQueue();
  }, 2_000);
}
