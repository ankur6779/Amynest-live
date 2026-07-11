/**
 * Persistent install identity — set once on first app open, never rotated.
 */
const INSTALL_ID_KEY = "amynest:install:id:v1";
const FIRST_OPEN_KEY = "amynest:install:first_open:v1";
const FUNNEL_SESSION_KEY = "amynest:funnel:session:v1";
const LAUNCH_TS_KEY = "amynest:funnel:launch_ts:v1";

function safeRead(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `i_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function getOrCreateInstallId(): string {
  const existing = safeRead(INSTALL_ID_KEY);
  if (existing && existing.length >= 8) return existing;
  const id = randomId();
  safeWrite(INSTALL_ID_KEY, id);
  return id;
}

export function isFirstInstallOpen(): boolean {
  return safeRead(FIRST_OPEN_KEY) !== "1";
}

export function markFirstInstallOpen(): void {
  safeWrite(FIRST_OPEN_KEY, "1");
}

export function getOrCreateFunnelSessionId(): string {
  try {
    const existing = sessionStorage.getItem(FUNNEL_SESSION_KEY);
    if (existing && existing.length >= 8) return existing;
    const id = randomId();
    sessionStorage.setItem(FUNNEL_SESSION_KEY, id);
    return id;
  } catch {
    return randomId();
  }
}

/** Earliest launch timestamp — set in index.html before any bundle. */
export function getLaunchTimestampMs(): number {
  if (typeof window !== "undefined") {
    const win = window as Window & {
      __AMYNEST_LAUNCH_TS?: number;
      __AMYNEST_NATIVE_LAUNCH_TS?: number;
    };
    if (typeof win.__AMYNEST_NATIVE_LAUNCH_TS === "number") {
      return win.__AMYNEST_NATIVE_LAUNCH_TS;
    }
    if (typeof win.__AMYNEST_LAUNCH_TS === "number") {
      return win.__AMYNEST_LAUNCH_TS;
    }
  }
  const stored = safeRead(LAUNCH_TS_KEY);
  if (stored) {
    const n = Number(stored);
    if (Number.isFinite(n)) return n;
  }
  const now = Date.now();
  safeWrite(LAUNCH_TS_KEY, String(now));
  return now;
}

export function setLaunchTimestampMs(ts: number): void {
  if (typeof window !== "undefined") {
    (window as Window & { __AMYNEST_LAUNCH_TS?: number }).__AMYNEST_LAUNCH_TS = ts;
  }
  safeWrite(LAUNCH_TS_KEY, String(ts));
}

export type StartType = "cold" | "warm" | "hot";

export function detectStartType(): StartType {
  if (typeof window === "undefined") return "cold";
  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav?.type === "reload") return "warm";
    if (nav?.type === "back_forward") return "hot";
  } catch {
    /* ignore */
  }
  return "cold";
}
