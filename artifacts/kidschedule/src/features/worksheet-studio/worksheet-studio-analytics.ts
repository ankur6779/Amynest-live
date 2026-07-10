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

const QUEUE_KEY = "worksheet-studio-offline-queue";

export interface QueuedRequest {
  id: string;
  url: string;
  body: string;
  createdAt: string;
}

export function enqueueOfflineRequest(url: string, body: object): void {
  try {
    const sanitized = sanitizeOfflineBody(body);
    const raw = localStorage.getItem(QUEUE_KEY);
    const queue: QueuedRequest[] = raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
    queue.push({ id: `q_${Date.now()}`, url, body: JSON.stringify(sanitized), createdAt: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-20)));
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

export async function flushOfflineQueue(fetcher: (url: string, init: RequestInit) => Promise<Response>): Promise<number> {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return 0;
    const queue = JSON.parse(raw) as QueuedRequest[];
    let flushed = 0;
    const remaining: QueuedRequest[] = [];
    for (const item of queue) {
      try {
        const res = await fetcher(item.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: item.body });
        if (res.ok) flushed += 1;
        else remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    return flushed;
  } catch {
    return 0;
  }
}
