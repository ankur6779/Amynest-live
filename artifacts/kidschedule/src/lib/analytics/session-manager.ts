import {
  FLUSH_DEBOUNCE_MS,
  PERSISTENT_QUEUE_KEY,
  SESSION_IDLE_TIMEOUT_MS,
  type QueuedAnalyticsEvent,
} from "./constants";

const SESSION_ID_KEY = "amynest_analytics_session";
const SESSION_LAST_ACTIVE_KEY = "amynest_analytics_session_last_active";
const SESSION_STARTED_KEY = "amynest_analytics_session_started";
const APP_OPEN_KEY = "amynest_analytics_app_open_sent";
const FIRST_OPEN_KEY = "amynest_analytics_first_open";

export type SessionEndReason =
  | "timeout"
  | "background"
  | "logout"
  | "manual"
  | "recovery";

export type SessionRotationListener = (info: {
  previousSessionId: string;
  newSessionId: string;
  reason: SessionEndReason;
  durationMs: number;
  eventCount: number;
}) => void;

function storage(): Storage | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}

function newSessionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export class SessionManager {
  private eventCount = 0;
  private listeners: SessionRotationListener[] = [];

  getSessionId(): string {
    const ss = storage();
    if (!ss) return "no-session";
    const now = Date.now();
    const lastRaw = ss.getItem(SESSION_LAST_ACTIVE_KEY);
    const last = lastRaw ? Number(lastRaw) : now;
    let id = ss.getItem(SESSION_ID_KEY);

    if (!id || now - last > SESSION_IDLE_TIMEOUT_MS) {
      const reason: SessionEndReason = id ? "timeout" : "recovery";
      if (id) this.rotateSession(reason);
      id = newSessionId();
      ss.setItem(SESSION_ID_KEY, id);
      ss.setItem(SESSION_STARTED_KEY, String(now));
      this.eventCount = 0;
    }

    ss.setItem(SESSION_LAST_ACTIVE_KEY, String(now));
    return id;
  }

  touchActivity(): void {
    const ss = storage();
    if (!ss) return;
    ss.setItem(SESSION_LAST_ACTIVE_KEY, String(Date.now()));
  }

  incrementEventCount(): void {
    this.eventCount++;
  }

  onRotate(listener: SessionRotationListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  rotateSession(reason: SessionEndReason): string {
    const ss = storage();
    const previousId = ss?.getItem(SESSION_ID_KEY) ?? "unknown";
    const started = Number(ss?.getItem(SESSION_STARTED_KEY) ?? Date.now());
    const durationMs = Math.max(0, Date.now() - started);
    const newId = newSessionId();
    if (ss) {
      ss.setItem(SESSION_ID_KEY, newId);
      ss.setItem(SESSION_STARTED_KEY, String(Date.now()));
      ss.setItem(SESSION_LAST_ACTIVE_KEY, String(Date.now()));
      ss.removeItem(APP_OPEN_KEY);
    }
    const eventCount = this.eventCount;
    this.eventCount = 0;
    for (const listener of this.listeners) {
      listener({
        previousSessionId: previousId,
        newSessionId: newId,
        reason,
        durationMs,
        eventCount,
      });
    }
    return newId;
  }

  shouldEmitAppOpen(): boolean {
    const ss = storage();
    if (!ss) return true;
    if (ss.getItem(APP_OPEN_KEY)) return false;
    ss.setItem(APP_OPEN_KEY, "1");
    return true;
  }

  shouldEmitFirstOpen(): boolean {
    if (typeof localStorage === "undefined") return false;
    if (localStorage.getItem(FIRST_OPEN_KEY)) return false;
    localStorage.setItem(FIRST_OPEN_KEY, "1");
    return true;
  }

  clearAppOpenGuard(): void {
    storage()?.removeItem(APP_OPEN_KEY);
  }

  /** Drain offline persistent queue key — shared namespace */
  persistentQueueKey(): string {
    return PERSISTENT_QUEUE_KEY;
  }
}

export function loadPersistentQueue(): QueuedAnalyticsEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(PERSISTENT_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedAnalyticsEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePersistentQueue(events: QueuedAnalyticsEvent[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (events.length === 0) {
      localStorage.removeItem(PERSISTENT_QUEUE_KEY);
      return;
    }
    localStorage.setItem(PERSISTENT_QUEUE_KEY, JSON.stringify(events.slice(-500)));
  } catch {
    /* quota exceeded — best effort */
  }
}

export function installSessionLifecycle(session: SessionManager): () => void {
  if (typeof document === "undefined") return () => {};

  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      session.touchActivity();
    } else if (document.visibilityState === "visible") {
      session.getSessionId();
    }
  };

  document.addEventListener("visibilitychange", onVisibility);
  return () => document.removeEventListener("visibilitychange", onVisibility);
}

export const SESSION_FLUSH_DEBOUNCE_MS = FLUSH_DEBOUNCE_MS;
