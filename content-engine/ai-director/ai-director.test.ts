import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import { composeProductionScenes } from "../scene-composer/compose.js";
import { extractScriptBeats, planComposerIntents } from "../scene-composer/planner.js";
import { getVideoProviderCapabilities } from "../scene-composer/providers.js";
import {
  directProductionScenes,
  isAiDirectorEnabled,
} from "./director.js";
import { buildEmotionMap } from "./emotion-map.js";
import { gateDirectorPackage } from "./quality.js";
import { selectShotForIntent } from "./shot-language.js";

describe("AI Director Layer", () => {
  it("is enabled by default and can be disabled via env", () => {
    assert.equal(isAiDirectorEnabled({}), true);
    assert.equal(isAiDirectorEnabled({ AMYNEST_AI_DIRECTOR: "0" }), false);
  });

  it("builds an emotion map with intensity 1–10 and audience feeling", () => {
    const pkg = makeContentPackage();
    const intents = planComposerIntents({
      beats: extractScriptBeats(pkg),
      totalDuration: 20,
      provider: getVideoProviderCapabilities("google-veo"),
      category: pkg.topic.category,
      title: pkg.title,
      keywords: pkg.topic.keywords,
    });
    const map = buildEmotionMap(intents);
    assert.ok(map.length >= 6);
    assert.equal(map[0]!.targetEmotion, "Curiosity");
    assert.equal(map[0]!.emotionArc, "Curious");
    assert.ok(map.some((m) => m.targetEmotion === "Hope"));
    assert.ok(map.some((m) => m.targetEmotion === "Curiosity"));
    assert.ok(map.some((m) => m.targetEmotion === "Confidence"));
    assert.ok(map.some((m) => m.targetEmotion === "Joy"));
    assert.ok(map.some((m) => m.emotionArc === "Thinking"));
    assert.ok(map.some((m) => m.emotionArc === "Understanding"));
    assert.ok(map.some((m) => m.emotionArc === "Success"));
    assert.ok(map.some((m) => m.emotionArc === "Celebration"));
    for (const beat of map) {
      assert.ok(beat.intensity >= 1 && beat.intensity <= 10);
      assert.ok(beat.facialExpression.length > 0);
      assert.ok(beat.audienceFeeling.length > 0);
      assert.ok(beat.emotionArc.length > 0);
    }
  });

  it("selects professional shot language from story role (not random)", () => {
    const hook = selectShotForIntent({
      role: "hook",
      roleOccurrence: 0,
      category: "Learning",
    });
    assert.equal(hook.shotType, "Push-In");
    assert.equal(hook.composerCamera, "Push");

    const emotion = selectShotForIntent({
      role: "emotion",
      roleOccurrence: 0,
      category: "Learning",
    });
    assert.equal(emotion.shotType, "Close-Up");

    const feature = selectShotForIntent({
      role: "feature",
      roleOccurrence: 0,
      category: "Learning",
    });
    assert.equal(feature.shotType, "POV");
  });

  it("produces a Director Package with camera, lighting, motion, micro-actions, continuity", () => {
    const pkg = makeContentPackage();
    const intents = planComposerIntents({
      beats: extractScriptBeats(pkg),
      totalDuration: 20,
      provider: getVideoProviderCapabilities("mock"),
      category: pkg.topic.category,
      title: pkg.title,
      keywords: pkg.topic.keywords,
    });
    const { director, intents: directed } = directProductionScenes({
      contentPackage: pkg,
      intents,
    });

    assert.equal(director.version, "1.2.0");
    assert.ok(director.scenes.length === intents.length);
    assert.ok(director.emotionMap.length === intents.length);
    assert.ok(director.cameraPlanSummary.length > 0);
    assert.ok(director.lightingPlanSummary.length > 0);
    assert.ok(director.motionPlanSummary.length > 0);
    assert.ok(director.transitionPlan.length === director.scenes.length - 1);
    assert.ok(director.visualContinuity.roomLayout.length > 0);
    assert.ok(director.visualContinuity.wardrobe.includes("Official locked wardrobe"));
    assert.match(
      director.visualContinuity.emotionArc ?? "",
      /Curious/,
    );

    for (const scene of director.scenes) {
      assert.ok(scene.camera.shotType.length > 0);
      assert.ok(scene.lighting.mood.length > 0);
      assert.ok(scene.microActions.length >= 1);
      assert.ok(scene.emotion.intensity >= 1);
      assert.ok(scene.continuityNotes.length >= 3);
      assert.ok(scene.blocking.positions.length > 0);
      assert.ok(scene.continuityState.eyeDirection.length > 0);
      assert.ok(scene.continuityState.handPosition.length > 0);
      assert.ok(scene.cutOut.kind.length > 0);
      assert.match(
        scene.continuityNotes.join("\n"),
        /SCENE CONTINUITY LOCK|Character position/,
      );
    }

    // Prefer cinematic cut language (not only fades)
    const kinds = director.scenes.map((s) => s.cutOut.kind);
    assert.ok(
      kinds.some((k) =>
        /eyeline-cut|action-cut|motivated-cut|match-cut|l-cut|j-cut/.test(k),
      ),
    );

    // Directed intents receive director camera/emotion choices
    assert.equal(directed[0]!.camera, director.scenes[0]!.camera.composerCamera);
    assert.equal(
      directed[0]!.emotion,
      director.scenes[0]!.emotion.composerEmotion,
    );
  });

  it("quality gate accepts cinematic packages and rejects empty micro-action slides", () => {
    const pkg = makeContentPackage();
    const intents = planComposerIntents({
      beats: extractScriptBeats(pkg),
      totalDuration: 20,
      provider: getVideoProviderCapabilities("mock"),
      category: pkg.topic.category,
      title: pkg.title,
      keywords: pkg.topic.keywords,
    });
    const { director } = directProductionScenes({ contentPackage: pkg, intents });
    assert.equal(director.quality.ok, true);
    assert.ok(director.quality.cinematicScore >= 70);

    const broken = structuredClone(director.scenes);
    const living = broken.find((s) => s.role === "problem")!;
    living.microActions = [];
    living.camera.movement = "static-hold";
    living.pacing = "settle";
    const gated = gateDirectorPackage({
      scenes: broken,
      continuity: director.visualContinuity,
    });
    assert.equal(gated.ok, false);
    assert.ok(gated.rejects.some((r) => r.code === "static-image" || r.code === "slideshow"));
  });

  it("wires into composeProductionScenes before prompts (additive, no new phase)", () => {
    const composed = composeProductionScenes({
      contentPackage: makeContentPackage(),
      duration: 20,
      provider: "google-veo",
    });

    assert.ok(composed.director, "director package attached");
    assert.equal(composed.director!.quality.ok, true);
    assert.match(composed.director!.emotionMap[0]!.targetEmotion, /Curiosity/);
    assert.match(composed.director!.emotionMap[0]!.emotionArc, /Curious/);

    for (const scene of composed.scenes) {
      assert.match(scene.prompt.userPrompt, /AI DIRECTOR — MANDATORY/);
      assert.match(scene.prompt.userPrompt, /Micro actions/);
      assert.match(scene.prompt.userPrompt, /Emotion arc:/);
      assert.match(scene.prompt.userPrompt, /CONTINUITY STATE/);
      assert.match(scene.prompt.userPrompt, /CUT IN|CUT OUT/);
      assert.match(scene.prompt.systemBrandBlock, /EMOTION MAP:/);
      assert.match(scene.prompt.systemBrandBlock, /EMOTION ARC/);
      assert.match(scene.prompt.negativePrompt, /powerpoint style/);
      assert.match(scene.prompt.negativePrompt, /character teleport/);
    }

    // Emotion-before-feature spine preserved
    const roles = composed.scenes.map((s) => s.intent.role);
    const emotionIdx = roles.indexOf("emotion");
    const featureIdx = roles.indexOf("feature");
    assert.ok(emotionIdx >= 0 && featureIdx > emotionIdx);
  });
});
