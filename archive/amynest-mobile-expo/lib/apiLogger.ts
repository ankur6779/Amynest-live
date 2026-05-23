const MAX_ENTRIES = 60;
const MAX_STRING_LEN = 400;
const MAX_ARRAY_LEN = 10;
const MAX_PAYLOAD_KEYS = 25;

export interface ApiLogEntry {
  id: string;
  endpoint: string;
  method: string;
  status: number | null;
  responseTime: number | null;
  requestPayload: unknown;
  responsePayload: unknown;
  error: string | null;
  timestamp: string;
  screen: string;
}

function truncate(val: unknown, depth = 3): unknown {
  if (depth <= 0) return "[…]";
  if (val === null || val === undefined) return val;
  if (typeof val === "string") return val.length > MAX_STRING_LEN ? val.slice(0, MAX_STRING_LEN) + "…" : val;
  if (typeof val !== "object") return val;
  if (Array.isArray(val)) return val.slice(0, MAX_ARRAY_LEN).map((v) => truncate(v, depth - 1));
  const entries = Object.entries(val as Record<string, unknown>).slice(0, MAX_PAYLOAD_KEYS);
  return Object.fromEntries(entries.map(([k, v]) => [k, truncate(v, depth - 1)]));
}

class ApiLogger {
  private entries: ApiLogEntry[] = [];
  private listeners = new Set<(e: ApiLogEntry[]) => void>();
  private _screen = "unknown";

  setScreen(s: string) { this._screen = s; }
  getScreen(): string { return this._screen; }
  getEntries(): ReadonlyArray<ApiLogEntry> { return this.entries; }

  record(e: Omit<ApiLogEntry, "id" | "timestamp" | "screen">): ApiLogEntry {
    const full: ApiLogEntry = {
      ...e,
      id: Math.random().toString(36).slice(2, 10),
      timestamp: new Date().toISOString(),
      screen: this._screen,
    };
    this.entries = [full, ...this.entries].slice(0, MAX_ENTRIES);
    this.emit();
    return full;
  }

  clear() { this.entries = []; this.emit(); }

  subscribe(fn: (e: ApiLogEntry[]) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const snap = [...this.entries];
    this.listeners.forEach((fn) => fn(snap));
  }
}

export const apiLogger = new ApiLogger();

export async function loggedFetch(
  url: string,
  init: RequestInit,
  fn: (url: string, init: RequestInit) => Promise<Response>,
): Promise<Response> {
  const t0 = Date.now();
  const method = (init.method ?? "GET").toUpperCase();

  let reqPayload: unknown = null;
  try {
    if (typeof init.body === "string") reqPayload = JSON.parse(init.body);
  } catch { /* binary */ }

  try {
    const res = await fn(url, init);
    const rt = Date.now() - t0;

    let resPayload: unknown = null;
    try {
      const text = await res.clone().text();
      if (text) resPayload = truncate(JSON.parse(text));
    } catch { /* non-JSON */ }

    apiLogger.record({
      endpoint: url,
      method,
      status: res.status,
      responseTime: rt,
      requestPayload: reqPayload ? truncate(reqPayload) : null,
      responsePayload: resPayload,
      error: null,
    });
    return res;
  } catch (err) {
    apiLogger.record({
      endpoint: url,
      method,
      status: null,
      responseTime: Date.now() - t0,
      requestPayload: reqPayload ? truncate(reqPayload) : null,
      responsePayload: null,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
