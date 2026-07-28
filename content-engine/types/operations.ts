/** Phase 10 production readiness & operations contracts. */

export const OPERATIONS_REPORT_VERSION = "10.0.0";

export type RuntimeEnvironment = "development" | "staging" | "production" | "local";

export type OpsLogLevel = "debug" | "info" | "warn" | "error";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export type HealthCheckName =
  | "overall"
  | "queue"
  | "scheduler"
  | "storage"
  | "renderer"
  | "publishing"
  | "analytics"
  | "trend-provider"
  | "openai"
  | "youtube"
  | "telegram"
  | "email"
  | "memory"
  | "disk"
  | "cpu";

export type OpsNotificationChannel =
  | "telegram"
  | "email"
  | "slack"
  | "discord"
  | "webhook";

export type OpsNotificationEvent =
  | "startup"
  | "shutdown"
  | "workflow-failure"
  | "workflow-recovery"
  | "publish-success"
  | "critical-error"
  | "daily-summary"
  | "weekly-summary";

export type OpsSchedulerBackend =
  | "cron"
  | "coolify"
  | "docker"
  | "systemd"
  | "cloud";

export type SecretName =
  | "OPENAI_API_KEY"
  | "GEMINI_API_KEY"
  | "YOUTUBE_CLIENT_ID"
  | "YOUTUBE_CLIENT_SECRET"
  | "YOUTUBE_REFRESH_TOKEN"
  | "YOUTUBE_ACCESS_TOKEN"
  | "TELEGRAM_BOT_TOKEN"
  | "SMTP_URL"
  | "SMTP_HOST"
  | "SMTP_USER"
  | "SMTP_PASS"
  | "WEBHOOK_URL"
  | "SLACK_WEBHOOK_URL"
  | "DISCORD_WEBHOOK_URL"
  | "ANALYTICS_ACCESS_TOKEN"
  | "GOOGLE_TRENDS_API_KEY";

export interface OperationsEngineSettings {
  runtimeEnvironment: RuntimeEnvironment;
  opsLogLevel: OpsLogLevel;
  dataDirectory: string;
  backupDirectory: string;
  healthcheckEnabled: boolean;
  monitoringEnabled: boolean;
  backupEnabled: boolean;
  opsNotificationsEnabled: boolean;
  opsNotificationChannels: OpsNotificationChannel[];
  schedulerBackend: OpsSchedulerBackend;
  dailyCron: string;
  minimumDiskFreeMb: number;
  maximumMemoryUsagePercent: number;
  secretValidationMode: "strict" | "permissive";
  correlationHeader: string;
}

export interface SecretDiagnostic {
  name: SecretName;
  present: boolean;
  required: boolean;
  maskedValue?: string;
  message: string;
}

export interface SecretsReport {
  ok: boolean;
  environment: RuntimeEnvironment;
  diagnostics: SecretDiagnostic[];
  missingRequired: SecretName[];
  checkedAt: string;
}

export interface HealthCheckResult {
  name: HealthCheckName;
  status: HealthStatus;
  message: string;
  latencyMs: number;
  checkedAt: string;
  details?: Record<string, string | number | boolean>;
}

export interface HealthReport {
  ready: boolean;
  live: boolean;
  status: HealthStatus;
  checks: HealthCheckResult[];
  checkedAt: string;
}

