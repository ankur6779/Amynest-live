import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyEnvironmentOverrides,
  loadLayeredConfiguration,
  parseEnvironment,
} from "./engine.js";

describe("configuration engine", () => {
  it("parses environments and applies env overrides over defaults", () => {
    assert.equal(parseEnvironment("prod"), "production");
    assert.equal(parseEnvironment("dev"), "development");
    const loaded = loadLayeredConfiguration({
      env: {
        AMYNEST_ENV: "staging",
        AMYNEST_LOG_LEVEL: "warn",
        AMYNEST_DAILY_VIDEO_COUNT: "3",
        AMYNEST_SCHEDULER_BACKEND: "coolify",
      },
      runtimeOverrides: { dailyCron: "15 8 * * *" },
    });
    assert.equal(loaded.environment, "staging");
    assert.ok(loaded.sources.includes("defaults"));
    assert.ok(loaded.sources.includes("env"));
    assert.ok(loaded.sources.includes("runtime"));
    assert.equal(loaded.config.opsLogLevel, "warn");
    assert.equal(loaded.config.dailyVideoCount, 3);
    assert.equal(loaded.config.schedulerBackend, "coolify");
    assert.equal(loaded.config.dailyCron, "15 8 * * *");
    assert.equal(loaded.validation.ok, true);
  });

  it("returns changed=false when no env overrides present", () => {
    const result = applyEnvironmentOverrides(
      { timezone: "Asia/Kolkata" } as never,
      {},
    );
    assert.equal(result.changed, false);
  });
});
