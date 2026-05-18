import { logger } from "./logger.js";

export type HeavyRouteGroup = "dashboard" | "subscription";

const GROUP_CONFIG: Record<
  HeavyRouteGroup,
  { cacheMs: number; maxPerWindow: number; windowMs: number }
> = {
  dashboard: { cacheMs: 10_000, maxPerWindow: 2, windowMs: 5_000 },
  subscription: { cacheMs: 30_000, maxPerWindow: 1, windowMs: 5_000 },
};

const LOOP_WINDOW_MS = 2_000;
const LOOP_THRESHOLD = 3;
const IN_FLIGHT_WAIT_MS = 4_000;
const IN_FLIGHT_POLL_MS = 100;

type CacheEntry = { body: unknown; expiresAt: number };

const responseCache = new Map<string, CacheEntry>();
const rateTimestamps = new Map<string, number[]>();
const callHistory = new Map<string, number[]>();
const inFlightKeys = new Set<string>();

let memoryPressureMode = false;

export function isMemoryPressureMode(): boolean {
  return memoryPressureMode;
}

export function setMemoryPressureMode(on: boolean): void {
  if (memoryPressureMode !== on) {
    memoryPressureMode = on;
    if (on) {
      logger.warn({ evt: "memory.pressure_on" }, "Heavy API routes degraded to cache/fallback");
    } else {
      logger.info({ evt: "memory.pressure_off" }, "Heavy API routes restored");
    }
  }
}

function routeKey(userId: string, path: string): string {
  return `${userId}:${path}`;
}

export function getCachedHeavyResponse(
  userId: string,
  path: string,
): unknown | null {
  const entry = responseCache.get(routeKey(userId, path));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(routeKey(userId, path));
    return null;
  }
  return entry.body;
}

export function setCachedHeavyResponse(
  userId: string,
  path: string,
  body: unknown,
  group: HeavyRouteGroup,
): void {
  const ttl = GROUP_CONFIG[group].cacheMs;
  responseCache.set(routeKey(userId, path), {
    body,
    expiresAt: Date.now() + ttl,
  });
}

export type GuardDecision =
  | { action: "proceed" }
  | { action: "respond"; body: unknown; reason: string }
  | { action: "fallback"; reason: string };

export function evaluateHeavyRouteRequest(
  group: HeavyRouteGroup,
  userId: string,
  path: string,
): GuardDecision {
  const cached = getCachedHeavyResponse(userId, path);

  // Memory pressure is informational only. We NEVER auto-degrade live requests
  // to a fallback purely because RSS is high — that turned the dashboard into
  // empty data even under normal V8 heap growth. If pressure is real and the
  // container OOMs, Render restarts us; until then, serve real data.
  // Cache-hits below still apply, which gives free CPU/memory relief.

  const now = Date.now();
  const historyKey = routeKey(userId, path);
  const recentCalls = (callHistory.get(historyKey) ?? []).filter(
    (t) => now - t < LOOP_WINDOW_MS,
  );
  recentCalls.push(now);
  callHistory.set(historyKey, recentCalls);

  if (recentCalls.length >= LOOP_THRESHOLD) {
    logger.warn(
      { evt: "api.loop_detected", userId, path, count: recentCalls.length, group },
      "Repeated API calls within 2s — returning cache/fallback",
    );
    if (cached != null) return { action: "respond", body: cached, reason: "loop_cache" };
    return { action: "fallback", reason: "loop_detected" };
  }

  const rateKey = `${group}:${userId}`;
  const cfg = GROUP_CONFIG[group];
  const hits = (rateTimestamps.get(rateKey) ?? []).filter(
    (t) => now - t < cfg.windowMs,
  );
  if (hits.length >= cfg.maxPerWindow) {
    if (cached != null) {
      return { action: "respond", body: cached, reason: "rate_limit_cache" };
    }
    return { action: "fallback", reason: "rate_limit" };
  }
  hits.push(now);
  rateTimestamps.set(rateKey, hits);

  if (cached != null) {
    return { action: "respond", body: cached, reason: "cache_hit" };
  }

  return { action: "proceed" };
}

export function markHeavyRouteInFlight(userId: string, path: string): string {
  const key = routeKey(userId, path);
  inFlightKeys.add(key);
  return key;
}

export function clearHeavyRouteInFlight(key: string): void {
  inFlightKeys.delete(key);
}

export function isHeavyRouteInFlight(userId: string, path: string): boolean {
  return inFlightKeys.has(routeKey(userId, path));
}

export async function waitForHeavyRouteCache(
  userId: string,
  path: string,
): Promise<unknown | null> {
  const deadline = Date.now() + IN_FLIGHT_WAIT_MS;
  while (Date.now() < deadline) {
    const cached = getCachedHeavyResponse(userId, path);
    if (cached != null) return cached;
    if (!isHeavyRouteInFlight(userId, path)) break;
    await new Promise((r) => setTimeout(r, IN_FLIGHT_POLL_MS));
  }
  return getCachedHeavyResponse(userId, path);
}

/** Trim expired entries and cap map sizes — called every 60s. */
export function cleanupProductionGuardMaps(): void {
  const now = Date.now();

  for (const [k, v] of responseCache) {
    if (now > v.expiresAt) responseCache.delete(k);
  }
  if (responseCache.size > 500) {
    const drop = responseCache.size - 400;
    let n = 0;
    for (const k of responseCache.keys()) {
      responseCache.delete(k);
      if (++n >= drop) break;
    }
  }

  for (const [k, times] of rateTimestamps) {
    const recent = times.filter((t) => now - t < 10_000);
    if (recent.length === 0) rateTimestamps.delete(k);
    else rateTimestamps.set(k, recent);
  }

  for (const [k, times] of callHistory) {
    const recent = times.filter((t) => now - t < 5_000);
    if (recent.length === 0) callHistory.delete(k);
    else callHistory.set(k, recent);
  }

  inFlightKeys.clear();
}
