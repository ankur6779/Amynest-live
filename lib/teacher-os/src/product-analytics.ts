import type { ProductAnalyticsEvent, ProductEventType } from "./pilot-types.js";
import type { TeacherOsModuleId } from "./types.js";

const EVENTS_KEY = "teacher-os-product-events-v81";
const SESSION_KEY = "teacher-os-session-v81";
const MAX_EVENTS = 1500;

let activeSessionId = "";

function canStore(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage != null;
  } catch {
    return false;
  }
}

function loadEvents(): ProductAnalyticsEvent[] {
  if (!canStore()) return [];
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as ProductAnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: ProductAnalyticsEvent[]): void {
  if (!canStore()) return;
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch { /* */ }
}

export function getOrCreateSessionId(): string {
  if (activeSessionId) return activeSessionId;
  if (!canStore()) {
    activeSessionId = `sess_${Date.now()}`;
    return activeSessionId;
  }
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      activeSessionId = raw;
      return activeSessionId;
    }
    activeSessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, activeSessionId);
    return activeSessionId;
  } catch {
    activeSessionId = `sess_${Date.now()}`;
    return activeSessionId;
  }
}

export function startProductSession(): string {
  const id = getOrCreateSessionId();
  trackProductEvent("session_start");
  return id;
}

export function endProductSession(durationMs: number): void {
  trackProductEvent("session_end", { durationMs });
  activeSessionId = "";
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* */ }
}

export function trackProductEvent(
  type: ProductEventType,
  props?: Record<string, string | number | boolean> & { module?: TeacherOsModuleId; durationMs?: number },
): void {
  const events = loadEvents();
  const { module, durationMs, ...rest } = props ?? {};
  events.push({
    type,
    at: new Date().toISOString(),
    sessionId: getOrCreateSessionId(),
    module,
    durationMs,
    props: Object.keys(rest).length ? rest : undefined,
  });
  saveEvents(events);
}

export function getProductEvents(): ProductAnalyticsEvent[] {
  return loadEvents();
}

export function getSessionCount(): number {
  const sessions = new Set(loadEvents().filter((e) => e.type === "session_start").map((e) => e.sessionId));
  return sessions.size;
}

export function clearProductEvents(): void {
  if (!canStore()) return;
  try {
    localStorage.removeItem(EVENTS_KEY);
  } catch { /* */ }
}

export function trackTimedOperation(
  type: ProductEventType,
  startMs: number,
  props?: Record<string, string | number | boolean>,
): void {
  trackProductEvent(type, { ...props, durationMs: Math.max(0, Date.now() - startMs) });
}
