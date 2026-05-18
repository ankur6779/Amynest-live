import { logAmynestEnvironment } from "./lib/loadEnv";
import app from "./app";
import { logStartupEnvDiagnostics } from "./lib/env";
import { logger } from "./lib/logger";
import { registerProcessErrorHandlers } from "./utils/async-errors.js";
import { startMemoryMonitor } from "./utils/memory-monitor.js";
import { bootstrapApiQueue } from "./queue/bootstrap.js";
import { isBullMqActive } from "./queue/ai-job-queue.js";
import { startEmbeddedAiWorker } from "./worker/ai-worker.js";
import { startRazorpayWebhookCleanup } from "./lib/razorpayWebhookCleanup";
import { startWeeklyRecapCron } from "./lib/weeklyRecapCron";
import { startNotificationCron } from "./lib/notificationCron";
import { seedPhonicsWordBank } from "./lib/phonicsWordBankSeed";
import { startRenderKeepWarm } from "./lib/render-keep-warm";
import { ensurePushTokensTable } from "./lib/ensurePushTokensTable";
import {
  armListenDeadline,
  beginBootPhase,
  bootElapsedMs,
  disarmListenDeadline,
  endBootPhase,
  failBootPhase,
  getLastSuccessfulBootPhase,
  isModuleEnabled,
  logBootProfile,
  registerBootSignalHandlers,
} from "./lib/boot-diagnostics.js";
import { startFastMemoryPoll } from "./lib/memory-poll.js";
import { verifyDatabaseAtStartup } from "./lib/db-verify.js";

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
  phase: string,
  fn: () => Promise<unknown> | unknown,
): Promise<void> {
  beginBootPhase(phase);
  try {
    await fn();
    endBootPhase(phase);
  } catch (err) {
    failBootPhase(phase, err);
    logger.error(
      {
        evt: "background.phase_failed",
        phase,
        err,
        message: err instanceof Error ? err.message : String(err),
      },
      `Background task "${phase}" failed; server stays up in degraded mode`,
    );
  }
}

/**
 * Heavy / I/O-bound boot tasks. Kicked off AFTER `app.listen` so Render's
 * ~10s boot deadline is never at risk — the HTTP listener responds to /health
 * within milliseconds while these run in the background.
 *
 * Each step is independent and fail-safe: any single failure logs and
 * continues so the server keeps serving traffic in degraded mode rather than
 * entering a restart loop.
 */
async function startBackgroundTasks(): Promise<void> {
  logger.info(
    { evt: "background.tasks_starting", bootMs: bootElapsedMs() },
    "Kicking off background init tasks",
  );

  if (isModuleEnabled("redis")) {
    await runBackgroundPhase("queue_bootstrap", () => bootstrapApiQueue());
  } else {
    logger.warn(
      { evt: "boot.skip", module: "redis" },
      "Redis/queue bootstrap SKIPPED",
    );
  }

  if (isModuleEnabled("db")) {
    if (process.env["DIAG_DB_VERIFY"]?.trim() === "1") {
      await runBackgroundPhase("db_verify", async () => {
        const r = await verifyDatabaseAtStartup();
        if (!r.pingOk) {
          throw new Error(`DB ping failed: ${r.pingError ?? "unknown"}`);
        }
      });
    }
    await runBackgroundPhase("ensure_push_tokens_table", () =>
      ensurePushTokensTable(),
    );
  } else {
    logger.warn(
      { evt: "boot.skip", module: "db" },
      "DB verification + ensure_push_tokens_table SKIPPED",
    );
  }

  if (isModuleEnabled("worker")) {
    let bullMqActive = false;
    try {
      bullMqActive = isBullMqActive();
    } catch (err) {
      logger.error(
        { evt: "boot.bullmq_check_failed", err },
        "Could not determine BullMQ mode; skipping embedded worker",
      );
    }
    if (!bullMqActive) {
      await runBackgroundPhase("embedded_ai_worker", () =>
        startEmbeddedAiWorker(),
      );
    }
  }

  if (isModuleEnabled("crons")) {
    beginBootPhase("crons");
    try {
      startRazorpayWebhookCleanup();
      startWeeklyRecapCron();
      startNotificationCron();
      startRenderKeepWarm(port);
      void seedPhonicsWordBank();
      endBootPhase("crons");
    } catch (err) {
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

function startServer(): void {
  registerProcessErrorHandlers();
  registerBootSignalHandlers();
  logBootProfile();
  armListenDeadline();

  beginBootPhase("memory_monitor");
  startMemoryMonitor();
  if (process.env["DIAG_MEMORY_POLL"]?.trim() === "1") {
    startFastMemoryPoll();
  }
  endBootPhase("memory_monitor");

  beginBootPhase("http_listen");
  const server = app.listen(port);

  server.on("listening", () => {
    disarmListenDeadline();
    endBootPhase("http_listen", { port, elapsedMs: bootElapsedMs() });

    logAmynestEnvironment();
    logger.info(
      {
        evt: "server.listening",
        port,
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
    process.exit(1);
  });
}

try {
  startServer();
} catch (err) {
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
}
