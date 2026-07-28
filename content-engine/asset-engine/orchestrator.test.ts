import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../config/index.js";
import { StoryboardPlanner } from "../storyboard/planner.js";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import { InMemoryTelemetrySink } from "../telemetry/index.js";
import { exportAssetPackage } from "./export/index.js";
import { buildBrandingAssets } from "./branding/index.js";
import { validateAssetPackage } from "./validation/index.js";
import { AssetOrchestrator } from "./orchestrator.js";

describe("AssetOrchestrator", () => {
  it("builds a complete AssetPackage from StoryboardPackage", async () => {
    const config = loadDefaultConfig();
    const { package: storyboard } = new StoryboardPlanner({ config }).planFromContentPackage(
      makeContentPackage(),
      30,
    );
    const telemetry = new InMemoryTelemetrySink();
    const { package: assets, telemetry: event } = await new AssetOrchestrator({
      config,
      telemetry,
    }).orchestrate(storyboard);

    assert.equal(assets.version, "4.0.0");
    assert.equal(assets.storyboardId, storyboard.id);
    assert.ok(assets.resolvedAssets.length >= storyboard.scenes.length);
    assert.ok(assets.assetManifest.entries.length >= assets.resolvedAssets.length);
    assert.ok(
      assets.brandingAssets.logo.path.includes("brand://") ||
        assets.brandingAssets.logo.path.includes("content-engine/brand/assets"),
      `unexpected logo path: ${assets.brandingAssets.logo.path}`,
    );
    assert.ok(assets.brandingAssets.qrPlaceholder.path);
    assert.ok(assets.brandingAssets.playStorePlaceholder.path);
    assert.equal(assets.validation.ok, true, assets.validation.errors.map((e) => e.message).join("; "));
    assert.equal(event.name, "asset_engine.orchestrate");
    assert.ok(Number(event.metadata?.assetCount) >= 1);
    assert.equal(telemetry.list().length, 1);
  });

  it("injects branding profiles and exports manifests", async () => {
    const config = { ...loadDefaultConfig(), brandingProfile: "dark" as const };
    const { package: storyboard } = new StoryboardPlanner({
      config: loadDefaultConfig(),
    }).planFromContentPackage(makeContentPackage(), 15);

    const branding = buildBrandingAssets(storyboard, "dark");
    assert.equal(branding.colors.mode, "dark");
    assert.equal(branding.profile, "dark");

    const { package: assets } = await new AssetOrchestrator({ config }).orchestrate(storyboard);
    const json = exportAssetPackage(assets, "json");
    const yaml = exportAssetPackage(assets, "yaml");
    const manifest = exportAssetPackage(assets, "asset-manifest-v1");

    assert.match(json.content, /"version": "4.0.0"/);
    assert.match(yaml.content, /version: ["']?4\.0\.0["']?/);
    assert.equal(JSON.parse(manifest.content).format, "asset-manifest-v1");
    assert.ok(JSON.parse(manifest.content).entries.length > 0);
  });

  it("validation catches duplicate assets", async () => {
    const config = loadDefaultConfig();
    const { package: storyboard } = new StoryboardPlanner({ config }).planFromContentPackage(
      makeContentPackage(),
      20,
    );
    const { package: assets } = await new AssetOrchestrator({ config }).orchestrate(storyboard);
    assets.resolvedAssets.push({ ...assets.resolvedAssets[0]! });
    const report = validateAssetPackage(assets);
    assert.equal(report.ok, false);
    assert.ok(report.errors.some((e) => e.message.includes("duplicate")));
  });
});
