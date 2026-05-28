import { getApiUrl } from "@/lib/api";
import { queueClientLog } from "@/lib/client-logs";
import type { ProgressAnalyticsEvent } from "@workspace/learning-progress-engine";

export type { ProgressAnalyticsEvent };

const seenToday = new Map<string, string>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Dedupe once-per-day events per child (e.g. daily_return). */
function shouldEmit(event: ProgressAnalyticsEvent, childId: number): boolean {
  if (event !== "daily_return" && !event.startsWith("retention_day_")) return true;
  const key = `${childId}:${event}`;
  const today = todayKey();
  if (seenToday.get(key) === today) return false;
  seenToday.set(key, today);
  return true;
}

export function trackProgressEvent(
  event: ProgressAnalyticsEvent,
  childId: number,
  metadata?: Record<string, string | number | boolean>,
): void {
  if (!shouldEmit(event, childId)) return;

  queueClientLog({
    type: "info",
    message: `learning_progress:${event}`,
    context: `child:${childId}`,
    meta: { event, childId, ...metadata },
  });
}

export async function trackProgressEventServer(
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  event: ProgressAnalyticsEvent,
  childId: number,
  metadata?: Record<string, string | number | boolean>,
): Promise<void> {
  if (!shouldEmit(event, childId)) return;
  try {
    await authFetch(getApiUrl("/api/learning-progress/analytics"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, event, metadata }),
    });
  } catch {
    /* best-effort */
  }
}
