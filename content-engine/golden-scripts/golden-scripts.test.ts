import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGoldenScript } from "./build.js";
import { evaluateMutedVideoTest } from "./muted-visual.js";
import { GOLDEN_QUALITY_THRESHOLD } from "./quality.js";
import { allGoldenSeeds } from "./seeds.js";
import { SITUATIONS } from "./situations.js";
import { mentionsProduct } from "./storycraft.js";

describe("Golden Script Library", () => {
  it("contains exactly 50 seeds — 5 per category — with situation packs", () => {
    const seeds = allGoldenSeeds();
    assert.equal(seeds.length, 50);
    assert.equal(Object.keys(SITUATIONS).length, 50);
    const counts = new Map<string, number>();
    for (const seed of seeds) {
      counts.set(seed.category, (counts.get(seed.category) ?? 0) + 1);
    }
    for (const category of [
      "Learning",
      "Speech",
      "Health",
      "Games",
      "Astro",
      "Routine Technology",
      "Amy Coach",
      "Audio Lessons",
      "Parent Tips",
      "Premium Features",
    ]) {
      assert.equal(counts.get(category), 5, category);
    }
  });

  it("builds emotion-first scripts at overall ≥ 90 with hope before CTA", () => {
    const scripts = allGoldenSeeds().map((seed, i) => buildGoldenScript(seed, i + 1));
    assert.equal(scripts.length, 50);
    for (const script of scripts) {
      assert.ok(
        script.quality.overall >= GOLDEN_QUALITY_THRESHOLD,
        `${script.filename} scored ${script.quality.overall}`,
      );
      assert.ok(script.quality.storycraft >= 80, `${script.filename} storycraft`);
      assert.ok(script.parentingSituation.length > 20);
      assert.ok(script.firstThreeSeconds.length > 20);
      assert.ok(script.hopeClose.length > 20);
      assert.equal(script.hooks.length, 10);

      const early = [
        script.selectedHook.text,
        script.parentingSituation,
        script.firstThreeSeconds,
        script.problem,
        script.whyParentsFaceIt,
        script.emotionBeat,
        script.suggestedOpeningScene,
      ];
      for (const beat of early) {
        assert.equal(
          mentionsProduct(beat),
          false,
          `${script.filename} product leaked early: ${beat}`,
        );
      }

      assert.match(script.productEntryBeat, /AmyNest|Amy appear/i);
      assert.match(script.cta, /Download AmyNest AI/);
      assert.match(script.suggestedEndingScene, /hope|hopeful|lighter|end card/i);
      assert.ok(
        script.suggestedCharacters.every((c) =>
          ["Amy AI", "Amy Girl", "Amy Boy"].includes(c),
        ),
      );

      // Muted Video Test
      assert.ok(script.quality.mutedVideo >= GOLDEN_QUALITY_THRESHOLD);
      assert.equal(script.mutedVisual.principle, "visual-story-first");
      assert.ok(script.mutedVisual.first10SecondsMuted.length >= 3);
      assert.ok(script.mutedVisual.last5SecondsMuted.length >= 2);
      const mutedGate = evaluateMutedVideoTest(script.mutedVisual);
      assert.equal(mutedGate.ok, true, mutedGate.failures.join("; "));
      const firstShow = script.mutedVisual.first10SecondsMuted
        .map((s) => s.show)
        .join(" ");
      assert.equal(mentionsProduct(firstShow), false);
    }
  });
});
