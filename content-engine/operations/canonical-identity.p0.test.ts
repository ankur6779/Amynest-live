/**
 * Canonical Character Identity Fix V1 — regression (no KIE calls).
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it } from "node:test";
import { wardrobeFor } from "../character-memory-engine/wardrobe.js";
import {
  assertCanonicalIdentitiesForCast,
  assertNoCrossCharacterIdentitySwap,
  canonicalBiblePath,
  characterFromBiblePath,
  isCanonicalBiblePath,
  isIdentityKeyframePath,
  resolveGenerationSeed,
} from "../character-memory-engine/seed.js";
import {
  AMY_CANONICAL_IDENTITY_LOCK,
  CINEMATIC_STYLE_SEPARATION,
  canonicalIdentityLocksForCast,
} from "../character-memory-engine/identity-lock.js";
import { performancePrompt } from "../creative-composition/performances.js";
import type { CompositionShotPlan } from "../creative-composition/types.js";
import { resolveKieReferencePaths } from "../asset-engine/providers/kie-video/client.js";
import type { SceneCharacterMemory } from "../character-memory-engine/types.js";

function tinyPng(path: string): void {
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  writeFileSync(path, bytes);
}

function fakeMemory(
  characters: SceneCharacterMemory["characters"],
  lastFramePath?: string,
): SceneCharacterMemory {
  return {
    sceneId: "shot-prev",
    index: 0,
    role: "prev",
    characters,
    poses: [],
    props: [],
    room: "room",
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
      framingNote: "medium",
      continueFrom: "prior",
    },
    emotion: {
      stage: "curious",
      label: "curious",
      energy: "medium",
      previousStage: null,
    },
    animationEnergy: "medium",
    intentionalChanges: [],
    inheritsFromSceneId: null,
    bibleAssetPaths: characters.map((c) => wardrobeFor(c).bibleAsset),
    referenceImagePaths: characters.map((c) => wardrobeFor(c).bibleAsset),
    lastFramePath,
    ok: true,
    rejects: [],
  };
}

describe("Canonical Character Identity Fix V1", () => {
  const amy = wardrobeFor("amy-ai").bibleAsset;
  const girl = wardrobeFor("amy-girl").bibleAsset;
  const boy = wardrobeFor("amy-boy").bibleAsset;

  it("CASE 1: Girl lead + Amy companion → Girl bible primary, Amy bible secondary; no Girl keyframe on wire", () => {
    const dir = join(tmpdir(), `canon-id-c1-${Date.now()}`);
    mkdirSync(join(dir, "keyframes"), { recursive: true });
    const girlIdentity = join(dir, "keyframes", "shot-amy-girl-learn-identity.png");
    tinyPng(girlIdentity);

    const seed = resolveGenerationSeed({
      character: "amy-girl",
      identityKeyframePath: girlIdentity,
      cast: ["amy-girl", "amy-ai"],
      previousMemory: fakeMemory(["amy-girl", "amy-ai"]),
    });

    assert.equal(seed.imagePath, girl);
    assert.ok(seed.referenceImagePaths.includes(girl));
    assert.ok(seed.referenceImagePaths.includes(amy));
    assert.ok(!seed.referenceImagePaths.includes(girlIdentity));
    assert.equal(
      seed.identityBindings.find((b) => b.character === "amy-girl")?.role,
      "primary-character-identity",
    );
    assert.equal(
      seed.identityBindings.find((b) => b.character === "amy-ai")?.role,
      "secondary-character-identity",
    );
    assert.equal(characterFromBiblePath(seed.imagePath), "amy-girl");
    assert.ok(
      !seed.referenceImagePaths.some(
        (p) => isIdentityKeyframePath(p) && !isCanonicalBiblePath(p),
      ),
    );
  });

  it("CASE 2: Amy lead + Girl companion → Amy primary, Girl secondary", () => {
    const dir = join(tmpdir(), `canon-id-c2-${Date.now()}`);
    mkdirSync(join(dir, "keyframes"), { recursive: true });
    const amyIdentity = join(dir, "keyframes", "shot-amy-host-identity.png");
    tinyPng(amyIdentity);

    const seed = resolveGenerationSeed({
      character: "amy-ai",
      identityKeyframePath: amyIdentity,
      cast: ["amy-ai", "amy-girl"],
    });

    assert.equal(seed.imagePath, amy);
    assert.ok(seed.referenceImagePaths.includes(amy));
    assert.ok(seed.referenceImagePaths.includes(girl));
    assert.ok(!seed.referenceImagePaths.includes(amyIdentity));
    assert.equal(characterFromBiblePath(seed.imagePath), "amy-ai");
  });

  it("CASE 3: Boy lead + Amy companion → Boy primary, Amy secondary", () => {
    const dir = join(tmpdir(), `canon-id-c3-${Date.now()}`);
    mkdirSync(join(dir, "keyframes"), { recursive: true });
    const boyIdentity = join(dir, "keyframes", "shot-boy-identity.png");
    tinyPng(boyIdentity);

    const seed = resolveGenerationSeed({
      character: "amy-boy",
      identityKeyframePath: boyIdentity,
      cast: ["amy-boy", "amy-ai"],
    });

    assert.equal(seed.imagePath, boy);
    assert.ok(seed.referenceImagePaths.includes(boy));
    assert.ok(seed.referenceImagePaths.includes(amy));
    assert.ok(!seed.referenceImagePaths.includes(boyIdentity));
  });

  it("CASE 4: Amy + Girl + Boy → all three canonical bibles", () => {
    const dir = join(tmpdir(), `canon-id-c4-${Date.now()}`);
    mkdirSync(join(dir, "keyframes"), { recursive: true });
    const identity = join(dir, "keyframes", "shot-trio-identity.png");
    tinyPng(identity);

    const seed = resolveGenerationSeed({
      character: "amy-ai",
      identityKeyframePath: identity,
      cast: ["amy-ai", "amy-girl", "amy-boy"],
    });

    assert.equal(seed.imagePath, amy);
    assert.ok(seed.referenceImagePaths.includes(amy));
    assert.ok(seed.referenceImagePaths.includes(girl));
    assert.ok(seed.referenceImagePaths.includes(boy));
    assert.equal(seed.identityBindings.length, 3);
    assert.ok(!seed.referenceImagePaths.includes(identity));
  });

  it("CRITICAL: Amy must never resolve to Girl/Boy identity keyframe", () => {
    const dir = join(tmpdir(), `canon-id-crit-${Date.now()}`);
    mkdirSync(join(dir, "keyframes"), { recursive: true });
    const girlIdentity = join(dir, "keyframes", "shot-amy-girl-learn-identity.png");
    tinyPng(girlIdentity);

    const seed = resolveGenerationSeed({
      character: "amy-girl",
      identityKeyframePath: girlIdentity,
      cast: ["amy-girl", "amy-ai"],
    });

    const amyBinding = seed.identityBindings.find((b) => b.character === "amy-ai");
    assert.ok(amyBinding);
    assert.equal(amyBinding!.biblePath, amy);
    assert.notEqual(amyBinding!.biblePath, girlIdentity);
    assert.notEqual(amyBinding!.biblePath, girl);
    assert.equal(characterFromBiblePath(amyBinding!.biblePath), "amy-ai");

    assert.throws(() =>
      assertNoCrossCharacterIdentitySwap({
        character: "amy-ai",
        imagePath: girl,
        referenceImagePaths: [girl, amy],
        identityBindings: [
          {
            character: "amy-ai",
            role: "primary-character-identity",
            biblePath: amy,
          },
        ],
      }),
    );
  });

  it("CRITICAL: Girl/Boy must never resolve to Amy identity as their bible", () => {
    assert.equal(characterFromBiblePath(amy), "amy-ai");
    assert.equal(characterFromBiblePath(girl), "amy-girl");
    assert.equal(characterFromBiblePath(boy), "amy-boy");

    const seedGirl = resolveGenerationSeed({
      character: "amy-girl",
      identityKeyframePath: girl,
      cast: ["amy-girl"],
    });
    assert.notEqual(seedGirl.imagePath, amy);

    const seedBoy = resolveGenerationSeed({
      character: "amy-boy",
      identityKeyframePath: boy,
      cast: ["amy-boy"],
    });
    assert.notEqual(seedBoy.imagePath, amy);
  });

  it("fail-fast on cross-character bible binding", () => {
    assert.throws(() =>
      assertNoCrossCharacterIdentitySwap({
        character: "amy-girl",
        imagePath: girl,
        referenceImagePaths: [girl, amy],
        identityBindings: [
          {
            character: "amy-girl",
            role: "primary-character-identity",
            biblePath: amy, // wrong on purpose
          },
        ],
      }),
    );
    assert.doesNotThrow(() =>
      assertCanonicalIdentitiesForCast(["amy-ai", "amy-girl", "amy-boy"]),
    );
  });

  it("OLD vs NEW KIE payload fixture (Girl lead + Amy)", () => {
    const dir = join(tmpdir(), `canon-id-payload-${Date.now()}`);
    mkdirSync(join(dir, "keyframes"), { recursive: true });
    mkdirSync(join(dir, "character-memory"), { recursive: true });
    const girlIdentity = join(dir, "keyframes", "shot-amy-girl-learn-identity.png");
    const freeze = join(dir, "character-memory", "shot-amy-host-last.png");
    tinyPng(girlIdentity);
    tinyPng(freeze);

    // OLD (failed validation shape)
    const oldPaths = [girl, amy, girlIdentity];
    assert.ok(oldPaths.includes(girlIdentity));

    const seed = resolveGenerationSeed({
      character: "amy-girl",
      identityKeyframePath: girlIdentity,
      cast: ["amy-girl", "amy-ai"],
      previousMemory: fakeMemory(["amy-girl", "amy-ai"], freeze),
    });
    const newPaths = resolveKieReferencePaths({
      imagePath: seed.imagePath,
      referenceImagePaths: seed.referenceImagePaths,
      requiredReferencePaths: [girl, amy],
    });

    assert.equal(seed.localMemoryFreezePath, freeze);
    assert.ok(!newPaths.includes(freeze));
    assert.ok(!newPaths.includes(girlIdentity));
    assert.ok(newPaths.includes(girl));
    assert.ok(newPaths.includes(amy));
    assert.equal(seed.imagePath, girl);
  });

  it("prompt includes Amy hard lock + cinematic style separation", () => {
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
    const { prompt, memory } = performancePrompt(shot);
    assert.ok(memory);
    assert.match(prompt, /CINEMATIC STYLE SEPARATION/i);
    assert.match(prompt, /DO NOT TURN AMY INTO A GENERIC ROBOT|AMY AI IS THE EXACT CANONICAL/i);
    assert.match(prompt, /PURPLE CAP|INTEGRATED HEADPHONES|AMYAI CAP BRANDING/i);
    assert.ok(canonicalIdentityLocksForCast(["amy-ai"]).includes(AMY_CANONICAL_IDENTITY_LOCK));
    assert.ok(CINEMATIC_STYLE_SEPARATION.length > 40);
    // Soft-robot must not be the identity definition for Amy alone without separation
    assert.match(prompt, /MUST NEVER|sole identity authority|Official Character Bible/i);
  });

  it("single-cast may keep lead env keyframe after bible", () => {
    const dir = join(tmpdir(), `canon-id-single-${Date.now()}`);
    mkdirSync(join(dir, "keyframes"), { recursive: true });
    const identity = join(dir, "keyframes", "shot-amy-host-identity.png");
    tinyPng(identity);
    const seed = resolveGenerationSeed({
      character: "amy-ai",
      identityKeyframePath: identity,
      cast: ["amy-ai"],
    });
    assert.equal(seed.imagePath, amy);
    assert.ok(seed.referenceImagePaths.includes(amy));
    assert.ok(seed.referenceImagePaths.includes(identity));
    assert.equal(
      seed.visualReferences.find((v) => v.path === identity)?.role,
      "environment-reference",
    );
  });
});
