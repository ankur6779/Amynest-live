import { recordStudioAnalytics } from "@workspace/worksheet-studio/client";

/** Lightweight analytics hooks for worksheet studio events. */
type WorksheetEvent =
  | "worksheet_generate_start"
  | "worksheet_generate_done"
  | "worksheet_export_pdf"
  | "worksheet_copilot"
  | "worksheet_autosave"
  | "worksheet_error"
  | "worksheet_library_open"
  | "worksheet_productivity_open"
  | "worksheet_bulk_export"
  | "worksheet_pack_generate"
  | "worksheet_branding_open"
  | "worksheet_prompt_enhance"
  | "worksheet_reference_upload"
  | "worksheet_vision_analyze"
  | "worksheet_vision_template_apply"
  | "worksheet_copilot_edit"
  | "worksheet_reconstruct_start"
  | "worksheet_reconstruct_done"
  | "worksheet_reconstruct_analyze"
  | "worksheet_reconstruct_upload";

export function trackWorksheetEvent(
  event: WorksheetEvent,
  props?: Record<string, string | number | boolean>,
): void {
  try {
    recordStudioAnalytics(event, props);
    if (typeof window !== "undefined" && "gtag" in window) {
      (window as { gtag?: (...args: unknown[]) => void }).gtag?.("event", event, props);
    }
    // v8.1 — forward to Teacher OS product analytics when available
    void import("@/features/teacher-os/teacher-os-analytics").then((m) => {
      m.bridgeWorksheetEvent(event, props);
    }).catch(() => { /* teacher-os not loaded */ });
  } catch { /* non-blocking */ }
}

const QUEUE_KEY_PREFIX = "worksheet-studio-offline-queue";
const LEGACY_QUEUE_KEY = QUEUE_KEY_PREFIX;

export interface QueuedRequest {
  id: string;
  url: string;
  body: string;
  createdAt: string;
  userId?: string;
}

function queueKeyForUser(userId: string | null | undefined): string | null {
  if (!userId || userId.length === 0) return null;
  return `${QUEUE_KEY_PREFIX}:${userId}`;
}

export function enqueueOfflineRequest(
  url: string,
  body: object,
  userId?: string | null,
): void {
  try {
    const key = queueKeyForUser(userId);
    if (!key) return;
    const sanitized = sanitizeOfflineBody(body);
    const raw = localStorage.getItem(key);
    const queue: QueuedRequest[] = raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
    queue.push({
      id: `q_${Date.now()}`,
      url,
      body: JSON.stringify(sanitized),
      createdAt: new Date().toISOString(),
      userId: userId ?? undefined,
    });
    localStorage.setItem(key, JSON.stringify(queue.slice(-20)));
  } catch { /* ignore */ }
}

/** Strip large base64 blobs before persisting offline queue entries. */
function sanitizeOfflineBody(body: object): object {
  const json = JSON.stringify(body);
  if (json.length < 80_000) return body;
  const clone = JSON.parse(json) as Record<string, unknown>;
  if (Array.isArray(clone.visionImages)) clone.visionImages = [];
  if (Array.isArray(clone.references)) {
    clone.references = (clone.references as Array<Record<string, unknown>>).map((r) => ({
      ...r,
      thumbnailDataUrl: undefined,
      pageThumbnails: undefined,
    }));
  }
  if (Array.isArray(clone.sources)) {
    clone.sources = (clone.sources as Array<Record<string, unknown>>).map((s) => ({
      ...s,
      thumbnailDataUrl: undefined,
      pageThumbnails: undefined,
    }));
  }
  return clone;
}

export async function flushOfflineQueue(
  fetcher: (url: string, init: RequestInit) => Promise<Response>,
  userId?: string | null,
): Promise<number> {
  try {
    const key = queueKeyForUser(userId);
    if (!key) return 0;
    let raw = localStorage.getItem(key);
    // One-time adopt of legacy unscoped queue into this user bucket.
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_QUEUE_KEY);
      if (legacy) {
        localStorage.setItem(key, legacy);
        localStorage.removeItem(LEGACY_QUEUE_KEY);
        raw = legacy;
      }
    }
    if (!raw) return 0;
    const queue = JSON.parse(raw) as QueuedRequest[];
    let flushed = 0;
    const remaining: QueuedRequest[] = [];
    for (const item of queue) {
      if (item.userId && userId && item.userId !== userId) {
        remaining.push(item);
        continue;
      }
      try {
        const res = await fetcher(item.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: item.body,
        });
        if (res.ok) flushed += 1;
        else remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }
    localStorage.setItem(key, JSON.stringify(remaining));
    return flushed;
  } catch {
    return 0;
  }
}

/** Drop all worksheet offline queues (scoped + legacy) on account switch. */
export function clearWorksheetOfflineQueue(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (
        key &&
        (key === LEGACY_QUEUE_KEY || key.startsWith(`${QUEUE_KEY_PREFIX}:`))
      ) {
        keys.push(key);
      }
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    /* private mode */
  }
}
