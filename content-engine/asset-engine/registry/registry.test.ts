import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultAssetRegistry } from "./registry.js";

describe("asset provider registry", () => {
  it("registers local, screen, illustration, placeholder, and future AI providers", () => {
    const registry = createDefaultAssetRegistry();
    for (const id of [
      "local-library",
      "screen-recording",
      "illustration",
      "placeholder",
      "openai-images",
      "flux",
      "ideogram",
      "stable-diffusion",
      "runway",
      "google-veo",
      "future",
    ] as const) {
      assert.ok(registry.has(id), `missing ${id}`);
      assert.equal(typeof registry.get(id).supportsImages, "function");
    }
  });
});
