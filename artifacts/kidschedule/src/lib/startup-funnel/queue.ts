import { getApiUrl } from "@/lib/api";
import type { StartupFunnelEventPayload } from "@workspace/analytics-taxonomy";

const QUEUE_KEY = "amynest:startup-funnel:queue:v1";
const MAX_QUEUE = 200;
const MAX_BATCH = 25;
const ENDPOINT = "/api/startup-funnel-events";

function readQueue(): StartupFunnelEventPayload[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StartupFunnelEventPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(events: StartupFunnelEventPayload[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUE)));
  } catch {
    /* ignore quota */
  }
}

export function enqueueStartupFunnelEvent(event: StartupFunnelEventPayload): void {
  const queue = readQueue();
  queue.push(event);
  writeQueue(queue);
}

export async function flushStartupFunnelQueue(): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;

  const url = getApiUrl(ENDPOINT);
  const remaining: StartupFunnelEventPayload[] = [];

  for (let i = 0; i < queue.length; i += MAX_BATCH) {
    const batch = queue.slice(i, i + MAX_BATCH);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ events: batch }),
        credentials: "omit",
        keepalive: true,
      });
      if (!res.ok) {
        remaining.push(...batch, ...queue.slice(i + MAX_BATCH));
        break;
      }
    } catch {
      remaining.push(...batch, ...queue.slice(i + MAX_BATCH));
      break;
    }
  }

  writeQueue(remaining);
}

export function installStartupFunnelOnlineFlush(): void {
  if (typeof window === "undefined") return;
  const onOnline = () => void flushStartupFunnelQueue();
  window.addEventListener("online", onOnline);
  void flushStartupFunnelQueue();
}

export function clearStartupFunnelQueueForTests(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    /* ignore */
  }
}

export function getStartupFunnelQueueSize(): number {
  return readQueue().length;
}
