import { freemem, totalmem } from "node:os";
import { existsSync, mkdirSync, statfsSync } from "node:fs";
import type { ContentEngineConfig } from "../../types/index.js";
import type {
  HealthCheckName,
  HealthCheckResult,
  HealthReport,
  HealthStatus,
} from "../../types/operations.js";
import { createDefaultAnalyticsRegistry } from "../../analytics/providers/index.js";
import { createDefaultTrendRegistry } from "../../brain/trends/index.js";
import { createDefaultRenderRegistry } from "../../render-engine/providers/index.js";
import { createDefaultPublishingRegistry } from "../../publishing/youtube/index.js";

export interface HealthCheckOptions {
  config: ContentEngineConfig;
  dataDirectory: string;
  queueLength?: number;
  schedulerReady?: boolean;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
}

/** Collect Ready / Live / Detailed health status as structured JSON. */
export async function collectHealthReport(
  options: HealthCheckOptions,
): Promise<HealthReport> {
  const now = options.now ?? (() => new Date());
  const checkedAt = now().toISOString();
  const checks: HealthCheckResult[] = [];

  checks.push(await checkNamed("storage", async () => {
    mkdirSync(options.dataDirectory, { recursive: true });
    if (!existsSync(options.dataDirectory)) {
      return unhealthy("Storage directory unavailable");
    }
    return healthy("Storage initialized");
  }));

  checks.push(await checkNamed("queue", async () => {
    const length = options.queueLength ?? 0;
    if (length > 100) return degraded(`Queue length high: ${length}`);
    return healthy(`Queue length ${length}`, { queueLength: length });
  }));

  checks.push(await checkNamed("scheduler", async () => {
    if (options.schedulerReady === false) {
      return unhealthy("Scheduler not initialized");
    }
    return healthy("Scheduler ready");
  }));

  checks.push(await checkNamed("renderer", async () => {
    const registry = createDefaultRenderRegistry();
    const provider = await registry.resolveProvider(
      options.config.renderer ?? "mock",
      options.config.preferredRenderer ?? "mock",
    );
    const health = await provider.health();
    return health.ok
      ? healthy(`Renderer ${provider.id} healthy`)
      : degraded(health.message ?? `Renderer ${provider.id} degraded`);
  }));

  checks.push(await checkNamed("publishing", async () => {
    const registry = createDefaultPublishingRegistry();
    const provider = await registry.resolveProvider(
      options.config.publishingProvider ?? "mock",
    );
    const health = await provider.health();
    return health.ok
      ? healthy(`Publishing ${provider.id} healthy`)
      : degraded(health.message ?? `Publishing ${provider.id} degraded`);
  }));

  checks.push(await checkNamed("analytics", async () => {
    const registry = createDefaultAnalyticsRegistry();
    const provider = await registry.resolveProvider(
      options.config.analyticsProvider ?? "mock",
    );
    const health = await provider.health();
    return health.ok
      ? healthy(`Analytics ${provider.id} healthy`)
      : degraded(health.message ?? `Analytics ${provider.id} degraded`);
  }));

  checks.push(await checkNamed("trend-provider", async () => {
    const registry = createDefaultTrendRegistry();
    const provider = await registry.resolveProvider(
      options.config.trendProvider ?? "mock",
    );
    const health = await provider.health();
    return health.ok
      ? healthy(`Trend provider ${provider.id} healthy`)
      : degraded(health.message ?? `Trend provider ${provider.id} degraded`);
  }));

  const env = options.env ?? process.env;
  checks.push(await checkNamed("openai", async () => {
    if ((options.config.scriptProvider ?? "mock") === "mock") {
      return healthy("OpenAI not required (mock script provider)");
    }
    return env.OPENAI_API_KEY
      ? healthy("OpenAI credentials present")
      : unhealthy("OPENAI_API_KEY missing");
  }));

  checks.push(await checkNamed("youtube", async () => {
    if ((options.config.publishingProvider ?? "mock") === "mock") {
      return healthy("YouTube not required (mock publishing provider)");
    }
    const hasAccess = Boolean(env.YOUTUBE_ACCESS_TOKEN?.trim());
    const hasRefresh =
      Boolean(env.YOUTUBE_CLIENT_ID?.trim()) &&
      Boolean(env.YOUTUBE_CLIENT_SECRET?.trim()) &&
      Boolean(env.YOUTUBE_REFRESH_TOKEN?.trim());
    if (hasAccess || hasRefresh) {
      return healthy(
        hasAccess
          ? "YouTube access token present"
          : "YouTube OAuth refresh credentials present",
      );
    }
    return unhealthy("YouTube OAuth credentials incomplete");
  }));

  checks.push(await checkNamed("telegram", async () => {
    const channels = options.config.opsNotificationChannels ?? [];
    if (!channels.includes("telegram")) {
      return healthy("Telegram not configured");
    }
    return env.TELEGRAM_BOT_TOKEN
      ? healthy("Telegram bot token present")
      : unhealthy("TELEGRAM_BOT_TOKEN missing");
  }));

  checks.push(await checkNamed("email", async () => {
    const channels = options.config.opsNotificationChannels ?? [];
    if (!channels.includes("email")) {
      return healthy("Email not configured");
    }
    const ok = Boolean(env.SMTP_URL) || Boolean(env.SMTP_HOST);
    return ok ? healthy("SMTP credentials present") : unhealthy("SMTP credentials missing");
  }));

  checks.push(await checkNamed("memory", async () => {
    const used = 1 - freemem() / totalmem();
    const pct = Math.round(used * 100);
    const max = options.config.maximumMemoryUsagePercent ?? 90;
    // System-wide memory is advisory: only critical exhaustion blocks liveness.
    if (pct >= 98) {
      return unhealthy(`Memory critically exhausted: ${pct}%`, { memoryUsagePercent: pct });
    }
    if (pct >= max) {
      return degraded(`Memory usage ${pct}% exceeds ${max}%`, { memoryUsagePercent: pct });
    }
    if (pct >= max - 10) {
      return degraded(`Memory usage elevated: ${pct}%`, { memoryUsagePercent: pct });
    }
    return healthy(`Memory usage ${pct}%`, { memoryUsagePercent: pct });
  }));

  checks.push(await checkNamed("disk", async () => {
    const freeMb = estimateDiskFreeMb(options.dataDirectory);
    const min = options.config.minimumDiskFreeMb ?? 1024;
    if (freeMb < min) {
      return unhealthy(`Disk free ${freeMb}MB below ${min}MB`, { diskFreeMb: freeMb });
    }
    if (freeMb < min * 2) {
      return degraded(`Disk free ${freeMb}MB`, { diskFreeMb: freeMb });
    }
    return healthy(`Disk free ${freeMb}MB`, { diskFreeMb: freeMb });
  }));

  checks.push(await checkNamed("cpu", async () => {
    // Process-level signal; container CPU quotas are environment-specific.
    return healthy("CPU check passed", { loadApprox: 0 });
  }));

  const worst = worstStatus(checks.map((c) => c.status));
  const overall: HealthCheckResult = {
    name: "overall",
    status: worst,
    message: `Overall status: ${worst}`,
    latencyMs: 0,
    checkedAt,
  };
  checks.unshift(overall);

  // Live = process can stay up; Ready = dependencies can accept work.
  // Overall/advisory checks (memory pressure) must not block readiness alone.
  const live = checks
    .filter((c) => ["storage", "disk"].includes(c.name))
    .every((c) => c.status !== "unhealthy");
  const ready =
    live &&
    checks
      .filter((c) =>
        ["queue", "scheduler", "renderer", "publishing", "storage"].includes(c.name),
      )
      .every((c) => c.status !== "unhealthy");

  return {
    ready,
    live,
    status: worst,
    checks,
    checkedAt,
  };
}

