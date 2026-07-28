import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FutureTrendProvider } from "./future.js";
import { GoogleTrendsProvider } from "./google.js";
import { MockTrendProvider } from "./mock.js";
import {
  TrendProviderRegistry,
  createDefaultTrendRegistry,
} from "./registry.js";
import { YouTubeTrendsProvider } from "./youtube.js";

describe("TrendProviderRegistry", () => {
  it("registers mock google youtube and future providers", () => {
    const registry = createDefaultTrendRegistry();
    assert.deepEqual(
      registry.list().map((p) => p.id).sort(),
      ["future", "google-trends", "mock", "youtube-trends"],
    );
    assert.equal(new FutureTrendProvider().id, "future");
    assert.equal(new GoogleTrendsProvider().id, "google-trends");
    assert.equal(new YouTubeTrendsProvider().id, "youtube-trends");
    assert.equal(new MockTrendProvider().id, "mock");
  });

  it("falls back to mock when primary provider is unhealthy", async () => {
    const registry = new TrendProviderRegistry({
      providers: [
        new GoogleTrendsProvider({ apiKey: "" }),
        new MockTrendProvider(),
      ],
    });
    const provider = await registry.resolveProvider("google-trends");
    assert.equal(provider.id, "mock");
  });

  it("returns mock trends with expected shape", async () => {
    const trends = await new MockTrendProvider().fetchTrends({
      region: "IN",
      limit: 3,
    });
    assert.equal(trends.length, 3);
    for (const trend of trends) {
      assert.ok(trend.keyword.length > 0);
      assert.ok(trend.score > 0);
      assert.equal(trend.source, "mock");
      assert.equal(trend.region, "IN");
      assert.ok(Array.isArray(trend.relatedCategories));
    }
  });

  it("supports provider switching without hardcoding in callers", async () => {
    const registry = createDefaultTrendRegistry();
    for (const id of [
      "mock",
      "google-trends",
      "youtube-trends",
      "future",
    ] as const) {
      const provider = await registry.resolveProvider(id);
      assert.ok(provider.id === id || provider.id === "mock");
      const signals = await provider.fetchTrends({ region: "IN", limit: 2 });
      assert.ok(Array.isArray(signals));
    }
  });
});
