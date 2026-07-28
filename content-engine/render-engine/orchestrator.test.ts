import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { AssetOrchestrator } from "../asset-engine/index.js";
import { loadDefaultConfig } from "../config/index.js";
import { StoryboardPlanner } from "../storyboard/planner.js";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import { InMemoryTelemetrySink } from "../telemetry/index.js";
import { exportRenderPackage } from "./export/index.js";
import { RenderOrchestrator } from "./orchestrator.js";
import { createDefaultRenderRegistry } from "./providers/index.js";
import { InMemoryRenderCache } from "./cache/index.js";

async function preparePackages(outputDirectory: string) {
  const config = {
    ...loadDefaultConfig(),
    renderer: "mock" as const,
    outputDirectory,
  };
  const { package: storyboard } = new StoryboardPlanner({ config }).planFromContentPackage(
    makeContentPackage(),
    30,
  );
  const { package: assets } = await new AssetOrchestrator({ config }).orchestrate(storyboard);
  return { config, storyboard, assets };
}

describe("RenderOrchestrator", () => {
  it("transforms AssetPackage into a complete RenderPackage", async () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "amynest-render-"));
    const { config, storyboard, assets } = await preparePackages(outputDirectory);
    const telemetry = new InMemoryTelemetrySink();

    const result = await new RenderOrchestrator({ config, telemetry }).render({
      storyboard,
      assets,
    });

    assert.equal(result.package.version, "5.0.0");
    assert.equal(result.package.storyboardId, storyboard.id);
    assert.equal(result.package.assetPackageId, assets.id);
    assert.equal(result.package.resolution.width, 1080);
    assert.equal(result.package.resolution.height, 1920);
    assert.equal(result.package.fps, 30);
    assert.equal(result.package.codec, "h264");
    assert.ok(result.package.checksum.length >= 32);
    assert.ok(result.package.duration > 0);
    assert.equal(result.package.validation.ok, true);
    assert.equal(result.cacheHit, false);
    assert.equal(result.telemetry.name, "render_engine.render");
    assert.ok(result.progressLog.some((e) => e.stage === "queued"));
    assert.ok(result.progressLog.some((e) => e.stage === "completed"));

    const payload = readFileSync(result.package.videoPath);
    assert.equal(payload.subarray(0, 17).toString("utf8"), "AMYNEST_RENDER_V1");
  });

  it("skips rendering on cache hit when fingerprints are unchanged", async () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "amynest-render-"));
    const { config, storyboard, assets } = await preparePackages(outputDirectory);
    const cache = new InMemoryRenderCache();
    const orchestrator = new RenderOrchestrator({ config, cache });

    const first = await orchestrator.render({ storyboard, assets });
    const second = await orchestrator.render({ storyboard, assets });

    assert.equal(first.cacheHit, false);
    assert.equal(second.cacheHit, true);
    assert.equal(second.package.id, first.package.id);
    assert.equal(second.package.checksum, first.package.checksum);
  });

  it("exports render manifests and switches providers via config", async () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "amynest-render-"));
    const base = await preparePackages(outputDirectory);
    const remotionConfig = {
      ...base.config,
      renderer: "remotion" as const,
      preferredRenderer: "mock" as const,
    };

    const { package: rendered } = await new RenderOrchestrator({
      config: remotionConfig,
      registry: createDefaultRenderRegistry(),
    }).render({ storyboard: base.storyboard, assets: base.assets });

    assert.equal(rendered.renderMetadata.renderer, "remotion");
    const json = exportRenderPackage(rendered, "json");
    const yaml = exportRenderPackage(rendered, "yaml");
    const manifest = exportRenderPackage(rendered, "render-manifest-v1");
    assert.match(json.content, /"version": "5.0.0"/);
    assert.match(yaml.content, /version: ["']?5\.0\.0["']?/);
    assert.equal(JSON.parse(manifest.content).format, "render-manifest-v1");
  });

  it("rejects mismatched storyboard and asset package ids", async () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "amynest-render-"));
    const { config, storyboard, assets } = await preparePackages(outputDirectory);
    await assert.rejects(
      () =>
        new RenderOrchestrator({ config }).render({
          storyboard,
          assets: { ...assets, storyboardId: "other-id" },
        }),
      /storyboardId mismatch/,
    );
  });
});
