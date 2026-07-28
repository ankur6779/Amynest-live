import { resolveOperationsSettings } from "../config/operations.js";
import {
  createTelemetryEvent,
  InMemoryTelemetrySink,
  type TelemetrySink,
} from "../telemetry/index.js";
import { WorkflowOrchestrator } from "../workflow/orchestrator/index.js";
import { InMemoryWorkflowStore } from "../workflow/persistence/index.js";
import type { WorkflowQueue } from "../workflow/queue/index.js";
import type { ContentEngineConfig } from "../types/index.js";
import type {
  AcceptanceScenarioResult,
  BootstrapReport,
  DiagnosticReport,
  HealthReport,
  OperationsExportResult,
  ProductionValidationReport,
  RuntimeMetrics,
  SecretsReport,
} from "../types/operations.js";
import { runProductionAcceptance } from "./acceptance/engine.js";
import { BackupEngine } from "./backup/engine.js";
import { bootstrapOperations } from "./bootstrap/engine.js";
import { buildDiagnosticReport } from "./diagnostics/engine.js";
import { exportDiagnosticReport } from "./export/engine.js";
import { collectHealthReport } from "./health/engine.js";
import { createStructuredLogger, type StructuredLogger } from "./logging/engine.js";
import { collectRuntimeMetrics } from "./monitoring/engine.js";
import { OpsNotificationBus } from "./notifications/engine.js";
import {
  FileOperationsStore,
  InMemoryOperationsStore,
  type OperationsPersistenceStore,
} from "./persistence/store.js";
import { RecoveryEngine } from "./recovery/engine.js";
import { OpsScheduler } from "./scheduler/engine.js";
import { validateSecrets } from "./secrets/engine.js";
import { buildOpsTelemetry } from "./telemetry/engine.js";
import { validateProductionReadiness } from "./validation/engine.js";

export interface OperationsOrchestratorOptions {
  config?: ContentEngineConfig;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  store?: OperationsPersistenceStore;
  telemetry?: TelemetrySink;
  logger?: StructuredLogger;
  inMemory?: boolean;
  now?: () => Date;
}

export interface OperationsDoctorResult {
  bootstrap: BootstrapReport;
  secrets: SecretsReport;
  validation: ProductionValidationReport;
  health: HealthReport;
  ok: boolean;
}

/**
 * Phase 10 operations orchestrator — production bootstrap, health, recovery,
 * backup, diagnostics, and acceptance around Phases 1–9.
 */
export class OperationsOrchestrator {
  private config?: ContentEngineConfig;
  private store: OperationsPersistenceStore;
  private readonly telemetry: TelemetrySink;
  private logger: StructuredLogger;
  private queue?: WorkflowQueue;
  private scheduler?: OpsScheduler;
  private notifications?: OpsNotificationBus;
  private bootstrapReport?: BootstrapReport;
  private readonly recoveryDurations: number[] = [];
  private crashCount = 0;
  private readonly now: () => Date;
  private readonly env?: NodeJS.ProcessEnv;
  private readonly configPath?: string;
  private readonly inMemory: boolean;

  constructor(options: OperationsOrchestratorOptions = {}) {
    this.config = options.config;
    this.env = options.env;
    this.configPath = options.configPath;
    this.inMemory = options.inMemory ?? false;
    this.telemetry = options.telemetry ?? new InMemoryTelemetrySink();
    this.logger =
      options.logger ??
      createStructuredLogger({
        level: "info",
        sink: () => undefined,
      });
    this.now = options.now ?? (() => new Date());
    this.store =
      options.store ??
      (this.inMemory
        ? new InMemoryOperationsStore(new InMemoryWorkflowStore())
        : new FileOperationsStore(".amynest-data"));
  }

  async bootstrap(): Promise<BootstrapReport> {
    const result = await bootstrapOperations({
      configPath: this.configPath,
      env: this.env,
      runtimeOverrides: this.config,
      logger: this.logger,
      store: this.store,
      now: this.now,
    });
    this.config = result.config;
    this.store = result.store;
    this.queue = result.queue;
    this.scheduler = result.scheduler;
    this.logger = result.logger;
    this.bootstrapReport = result.report;
    this.notifications = new OpsNotificationBus({
      channels: result.config.opsNotificationChannels ?? ["webhook"],
      enabled: result.config.opsNotificationsEnabled !== false,
    });

    if (result.report.ok) {
      await this.notifications.notify(
        "startup",
        "AmyNest Content Engine started",
        `Environment=${result.environment}; ready=true`,
        this.logger.getCorrelationId(),
      );
    } else {
      await this.notifications.notify(
        "critical-error",
        "AmyNest bootstrap failed",
        result.report.errors.join("; "),
        this.logger.getCorrelationId(),
      );
    }

    this.telemetry.record(
      createTelemetryEvent({
        name: "ops.bootstrap",
        generationTimeMs: result.report.startupTimeMs,
        provider: "ops",
        errors: result.report.errors,
        retryCount: 0,
        cacheHit: false,
        metadata: {
          ready: result.report.ready,
          environment: result.environment,
        },
      }),
    );

    return result.report;
  }

