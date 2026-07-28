import { arch, freemem, platform, totalmem, uptime } from "node:os";
import type {
  DiagnosticReport,
  HealthReport,
  OpsTelemetry,
  RuntimeEnvironment,
  RuntimeMetrics,
  SecretsReport,
} from "../../types/operations.js";
import { OPERATIONS_REPORT_VERSION } from "../../types/operations.js";
import type { WorkflowPersistenceStore } from "../../workflow/persistence/index.js";

export function buildDiagnosticReport(input: {
  environment: RuntimeEnvironment;
  health: HealthReport;
  secrets: SecretsReport;
  metrics: RuntimeMetrics;
  telemetry: OpsTelemetry;
  workflowStore: WorkflowPersistenceStore;
  diskFreeMb: number;
  now?: () => Date;
}): DiagnosticReport {
  const now = input.now ?? (() => new Date());
  const workflows = input.workflowStore.list();
  const recentFailures = workflows
    .flatMap((w) => w.errors)
    .slice(-20);
  const retries = workflows.reduce((sum, w) => sum + w.retries, 0);

  return {
    version: OPERATIONS_REPORT_VERSION,
    generatedAt: now().toISOString(),
    environment: input.environment,
    providerStatus: input.health.checks.filter((c) =>
      [
        "renderer",
        "publishing",
        "analytics",
        "trend-provider",
        "openai",
        "youtube",
        "telegram",
        "email",
      ].includes(c.name),
    ),
    workflowStatus: workflows.map((w) => ({
      workflowId: w.workflowId,
      status: w.status,
      updatedAt: w.updatedAt,
    })),
    recentFailures,
    retries,
    health: input.health,
    system: {
      nodeVersion: process.version,
      platform: platform(),
      arch: arch(),
      uptimeSeconds: Math.round(uptime()),
      memoryUsagePercent: Math.round((1 - freemem() / totalmem()) * 100),
      diskFreeMb: input.diskFreeMb,
    },
    secrets: input.secrets,
    metrics: input.metrics,
    telemetry: input.telemetry,
  };
}
