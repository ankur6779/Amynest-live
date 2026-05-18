import "./lib/loadEnv";
import { logAmynestEnvironment } from "./lib/loadEnv";
import { logStartupEnvDiagnostics } from "./lib/env";
import { logger } from "./lib/logger";
import { registerProcessErrorHandlers } from "./utils/async-errors.js";
import { startMemoryMonitor } from "./utils/memory-monitor.js";
import {
  armListenDeadline,
  beginBootPhase,
  bootElapsedMs,
  disarmListenDeadline,
  endBootPhase,
  failBootPhase,
  getEnabledModules,
  getLastSuccessfulBootPhase,
  isMinimalBoot,
  isModuleEnabled,
  logBootProfile,
  registerBootSignalHandlers,
} from "./lib/boot-diagnostics.js";
import { startFastMemoryPoll } from "./lib/memory-poll.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

/**
 * Runs a single background-init step with phase logging that NEVER rethrows.
 * Background tasks must not crash the live HTTP server — degraded mode is
 * preferred over a restart loop.
 */
async function runBackgroundPhase(
  name: string,
  fn: () => Promise<unknown> | unknown,
): Promise<void> {
  console.log("[bg:start]", name);
  beginBootPhase(name);
  try {
    await fn();
    console.log("[bg:ok]", name);
    endBootPhase(name);
  } catch (e) {
    console.error("[bg:fail]", name, e);
    failBootPhase(name, e);
    logger.error(
      {
        evt: "background.phase_failed",
        phase: name,
        err: e,
        message: e instanceof Error ? e.message : String(e),
      },
      `Background task "${name}" failed; server stays up in degraded mode`,
    );
  }
}

/**
 * Heavy / I/O-bound boot tasks. Kicked off AFTER `app.listen` so Render's
 * ~10s boot deadline is never at risk — the HTTP listener responds to /health
 * within milliseconds while these run in the background.
 */
async function startBackgroundTasks(): Promise<void> {
  if (isMinimalBoot()) {
    logger.info({ evt: "background.skipped" }, "MINIMAL_BOOT=1 — no background tasks");
    return;
  }

  logger.info(
    { evt: "background.tasks_starting", bootMs: bootElapsedMs() },
    "Kicking off background init tasks",
  );

  if (isModuleEnabled("redis")) {
    await runBackgroundPhase("queue_bootstrap", async () => {
      const { bootstrapApiQueue } = await import("./queue/bootstrap.js");
      return bootstrapApiQueue();
    });
  } else {
    logger.warn(
      { evt: "boot.skip", module: "redis" },
      "Redis/queue bootstrap SKIPPED",
    );
  }

  if (isModuleEnabled("db")) {
    if (process.env["DIAG_DB_VERIFY"]?.trim() === "1") {
      await runBackgroundPhase("db_verify", async () => {
        const { verifyDatabaseAtStartup } = await import("./lib/db-verify.js");
        const r = await verifyDatabaseAtStartup();
        if (!r.pingOk) {
          throw new Error(`DB ping failed: ${r.pingError ?? "unknown"}`);
        }
      });
    }
    await runBackgroundPhase("ensure_push_tokens_table", async () => {
      const { ensurePushTokensTable } = await import("./lib/ensurePushTokensTable.js");
      return ensurePushTokensTable();
    });
  } else {
    logger.warn(
      { evt: "boot.skip", module: "db" },
      "DB verification + ensure_push_tokens_table SKIPPED",
    );
  }

  if (isModuleEnabled("worker")) {
    let bullMqActive = false;
    try {
      const { isBullMqActive } = await import("./queue/ai-job-queue.js");
      bullMqActive = isBullMqActive();
    } catch (err) {
      logger.error(
        { evt: "boot.bullmq_check_failed", err },
        "Could not determine BullMQ mode; skipping embedded worker",
      );
    }
    if (!bullMqActive) {
      await runBackgroundPhase("embedded_ai_worker", async () => {
        const { startEmbeddedAiWorker } = await import("./worker/ai-worker.js");
        return startEmbeddedAiWorker();
      });
    }
  }

  if (isModuleEnabled("crons")) {
    console.log("[bg:start]", "crons");
    beginBootPhase("crons");
    try {
      const { startRazorpayWebhookCleanup } = await import("./lib/razorpayWebhookCleanup.js");
      const { startWeeklyRecapCron } = await import("./lib/weeklyRecapCron.js");
      const { startNotificationCron } = await import("./lib/notificationCron.js");
      const { startRenderKeepWarm } = await import("./lib/render-keep-warm.js");
      const { seedPhonicsWordBank } = await import("./lib/phonicsWordBankSeed.js");

      startRazorpayWebhookCleanup();
      startWeeklyRecapCron();
      startNotificationCron();
      startRenderKeepWarm(port);
      void seedPhonicsWordBank();
      console.log("[bg:ok]", "crons");
      endBootPhase("crons");
    } catch (err) {
      console.error("[bg:fail]", "crons", err);
      failBootPhase("crons", err);
      logger.error(
        { evt: "background.crons_failed", err },
        "Cron initialization failed; server stays up",
      );
    }
  } else {
    logger.warn(
      { evt: "boot.skip", module: "crons" },
      "Cron jobs + keep-warm + phonics seed SKIPPED",
    );
  }

  logger.info(
    { evt: "background.tasks_ready", bootMs: bootElapsedMs() },
    "Background init tasks complete",
  );
}

