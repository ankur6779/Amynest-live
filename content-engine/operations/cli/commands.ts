import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadDefaultConfig } from "../../config/index.js";
import { InMemoryWorkflowStore } from "../../workflow/persistence/index.js";
import { InMemoryOperationsStore } from "../persistence/store.js";
import { OperationsOrchestrator } from "../orchestrator.js";

export type OpsCliCommand =
  | "doctor"
  | "health"
  | "workflow-status"
  | "resume"
  | "backup"
  | "restore"
  | "logs"
  | "metrics"
  | "diagnostics"
  | "acceptance";

export async function runOpsCliCommand(
  command: OpsCliCommand,
  flags: Record<string, string> = {},
): Promise<{ exitCode: number; stdout: string }> {
  const dataDir =
    flags["data-dir"] ??
    mkdtempSync(join(tmpdir(), "amynest-ops-"));
  const backupDir = flags["backup-dir"] ?? join(dataDir, "backups");
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(backupDir, { recursive: true });

  const store = flags.memory
    ? new InMemoryOperationsStore(new InMemoryWorkflowStore())
    : undefined;

  const orchestrator = new OperationsOrchestrator({
    inMemory: Boolean(flags.memory),
    store,
    config: {
      ...loadDefaultConfig(),
      dataDirectory: dataDir,
      backupDirectory: backupDir,
      runtimeEnvironment: "local",
      secretValidationMode: "permissive",
      renderer: "mock",
      publishingProvider: "mock",
      analyticsProvider: "mock",
      trendProvider: "mock",
      scriptProvider: "mock",
    },
  });

  switch (command) {
    case "doctor": {
      const result = await orchestrator.doctor();
      return {
        exitCode: result.ok ? 0 : 1,
        stdout: JSON.stringify(result, null, 2),
      };
    }
    case "health": {
      await orchestrator.bootstrap();
      const health = await orchestrator.health();
      return {
        exitCode: health.ready ? 0 : 1,
        stdout: JSON.stringify(health, null, 2),
      };
    }
    case "workflow-status": {
      await orchestrator.bootstrap();
      return {
        exitCode: 0,
        stdout: JSON.stringify(orchestrator.workflowStatus(), null, 2),
      };
    }
    case "resume": {
      await orchestrator.bootstrap();
      const result = await orchestrator.resume(flags.workflow);
      return {
        exitCode: 0,
        stdout: JSON.stringify(result, null, 2),
      };
    }
    case "backup": {
      await orchestrator.bootstrap();
      const manifest = orchestrator.backup();
      return {
        exitCode: 0,
        stdout: JSON.stringify(manifest, null, 2),
      };
    }
    case "restore": {
      if (!flags.backup) {
        return { exitCode: 1, stdout: JSON.stringify({ error: "--backup <id> required" }) };
      }
      await orchestrator.bootstrap();
      const result = orchestrator.restore(flags.backup);
      return {
        exitCode: result.ok ? 0 : 1,
        stdout: JSON.stringify(result, null, 2),
      };
    }
    case "logs": {
      await orchestrator.bootstrap();
      return {
        exitCode: 0,
        stdout: orchestrator
          .logs()
          .map((line) => JSON.stringify(line))
          .join("\n"),
      };
    }
    case "metrics": {
      await orchestrator.bootstrap();
      return {
        exitCode: 0,
        stdout: JSON.stringify(orchestrator.metrics(), null, 2),
      };
    }
    case "diagnostics": {
      await orchestrator.bootstrap();
      const report = await orchestrator.diagnostics();
      const exported = orchestrator.exportDiagnostics(report, "ops-report-v1");
      return { exitCode: 0, stdout: exported.content };
    }
    case "acceptance": {
      const result = await orchestrator.acceptance();
      return {
        exitCode: result.ok ? 0 : 1,
        stdout: JSON.stringify(result, null, 2),
      };
    }
    default: {
      const _exhaustive: never = command;
      return {
        exitCode: 1,
        stdout: JSON.stringify({ error: `Unknown ops command: ${_exhaustive}` }),
      };
    }
  }
}
