import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../config/index.js";
import { InMemoryWorkflowStore } from "../workflow/persistence/index.js";
import { OPERATIONS_REPORT_VERSION } from "../types/operations.js";
import { InMemoryOperationsStore } from "./persistence/store.js";
import { OperationsOrchestrator } from "./orchestrator.js";

function mockOpsConfig(root: string) {
  return {
    ...loadDefaultConfig(),
    runtimeEnvironment: "local" as const,
    secretValidationMode: "permissive" as const,
    dataDirectory: join(root, "data"),
    backupDirectory: join(root, "backups"),
    renderer: "mock" as const,
    publishingProvider: "mock" as const,
    analyticsProvider: "mock" as const,
    scriptProvider: "mock" as const,
    trendProvider: "mock" as const,
    dailyVideoCount: 3,
    minimumSampleSize: 1,
  };
}

describe("OperationsOrchestrator", () => {
  it("bootstraps and passes doctor in local mock mode", async () => {
    const root = mkdtempSync(join(tmpdir(), "amynest-ops-orch-"));
    const orchestrator = new OperationsOrchestrator({
      inMemory: true,
      store: new InMemoryOperationsStore(new InMemoryWorkflowStore()),
      config: mockOpsConfig(root),
      now: () => new Date("2026-07-28T10:00:00.000Z"),
    });

    const doctor = await orchestrator.doctor();
    assert.equal(doctor.ok, true);
    assert.equal(doctor.bootstrap.ready, true);
    assert.ok(doctor.bootstrap.steps.some((s) => s.step === "ready" && s.ok));
    assert.equal(doctor.health.ready, true);
    assert.equal(doctor.secrets.ok, true);
  });

  it("exports diagnostics and metrics", async () => {
    const root = mkdtempSync(join(tmpdir(), "amynest-ops-diag-"));
    const orchestrator = new OperationsOrchestrator({
      inMemory: true,
      store: new InMemoryOperationsStore(new InMemoryWorkflowStore()),
      config: mockOpsConfig(root),
    });
    await orchestrator.bootstrap();
    const diagnostics = await orchestrator.diagnostics();
    assert.equal(diagnostics.version, OPERATIONS_REPORT_VERSION);
    const exported = orchestrator.exportDiagnostics(diagnostics, "ops-report-v1");
    assert.match(exported.content, /ops-report-v1/);
    const metrics = orchestrator.metrics();
    assert.ok(metrics.availability >= 0);
  });

  it("creates and restores backups", async () => {
    const root = mkdtempSync(join(tmpdir(), "amynest-ops-bak-"));
    const store = new InMemoryOperationsStore(new InMemoryWorkflowStore());
    const orchestrator = new OperationsOrchestrator({
      store,
      config: mockOpsConfig(root),
    });
    await orchestrator.bootstrap();
    const manifest = orchestrator.backup();
    assert.ok(manifest.id.startsWith("bak_"));
    assert.ok(manifest.includes.includes("workflow-state"));
    const restored = orchestrator.restore(manifest.id);
    assert.equal(restored.ok, true);
  });

  it("runs production acceptance end-to-end with mocks", async () => {
    const root = mkdtempSync(join(tmpdir(), "amynest-ops-acc-"));
    const orchestrator = new OperationsOrchestrator({
      inMemory: true,
      store: new InMemoryOperationsStore(new InMemoryWorkflowStore()),
      config: mockOpsConfig(root),
      now: () => new Date("2026-07-28T10:00:00.000Z"),
    });

    const result = await orchestrator.acceptance();
    assert.equal(result.ok, true, result.steps.map((s) => `${s.name}:${s.message}`).join("; "));
    assert.equal(result.videosGenerated, 3);
    assert.ok(result.analyticsReportId);
    assert.ok(result.campaignPlanId);
  });
});