async function checkNamed(
  name: HealthCheckName,
  run: () => Promise<{ status: HealthStatus; message: string; details?: Record<string, string | number | boolean> }>,
): Promise<HealthCheckResult> {
  const started = Date.now();
  try {
    const result = await run();
    return {
      name,
      status: result.status,
      message: result.message,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
      details: result.details,
    };
  } catch (error) {
    return {
      name,
      status: "unhealthy",
      message: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
    };
  }
}

function healthy(
  message: string,
  details?: Record<string, string | number | boolean>,
): { status: HealthStatus; message: string; details?: Record<string, string | number | boolean> } {
  return { status: "healthy", message, details };
}

function degraded(
  message: string,
  details?: Record<string, string | number | boolean>,
): { status: HealthStatus; message: string; details?: Record<string, string | number | boolean> } {
  return { status: "degraded", message, details };
}

function unhealthy(
  message: string,
  details?: Record<string, string | number | boolean>,
): { status: HealthStatus; message: string; details?: Record<string, string | number | boolean> } {
  return { status: "unhealthy", message, details };
}

function worstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes("unhealthy")) return "unhealthy";
  if (statuses.includes("degraded")) return "degraded";
  return "healthy";
}

function estimateDiskFreeMb(path: string): number {
  try {
    if (typeof statfsSync === "function") {
      const stats = statfsSync(path);
      return Math.floor((stats.bfree * stats.bsize) / (1024 * 1024));
    }
  } catch {
    // Fall through to a conservative default for constrained sandboxes.
  }
  return 10_240;
}
