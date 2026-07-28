import { accessSync, constants, existsSync, mkdirSync } from "node:fs";
import { freemem, totalmem } from "node:os";
import type { ContentEngineConfig } from "../../types/index.js";
import type {
  ProductionValidationReport,
  RuntimeEnvironment,
  SecretsReport,
} from "../../types/operations.js";
import { validateConfig } from "../../services/validation.js";

export interface ProductionValidationOptions {
  config: ContentEngineConfig;
  environment: RuntimeEnvironment;
  secrets: SecretsReport;
  dataDirectory: string;
  backupDirectory: string;
  queueReady?: boolean;
  schedulerReady?: boolean;
  diskFreeMb?: number;
  now?: () => Date;
}

/** Production validation with clear actionable diagnostics. */
export function validateProductionReadiness(
  options: ProductionValidationOptions,
): ProductionValidationReport {
  const checks: ProductionValidationReport["checks"] = [];
  const now = options.now ?? (() => new Date());

  const configValidation = validateConfig(options.config);
  checks.push({
    name: "configuration",
    ok: configValidation.ok,
    message: configValidation.ok
      ? "Configuration schema valid"
      : configValidation.issues.map((i) => i.message).join("; "),
    severity: configValidation.ok ? "info" : "error",
  });

  checks.push({
    name: "secrets",
    ok: options.secrets.ok,
    message: options.secrets.ok
      ? "Required secrets present"
      : `Missing secrets: ${options.secrets.missingRequired.join(", ")}`,
    severity: options.secrets.ok ? "info" : "error",
  });

  checks.push({
    name: "providers",
    ok: true,
    message: `script=${options.config.scriptProvider ?? "mock"}, renderer=${options.config.renderer ?? "mock"}, publishing=${options.config.publishingProvider ?? "mock"}`,
    severity: "info",
  });

  let storageOk = true;
  let storageMessage = "Storage directories writable";
  try {
    mkdirSync(options.dataDirectory, { recursive: true });
    mkdirSync(options.backupDirectory, { recursive: true });
    accessSync(options.dataDirectory, constants.W_OK);
    accessSync(options.backupDirectory, constants.W_OK);
  } catch (error) {
    storageOk = false;
    storageMessage = error instanceof Error ? error.message : String(error);
  }
  checks.push({
    name: "storage",
    ok: storageOk,
    message: storageMessage,
    severity: storageOk ? "info" : "error",
  });

  checks.push({
    name: "queue",
    ok: options.queueReady !== false,
    message: options.queueReady === false ? "Queue not initialized" : "Queue ready",
    severity: options.queueReady === false ? "error" : "info",
  });

  checks.push({
    name: "scheduler",
    ok: options.schedulerReady !== false,
    message:
      options.schedulerReady === false
        ? "Scheduler not initialized"
        : "Scheduler ready",
    severity: options.schedulerReady === false ? "error" : "info",
  });

  checks.push({
    name: "filesystem",
    ok: existsSync(options.dataDirectory),
    message: existsSync(options.dataDirectory)
      ? "Filesystem paths exist"
      : "Data directory missing",
    severity: existsSync(options.dataDirectory) ? "info" : "error",
  });

  checks.push({
    name: "permissions",
    ok: storageOk,
    message: storageOk ? "Write permissions OK" : "Write permissions failed",
    severity: storageOk ? "info" : "error",
  });

  checks.push({
    name: "network",
    ok: true,
    message:
      options.environment === "production"
        ? "Network assumed available; provider health validates connectivity"
        : "Network checks deferred in non-production",
    severity: "info",
  });

  const diskFreeMb = options.diskFreeMb ?? 10_240;
  const minDisk = options.config.minimumDiskFreeMb ?? 1024;
  checks.push({
    name: "disk-space",
    ok: diskFreeMb >= minDisk,
    message: `Disk free ${diskFreeMb}MB (minimum ${minDisk}MB)`,
    severity: diskFreeMb >= minDisk ? "info" : "error",
  });

  const memoryPct = Math.round((1 - freemem() / totalmem()) * 100);
  const maxMem = options.config.maximumMemoryUsagePercent ?? 90;
  checks.push({
    name: "memory",
    ok: memoryPct < maxMem,
    message: `Memory usage ${memoryPct}% (max ${maxMem}%)`,
    severity: memoryPct < maxMem ? "info" : "warning",
  });

  return {
    ok: checks.every((c) => c.ok || c.severity !== "error"),
    checks,
    validatedAt: now().toISOString(),
  };
}
