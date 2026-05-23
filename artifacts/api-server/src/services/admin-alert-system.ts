/**
 * Smart admin alert system — severity-routed notifications with dedup + cooldown.
 *
 * CRITICAL → Telegram + Slack + Email
 * WARNING  → Slack only
 * INFO     → dashboard only
 */

import { logger } from "../lib/logger.js";
import { sendEmail } from "../lib/email.js";

export type AdminAlertSeverity = "critical" | "warning" | "info";

export type AdminAlertModule =
  | "infra"
  | "lesson"
  | "api"
  | "streaming"
  | "predictive"
  | "system";

export type AdminAlertPayload = {
  severity: AdminAlertSeverity;
  module: AdminAlertModule;
  issue: string;
  metric: string;
  value: number;
  actionTaken?: string;
};

export type AdminAlertRecord = AdminAlertPayload & {
  id: string;
  dedupKey: string;
  sentAt: number;
  channels: AdminAlertChannel[];
  resolved?: boolean;
  resolutionMessage?: string;
};

export type AdminAlertChannel = "telegram" | "slack" | "email" | "dashboard";

export type AdminAlertDispatchResult = {
  dispatched: boolean;
  reason?: "dedup" | "cooldown" | "dashboard_only";
  channels: AdminAlertChannel[];
};

const DEDUP_WINDOW_MS = 5 * 60 * 1000;
const COOLDOWN_MS = 2 * 60 * 1000;
const MAX_DASHBOARD_ALERTS = 50;

const dashboardAlerts: AdminAlertRecord[] = [];
const recentDispatches = new Map<string, number>();
const activeConditions = new Set<string>();
let lastExternalDispatchAt: number | null = null;

function alertConditionKey(payload: Pick<AdminAlertPayload, "module" | "metric" | "issue">): string {
  return `${payload.module}:${payload.metric}:${payload.issue}`;
}

function dedupKey(payload: AdminAlertPayload): string {
  return `${payload.severity}:${alertConditionKey(payload)}`;
}

function channelsForSeverity(severity: AdminAlertSeverity): AdminAlertChannel[] {
  switch (severity) {
    case "critical":
      return ["telegram", "slack", "email", "dashboard"];
    case "warning":
      return ["slack", "dashboard"];
    case "info":
      return ["dashboard"];
  }
}

function formatAlertText(payload: AdminAlertPayload): string {
  const pctMetrics = new Set(["failureRate", "fallbackRate", "apiErrorRate", "streamingStallRate"]);
  const valueStr = pctMetrics.has(payload.metric)
    ? `${payload.value.toFixed(1)}%`
    : payload.metric === "ttfa"
      ? `${Math.round(payload.value)}ms`
      : String(payload.value);

  const lines = [
    `[AmyNest] ${payload.severity.toUpperCase()} — ${payload.issue}`,
    `Module: ${payload.module}`,
    `Metric: ${payload.metric} = ${valueStr}`,
  ];
  if (payload.actionTaken) {
    lines.push(`Action: ${payload.actionTaken}`);
  }
  return lines.join("\n");
}

function formatResolutionText(issue: string, message?: string): string {
  return message ?? `✅ ${issue} resolved, system normal`;
}

async function sendSlackAlert(payload: AdminAlertPayload): Promise<void> {
  const url =
    process.env.ADMIN_ALERT_SLACK_WEBHOOK_URL?.trim() ??
    process.env.SERVICE_CRASH_ALERT_WEBHOOK_URL?.trim() ??
    process.env.STATIC_AUDIO_ALERT_WEBHOOK_URL?.trim();
  if (!url) return;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: formatAlertText(payload),
      alert: payload,
      ts: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(8_000),
  });
}

async function sendSlackResolution(issue: string, message: string): Promise<void> {
  const url =
    process.env.ADMIN_ALERT_SLACK_WEBHOOK_URL?.trim() ??
    process.env.SERVICE_CRASH_ALERT_WEBHOOK_URL?.trim() ??
    process.env.STATIC_AUDIO_ALERT_WEBHOOK_URL?.trim();
  if (!url) return;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message, resolution: issue, ts: new Date().toISOString() }),
    signal: AbortSignal.timeout(8_000),
  });
}

async function sendTelegramAlert(payload: AdminAlertPayload): Promise<void> {
  const token = process.env.ADMIN_ALERT_TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.ADMIN_ALERT_TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatAlertText(payload),
    }),
    signal: AbortSignal.timeout(8_000),
  });
}

async function sendTelegramResolution(message: string): Promise<void> {
  const token = process.env.ADMIN_ALERT_TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.ADMIN_ALERT_TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
    signal: AbortSignal.timeout(8_000),
  });
}

async function sendEmailAlert(payload: AdminAlertPayload): Promise<void> {
  const to = process.env.ADMIN_ALERT_EMAIL?.trim();
  if (!to) return;

  const text = formatAlertText(payload);
  await sendEmail({
    to,
    subject: `[AmyNest ${payload.severity.toUpperCase()}] ${payload.issue}`,
    html: `<pre>${text.replace(/</g, "&lt;")}</pre>`,
    text,
  });
}

async function sendEmailResolution(message: string, issue: string): Promise<void> {
  const to = process.env.ADMIN_ALERT_EMAIL?.trim();
  if (!to) return;

  await sendEmail({
    to,
    subject: `[AmyNest] Resolved: ${issue}`,
    html: `<p>${message}</p>`,
    text: message,
  });
}

