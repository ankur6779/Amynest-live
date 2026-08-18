/**
 * P0 integrity: Golden VO immutability + KIE reference path ordering.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync } from "node:fs";
import { allGoldenSeeds } from "../golden-scripts/seeds.js";
import { buildGoldenScript } from "../golden-scripts/build.js";
import { wardrobeFor } from "../character-memory-engine/wardrobe.js";
import { resolveKieReferencePaths } from "../asset-engine/providers/kie-video/client.js";
import {
  assertGoldenVoiceIntegrity,
  buildGoldenVoiceAndCaptions,
  wordCoveragePercent,
} from "./golden-voice.js";

describe("P0 golden voice immutability", () => {
  for (const num of [9, 10, 11, 12]) {
    it(`golden-${String(num).padStart(3, "0")} keeps its own topic (not Speech Practice template)`, () => {
      const seed = allGoldenSeeds()[num - 1]!;
      const script = buildGoldenScript(seed, num);
      const { voiceScript, captions } = buildGoldenVoiceAndCaptions(script, 21);
      assertGoldenVoiceIntegrity(script, voiceScript);
      assert.ok(!/speak into the mic/i.test(voiceScript), "foreign mic template");
      if (script.category !== "Speech" || !/speech practice/i.test(script.featureName)) {
        assert.ok(!/shame flickers/i.test(voiceScript));
      }
      assert.ok(
        wordCoveragePercent(script.productEntryBeat, voiceScript) >= 55,
        "product beat coverage",
      );
      assert.ok(captions.length >= 4);
      assert.match(voiceScript, /Download AmyNest AI/i);
    });
  }

  it("rejects Speech Practice template on Health golden", () => {
    const seed = allGoldenSeeds()[11]!;
    const script = buildGoldenScript(seed, 12);
    assert.throws(() =>
      assertGoldenVoiceIntegrity(
        script,
        "Parents feel the speech struggle today — shame flickers. AmyNest Speech Practice — speak into the mic. Download AmyNest AI on Google Play and the App Store.",
      ),
    );
  });
});

describe("P0 KIE reference paths", () => {
  it("puts canonical bible into resolved image path list", () => {
    const bible = wardrobeFor("amy-ai").bibleAsset;
    assert.ok(existsSync(bible), `bible missing: ${bible}`);
    const identity = bible; // stand-in for keyframe
    const paths = resolveKieReferencePaths({
      imagePath: identity,
      referenceImagePaths: [identity],
      requiredReferencePaths: [bible],
    });
    assert.ok(paths.includes(bible));
    assert.ok(paths.length >= 1 && paths.length <= 3);
  });

  it("fails when required bible is missing", () => {
    assert.throws(() =>
      resolveKieReferencePaths({
        imagePath: "/tmp/does-not-exist-identity.png",
        requiredReferencePaths: ["/tmp/missing-amy-bible.png"],
      }),
    );
  });
});