  async doctor(): Promise<OperationsDoctorResult> {
    const bootstrap = this.bootstrapReport ?? (await this.bootstrap());
    const config = this.requireConfig();
    const secrets = validateSecrets({
      config,
      env: this.env,
      environment: config.runtimeEnvironment ?? "local",
      mode: config.secretValidationMode ?? "permissive",
      now: this.now,
    });
    const health = await this.health();
    const validation = validateProductionReadiness({
      config,
      environment: config.runtimeEnvironment ?? "local",
      secrets,
      dataDirectory: config.dataDirectory ?? ".amynest-data",
      backupDirectory: config.backupDirectory ?? ".amynest-backups",
      queueReady: Boolean(this.queue),
      schedulerReady: this.scheduler?.isReady() ?? false,
      now: this.now,
    });
    return {
      bootstrap,
      secrets,
      validation,
      health,
      ok: bootstrap.ok && secrets.ok && validation.ok && health.ready,
    };
  }

  async health(): Promise<HealthReport> {
    const config = this.requireConfig();
    return collectHealthReport({
      config,
      dataDirectory: config.dataDirectory ?? ".amynest-data",
      queueLength: this.queueLength(),
      schedulerReady: this.scheduler?.isReady() ?? true,
      env: this.env,
      now: this.now,
    });
  }

  metrics(): RuntimeMetrics {
    return collectRuntimeMetrics(this.telemetry.list(), {
      queueLength: this.queueLength(),
      crashCount: this.crashCount,
      now: this.now,
    });
  }

  async diagnostics(): Promise<DiagnosticReport> {
    const config = resolveOperationsSettings(this.requireConfig());
    const health = await this.health();
    const secrets = validateSecrets({
      config,
      env: this.env,
      environment: config.runtimeEnvironment,
      mode: config.secretValidationMode,
      now: this.now,
    });
    const metrics = this.metrics();
    const telemetry = buildOpsTelemetry({
      startupTimeMs: this.bootstrapReport?.startupTimeMs ?? 0,
      events: this.telemetry.list(),
      metrics,
      recoveryDurationsMs: this.recoveryDurations,
      now: this.now,
    });
    return buildDiagnosticReport({
      environment: config.runtimeEnvironment,
      health,
      secrets,
      metrics,
      telemetry,
      workflowStore: this.store.workflows,
      diskFreeMb: metrics.diskFreeMb,
      now: this.now,
    });
  }

  workflowStatus(): Array<{ workflowId: string; status: string; updatedAt: string }> {
    return this.store.workflows.list().map((w) => ({
      workflowId: w.workflowId,
      status: w.status,
      updatedAt: w.updatedAt,
    }));
  }

  async resume(workflowId?: string): Promise<{ resumed: string[]; plans: ReturnType<RecoveryEngine["listRecoverable"]> }> {
    const engine = new RecoveryEngine({ store: this.store.workflows });
    const plans = workflowId
      ? [engine.plan(workflowId)].filter((p): p is NonNullable<typeof p> => Boolean(p))
      : engine.listRecoverable();

    const resumed: string[] = [];
    const orchestrator = new WorkflowOrchestrator({
      config: this.requireConfig(),
      store: this.store.workflows,
      sleep: async () => undefined,
      telemetry: this.telemetry,
    });

    for (const plan of plans) {
      if (!plan.resumable) continue;
      const started = Date.now();
      engine.prepare(plan.workflowId);
      await orchestrator.resume(plan.workflowId);
      this.recoveryDurations.push(Date.now() - started);
      resumed.push(plan.workflowId);
      await this.notifications?.notify(
        "workflow-recovery",
        "Workflow recovered",
        `Resumed ${plan.workflowId} from ${plan.latestCheckpoint ?? "start"}`,
        this.logger.getCorrelationId(),
        { workflowId: plan.workflowId },
      );
    }
    return { resumed, plans };
  }

  backup() {
    const config = resolveOperationsSettings(this.requireConfig());
    const engine = new BackupEngine({
      backupDirectory: config.backupDirectory,
      store: this.store,
      environment: config.runtimeEnvironment,
      now: this.now,
    });
    return engine.createBackup();
  }

  restore(backupId: string) {
    const config = resolveOperationsSettings(this.requireConfig());
    const engine = new BackupEngine({
      backupDirectory: config.backupDirectory,
      store: this.store,
      environment: config.runtimeEnvironment,
      now: this.now,
    });
    return engine.restore(backupId);
  }

  logs() {
    return this.logger.list();
  }

  exportDiagnostics(
    report: DiagnosticReport,
    format: "json" | "yaml" | "ops-report-v1" = "json",
  ): OperationsExportResult {
    return exportDiagnosticReport(report, format);
  }

  async acceptance(): Promise<AcceptanceScenarioResult> {
    await this.bootstrap();
    return runProductionAcceptance({
      config: this.requireConfig(),
      store: this.store,
      telemetry: this.telemetry,
      logger: this.logger,
      now: this.now,
    });
  }

  recordCrash(): void {
    this.crashCount += 1;
  }

  getStore(): OperationsPersistenceStore {
    return this.store;
  }

  getCorrelationId(): string {
    return this.logger.getCorrelationId();
  }

  private requireConfig(): ContentEngineConfig {
    if (!this.config) {
      throw new Error("Operations not bootstrapped — call bootstrap() first");
    }
    return this.config;
  }

  private queueLength(): number {
    if (!this.queue) return 0;
    return this.queue.list().filter((j) => j.status === "queued" || j.status === "delayed").length;
  }
}

export function createOperationsOrchestrator(
  options?: OperationsOrchestratorOptions,
): OperationsOrchestrator {
  return new OperationsOrchestrator(options);
}