async function loadApp() {
  if (isMinimalBoot()) {
    return (await import("./app-minimal.js")).default;
  }
  const { createApp } = await import("./app.js");
  return createApp();
}

async function startServer(): Promise<void> {
  registerProcessErrorHandlers();
  registerBootSignalHandlers();
  logBootProfile();

  const enabled = getEnabledModules();
  console.log(
    "BOOT_MODULES:",
    isMinimalBoot() ? "(minimal — health only)" : enabled.length ? enabled.join(",") : "(none)",
  );

  armListenDeadline();

  beginBootPhase("memory_monitor");
  startMemoryMonitor();
  if (isModuleEnabled("memory-poll") && process.env["DIAG_MEMORY_POLL"]?.trim() === "1") {
    startFastMemoryPoll();
  }
  endBootPhase("memory_monitor");

  beginBootPhase("http_listen");
  const app = await loadApp();
  const server = app.listen(port);

  server.on("listening", () => {
    disarmListenDeadline();
    endBootPhase("http_listen", { port, elapsedMs: bootElapsedMs() });

    console.log("SERVER_LISTENING");
    logAmynestEnvironment();
    logger.info(
      {
        evt: "server.listening",
        port,
        minimalBoot: isMinimalBoot(),
        modules: enabled,
        amynestEnv: process.env["AMYNEST_ENV"],
        nodeEnv: process.env.NODE_ENV,
        render: !!process.env.RENDER,
        bootMs: bootElapsedMs(),
      },
      "Server listening",
    );
    console.log(`Server listening on port ${port}`);
    logStartupEnvDiagnostics();

    setImmediate(() => {
      void startBackgroundTasks().catch((err) => {
        logger.error(
          { evt: "background.unhandled", err },
          "Background tasks orchestrator threw — server remains up",
        );
      });
    });
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    failBootPhase("http_listen", err);
    logger.error(
      {
        evt: "http.listen_error",
        code: err.code,
        syscall: err.syscall,
        address: (err as { address?: string }).address,
        port: (err as { port?: number }).port,
        message: err.message,
        lastSuccessfulPhase: getLastSuccessfulBootPhase(),
      },
      `app.listen failed (${err.code ?? "unknown"})`,
    );
    if (err.code === "EADDRINUSE") {
      logger.warn(
        { evt: "http.listen_retry", port, delayMs: 1500 },
        "Port still bound by previous container — retrying once in 1.5s",
      );
      setTimeout(() => {
        try {
          server.listen(port);
        } catch (retryErr) {
          logger.error(
            { evt: "http.listen_retry_failed", err: retryErr },
            "Retry listen failed — exiting so the platform supervisor can restart cleanly",
          );
          process.exit(1);
        }
      }, 1500);
      return;
    }
    process.exit(1);
  });
}

void startServer().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(
    {
      err,
      message,
      lastSuccessfulPhase: getLastSuccessfulBootPhase(),
      bootMs: bootElapsedMs(),
    },
    "API failed to start",
  );
  console.error("API failed to start:", message);
  process.exit(1);
});
