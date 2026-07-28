import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadDefaultConfig, resolveRenderEngineSettings } from "../../config/index.js";
import { StoryboardPlanner } from "../../storyboard/planner.js";
import { makeContentPackage } from "../../storyboard/test-fixtures.js";
import { AssetOrchestrator } from "../../asset-engine/index.js";
import {
  InMemoryRenderCache,
  buildRenderFingerprint,
} from "./store.js";
import type { RenderPackage } from "../../types/render-package.js";

describe("render cache", () => {
  it("produces stable fingerprints and invalidates on config change", async () => {
    const config = loadDefaultConfig();
    const { package: storyboard } = new StoryboardPlanner({ config }).planFromContentPackage(
      makeContentPackage(),
      20,
    );
    const { package: assets } = await new AssetOrchestrator({ config }).orchestrate(storyboard);
    const settings = resolveRenderEngineSettings(config);

    const a = buildRenderFingerprint({ storyboard, assets, settings });
    const b = buildRenderFingerprint({ storyboard, assets, settings });
    assert.equal(a, b);

    const changed = buildRenderFingerprint({
      storyboard,
      assets,
      settings: { ...settings, bitrate: "12M" },
    });
    assert.notEqual(a, changed);
  });

  it("stores and retrieves packages by fingerprint", () => {
    const cache = new InMemoryRenderCache();
    const pkg = {
      id: "rp_test",
      version: "5.0.0",
      createdAt: new Date().toISOString(),
      storyboardId: "sb",
      assetPackageId: "ap",
      videoPath: "/tmp/out.mp4",
      duration: 15,
      resolution: { width: 1080, height: 1920 },
      fps: 30,
      codec: "h264",
      audioCodec: "aac",
      container: "mp4",
      checksum: "abc",
      renderMetadata: {
        jobId: "j1",
        storyboardId: "sb",
        assetPackageId: "ap",
        compositionFingerprint: "fp1",
        renderer: "mock",
        outputDirectory: "/tmp",
        subtitleMode: "burned-in",
        watermarkApplied: true,
        createdAt: new Date().toISOString(),
        artifacts: {},
      },
      telemetry: {
        renderTimeMs: 10,
        encodingTimeMs: 2,
        frames: 450,
        droppedFrames: 0,
        cacheHit: false,
        provider: "mock",
      },
      validation: { ok: true, errors: [], warnings: [] },
      progressLog: [],
    } satisfies RenderPackage;

    cache.set("fp1", pkg);
    assert.equal(cache.get("fp1")?.id, "rp_test");
    cache.invalidate("fp1");
    assert.equal(cache.get("fp1"), undefined);
  });
});
