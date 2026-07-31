import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { performancePrompt } from "../creative-composition/performances.js";
import type { CompositionShotPlan } from "../creative-composition/types.js";
import { runCharacterMemoryEngine } from "../character-memory-engine/engine.js";
import { composeProductionScenes } from "../scene-composer/compose.js";
import {
  extractScriptBeats,
  planComposerIntents,
} from "../scene-composer/planner.js";
import { getVideoProviderCapabilities } from "../scene-composer/providers.js";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import {
  isStoryMemoryEnabled,
  runStoryMemoryEngine,
} from "./engine.js";

describe("Story Memory Engine", () => {
  it("is enabled by default and can be disabled via env", () => {
    assert.equal(isStoryMemoryEnabled({}), true);
    assert.equal(
      isStoryMemoryEnabled({ AMYNEST_STORY_MEMORY: "0" }),
      false,
    );
  });

  it("chains what/why/next, goals, callbacks with scores ≥95%", () => {
    const pkg = makeContentPackage();
    const intents = planComposerIntents({
      beats: extractScriptBeats(pkg),
      totalDuration: 20,
      provider: getVideoProviderCapabilities("mock"),
      category: pkg.topic.category,
      title: pkg.title,
      keywords: pkg.topic.keywords,
    });
    const characterMemory = runCharacterMemoryEngine({
      contentPackage: pkg,
      intents,
    });
    const story = runStoryMemoryEngine({
      contentPackage: pkg,
      intents,
      characterMemory,
    });

    assert.equal(story.version, "1.0.0");
    assert.equal(story.quality.ok, true, story.quality.summary);
    assert.ok(story.scores.narrativeContinuity >= 95);
    assert.ok(story.scores.emotionalContinuity >= 95);
    assert.ok(story.scores.storyCohesion >= 95);
    assert.ok(story.scores.endingSatisfaction >= 95);

    const living = story.scenes.filter((s) => s.role !== "end-card");
    assert.ok(living.length >= 5);
    assert.equal(living[0]!.inheritsFromSceneId, null);

    for (let i = 1; i < living.length; i++) {
      assert.equal(living[i]!.inheritsFromSceneId, living[i - 1]!.sceneId);
      assert.ok(living[i]!.whatJustHappened.length > 0);
      assert.ok(living[i]!.whyItHappened.length > 0);
      assert.ok(living[i]!.whatMustHappenNext.length > 0);
      assert.ok(living[i]!.emotionalPromise.length > 0);
    }

    // Goals persist (same text) across scenes
    const amyGoal = living[0]!.goals.find((g) => g.character === "amy-ai")!.goal;
    for (const scene of living) {
      assert.equal(
        scene.goals.find((g) => g.character === "amy-ai")!.goal,
        amyGoal,
      );
    }

    // Visual callback seeded and recalled
    assert.ok(
      living.some((s) => /purple book|VISUAL CALLBACK/i.test(s.callbackNote)),
    );

    const cta = living.find((s) => s.role === "cta");
    assert.ok(cta);
    assert.match(cta!.endingNote, /natural conclusion|earned/i);
    assert.equal(cta!.beatStage, "invite");
  });

  it("wires into composeProductionScenes after Character Memory", () => {
    const composed = composeProductionScenes({
      contentPackage: makeContentPackage(),
      duration: 20,
      provider: "mock",
    });

    assert.ok(composed.characterMemory);
    assert.ok(composed.storyMemory);
    assert.equal(composed.storyMemory!.version, "1.0.0");
    assert.equal(composed.storyMemory!.quality.ok, true);
    assert.ok(composed.storyMemory!.scores.narrativeContinuity >= 95);

    for (const scene of composed.scenes) {
      if (scene.intent.role === "end-card") continue;
      assert.match(scene.prompt.userPrompt, /STORY MEMORY ENGINE/);
      assert.match(scene.prompt.userPrompt, /WHAT JUST HAPPENED|WHAT MUST HAPPEN NEXT/);
      assert.match(
        scene.prompt.negativePrompt,
        /disconnected scene|bolted-on CTA|story jump/i,
      );
    }
  });

  it("enriches Veo creative-composition prompts with story thread", () => {
    const hook: CompositionShotPlan = {
      id: "shot-hook",
      role: "hook",
      durationSeconds: 4,
      environment: "study-desk",
      kind: "veo-performance",
      caption: "Homework feels hard today",
      camera: "push-in",
      character: "amy-girl",
      performance: "looks stuck",
      notes: "test",
      speechMode: "reacting",
      emotionBeat: "confused",
    };
    const first = performancePrompt(hook);
    assert.match(first.prompt, /STORY MEMORY ENGINE/);
    assert.ok(first.story);

    const learn: CompositionShotPlan = {
      id: "shot-learn",
      role: "amy-girl-learn",
      durationSeconds: 6,
      environment: "study-desk",
      kind: "veo-performance",
      caption: "Amy helps her understand",
      camera: "over-shoulder",
      character: "amy-girl",
      performance: "learns with Amy",
      notes: "test",
      speechMode: "listening",
    };
    const second = performancePrompt(learn, null, first.story ?? null);
    assert.match(second.prompt, /WHAT JUST HAPPENED/);
    assert.ok(second.story?.inheritsFromSceneId === first.story?.sceneId);
  });
});