export interface StructuredLogRecord {
  level: OpsLogLevel;
  message: string;
  timestamp: string;
  correlationId: string;
  workflowId?: string;
  videoId?: string;
  topicId?: string;
  provider?: string;
  phase?: string;
  durationMs?: number;
  retryCount?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface RuntimeMetrics {
  workflowSuccessRate: number;
  workflowFailures: number;
  workflowSuccesses: number;
  queueLength: number;
  renderDurationMsAvg: number;
  uploadDurationMsAvg: number;
  analyticsDurationMsAvg: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  diskFreeMb: number;
  providerFailures: number;
  retryCounts: number;
  crashCount: number;
  availability: number;
  collectedAt: string;
}

export interface OpsTelemetry {
  startupTimeMs: number;
  workflowTimeMsAvg: number;
  providerLatencyMsAvg: number;
  recoveryTimeMsAvg: number;
  crashCount: number;
  availability: number;
  recordedAt: string;
}

export interface BootstrapStepResult {
  step:
    | "load-config"
    | "validate-environment"
    | "validate-secrets"
    | "provider-health"
    | "initialize-storage"
    | "initialize-queue"
    | "initialize-scheduler"
    | "ready";
  ok: boolean;
  message: string;
  durationMs: number;
}

export interface BootstrapReport {
  ok: boolean;
  environment: RuntimeEnvironment;
  steps: BootstrapStepResult[];
  ready: boolean;
  startedAt: string;
  completedAt: string;
  startupTimeMs: number;
  errors: string[];
}

export interface RecoveryPlan {
  workflowId: string;
  resumable: boolean;
  latestCheckpoint?: string;
  skipPhases: string[];
  reason: string;
  preventDuplicateUpload: boolean;
  preventRegeneration: boolean;
}

export interface BackupManifest {
  id: string;
  createdAt: string;
  environment: RuntimeEnvironment;
  path: string;
  includes: Array<
    | "workflow-state"
    | "learning-store"
    | "analytics"
    | "campaign-plans"
    | "publishing-history"
  >;
  checksum: string;
  entryCount: number;
}

export interface RestoreResult {
  ok: boolean;
  backupId: string;
  restoredAt: string;
  restoredIncludes: BackupManifest["includes"];
  message: string;
}

export interface DiagnosticReport {
  version: string;
  generatedAt: string;
  environment: RuntimeEnvironment;
  providerStatus: HealthCheckResult[];
  workflowStatus: Array<{
    workflowId: string;
    status: string;
    updatedAt: string;
  }>;
  recentFailures: string[];
  retries: number;
  health: HealthReport;
  system: {
    nodeVersion: string;
    platform: string;
    arch: string;
    uptimeSeconds: number;
    memoryUsagePercent: number;
    diskFreeMb: number;
  };
  secrets: SecretsReport;
  metrics: RuntimeMetrics;
  telemetry: OpsTelemetry;
}

export interface ProductionValidationReport {
  ok: boolean;
  checks: Array<{
    name: string;
    ok: boolean;
    message: string;
    severity: "error" | "warning" | "info";
  }>;
  validatedAt: string;
}

export interface OpsNotificationPayload {
  event: OpsNotificationEvent;
  channel: OpsNotificationChannel;
  title: string;
  body: string;
  correlationId: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface OpsNotificationDelivery {
  event: OpsNotificationEvent;
  channel: OpsNotificationChannel;
  delivered: boolean;
  deliveredAt: string;
  message: string;
}

export interface ScheduledOpsJob {
  id: string;
  backend: OpsSchedulerBackend;
  cron: string;
  timezone: string;
  jobType: string;
  holidayAware: boolean;
  retryMissedJobs: boolean;
  nextRunAt?: string;
}

export interface OperationsExportFormat {
  format: "json" | "yaml" | "ops-report-v1";
}

export interface OperationsExportResult {
  format: "json" | "yaml" | "ops-report-v1";
  content: string;
  contentType: string;
}

export interface AcceptanceScenarioResult {
  ok: boolean;
  steps: Array<{ name: string; ok: boolean; message: string; durationMs: number }>;
  startedAt: string;
  completedAt: string;
  videosGenerated: number;
  campaignPlanId?: string;
  analyticsReportId?: string;
}

export interface OperationsRuntimeState {
  bootstrapped: boolean;
  bootstrap?: BootstrapReport;
  health?: HealthReport;
  metrics: RuntimeMetrics;
  telemetry: OpsTelemetry;
  correlationId: string;
  startedAt: string;
}
