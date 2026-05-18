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

async function startServer(): Promise<void> {
  registerProcessErrorHandlers();
  startMemoryMonitor();

  await bootstrapApiQueue();

  if (!isBullMqActive()) {
    startEmbeddedAiWorker();
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logAmynestEnvironment();
    logger.info(
      {
        port,
        amynestEnv: process.env["AMYNEST_ENV"],
        nodeEnv: process.env.NODE_ENV,
        render: !!process.env.RENDER,
      },
      "Server listening",
    );
    console.log(`Server listening on port ${port}`);
    logStartupEnvDiagnostics();
    startRazorpayWebhookCleanup();
    startWeeklyRecapCron();
    startNotificationCron();
    startRenderKeepWarm(port);
    void seedPhonicsWordBank();
  });
}

startServer().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error({ err, message }, "API failed to start");
  console.error("API failed to start:", message);
  process.exit(1);
});
