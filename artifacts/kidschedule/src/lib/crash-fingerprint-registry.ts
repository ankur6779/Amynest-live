/**
 * Sentry-style in-session crash fingerprint registry.
 * Tracks frequency, first/last seen, and dedupes analytics emissions.
 */

import type { CrashReport } from "@/lib/crash-report";

export type CrashFingerprintRecord = {
  fingerprint: string;
  readableFingerprint: string;
  route: string;
  component?: string;
  message: string;
  stackHash: string;
  browser?: string;
  os?: string;
  appVersion?: string;
  sessionId?: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  lastErrorId?: string;
};

const REGISTRY_KEY = "amynest:crash-fingerprint-registry";
const DEDUPE_MS = 60_000;

const sessionRegistry = new Map<string, CrashFingerprintRecord>();
const lastAnalyticsEmit = new Map<string, number>();

function readPersistedRegistry(): Map<string, CrashFingerprintRecord> {
  if (typeof sessionStorage === "undefined") return new Map();
  try {
    const raw = sessionStorage.getItem(REGISTRY_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as CrashFingerprintRecord[];
    return new Map(parsed.map((r) => [r.fingerprint, r]));
  } catch {
    return new Map();
  }
}

function writePersistedRegistry(map: Map<string, CrashFingerprintRecord>): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const list = [...map.values()].slice(-100);
    sessionStorage.setItem(REGISTRY_KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
}

function ensureRegistryLoaded(): void {
  if (sessionRegistry.size > 0) return;
  const persisted = readPersistedRegistry();
  for (const [k, v] of persisted) sessionRegistry.set(k, v);
}

/** Hash top stack frames for grouping (sanitized — no PII). */
export function stackTraceHash(stack?: string): string {
  const head = (stack ?? "")
    .split("\n")
    .map((l) => l.trim().replace(/\d+/g, "N"))
    .filter(Boolean)
    .slice(0, 4)
    .join("|");
  let hash = 0;
  for (let i = 0; i < head.length; i++) {
    hash = (hash << 5) - hash + head.charCodeAt(i);
    hash |= 0;
  }
  return `sh_${(hash >>> 0).toString(16)}`;
}

export function recordCrashFingerprint(
  report: CrashReport,
  readableFingerprint: string,
): CrashFingerprintRecord {
  ensureRegistryLoaded();
  const now = report.timestamp;
  const stackHash = stackTraceHash(report.stack);
  const existing = sessionRegistry.get(report.fingerprint);

  const record: CrashFingerprintRecord = existing
    ? {
        ...existing,
        count: existing.count + 1,
        lastSeen: now,
        lastErrorId: report.errorId,
        message: report.message,
        route: report.route ?? existing.route,
        component: report.component ?? existing.component,
      }
    : {
        fingerprint: report.fingerprint,
        readableFingerprint,
        route: report.route ?? "/",
        component: report.component,
        message: report.message,
        stackHash,
        browser: report.browser,
        os: report.os,
        appVersion: report.appVersion,
        sessionId: report.sessionId,
        count: 1,
        firstSeen: now,
        lastSeen: now,
        lastErrorId: report.errorId,
      };

  sessionRegistry.set(report.fingerprint, record);
  writePersistedRegistry(sessionRegistry);
  return record;
}

/** Prevent duplicate `error_captured` for the same fingerprint within the dedupe window. */
export function shouldEmitErrorCaptured(fingerprint: string): boolean {
  const last = lastAnalyticsEmit.get(fingerprint) ?? 0;
  const now = Date.now();
  if (now - last < DEDUPE_MS) return false;
  lastAnalyticsEmit.set(fingerprint, now);
  return true;
}

export function getCrashFingerprintRegistry(): CrashFingerprintRecord[] {
  ensureRegistryLoaded();
  return [...sessionRegistry.values()].sort(
    (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime(),
  );
}

export function getCrashFingerprintSummary(fingerprint: string): CrashFingerprintRecord | null {
  ensureRegistryLoaded();
  return sessionRegistry.get(fingerprint) ?? null;
}

/** Test helper */
export function resetCrashFingerprintRegistry(): void {
  sessionRegistry.clear();
  lastAnalyticsEmit.clear();
  try {
    sessionStorage.removeItem(REGISTRY_KEY);
  } catch {
    /* ignore */
  }
}
