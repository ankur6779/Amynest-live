import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockPublishingProvider } from "./mock.js";
import { PublishingProviderRegistry } from "./registry.js";
import { YouTubePublishingProvider } from "./youtube.js";

describe("PublishingProviderRegistry fail-closed mode", () => {
  it("throws instead of silently falling back to mock", async () => {
    const registry = new PublishingProviderRegistry({
      fallbackMode: "none",
      providers: [
        new MockPublishingProvider(),
        new YouTubePublishingProvider({ accessToken: "", autoRefresh: false }),
      ],
    });
    await assert.rejects(
      () => registry.resolveProvider("youtube"),
      /unhealthy/i,
    );
  });
});
