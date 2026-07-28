import { resolveOperationsSettings } from "../../config/operations.js";
import { WorkflowQueue } from "../../workflow/queue/index.js";
import type { ContentEngineConfig } from "../../types/index.js";
import type {
  BootstrapReport,
  BootstrapStepResult,
  RuntimeEnvironment,
} from "../../types/operations.js";
import { loadLayeredConfiguration } from "../configuration/engine.js";
import { collectHealthReport } from "../health/engine.js";
import { createStructuredLogger, type StructuredLogger } from "../logging/engine.js";
import {
  FileOperationsStore,
  type OperationsPersistenceStore,
} from "../persistence/store.js";
import { OpsScheduler } from "../scheduler/engine.js";
import { validateSecrets } from "../secrets/engine.js";
import { validateProductionReadiness } from "../validation/engine.js";

export interface BootstrapOptions {
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  runtimeOverrides?: Partial<ContentEngineConfig>;
  environment?: RuntimeEnvironment;
  logger?: StructuredLogger;
  store?: OperationsPersistenceStore;
  now?: () => Date;
}

export interface BootstrapResult {
  report: BootstrapReport;
  config: ContentEngineConfig;
  environment: RuntimeEnvironment;
  store: OperationsPersistenceStore;
  queue: WorkflowQueue;
  scheduler: OpsScheduler;
  logger: StructuredLogger;
}

/**
 * Production bootstrap sequence:
 * Load Config → Validate Environment → Validate Secrets → Provider Health →
 * Initialize Storage → Initialize Queue → Initialize Scheduler → Ready
 */
