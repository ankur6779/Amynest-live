import type {
  ContentEngineConfig,
  ResolvedOpsConfig,
} from "../types/index.js";
import type { OperationsEngineSettings } from "../types/operations.js";

export const DEFAULT_OPERATIONS_SETTINGS: OperationsEngineSettings = {
  runtimeEnvironment: "local",
  opsLogLevel: "info",
  dataDirectory: ".amynest-data",
  backupDirectory: ".amynest-backups",
  healthcheckEnabled: true,
  monitoringEnabled: true,
  backupEnabled: true,
  opsNotificationsEnabled: true,
  opsNotificationChannels: ["webhook"],
  schedulerBackend: "cron",
  dailyCron: "0 9 * * *",
  minimumDiskFreeMb: 1024,
  maximumMemoryUsagePercent: 90,
  secretValidationMode: "permissive",
  correlationHeader: "x-amynest-correlation-id",
};

/** Merge Phase 10 operations defaults (backward compatible). */
export function resolveOperationsSettings(
  config: ContentEngineConfig,
): ResolvedOpsConfig {
  return {
    ...config,
    runtimeEnvironment:
      config.runtimeEnvironment ?? DEFAULT_OPERATIONS_SETTINGS.runtimeEnvironment,
    opsLogLevel: config.opsLogLevel ?? DEFAULT_OPERATIONS_SETTINGS.opsLogLevel,
    dataDirectory: config.dataDirectory ?? DEFAULT_OPERATIONS_SETTINGS.dataDirectory,
    backupDirectory:
      config.backupDirectory ?? DEFAULT_OPERATIONS_SETTINGS.backupDirectory,
    healthcheckEnabled:
      config.healthcheckEnabled ?? DEFAULT_OPERATIONS_SETTINGS.healthcheckEnabled,
    monitoringEnabled:
      config.monitoringEnabled ?? DEFAULT_OPERATIONS_SETTINGS.monitoringEnabled,
    backupEnabled: config.backupEnabled ?? DEFAULT_OPERATIONS_SETTINGS.backupEnabled,
    opsNotificationsEnabled:
      config.opsNotificationsEnabled ??
      DEFAULT_OPERATIONS_SETTINGS.opsNotificationsEnabled,
    opsNotificationChannels:
      config.opsNotificationChannels ??
      DEFAULT_OPERATIONS_SETTINGS.opsNotificationChannels,
    schedulerBackend:
      config.schedulerBackend ?? DEFAULT_OPERATIONS_SETTINGS.schedulerBackend,
    dailyCron: config.dailyCron ?? DEFAULT_OPERATIONS_SETTINGS.dailyCron,
    minimumDiskFreeMb:
      config.minimumDiskFreeMb ?? DEFAULT_OPERATIONS_SETTINGS.minimumDiskFreeMb,
    maximumMemoryUsagePercent:
      config.maximumMemoryUsagePercent ??
      DEFAULT_OPERATIONS_SETTINGS.maximumMemoryUsagePercent,
    secretValidationMode:
      config.secretValidationMode ?? DEFAULT_OPERATIONS_SETTINGS.secretValidationMode,
    correlationHeader:
      config.correlationHeader ?? DEFAULT_OPERATIONS_SETTINGS.correlationHeader,
  };
}
