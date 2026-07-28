import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import { composeProductionScenes, scenesNeedingRegeneration } from "./compose.js";
import { composeScenesForStoryboard } from "./enhance-storyboard.js";
import {
  detectActiveVideoProvider,
  getVideoProviderCapabilities,
  snapClipDuration,
} from "./providers.js";
import { buildXfadeSteps } from "./stitch.js";
import { validateComposerScene } from "./validate.js";

describe("Scene Composer", () => {
  it("adapts scene count to provider max clip duration (never hardcodes 6)", () => {
    const pkg = makeContentPackage();
    const veo = composeProductionScenes({
      contentPackage: pkg,
      duration: 30,
      provider: "google-veo",
    });
    const mock = composeProductionScenes({
      contentPackage: pkg,
      duration: 20,
      provider: "mock",
    });

    assert.ok(veo.scenes.length >= 6);
    // Short-clip providers must split more (or equal) vs long-clip mock.
    assert.ok(veo.scenes.length >= mock.scenes.length);
    assert.ok(
      veo.scenes
        .filter((s) => s.intent.role !== "end-card")
        .every((s) => s.intent.durationSeconds <= veo.provider.maxClipSeconds + 0.05),
    );
    const purposes = new Set(veo.scenes.map((s) => s.intent.storyboardPurpose));
    for (const required of [
      "hook",
      "opening-question",
      "story",
      "key-point",
      "cta",
      "brand-end",
    ]) {
      assert.ok(purposes.has(required as never), `missing purpose ${required}`);
    }
    assert.ok(veo.scenes.some((s) => s.intent.role === "end-card"));
    assert.equal(veo.targetResolution, "1080x1920");
    assert.equal(veo.aspectRatio, "9:16");
  });

  it("keeps product/feature after emotion in planned roles", () => {
    const composed = composeProductionScenes({
      contentPackage: makeContentPackage(),
      duration: 20,
      provider: "google-veo",
    });
    const roles = composed.scenes.map((s) => s.intent.role);
    const emotionIdx = roles.indexOf("emotion");
    const featureIdx = roles.indexOf("feature");
    if (emotionIdx >= 0 && featureIdx >= 0) {
      assert.ok(emotionIdx < featureIdx);
    }
    assert.equal(roles[roles.length - 1], "end-card");
  });

  it("embeds continuity previous/current/next into every prompt", () => {
    const composed = composeProductionScenes({
      contentPackage: makeContentPackage(),
      duration: 20,
      provider: "google-veo",
    });
    for (const scene of composed.scenes) {
      assert.match(scene.prompt.userPrompt, /Previous scene:/);
      assert.match(scene.prompt.userPrompt, /Current scene:/);
      assert.match(scene.prompt.userPrompt, /Next scene:/);
      assert.match(scene.prompt.systemBrandBlock, /BRAND LOCK|AmyNest|palette|#6A2CFF/i);
      assert.ok(scene.prompt.characters.length >= 1);
    }
  });

  it("validates scenes independently and lists only failed ones for regen", () => {
    const composed = composeProductionScenes({
      contentPackage: makeContentPackage(),
      duration: 20,
      provider: "google-veo",
      sceneNotes: {
        hook: "identity drift — face changed between frames",
      },
    });
    assert.equal(composed.validation.ok, false);
    const failed = scenesNeedingRegeneration(composed);
    assert.ok(failed.length >= 1);
    assert.ok(failed.every((s) => s.validation.shouldRegenerate));
    assert.ok(failed.every((s) => s.intent.role === "hook" || s.sceneId.includes("hook")));
  });

  it("snaps clip durations to provider allowed set", () => {
    const veo = getVideoProviderCapabilities("google-veo");
    assert.equal(snapClipDuration(7, veo), 6);
    assert.equal(snapClipDuration(8, veo), 8);
    assert.ok(snapClipDuration(20, veo) <= 8);
  });

  it("detects provider from env without architecture change", () => {
    const caps = detectActiveVideoProvider({
      env: { AMYNEST_VIDEO_PROVIDER: "runway" } as NodeJS.ProcessEnv,
    });
    assert.equal(caps.providerId, "runway");
    assert.equal(caps.maxClipSeconds, 10);
  });

  it("builds xfade stitch steps for seamless assembly", () => {
    const steps = buildXfadeSteps({
      clipDurations: [4, 6, 5],
      transitions: [
        {
          fromSceneId: "a",
          toSceneId: "b",
          type: "Crossfade",
          durationSeconds: 0.4,
          brandPurpleWash: false,
        },
        {
          fromSceneId: "b",
          toSceneId: "c",
          type: "Dissolve",
          durationSeconds: 0.45,
          brandPurpleWash: true,
        },
      ],
    });
    assert.equal(steps.length, 2);
    assert.ok(steps[0]!.offsetSeconds >= 0);
    assert.equal(steps[1]!.outLabel, "vxfade");
  });

  it("maps composer output into storyboard ScenePlan[]", () => {
    const { scenes, composer } = composeScenesForStoryboard({
      contentPackage: makeContentPackage(),
      duration: 20,
      providerId: "google-veo",
    });
    assert.equal(scenes.length, composer.scenes.length);
    assert.ok(scenes.every((s) => s.duration > 0));
    assert.ok(scenes.some((s) => s.purpose === "brand-end"));
    assert.ok(
      scenes[0]!.assetRequirements[0]!.videoPrompt.includes("SCENE GOAL"),
    );
  });

  it("rejects incorrect duration on validation", () => {
    const composed = composeProductionScenes({
      contentPackage: makeContentPackage(),
      duration: 15,
      provider: "mock",
    });
    const scene = composed.scenes[0]!;
    const result = validateComposerScene({
      sceneId: scene.sceneId,
      prompt: scene.prompt,
      provider: composed.provider,
      measuredDurationSeconds: scene.prompt.durationSeconds + 3,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "incorrect-duration");
  });
});
