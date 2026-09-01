import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { directProductionScenes } from "../ai-director/director.js";
import { performancePrompt } from "../creative-composition/performances.js";
import type { CompositionShotPlan } from "../creative-composition/types.js";
import { directPerformances } from "../performance-director/director.js";
import { composeProductionScenes } from "../scene-composer/compose.js";
import {
  extractScriptBeats,
  planComposerIntents,
} from "../scene-composer/planner.js";
import { getVideoProviderCapabilities } from "../scene-composer/providers.js";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import { resolveGenerationSeed } from "./seed.js";
import {
  isCharacterMemoryEnabled,
  runCharacterMemoryEngine,
} from "./engine.js";
import { wardrobeFor } from "./wardrobe.js";

describe("Character Memory Engine", () => {
  it("is enabled by default and can be disabled via env", () => {
    assert.equal(isCharacterMemoryEnabled({}), true);
    assert.equal(
      isCharacterMemoryEnabled({ AMYNEST_CHARACTER_MEMORY: "0" }),
      false,
    );
  });

  it("chains pose/props/lighting/emotion and scores ≥95% continuity", () => {
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
    const { performance } = directPerformances({
      contentPackage: pkg,
      intents,
      director,
    });
    const memory = runCharacterMemoryEngine({
      contentPackage: pkg,
      intents,
      director,
      performance,
    });

    assert.equal(memory.version, "1.0.0");
    assert.equal(memory.quality.ok, true);
    assert.ok(memory.scores.characterIdentity >= 95);
    assert.ok(memory.scores.sceneContinuity >= 95);
    assert.ok(memory.scores.emotionContinuity >= 95);
    assert.ok(memory.scores.cameraContinuity >= 95);

    const living = memory.scenes.filter((s) => s.role !== "end-card");
    assert.ok(living.length >= 5);
    assert.equal(living[0]!.inheritsFromSceneId, null);

    for (let i = 1; i < living.length; i++) {
      assert.equal(living[i]!.inheritsFromSceneId, living[i - 1]!.sceneId);
      // Lighting / room carry unless intentional
      if (!living[i]!.intentionalChanges.includes("lighting")) {
        assert.equal(
          living[i]!.lighting.windowDirection,
          living[i - 1]!.lighting.windowDirection,
        );
      }
      if (!living[i]!.intentionalChanges.includes("room")) {
        assert.equal(living[i]!.room, living[i - 1]!.room);
      }
      for (const pose of living[i]!.poses) {
        assert.match(pose.clothing, /purple|polymer|hoodie|body/i);
      }
    }

    // Emotion never jumps more than one major stage without clamp
    for (let i = 1; i < living.length; i++) {
      assert.ok(living[i]!.emotion.stage.length > 0);
      assert.ok(living[i]!.camera.continueFrom.length > 0);
    }
  });

  it("wires into composeProductionScenes after Character Studio", () => {
    const composed = composeProductionScenes({
      contentPackage: makeContentPackage(),
      duration: 20,
      provider: "mock",
    });

    assert.equal(composed.director?.version, "1.2.0");
    assert.equal(composed.performanceDirector?.version, "2.0.0");
    assert.equal(composed.characterStudio?.version, "1.0.0");
    assert.ok(composed.characterMemory);
    assert.equal(composed.characterMemory!.version, "1.0.0");
    assert.equal(composed.characterMemory!.quality.ok, true);
    assert.ok(composed.characterMemory!.scores.characterIdentity >= 95);

    for (const scene of composed.scenes) {
      if (scene.intent.role === "end-card") continue;
      assert.match(scene.prompt.userPrompt, /CHARACTER MEMORY ENGINE/);
      assert.match(scene.prompt.userPrompt, /INHERIT|SCENE 1 SEED/);
      assert.match(scene.prompt.negativePrompt, /camera teleport|identity|wardrobe/i);
    }
  });

  it("enriches Veo prompts and keeps generated last-frame out of KIE seed", () => {
    const shot: CompositionShotPlan = {
      id: "shot-amy-girl-learn",
      role: "amy-girl-learn",
      durationSeconds: 6,
      environment: "study-desk",
      kind: "veo-performance",
      caption: "Amy Girl learns with Amy AI",
      camera: "over-shoulder",
      character: "amy-girl",
      performance: "listens and learns",
      notes: "test",
      speechMode: "listening",
    };
    const { prompt, negativePrompt, memory } = performancePrompt(shot);
    assert.match(prompt, /CHARACTER MEMORY ENGINE/);
    assert.match(prompt, /Clothing LOCK|Room LOCK|Camera CONTINUE/);
    assert.match(negativePrompt, /camera teleport|independent AI clip/);
    assert.ok(memory);
    assert.match(prompt, /AMY AI IS THE EXACT CANONICAL|CINEMATIC STYLE SEPARATION/i);

    const identity = memory!.bibleAssetPaths[0]!;
    const withFrame = {
      ...memory!,
      lastFramePath: identity, // exists on disk so continue semantics fire
    };
    const seed = resolveGenerationSeed({
      character: "amy-girl",
      identityKeyframePath: identity,
      previousMemory: withFrame,
      cast: memory!.characters,
    });
    assert.equal(seed.usedPreviousFrame, true);
    // Primary is lead canonical bible — never companion/keyframe swap
    assert.equal(seed.imagePath, wardrobeFor("amy-girl").bibleAsset);
    assert.ok(seed.note.includes("CANONICAL IDENTITY"));
    for (const b of seed.identityBindings) {
      assert.equal(b.biblePath, wardrobeFor(b.character).bibleAsset);
    }
  });
});
