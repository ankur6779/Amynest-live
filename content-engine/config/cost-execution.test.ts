import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCostFirstProviderSelection,
  isCostFirstEnabled,
} from "./cost-execution.js";
import { loadDefaultConfig } from "./index.js";

describe("cost-first provider selection", () => {
  it("is enabled by default", () => {
    assert.equal(isCostFirstEnabled({}), true);
    assert.equal(isCostFirstEnabled({ AMYNEST_COST_FIRST: "false" }), false);
  });

  it("forces mock scripts and local-first providers", () => {
    const base = {
      ...loadDefaultConfig(),
      scriptProvider: "openai" as const,
      preferredProviders: ["google-veo" as const, "google-imagen" as const],
    };
    const next = applyCostFirstProviderSelection(base, {});
    assert.equal(next.scriptProvider, "mock");
    assert.equal(next.preferredProviders?.[0], "local-library");
    assert.ok((next.preferredProviders ?? []).includes("google-veo"));
  });

  it("respects explicit AMYNEST_SCRIPT_PROVIDER=gemini", () => {
    const base = { ...loadDefaultConfig(), scriptProvider: "mock" as const };
    const next = applyCostFirstProviderSelection(base, {
      AMYNEST_SCRIPT_PROVIDER: "gemini",
    });
    assert.equal(next.scriptProvider, "gemini");
  });

  it("can be disabled", () => {
    const base = {
      ...loadDefaultConfig(),
      scriptProvider: "openai" as const,
    };
    const next = applyCostFirstProviderSelection(base, {
      AMYNEST_COST_FIRST: "false",
    });
    assert.equal(next.scriptProvider, "openai");
  });
});
