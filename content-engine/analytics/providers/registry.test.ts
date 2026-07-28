import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FutureAnalyticsProvider } from "./future.js";
import { MockAnalyticsProvider } from "./mock.js";
import {
  AnalyticsProviderRegistry,
  createDefaultAnalyticsRegistry,
} from "./registry.js";
import { YouTubeAnalyticsProvider } from "./youtube.js";

describe("AnalyticsProviderRegistry", () => {
  it("registers mock youtube and future providers", () => {
    const registry = createDefaultAnalyticsRegistry();
    assert.deepEqual(
      registry.list().map((p) => p.id).sort(),
      ["future", "mock", "youtube"],
    );
    assert.equal(new FutureAnalyticsProvider().id, "future");
    assert.equal(new YouTubeAnalyticsProvider().id, "youtube");
  });

  it("falls back to mock when primary provider is unhealthy", async () => {
    const registry = new AnalyticsProviderRegistry({
      providers: [new YouTubeAnalyticsProvider({ accessToken: "" }), new MockAnalyticsProvider()],
    });
    const provider = await registry.resolveProvider("youtube");
    assert.equal(provider.id, "mock");
  });
});