export async function bootstrapOperations(
  options: BootstrapOptions = {},
): Promise<BootstrapResult> {
  const startedAtDate = options.now?.() ?? new Date();
  const startedAt = startedAtDate.toISOString();
  const startedMs = Date.now();
  const steps: BootstrapStepResult[] = [];
  const errors: string[] = [];
  const logger =
    options.logger ??
    createStructuredLogger({
      level: "info",
      sink: () => undefined,
    });

  let config!: ContentEngineConfig;
  let environment!: RuntimeEnvironment;
  let store!: OperationsPersistenceStore;
  let queue!: WorkflowQueue;
  let scheduler!: OpsScheduler;

  // 1. Load Config
  {
    const t0 = Date.now();
    try {
      const loaded = loadLayeredConfiguration({
        configPath: options.configPath,
        env: options.env,
        runtimeOverrides: options.runtimeOverrides,
        environment: options.environment,
      });
      config = resolveOperationsSettings(loaded.config);
      environment = loaded.environment;
      if (!loaded.validation.ok) {
        const message = loaded.validation.issues
          .filter((i) => i.severity === "error")
          .map((i) => `${i.path}: ${i.message}`)
          .join("; ");
        throw new Error(`Configuration invalid — ${message}`);
      }
      steps.push(okStep("load-config", "Configuration loaded and schema-validated", t0));
      logger.info("Configuration loaded", {
        phase: "bootstrap",
        metadata: { sources: loaded.sources.join(",") },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
      steps.push(failStep("load-config", message, t0));
      return finalizeFailure({
        steps,
        errors,
        startedAt,
        startedMs,
        environment: options.environment ?? "local",
        logger,
      });
    }
  }

  // 2. Validate Environment
  {
    const t0 = Date.now();
    try {
      if (!["development", "staging", "production", "local"].includes(environment)) {
        throw new Error(`Unsupported runtime environment: ${environment}`);
      }
      steps.push(okStep("validate-environment", `Environment=${environment}`, t0));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
      steps.push(failStep("validate-environment", message, t0));
      return finalizeFailure({
        steps,
        errors,
        startedAt,
        startedMs,
        environment,
        logger,
        config,
      });
    }
  }

  // 3. Validate Secrets
  {
    const t0 = Date.now();
    const secrets = validateSecrets({
      config,
      env: options.env,
      environment,
      mode: config.secretValidationMode ?? "permissive",
      now: options.now,
    });
    if (!secrets.ok) {
      const message = `Missing required secrets: ${secrets.missingRequired.join(", ")}. Set them via environment variables before startup.`;
      errors.push(message);
      steps.push(failStep("validate-secrets", message, t0));
      return finalizeFailure({
        steps,
        errors,
        startedAt,
        startedMs,
        environment,
        logger,
        config,
      });
    }
    steps.push(
      okStep(
        "validate-secrets",
        `Secrets OK (${secrets.diagnostics.filter((d) => d.present).length} present)`,
        t0,
      ),
    );
  }

  // 4. Provider Health Checks
  {
    const t0 = Date.now();
    store =
      options.store ??
      new FileOperationsStore(config.dataDirectory ?? ".amynest-data");
    store.ensure();
    const health = await collectHealthReport({
      config,
      dataDirectory: config.dataDirectory ?? ".amynest-data",
      queueLength: 0,
      schedulerReady: true,
      env: options.env,
      now: options.now,
    });
    const blocking = health.checks.filter(
      (c) =>
        c.status === "unhealthy" &&
        ["renderer", "publishing", "storage", "openai", "youtube"].includes(c.name),
    );
    if (blocking.length > 0) {
      const message = blocking.map((c) => `${c.name}: ${c.message}`).join("; ");
      errors.push(message);
      steps.push(failStep("provider-health", message, t0));
      return finalizeFailure({
        steps,
        errors,
        startedAt,
        startedMs,
        environment,
        logger,
        config,
        store,
      });
    }
    steps.push(okStep("provider-health", `Providers ${health.status}`, t0));
  }

  // 5. Initialize Storage
  {
    const t0 = Date.now();
    try {
      store.ensure();
      const readiness = validateProductionReadiness({
        config,
        environment,
        secrets: validateSecrets({
          config,
          env: options.env,
          environment,
          mode: config.secretValidationMode ?? "permissive",
          now: options.now,
        }),
        dataDirectory: config.dataDirectory ?? ".amynest-data",
        backupDirectory: config.backupDirectory ?? ".amynest-backups",
        queueReady: true,
        schedulerReady: true,
        now: options.now,
      });
      if (!readiness.ok) {
        throw new Error(
          readiness.checks
            .filter((c) => !c.ok && c.severity === "error")
            .map((c) => c.message)
            .join("; "),
        );
      }
      steps.push(okStep("initialize-storage", "Persistent storage ready", t0));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
      steps.push(failStep("initialize-storage", message, t0));
      return finalizeFailure({
        steps,
        errors,
        startedAt,
        startedMs,
        environment,
        logger,
        config,
        store,
      });
    }
  }

  // 6. Initialize Queue
  {
    const t0 = Date.now();
    queue = new WorkflowQueue({
      mode: config.queueMode ?? "priority",
      concurrency: config.workflowConcurrency ?? 2,
    });
    steps.push(okStep("initialize-queue", "Workflow queue initialized", t0));
  }

  // 7. Initialize Scheduler
  {
    const t0 = Date.now();
    scheduler = new OpsScheduler({
      backend: config.schedulerBackend ?? "cron",
      cron: config.dailyCron ?? "0 9 * * *",
      timezone: config.timezone,
      holidayAware: true,
      retryMissedJobs: true,
      seasonalCalendar: config.seasonalCalendar,
      now: options.now,
    });
    scheduler.initialize();
    steps.push(
      okStep(
        "initialize-scheduler",
        `Scheduler ready (${scheduler.backendLabel()})`,
        t0,
      ),
    );
  }

  // 8. Ready
  {
    const t0 = Date.now();
    steps.push(okStep("ready", "Operations platform ready", t0));
    logger.info("Bootstrap complete", {
      phase: "bootstrap",
      durationMs: Date.now() - startedMs,
    });
  }

  const completedAt = (options.now?.() ?? new Date()).toISOString();
  return {
    report: {
      ok: true,
      environment,
      steps,
      ready: true,
      startedAt,
      completedAt,
      startupTimeMs: Date.now() - startedMs,
      errors: [],
    },
    config,
    environment,
    store,
    queue,
    scheduler,
    logger,
  };
}

function okStep(
  step: BootstrapStepResult["step"],
  message: string,
  started: number,
): BootstrapStepResult {
  return { step, ok: true, message, durationMs: Date.now() - started };
}

function failStep(
  step: BootstrapStepResult["step"],
  message: string,
  started: number,
): BootstrapStepResult {
  return { step, ok: false, message, durationMs: Date.now() - started };
}

function finalizeFailure(input: {
  steps: BootstrapStepResult[];
  errors: string[];
  startedAt: string;
  startedMs: number;
  environment: RuntimeEnvironment;
  logger: StructuredLogger;
  config?: ContentEngineConfig;
  store?: OperationsPersistenceStore;
}): BootstrapResult {
  input.logger.error("Bootstrap failed", {
    phase: "bootstrap",
    metadata: { errors: input.errors.join(" | ") },
  });
  const completedAt = new Date().toISOString();
  const config = input.config ?? ({ timezone: "UTC" } as ContentEngineConfig);
  const store =
    input.store ??
    new FileOperationsStore(".amynest-data");
  const queue = new WorkflowQueue({ mode: "priority", concurrency: 1 });
  const scheduler = new OpsScheduler({
    backend: "cron",
    cron: "0 9 * * *",
    timezone: config.timezone ?? "UTC",
  });
  return {
    report: {
      ok: false,
      environment: input.environment,
      steps: input.steps,
      ready: false,
      startedAt: input.startedAt,
      completedAt,
      startupTimeMs: Date.now() - input.startedMs,
      errors: input.errors,
    },
    config,
    environment: input.environment,
    store,
    queue,
    scheduler,
    logger: input.logger,
  };
}
