import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AssetOrchestrator } from "../../asset-engine/index.js";
import { loadDefaultConfig } from "../../config/index.js";
import { StoryboardPlanner } from "../../storyboard/planner.js";
import { makeContentPackage } from "../../storyboard/test-fixtures.js";
import { buildAudioMixPlan } from "../audio/index.js";
import { buildCompositionPlan } from "../compositor/index.js";
import { buildSubtitlePlan } from "../subtitles/index.js";
import { buildFrameTimeline, buildTransitionSpecs } from "../timeline/index.js";
import { buildWatermarkSpec } from "../watermark/index.js";
import { validateCompositionPlan, validateRenderPackage } from "./engine.js";
import type { RenderPackage } from "../../types/render-package.js";

describe("render validation", () => {
  it("accepts a well-formed composition plan", async () => {
    const config = loadDefaultConfig();
    const { package: storyboard } = new StoryboardPlanner({ config }).planFromContentPackage(
      makeContentPackage(),
      30,
    );
    const { package: assets } = await new AssetOrchestrator({ config }).orchestrate(storyboard);
    const timeline = buildFrameTimeline(storyboard, 30);
    const composition = buildCompositionPlan({
      storyboard,
      assets,
      timeline,
      transitions: buildTransitionSpecs(storyboard, timeline),
      subtitles: buildSubtitlePlan(storyboard, "burned-in"),
      audio: buildAudioMixPlan(storyboard),
      watermark: buildWatermarkSpec(storyboard, assets, true),
      fps: 30,
      bitrate: "8M",
      codec: "h264",
      audioCodec: "aac",
      outputContainer: "mp4",
    });

    const report = validateCompositionPlan(composition, storyboard, assets);
    assert.equal(report.ok, true, report.errors.map((e) => e.message).join("; "));
  });

  it("rejects invalid render packages", () => {
    const bad = {
      id: "rp",
      version: "5.0.0",
      createdAt: new Date().toISOString(),
      storyboardId: "sb",
      assetPackageId: "ap",
      videoPath: "",
      duration: 0,
      resolution: { width: 720, height: 1280 },
      fps: 0,
      codec: "h264",
      audioCodec: "aac",
      container: "mp4",
      checksum: "",
      renderMetadata: {
        jobId: "j",
        storyboardId: "sb",
        assetPackageId: "ap",
        compositionFingerprint: "x",
        renderer: "mock",
        outputDirectory: "/tmp",
        subtitleMode: "none",
        watermarkApplied: false,
        createdAt: new Date().toISOString(),
        artifacts: {},
      },
      telemetry: {
        renderTimeMs: 1,
        encodingTimeMs: 1,
        frames: 0,
        droppedFrames: 0,
        cacheHit: false,
        provider: "mock",
      },
      validation: { ok: true, errors: [], warnings: [] },
      progressLog: [],
    } satisfies RenderPackage;

    const report = validateRenderPackage(bad);
    assert.equal(report.ok, false);
    assert.ok(report.errors.some((e) => e.path === "videoPath"));
    assert.ok(report.errors.some((e) => e.path === "duration"));
    assert.ok(report.warnings.some((e) => e.path === "resolution"));
  });
});
