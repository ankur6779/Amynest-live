/**
 * Periodic admin health digest — email (+ optional Slack summary) every N hours.
 */

import { sendEmail, isEmailConfigured } from "../lib/email.js";
import { logger } from "../lib/logger.js";
import { getAdminDashboard } from "./audio-health-store.js";
import { getSystemHealthSnapshot } from "./system-health-store.js";

export type AdminHealthDigestResult =
  | { sent: true; emailId: string | null; slack: boolean }
  | { sent: false; reason: "disabled" | "no_email" | "no_provider" | "send_failed" | "recently_sent"; error?: string };

const MIN_INTERVAL_MS = 3.5 * 60 * 60 * 1000;
let lastDigestSentAt: number | null = null;

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function statusEmoji(status: string): string {
  if (status === "healthy" || status === "UP") return "🟢";
  if (status === "degraded" || status === "DOWN") return status === "DOWN" ? "🔴" : "🟡";
  if (status === "failing") return "🔴";
  return "⚪";
}

function formatIstTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function isAdminHealthDigestEnabled(): boolean {
  const raw = process.env["ADMIN_HEALTH_DIGEST_ENABLED"]?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function composeAdminHealthDigest(args: {
  dashboard: ReturnType<typeof getAdminDashboard>;
  system: Awaited<ReturnType<typeof getSystemHealthSnapshot>>;
  dashboardUrl?: string;
}): { subject: string; text: string; html: string } {
  const { dashboard, system, dashboardUrl = "https://www.amynest.in/admin/dashboard" } = args;
  const generatedAt = formatIstTimestamp(dashboard.generatedAt);

  const infraRows = [
    ["API", system.health.apiHealthy],
    ["Streaming", system.health.streamingHealthy],
    ["Cache", system.health.cacheHealthy],
    ["Worker", system.health.workerHealthy],
    ["DB", system.health.dbHealthy],
  ] as const;

  const layerLines = dashboard.layerHealth
    .filter((l) => l.total > 0)
    .map(
      (l) =>
        `  ${l.layer}: ${pct(l.successPct)} success, ${pct(l.failurePct)} fail, TTFA ${Math.round(l.avgTtfaMs)}ms`,
    );

  const moduleLines = dashboard.perModuleStats
    .filter((m) => m.total > 0)
    .map(
      (m) =>
        `  ${m.label}: ${m.success}/${m.total} ok, fail ${pct(m.failure / Math.max(m.total, 1))}, TTFA ${Math.round(m.avgTtfaMs)}ms`,
    );

  const serviceLines =
    system.services?.services.map(
      (s) => `  ${statusEmoji(s.status)} ${s.service}: ${s.status}`,
    ) ?? [];

  const alertLines = dashboard.alerts.map(
    (a) => `  ${a.emoji} [${a.severity}] ${a.message}`,
  );

  const errorLines = dashboard.errorFeed.slice(0, 5).map((e) => {
    const when = formatIstTimestamp(e.time);
    return `  ${when} — ${e.module}: ${e.error}`;
  });

  const opsFlags: string[] = [];
  if (dashboard.ops.safeMode) opsFlags.push("safe_mode");
  if (dashboard.ops.disableStreaming) opsFlags.push("streaming_disabled");
  if (dashboard.ops.disableApi) opsFlags.push("api_disabled");
  if (dashboard.ops.forceEmergencyMode) opsFlags.push("emergency_mode");
  if (dashboard.ops.pregenerationPaused) opsFlags.push("pregen_paused");

  const text = [
    `AmyNest Health Report — ${generatedAt} IST`,
    "",
    `Overall: ${statusEmoji(dashboard.status)} ${dashboard.status.toUpperCase()}`,
    `Window: last ${Math.round(dashboard.windowMs / 60_000)} min | Requests: ${dashboard.totalRequests}`,
    "",
    "Audio metrics",
    `  Success: ${pct(dashboard.successRate)} | Failure: ${pct(dashboard.failureRate)} | Fallback: ${pct(dashboard.fallbackRate)}`,
    `  Avg TTFA: ${Math.round(dashboard.avgTTFA)}ms | Cache hit: ${pct(dashboard.cacheHealth.hitRate)}`,
    "",
    "Infrastructure",
    ...infraRows.map(([name, ok]) => `  ${statusEmoji(ok ? "healthy" : "failing")} ${name}: ${ok ? "healthy" : "unhealthy"}`),
    `  API error rate: ${pct(system.metrics.apiErrorRate)} | Stall: ${pct(system.metrics.streamingStallRate)}`,
    `  Worker queue: ${Math.round(system.metrics.workerQueueDelayMs)}ms | DB latency: ${Math.round(system.metrics.dbLatencyMs)}ms`,
    "",
    ...(layerLines.length ? ["Layer health", ...layerLines, ""] : []),
    ...(moduleLines.length ? ["Modules", ...moduleLines, ""] : []),
    ...(serviceLines.length ? ["Services", ...serviceLines, ""] : []),
    ...(alertLines.length ? ["Active alerts", ...alertLines, ""] : ["Active alerts", "  None", ""]),
    ...(errorLines.length ? ["Recent errors", ...errorLines, ""] : []),
    ...(opsFlags.length ? [`Ops flags: ${opsFlags.join(", ")}`, ""] : []),
    ...(system.incidents.length
      ? [
          "Incidents",
          ...system.incidents.slice(0, 5).map((i) => `  ${i.type}: ${i.cause}`),
          "",
        ]
      : []),
    `Full dashboard: ${dashboardUrl}`,
  ].join("\n");

  const html = `
<div style="font-family:system-ui,sans-serif;max-width:640px;color:#111">
  <h2 style="margin:0 0 8px">AmyNest Health Report</h2>
  <p style="color:#555;margin:0 0 16px">${generatedAt} IST</p>
  <p style="font-size:18px;margin:0 0 16px">${statusEmoji(dashboard.status)} <strong>${dashboard.status.toUpperCase()}</strong></p>
  <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
    <tr><td style="padding:4px 8px;border:1px solid #ddd">Success</td><td style="padding:4px 8px;border:1px solid #ddd">${pct(dashboard.successRate)}</td></tr>
    <tr><td style="padding:4px 8px;border:1px solid #ddd">Failure</td><td style="padding:4px 8px;border:1px solid #ddd">${pct(dashboard.failureRate)}</td></tr>
    <tr><td style="padding:4px 8px;border:1px solid #ddd">Fallback</td><td style="padding:4px 8px;border:1px solid #ddd">${pct(dashboard.fallbackRate)}</td></tr>
    <tr><td style="padding:4px 8px;border:1px solid #ddd">Avg TTFA</td><td style="padding:4px 8px;border:1px solid #ddd">${Math.round(dashboard.avgTTFA)}ms</td></tr>
    <tr><td style="padding:4px 8px;border:1px solid #ddd">Requests (${Math.round(dashboard.windowMs / 60_000)}m)</td><td style="padding:4px 8px;border:1px solid #ddd">${dashboard.totalRequests}</td></tr>
  </table>
  <h3 style="margin:16px 0 8px">Infrastructure</h3>
  <ul style="margin:0;padding-left:20px">
    ${infraRows.map(([name, ok]) => `<li>${name}: ${ok ? "healthy" : "unhealthy"}</li>`).join("")}
    <li>API error: ${pct(system.metrics.apiErrorRate)} | Stall: ${pct(system.metrics.streamingStallRate)}</li>
    <li>Worker queue: ${Math.round(system.metrics.workerQueueDelayMs)}ms | DB: ${Math.round(system.metrics.dbLatencyMs)}ms</li>
  </ul>
  ${alertLines.length ? `<h3 style="margin:16px 0 8px">Alerts</h3><ul style="margin:0;padding-left:20px">${dashboard.alerts.map((a) => `<li>${a.emoji} ${a.message}</li>`).join("")}</ul>` : ""}
  ${opsFlags.length ? `<p style="margin:16px 0 8px"><strong>Ops:</strong> ${opsFlags.join(", ")}</p>` : ""}
  <p style="margin-top:24px"><a href="${dashboardUrl}">Open admin dashboard</a></p>
</div>`.trim();

  const subjectStatus = dashboard.status === "healthy" ? "OK" : dashboard.status.toUpperCase();
  return {
    subject: `[AmyNest Health] ${subjectStatus} — ${generatedAt}`,
    text,
    html,
  };
}

async function sendSlackSummary(text: string): Promise<boolean> {
  const url =
    process.env["ADMIN_ALERT_SLACK_WEBHOOK_URL"]?.trim() ??
    process.env["SERVICE_CRASH_ALERT_WEBHOOK_URL"]?.trim();
  if (!url) return false;

  const preview = text.split("\n").slice(0, 18).join("\n");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: preview, ts: new Date().toISOString() }),
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok;
  } catch (err) {
    logger.warn(
      {
        evt: "admin_health_digest.slack_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      "admin health digest slack send failed",
    );
    return false;
  }
}