function recordDashboardAlert(
  payload: AdminAlertPayload,
  key: string,
  channels: AdminAlertChannel[],
  resolved = false,
  resolutionMessage?: string,
): AdminAlertRecord {
  const record: AdminAlertRecord = {
    ...payload,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dedupKey: key,
    sentAt: Date.now(),
    channels,
    resolved,
    resolutionMessage,
  };
  dashboardAlerts.unshift(record);
  if (dashboardAlerts.length > MAX_DASHBOARD_ALERTS) {
    dashboardAlerts.length = MAX_DASHBOARD_ALERTS;
  }
  return record;
}

function shouldSkipExternalDispatch(key: string, now: number): "dedup" | "cooldown" | null {
  const lastSame = recentDispatches.get(key);
  if (lastSame != null && now - lastSame < DEDUP_WINDOW_MS) {
    return "dedup";
  }
  if (lastExternalDispatchAt != null && now - lastExternalDispatchAt < COOLDOWN_MS) {
    return "cooldown";
  }
  return null;
}

async function dispatchExternal(
  payload: AdminAlertPayload,
  channels: AdminAlertChannel[],
): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (channels.includes("slack")) tasks.push(sendSlackAlert(payload));
  if (channels.includes("telegram")) tasks.push(sendTelegramAlert(payload));
  if (channels.includes("email")) tasks.push(sendEmailAlert(payload));

  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === "rejected") {
      logger.warn(
        {
          evt: "admin_alert.dispatch_failed",
          issue: payload.issue,
          message: result.reason instanceof Error ? result.reason.message : String(result.reason),
        },
        "admin alert external dispatch failed",
      );
    }
  }
}

async function dispatchExternalResolution(
  issue: string,
  message: string,
  severity: AdminAlertSeverity,
): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (severity === "critical" || severity === "warning") {
    tasks.push(sendSlackResolution(issue, message));
  }
  if (severity === "critical") {
    tasks.push(sendTelegramResolution(message));
    tasks.push(sendEmailResolution(message, issue));
  }

  await Promise.allSettled(tasks);
}

/**
 * Emit an admin alert. Respects dedup (5 min) and global cooldown (2 min) for external channels.
 */
export async function emitAdminAlert(
  payload: AdminAlertPayload,
  now = Date.now(),
): Promise<AdminAlertDispatchResult> {
  const key = dedupKey(payload);
  const channels = channelsForSeverity(payload.severity);
  const externalChannels = channels.filter((c) => c !== "dashboard");

  if (externalChannels.length === 0) {
    recordDashboardAlert(payload, key, channels);
    recentDispatches.set(key, now);
    activeConditions.add(alertConditionKey(payload));
    return { dispatched: true, reason: "dashboard_only", channels };
  }

  const skipReason = shouldSkipExternalDispatch(key, now);
  if (skipReason) {
    recordDashboardAlert(payload, key, ["dashboard"]);
    activeConditions.add(alertConditionKey(payload));
    logger.info(
      { evt: "admin_alert.skipped", reason: skipReason, issue: payload.issue, key },
      "admin alert skipped external dispatch",
    );
    return { dispatched: false, reason: skipReason, channels: ["dashboard"] };
  }

  await dispatchExternal(payload, externalChannels);
  lastExternalDispatchAt = now;
  recentDispatches.set(key, now);
  activeConditions.add(alertConditionKey(payload));
  recordDashboardAlert(payload, key, channels);

  logger.warn(
    { evt: "admin_alert.sent", severity: payload.severity, issue: payload.issue, channels },
    "admin alert dispatched",
  );

  return { dispatched: true, channels };
}

/**
 * Emit a resolution alert when a previously-active condition clears.
 */
export async function emitAdminResolution(
  payload: Pick<AdminAlertPayload, "module" | "metric" | "issue" | "severity">,
  message?: string,
  now = Date.now(),
): Promise<boolean> {
  const conditionKey = alertConditionKey(payload);
  if (!activeConditions.has(conditionKey)) return false;

  activeConditions.delete(conditionKey);
  const text = formatResolutionText(payload.issue, message);

  const skipReason = shouldSkipExternalDispatch(`resolution:${conditionKey}`, now);
  if (!skipReason) {
    await dispatchExternalResolution(payload.issue, text, payload.severity);
    lastExternalDispatchAt = now;
    recentDispatches.set(`resolution:${conditionKey}`, now);
  }

  recordDashboardAlert(
    { ...payload, value: 0 },
    `resolution:${conditionKey}`,
    payload.severity === "info" ? ["dashboard"] : channelsForSeverity(payload.severity),
    true,
    text,
  );

  logger.info(
    { evt: "admin_alert.resolved", issue: payload.issue, skipped: !!skipReason },
    "admin alert resolution dispatched",
  );

  return true;
}

/**
 * Sync a condition — emits alert on rising edge, resolution on falling edge.
 */
export async function syncAdminAlertCondition(
  active: boolean,
  payload: AdminAlertPayload,
  resolutionMessage?: string,
  now = Date.now(),
): Promise<void> {
  const conditionKey = alertConditionKey(payload);
  const wasActive = activeConditions.has(conditionKey);

  if (active && !wasActive) {
    await emitAdminAlert(payload, now);
  } else if (!active && wasActive) {
    await emitAdminResolution(payload, resolutionMessage, now);
  }
}

export function getAdminAlerts(limit = 30): AdminAlertRecord[] {
  return dashboardAlerts.slice(0, limit);
}

export function isAdminAlertConditionActive(
  payload: Pick<AdminAlertPayload, "module" | "metric" | "issue">,
): boolean {
  return activeConditions.has(alertConditionKey(payload));
}

/** Test-only reset. */
export function resetAdminAlertSystemForTests(): void {
  dashboardAlerts.length = 0;
  recentDispatches.clear();
  activeConditions.clear();
  lastExternalDispatchAt = null;
}
