import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../../config/index.js";
import { collectHealthReport } from "./engine.js";

describe("health system", () => {
  it("returns ready live and detailed JSON checks", async () => {
    const dataDirectory = mkdtempSync(join(tmpdir(), "amynest-health-"));
    const report = await collectHealthReport({
      config: {
        ...loadDefaultConfig(),
        renderer: "mock",
        publishingProvider: "mock",
        analyticsProvider: "mock",
        trendProvider: "mock",
        scriptProvider: "mock",
      },
      dataDirectory,
      queueLength: 0,
      schedulerReady: true,
      env: {},
    });

    assert.equal(report.ready, true);
    assert.equal(report.live, true);
    assert.ok(report.checks.some((c) => c.name === "overall"));
    assert.ok(report.checks.some((c) => c.name === "renderer"));
    assert.ok(report.checks.some((c) => c.name === "publishing"));
    assert.ok(report.checks.some((c) => c.name === "memory"));
    assert.ok(report.checks.some((c) => c.name === "disk"));
  });
});
