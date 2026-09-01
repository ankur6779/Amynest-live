/**
 * Strategy B+D — KIE-safe Character Memory regression.
 * Proves: memory stays on for prompts/freezes; generated last-frames never enter KIE imageUrls.
 * NO paid KIE calls.
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it } from "node:test";
import { performancePrompt } from "../creative-composition/performances.js";
import type { CompositionShotPlan } from "../creative-composition/types.js";
import { wardrobeFor } from "../character-memory-engine/wardrobe.js";
import {
  isCharacterMemoryEnabled,
} from "../character-memory-engine/engine.js";
import { resolveGenerationSeed } from "../character-memory-engine/seed.js";
import {
  isGeneratedMemoryFramePath,
  resolveKieReferencePaths,
} from "../asset-engine/providers/kie-video/client.js";
import { allGoldenSeeds } from "../golden-scripts/seeds.js";
import { buildGoldenScript } from "../golden-scripts/build.js";
import {
  assertGoldenVoiceIntegrity,
  buildGoldenVoiceAndCaptions,
  wordCoveragePercent,
} from "./golden-voice.js";

function tinyPng(path: string): void {
  // Minimal valid 1x1 PNG
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  writeFileSync(path, bytes);
}

describe("KIE-safe Character Memory (B+D)", () => {
  it("1. Character Memory remains enabled by default", () => {
    assert.equal(isCharacterMemoryEnabled({}), true);
  });

  it("2. Memory state still reaches prompts", () => {
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
    assert.ok(memory);
    assert.match(prompt, /CHARACTER MEMORY ENGINE/);
    assert.match(prompt, /Room LOCK|Clothing LOCK|Camera CONTINUE|Emotion CONTINUE/);
    assert.match(prompt, /Position:|Eyes:|PROPS/);
    assert.match(negativePrompt, /camera teleport|wardrobe/i);
    // Prompt must NOT claim generated memory frame is a KIE visual ref
    assert.ok(!/Previous Scene Memory frame/.test(prompt));
    assert.match(prompt, /textual|local-only|identity keyframe/i);
  });

  it("3+4. Local freeze retained in seed metadata; NOT in KIE paths", () => {
    const dir = join(tmpdir(), `kie-safe-mem-${Date.now()}`);
    mkdirSync(join(dir, "character-memory"), { recursive: true });
    const identity = join(dir, "identity.png");
    const freeze = join(dir, "character-memory", "shot-amy-host-last.png");
    tinyPng(identity);
    tinyPng(freeze);

    const girlBible = wardrobeFor("amy-girl").bibleAsset;
    const amyBible = wardrobeFor("amy-ai").bibleAsset;
    assert.ok(existsSync(girlBible));
    assert.ok(existsSync(amyBible));

    const seed = resolveGenerationSeed({
      character: "amy-girl",
      identityKeyframePath: identity,
      cast: ["amy-girl", "amy-ai"],
      previousMemory: {
        sceneId: "shot-amy-host",
        index: 0,
        role: "amy-host",
        characters: ["amy-girl", "amy-ai"],
        room: "study",
        lighting: {
          timeOfDay: "day",
          windowDirection: "left",
          sunlight: "soft",
          shadowDirection: "right",
          roomBrightness: "bright",
          mood: "warm",
        },
        camera: {
          momentum: "push",
          movement: "slow",
          framingNote: "over shoulder",
          continueFrom: "prior",
        },
        emotion: {
          stage: "curious",
          label: "curious",
          energy: "medium",
          previousStage: "warm",
        },
        animationEnergy: "medium",
        intentionalChanges: [],
        poses: [],
        props: [],
        inheritsFromSceneId: null,
        bibleAssetPaths: [girlBible, amyBible],
        referenceImagePaths: [girlBible, amyBible, freeze],
        lastFramePath: freeze,
        ok: true,
        rejects: [],
      },
    });

    assert.equal(seed.usedPreviousFrame, true);
    assert.equal(seed.localMemoryFreezePath, freeze);
    // Canonical identity: primary = Girl bible (not Girl identity keyframe)
    assert.equal(seed.imagePath, girlBible);
    assert.ok(!seed.referenceImagePaths.includes(freeze));
    assert.ok(!seed.referenceImagePaths.includes(identity));
    assert.ok(seed.referenceImagePaths.every((p) => !isGeneratedMemoryFramePath(p)));
    assert.ok(seed.bibleAssetPaths.includes(girlBible));
    assert.ok(seed.bibleAssetPaths.includes(amyBible));

    // OLD vs NEW evidence (unit-level):
    const oldKieImagePaths = [girlBible, amyBible, freeze]; // pre-B+D learn shape
    const newKieImagePaths = resolveKieReferencePaths({
      imagePath: seed.imagePath,
      referenceImagePaths: seed.referenceImagePaths,
      requiredReferencePaths: [girlBible, amyBible].filter((p) => existsSync(p)).slice(0, 2),
    });

    assert.ok(oldKieImagePaths.includes(freeze), "OLD included memory freeze");
    assert.ok(!newKieImagePaths.includes(freeze), "NEW excludes memory freeze");
    assert.equal(
      newKieImagePaths.filter(isGeneratedMemoryFramePath).length,
      0,
      "generated memory refs must be 0",
    );
    assert.ok(newKieImagePaths.some((p) => /amy-girl-bible/i.test(p)));
    assert.ok(newKieImagePaths.some((p) => /amy-ai-bible/i.test(p)));
    assert.ok(!newKieImagePaths.includes(identity));
  });

  it("5. Canonical Amy/Girl/Boy references remain in resolved imageUrls paths", () => {
    for (const id of ["amy-ai", "amy-girl", "amy-boy"] as const) {
      const bible = wardrobeFor(id).bibleAsset;
      assert.ok(existsSync(bible), `missing bible ${id}`);
      const paths = resolveKieReferencePaths({
        imagePath: bible,
        referenceImagePaths: [bible],
        requiredReferencePaths: [bible],
      });
      assert.ok(paths.includes(bible));
    }
  });

  it("6. Missing canonical reference fails the shot", () => {
    assert.throws(() =>
      resolveKieReferencePaths({
        imagePath: "/tmp/does-not-exist-identity.png",
        requiredReferencePaths: ["/tmp/missing-amy-bible.png"],
      }),
    );
  });

  it("fail-safe strips accidental memory freeze from KIE path list", () => {
    const dir = join(tmpdir(), `kie-safe-strip-${Date.now()}`);
    mkdirSync(join(dir, "character-memory"), { recursive: true });
    const bible = wardrobeFor("amy-ai").bibleAsset;
    const freeze = join(dir, "character-memory", "shot-x-last.png");
    tinyPng(freeze);
    assert.ok(isGeneratedMemoryFramePath(freeze));

    const paths = resolveKieReferencePaths({
      imagePath: bible,
      referenceImagePaths: [freeze, bible],
      requiredReferencePaths: [bible],
    });
    assert.ok(!paths.includes(freeze));
    assert.equal(paths.filter(isGeneratedMemoryFramePath).length, 0);
    assert.ok(paths.includes(bible));
  });

  it("fail-safe rejects required reference that is a memory freeze", () => {
    const dir = join(tmpdir(), `kie-safe-req-${Date.now()}`);
    mkdirSync(join(dir, "character-memory"), { recursive: true });
    const freeze = join(dir, "character-memory", "shot-y-last.png");
    tinyPng(freeze);
    assert.throws(() =>
      resolveKieReferencePaths({
        imagePath: freeze,
        requiredReferencePaths: [freeze],
      }),
    );
  });

  it("7. Existing P0 Golden Script integrity remains intact", () => {
    for (const num of [9, 10, 11, 12]) {
      const seed = allGoldenSeeds()[num - 1]!;
      const script = buildGoldenScript(seed, num);
      const { voiceScript, captions } = buildGoldenVoiceAndCaptions(script, 21);
      assertGoldenVoiceIntegrity(script, voiceScript);
      assert.ok(captions.length >= 4);
      assert.match(voiceScript, /Download AmyNest AI/i);
      assert.ok(
        wordCoveragePercent(script.productEntryBeat, voiceScript) >= 55,
      );
    }
  });

  it("8. Existing TTS / golden voice completeness remains intact", () => {
    const seed = allGoldenSeeds()[9]!; // golden-010
    const script = buildGoldenScript(seed, 10);
    const { voiceScript } = buildGoldenVoiceAndCaptions(script, 21);
    assert.ok(voiceScript.split(/\s+/).filter(Boolean).length > 40);
    assert.ok(!/speak into the mic/i.test(voiceScript));
    assertGoldenVoiceIntegrity(script, voiceScript);
  });
});
