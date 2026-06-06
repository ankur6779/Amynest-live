/**
 * Structured client crash reporting with fingerprinting for grouping identical crashes.
 */

import { logClientError } from "@/lib/log-client-error";

export type CrashReport = {
  fingerprint: string;
  kind: string;
  message: string;
  stack?: string;
  component?: string;
  route?: string;
  userId?: string | null;
  sessionId?: string;
  browser?: string;
  os?: string;
  appVersion?: string;
  timestamp: string;
  meta?: Record<string, unknown>;
};

const SESSION_KEY = "amynest:crash-session-id";

function readSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `cs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `cs_${Date.now().toString(36)}`;
  }
}

function detectOs(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "unknown";
}

function detectBrowser(ua: string): string {
  if (/AmyNestAndroid/i.test(ua)) return "AmyNest Android WebView";
  if (/Capacitor/i.test(ua)) return "Capacitor WebView";
  if (/CriOS/i.test(ua)) return "Chrome iOS";
  if (/FxiOS/i.test(ua)) return "Firefox iOS";
  if (/Edg/i.test(ua)) return "Edge";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
  if (/Firefox/i.test(ua)) return "Firefox";
  return "unknown";
}

function readAppVersion(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return (
    document.querySelector('meta[name="app-build-version"]')?.getAttribute("content") ??
    document.querySelector('meta[name="amynest-deploy"]')?.getAttribute("content") ??
    undefined
  );
}

/** Stable hash for grouping identical crashes in dashboards. */
export function fingerprintCrash(
  message: string,
  component?: string,
  stack?: string,
): string {
  const head = (stack ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join("|");
  const raw = [message.replace(/\d+/g, "N"), component ?? "", head].join("::");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${(hash >>> 0).toString(16)}`;
}

export function buildCrashReport(input: {
  kind: string;
  message: string;
  stack?: string;
  component?: string;
  userId?: string | null;
  meta?: Record<string, unknown>;
}): CrashReport {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const route = typeof window !== "undefined" ? window.location.pathname : undefined;
  const message = input.message.slice(0, 4000);
  const stack = input.stack?.slice(0, 8000);
  const fingerprint = fingerprintCrash(message, input.component, stack);

  return {
    fingerprint,
    kind: input.kind,
    message,
    stack,
    component: input.component,
    route,
    userId: input.userId ?? null,
    sessionId: readSessionId(),
    browser: detectBrowser(ua),
    os: detectOs(ua),
    appVersion: readAppVersion(),
    timestamp: new Date().toISOString(),
    meta: input.meta,
  };
}

/** Log to console + POST /api/logs. Never throws. */
export async function reportCrash(input: {
  kind: string;
  message: string;
  stack?: string;
  component?: string;
  userId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<CrashReport> {
  const report = buildCrashReport(input);

  console.error("[amynest:crash]", {
    fingerprint: report.fingerprint,
    kind: report.kind,
    component: report.component,
    route: report.route,
    message: report.message,
  });

  try {
    const w = window as Window & { __amynestCrashLog?: CrashReport[] };
    const log = w.__amynestCrashLog ?? [];
    log.push(report);
    if (log.length > 50) log.shift();
    w.__amynestCrashLog = log;
  } catch {
    /* ignore */
  }

  void logClientError({
    label: input.component ?? report.kind,
    message: `[${report.fingerprint}] ${report.message}`,
    stack: report.stack,
    meta: {
      fingerprint: report.fingerprint,
      kind: report.kind,
      route: report.route,
      sessionId: report.sessionId,
      browser: report.browser,
      os: report.os,
      appVersion: report.appVersion,
      userId: report.userId,
      ...report.meta,
    },
  });

  return report;
}
