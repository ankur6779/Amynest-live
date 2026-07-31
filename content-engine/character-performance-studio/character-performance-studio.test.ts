import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
import {
  isCharacterStudioEnabled,
  runCharacterPerformanceStudio,
} from "./studio.js";

describe("Character Performance Studio", () => {
  it("is enabled by default and can be disabled via env", () => {
    assert.equal(isCharacterStudioEnabled({}), true);
    assert.equal(
      isCharacterStudioEnabled({ AMYNEST_CHARACTER_STUDIO: "0" }),
      false,
    );
  });

  it("assigns internal goals, face/eye/body, and allows intentional solos", () => {
    const pkg = makeContentPackage();
    const intents = planComposerIntents({
      beats: extractScriptBeats(pkg),
      totalDuration: 20,
      provider: getVideoProviderCapabilities("mock"),
      category: pkg.topic.category,
      title: pkg.title,
      keywords: pkg.topic.keywords,
    });
    const { performance } = directPerformances({ contentPackage: pkg, intents });
    const studio = runCharacterPerformanceStudio({
      contentPackage: pkg,
      intents,
      performance,
    });

    assert.equal(studio.version, "1.0.0");
    assert.equal(studio.quality.ok, true);

    const living = studio.scenes.filter((s) => s.briefs.length > 0);
    assert.ok(living.length >= 5);

    assert.ok(
      living.some((s) => s.briefs.length === 1),
      "intentional solo emotional beats",
    );
    assert.ok(
      living.some((s) => s.briefs.length === 2),
      "duo interaction beats",
    );

    for (const scene of living) {
      assert.ok(scene.briefs.length >= 1 && scene.briefs.length <= 3);
      if (scene.briefs.length >= 3) {
        assert.match(scene.sceneId, /transformation|celebrat/i);
      }
      for (const brief of scene.briefs) {
        assert.ok(brief.internalGoal.length > 0);
        assert.ok(brief.face.length > 0, "non-neutral face");
        assert.ok(brief.eyeFocus.length > 0);
        assert.ok(brief.body.length > 0);
        assert.ok(brief.energyVerbs.length > 0);
      }
      assert.match(scene.shotDensityNote, /2–3|2-3/);
      assert.match(scene.noAdModeNote, /NO AD MODE/);
    }

    // No back-to-back identical framing on living scenes
    for (let i = 1; i < living.length; i++) {
      assert.notEqual(
        living[i]!.framing,
        living[i]!.previousFraming,
        "framing should not repeat previous",
      );
    }

    const amy = living
      .flatMap((s) => s.briefs)
      .find((b) => b.character === "amy-ai");
    assert.ok(amy);
    assert.match(amy!.intention, /help|teach|encourage|protect/i);
    assert.ok(
      amy!.energyVerbs.some((v) =>
        /kneel|sit-with|encourage|comfort|celebrate|walk-beside|high-five|point/i.test(
          v,
        ),
      ),
    );
  });

  it("wires into composeProductionScenes after Performance Director", () => {
    const composed = composeProductionScenes({
      contentPackage: makeContentPackage(),
      duration: 20,
      provider: "mock",
    });

    assert.equal(composed.director?.version, "1.2.0");
    assert.equal(composed.performanceDirector?.version, "2.0.0");
    assert.ok(composed.characterStudio);
    assert.equal(composed.characterStudio!.version, "1.0.0");
    assert.equal(composed.characterStudio!.quality.ok, true);

    for (const scene of composed.scenes) {
      if (scene.intent.role === "end-card") continue;
      assert.match(scene.prompt.userPrompt, /CHARACTER PERFORMANCE STUDIO/);
      assert.match(scene.prompt.userPrompt, /Internal goal/);
      assert.match(scene.prompt.userPrompt, /FACE \(primary emotion\)/);
      assert.match(scene.prompt.negativePrompt, /neutral expression|presenter Amy/);
    }
  });

  it("enriches Veo creative-composition prompts", () => {
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
    const { prompt, negativePrompt } = performancePrompt(shot);
    assert.match(prompt, /CHARACTER PERFORMANCE STUDIO/);
    assert.match(prompt, /understand-try-learn-celebrate|Amy Girl goal/i);
    assert.match(negativePrompt, /robotic child|presenter Amy/);
  });
});
