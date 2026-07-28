import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FuturePublishingProvider } from "./future.js";
import { MockPublishingProvider } from "./mock.js";
import { createDefaultPublishingRegistry, PublishingProviderRegistry } from "./registry.js";
import { YouTubePublishingProvider } from "./youtube.js";

describe("PublishingProviderRegistry", () => {
  it("registers mock youtube and future providers", () => {
    const registry = createDefaultPublishingRegistry();
    const ids = registry.list().map((p) => p.id).sort();
    assert.deepEqual(ids, ["future", "mock", "youtube"]);
    assert.equal(new FuturePublishingProvider().id, "future");
    assert.equal(new YouTubePublishingProvider().id, "youtube");
  });

  it("falls back to mock when primary provider is unhealthy", async () => {
    const youtube = new YouTubePublishingProvider({ accessToken: "" });
    const registry = new PublishingProviderRegistry({
      providers: [youtube, new MockPublishingProvider()],
    });
    const provider = await registry.resolveProvider("youtube");
    assert.equal(provider.id, "mock");
  });
});
