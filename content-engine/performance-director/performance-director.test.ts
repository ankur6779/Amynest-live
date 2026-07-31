import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { directProductionScenes } from "../ai-director/director.js";
import { performancePrompt } from "../creative-composition/performances.js";
import type { CompositionShotPlan } from "../creative-composition/types.js";
import { composeProductionScenes } from "../scene-composer/compose.js";
import {
  extractScriptBeats,
  planComposerIntents,
} from "../scene-composer/planner.js";
import { getVideoProviderCapabilities } from "../scene-composer/providers.js";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import {
  directPerformances,
  isPerformanceDirectorEnabled,
} from "./director.js";

describe("Performance Director v2.0", () => {
  it("is enabled by default and can be disabled via env", () => {
    assert.equal(isPerformanceDirectorEnabled({}), true);
    assert.equal(
      isPerformanceDirectorEnabled({ AMYNEST_PERFORMANCE_DIRECTOR: "0" }),
      false,
    );
  });

  it("caps cast complexity (~70% duo / ~20% solo / ~10% trio) with one speaker", () => {
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
    const { performance, intents: acted } = directPerformances({
      contentPackage: pkg,
      intents,
      director,
    });

    assert.equal(performance.version, "2.0.0");
    assert.ok(performance.livingSceneCount >= 5);
    assert.ok(performance.complexity.avgCharactersPerShot <= 2.3);
    assert.ok(performance.complexity.avgCharactersPerShot >= 1.5);
    assert.ok(
      performance.complexity.duoRatio >= 0.45,
      `expected duo-heavy mix, got duo=${performance.complexity.duoRatio}`,
    );
    assert.ok(
      performance.complexity.trioRatio <= 0.25,
      `trio should stay near ~10%, got ${performance.complexity.trioRatio}`,
    );

    const living = performance.scenes.filter((s) => s.cast.length > 0);
    for (const scene of living) {
      assert.ok(scene.cast.length <= 3);
      assert.ok(scene.dominantEmotion.length > 0);
      assert.ok(scene.microActing.length >= 1);
      assert.ok(scene.cast.every((c) => c.beat.length > 0));
      const speakers = scene.cast.filter((c) => c.role === "speaking");
      assert.ok(speakers.length <= 1, "at most one active speaker");
      if (scene.cast.length >= 3) {
        assert.match(scene.sceneId, /transformation|celebrat/i);
      }
    }

    assert.ok(acted.some((i) => i.characters.length === 1), "includes solo beats");
    assert.ok(acted.some((i) => i.characters.length === 2), "includes duo beats");
    assert.ok(
      acted.every((i) => i.role === "end-card" || i.characters.length <= 3),
    );
  });

  it("wires into composeProductionScenes after AI Director", () => {
    const composed = composeProductionScenes({
      contentPackage: makeContentPackage(),
      duration: 20,
      provider: "mock",
    });

    assert.ok(composed.director, "AI Director still present");
    assert.equal(composed.director!.version, "1.2.0");
    assert.ok(composed.performanceDirector, "Performance Director attached");
    assert.equal(composed.performanceDirector!.version, "2.0.0");
    assert.ok(composed.performanceDirector!.complexity.avgCharactersPerShot <= 2.3);

    for (const scene of composed.scenes) {
      if (scene.intent.role === "end-card") continue;
      assert.match(scene.prompt.userPrompt, /PERFORMANCE DIRECTOR v2\.0/);
      assert.match(scene.prompt.userPrompt, /MICRO-ACTING/);
      assert.match(scene.prompt.negativePrompt, /frozen mannequin/);
    }
  });

  it("enriches creative-composition Veo prompts without provider changes", () => {
    const shot: CompositionShotPlan = {
      id: "shot-amy-host",
      role: "amy-host",
      durationSeconds: 4,
      environment: "study-desk",
      kind: "veo-performance",
      caption: "Amy AI helps with homework doubts",
      camera: "tracking",
      character: "amy-ai",
      performance: "kneels and helps",
      notes: "test",
      speechMode: "speaking",
      spokenLine: "Amy AI helps with homework doubts",
    };
    const { prompt, negativePrompt } = performancePrompt(shot);
    assert.match(prompt, /PERFORMANCE DIRECTOR v2\.0/);
    assert.match(prompt, /SPEAKING|speaking/i);
    assert.match(negativePrompt, /obvious lip sync mismatch|frozen mannequin/);
  });
});
