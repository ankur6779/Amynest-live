import type { ReleaseHealthReport } from "./pilot-types.js";
import { getProductEvents } from "./product-analytics.js";
import { trackProductEvent } from "./product-analytics.js";

export function recordHealthEvent(
  kind: "api_failure" | "offline_fallback" | "export_failure" | "vision_failure" | "crash" | "recovery_success",
  detail?: string,
): void {
  const typeMap = {
    api_failure: "api_failure" as const,
    offline_fallback: "offline_fallback" as const,
    export_failure: "export_failure" as const,
    vision_failure: "vision_failure" as const,
    crash: "crash" as const,
    recovery_success: "recovery_success" as const,
  };
  trackProductEvent(typeMap[kind], detail ? { detail: detail.slice(0, 120) } : undefined);
}

export function buildReleaseHealthReport(): ReleaseHealthReport {
  const events = getProductEvents();
  const sessions = new Set(events.filter((e) => e.type === "session_start").map((e) => e.sessionId));
  const crashed = new Set(events.filter((e) => e.type === "crash").map((e) => e.sessionId));
  const totalSessions = sessions.size || 1;
  const crashFreeSessions = [...sessions].filter((s) => !crashed.has(s)).length;

  return {
    crashFreeSessions,
    totalSessions,
    apiFailures: events.filter((e) => e.type === "api_failure").length,
    offlineFallbacks: events.filter((e) => e.type === "offline_fallback").length,
    pdfExportFailures: events.filter((e) => e.type === "export_failure" && e.props?.format === "pdf").length,
    docxExportFailures: events.filter((e) => e.type === "export_failure" && e.props?.format === "docx").length,
    visionFailures: events.filter((e) => e.type === "vision_failure").length,
    recoverySuccesses: events.filter((e) => e.type === "recovery_success").length,
    crashFreeRate: Math.round((crashFreeSessions / totalSessions) * 100),
  };
}
