import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FutureRenderer } from "./future.js";
import { MockRenderer } from "./mock.js";
import { createDefaultRenderRegistry, RenderProviderRegistry } from "./registry.js";
import type { RenderProvider } from "./types.js";
import type {
  RenderJobRequest,
  RenderProviderHealth,
  RenderTimeEstimate,
} from "../../types/render-package.js";

class UnhealthyPrimary implements RenderProvider {
  readonly id = "ffmpeg" as const;
  supportsGPU(): boolean {
    return true;
  }
  supportsTransparency(): boolean {
    return false;
  }
  supportsAudioMix(): boolean {
    return true;
  }
  async health(): Promise<RenderProviderHealth> {
    return { ok: false, message: "down", checkedAt: new Date().toISOString() };
  }
  estimateTime(_request: RenderJobRequest): RenderTimeEstimate {
    return { seconds: 1, confidence: "low" };
  }
  async cancel(): Promise<boolean> {
    return false;
  }
  async render(): Promise<never> {
    throw new Error("should not render");
  }
}

describe("RenderProviderRegistry", () => {
  it("registers mock, ffmpeg, remotion, and future providers", () => {
    const registry = createDefaultRenderRegistry();
    const ids = registry.list().map((p) => p.id).sort();
    assert.deepEqual(ids, ["ffmpeg", "future", "mock", "remotion"]);
    assert.equal(registry.get("mock").supportsAudioMix(), true);
    assert.equal(new FutureRenderer().id, "future");
  });

  it("falls back when primary renderer is unhealthy", async () => {
    const registry = new RenderProviderRegistry({
      providers: [new UnhealthyPrimary(), new MockRenderer()],
    });
    const provider = await registry.resolveProvider("ffmpeg", "mock");
    assert.equal(provider.id, "mock");
  });

  it("exposes capability flags for GPU and transparency", () => {
    const registry = createDefaultRenderRegistry();
    assert.equal(registry.get("mock").supportsGPU(), false);
    assert.equal(registry.get("mock").supportsTransparency(), true);
    assert.equal(registry.get("remotion").supportsGPU(), true);
    assert.equal(registry.get("ffmpeg").supportsAudioMix(), true);
  });
});
