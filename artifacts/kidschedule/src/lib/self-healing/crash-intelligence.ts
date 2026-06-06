/**
 * Level 9 — Crash intelligence: fingerprints, context capture, spike tracking.
 */

import { fingerprintCrash, generateErrorReferenceId } from "@/lib/crash-report";
import { getRecentSelfHealingActions } from "@/lib/self-healing/action-log";
import type { CrashIntelligencePayload, RecoveryLevel } from "@/lib/self-healing/types";

function detectOs(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  return "unknown";
}

function detectBrowser(ua: string): string {
  if (/AmyNestAndroid/i.test(ua)) return "AmyNest Android WebView";
  if (/Capacitor/i.test(ua)) return "Capacitor WebView";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
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

function readChildId(route?: string): string | null {
  if (!route) return null;
  const m = route.match(/\/children\/([^/]+)/);
  return m?.[1] ?? null;
}

/** Human-readable fingerprint for dashboards — e.g. ChildForm|MaximumDepth|InfantEffect */
export function buildReadableFingerprint(
  component?: string,
  message?: string,
  effectHint?: string,
): string {
  const comp = (component ?? "Unknown").replace(/\s+/g, "");
  let msgClass = "Error";
  if (message?.includes("Maximum update depth")) msgClass = "MaximumDepth";
  else if (message?.includes("Too many re-renders")) msgClass = "TooManyRerenders";
  else if (message?.includes("ChunkLoadError")) msgClass = "ChunkLoad";
  else if (message?.includes("Failed to fetch")) msgClass = "Network";
  const parts = [comp, msgClass, effectHint?.replace(/\s+/g, "")].filter(Boolean);
  return parts.join("|");
}

function inferEffectHint(message: string, componentStack?: string): string | undefined {
  const stack = componentStack ?? "";
  if (stack.includes("ChildForm") || message.includes("child")) {
    if (message.includes("Maximum update depth")) return "InfantEffect";
    return "ChildForm";
  }
  if (stack.includes("ChildDobPicker")) return "DobPicker";
  return undefined;
}

export function captureCrashIntelligence(input: {
  kind: string;
  message: string;
  stack?: string;
  component?: string;
  componentStack?: string;
  userId?: string | null;
  childId?: string | null;
  queryKeys?: string[];
  recoveryLevel?: RecoveryLevel;
  mitigationApplied?: string | null;
}): CrashIntelligencePayload {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const route = typeof window !== "undefined" ? window.location.pathname : undefined;
  const effectHint = inferEffectHint(input.message, input.componentStack);
  const readableFingerprint = buildReadableFingerprint(
    input.component,
    input.message,
    effectHint,
  );
  const fingerprint = fingerprintCrash(input.message, input.component, input.stack);

  const payload: CrashIntelligencePayload = {
    errorId: generateErrorReferenceId(),
    fingerprint,
    readableFingerprint,
    kind: input.kind,
    message: input.message.slice(0, 4000),
    stack: input.stack?.slice(0, 8000),
    component: input.component,
    componentStack: input.componentStack?.slice(0, 8000),
    route,
    userId: input.userId ?? null,
    childId: input.childId ?? readChildId(route),
    browser: detectBrowser(ua),
    os: detectOs(ua),
    appVersion: readAppVersion(),
    timestamp: new Date().toISOString(),
    queryKeys: input.queryKeys?.slice(0, 20),
    recentActions: getRecentSelfHealingActions().slice(-10),
    recoveryLevel: input.recoveryLevel,
    mitigationApplied: input.mitigationApplied ?? null,
  };

  try {
    const w = window as Window & {
      __amynestCrashIntelligence?: CrashIntelligencePayload[];
      __amynestFingerprintCounts?: Record<string, number>;
    };
    const log = w.__amynestCrashIntelligence ?? [];
    log.push(payload);
    if (log.length > 50) log.shift();
    w.__amynestCrashIntelligence = log;

    const counts = w.__amynestFingerprintCounts ?? {};
    counts[readableFingerprint] = (counts[readableFingerprint] ?? 0) + 1;
    w.__amynestFingerprintCounts = counts;
  } catch {
    /* ignore */
  }

  return payload;
}

export function getFingerprintCounts(): Record<string, number> {
  try {
    const w = window as Window & { __amynestFingerprintCounts?: Record<string, number> };
    return { ...(w.__amynestFingerprintCounts ?? {}) };
  } catch {
    return {};
  }
}
