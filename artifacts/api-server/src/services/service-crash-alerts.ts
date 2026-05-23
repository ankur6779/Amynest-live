import { logger } from "../lib/logger.js";
import type { MonitoredService } from "./service-crash-store.js";

/** Slack-compatible webhook for service crash / recovery alerts. */
export async function sendServiceCrashAlert(
  kind: "service_crash" | "service_recovery" | "multi_service_down",
  service: MonitoredService | "multiple",
  detail: Record<string, unknown>,
): Promise<void> {
  const url =
    process.env.SERVICE_CRASH_ALERT_WEBHOOK_URL?.trim() ??
    process.env.STATIC_AUDIO_ALERT_WEBHOOK_URL?.trim();
  if (!url) return;

  const labels: Record<MonitoredService | "multiple", string> = {
    backend: "Backend",
    worker: "Worker",
    redis: "Redis",
    db: "Database",
    multiple: "Multiple services",
  };

  const label = labels[service];
  const text =
    kind === "service_crash"
      ? `[AmyNest] ${label} DOWN`
      : kind === "service_recovery"
        ? `[AmyNest] ${label} recovered`
        : `[AmyNest] Safe mode — multiple services DOWN`;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        event: kind,
        service,
        detail,
        ts: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    logger.warn(
      {
        evt: "service_crash.alert_webhook_failed",
        kind,
        service,
        message: err instanceof Error ? err.message : String(err),
      },
      "service crash alert webhook failed",
    );
  }
}