export async function dispatchAdminHealthDigest(now = Date.now()): Promise<AdminHealthDigestResult> {
  if (!isAdminHealthDigestEnabled()) {
    return { sent: false, reason: "disabled" };
  }

  if (lastDigestSentAt != null && now - lastDigestSentAt < MIN_INTERVAL_MS) {
    return { sent: false, reason: "recently_sent" };
  }

  const to = process.env["ADMIN_ALERT_EMAIL"]?.trim();
  if (!to) {
    logger.warn({ evt: "admin_health_digest.skip" }, "ADMIN_ALERT_EMAIL not set");
    return { sent: false, reason: "no_email" };
  }

  if (!isEmailConfigured()) {
    logger.warn({ evt: "admin_health_digest.skip" }, "RESEND_API_KEY not set");
    return { sent: false, reason: "no_provider" };
  }

  const dashboard = getAdminDashboard(now);
  const system = await getSystemHealthSnapshot(now);
  const dashboardUrl =
    process.env["ADMIN_HEALTH_DIGEST_DASHBOARD_URL"]?.trim() ??
    "https://www.amynest.in/admin/dashboard";
  const composed = composeAdminHealthDigest({ dashboard, system, dashboardUrl });

  const result = await sendEmail({
    to,
    subject: composed.subject,
    html: composed.html,
    text: composed.text,
  });

  if (!result.ok) {
    return {
      sent: false,
      reason: "send_failed",
      error: result.error,
    };
  }

  const slack =
    process.env["ADMIN_HEALTH_DIGEST_SLACK"]?.trim().toLowerCase() !== "false"
      ? await sendSlackSummary(composed.text)
      : false;

  lastDigestSentAt = now;
  logger.info(
    {
      evt: "admin_health_digest.sent",
      status: dashboard.status,
      emailId: result.id,
      slack,
    },
    "admin health digest dispatched",
  );

  return { sent: true, emailId: result.id, slack };
}

/** Test-only reset. */
export function resetAdminHealthDigestForTests(): void {
  lastDigestSentAt = null;
}
