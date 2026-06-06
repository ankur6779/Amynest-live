/**
 * Best-effort POST to /api/crash-events for durable crash_events storage.
 * Never throws — telemetry must not crash the app.
 */

import { getApiUrl } from "@/lib/api";
import { getFirebaseAuth } from "@/lib/firebase";
import type { CrashReport } from "@/lib/crash-report";

async function bearerToken(): Promise<string | null> {
  try {
    const user = getFirebaseAuth().currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export async function persistCrashEventToBackend(report: CrashReport): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = await bearerToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const readableFingerprint =
      typeof report.meta?.readableFingerprint === "string"
        ? report.meta.readableFingerprint
        : undefined;

    const body = {
      errorId: report.errorId,
      fingerprint: report.fingerprint,
      readableFingerprint,
      route: report.route,
      message: report.message,
      stack: report.stack,
      componentStack: report.componentStack,
      childId: report.childId,
      timestamp: report.timestamp,
      meta: {
        kind: report.kind,
        component: report.component,
        sessionId: report.sessionId,
        browser: report.browser,
        os: report.os,
        appVersion: report.appVersion,
        userId: report.userId,
        queryKeys: report.meta?.queryKeys,
        recentActions: report.meta?.recentActions,
        featureFlags: report.meta?.featureFlags,
        mitigationApplied: report.meta?.mitigationApplied,
        recoveryOutcome: report.meta?.recoveryOutcome,
        selfHealing: report.meta?.selfHealing,
        readableFingerprint,
        ...report.meta,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    await fetch(getApiUrl("/api/crash-events"), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      keepalive: true,
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch {
    /* best-effort */
  }
}
