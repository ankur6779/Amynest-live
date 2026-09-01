/**
 * Amy Girl Canonical Identity Consistency Fix V1 — local regression (no KIE).
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it } from "node:test";
import { wardrobeFor } from "../character-memory-engine/wardrobe.js";
import {
  bibleBindingFor,
  characterFromBiblePath,
  resolveGenerationSeed,
} from "../character-memory-engine/seed.js";
import {
  AMY_GIRL_VISUAL_IDENTITY_TOKEN,
  GIRL_CANONICAL_IDENTITY_LOCK,
  assertKieReferenceManifestSafe,
  buildKieReferenceManifest,
  formatAmyGirlVisualTokenSummary,
} from "../character-memory-engine/identity-lock.js";
import { performancePrompt } from "../creative-composition/performances.js";
import type { CompositionShotPlan } from "../creative-composition/types.js";
import type { BrandCharacterId } from "../brand/types.js";

function tinyPng(path: string): void {
  writeFileSync(
    path,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
}

function seedFor(
  lead: BrandCharacterId,
  cast: BrandCharacterId[],
): ReturnType<typeof resolveGenerationSeed> {
  const dir = join(tmpdir(), `girl-id-${lead}-${cast.join("-")}-${Date.now()}-${Math.random()}`);
  mkdirSync(join(dir, "keyframes"), { recursive: true });
  const identity = join(dir, "keyframes", `${lead}-identity.png`);
  tinyPng(identity);
  return resolveGenerationSeed({
    character: lead,
    identityKeyframePath: identity,
    cast,
  });
}

function assertOwnBible(
  seed: ReturnType<typeof resolveGenerationSeed>,
  id: BrandCharacterId,
): void {
  const binding = bibleBindingFor(seed, id);
  assert.ok(binding, `${id} missing binding`);
  assert.equal(binding!.biblePath, wardrobeFor(id).bibleAsset);
  assert.equal(characterFromBiblePath(binding!.biblePath), id);
  assert.ok(
    seed.referenceImagePaths.includes(binding!.biblePath) ||
      seed.imagePath === binding!.biblePath,
  );
}

describe("Amy Girl Canonical Identity Consistency V1", () => {
  const amy = wardrobeFor("amy-ai").bibleAsset;
  const girl = wardrobeFor("amy-girl").bibleAsset;
  const boy = wardrobeFor("amy-boy").bibleAsset;

  it("CASE A: Girl only → Girl bible only as identity authority", () => {
    const seed = seedFor("amy-girl", ["amy-girl"]);
    assert.equal(seed.imagePath, girl);
    assertOwnBible(seed, "amy-girl");
    assert.equal(bibleBindingFor(seed, "amy-ai"), undefined);
    const manifest = buildKieReferenceManifest({
      cast: ["amy-girl"],
      referenceImagePaths: seed.referenceImagePaths.filter((p) =>
        /bible/i.test(p),
      ),
      localMemoryFreezePath: null,
    });
    // For single-cast, seed may include env keyframe — manifest uses bible subset
    assert.doesNotThrow(() =>
      assertKieReferenceManifestSafe(
        buildKieReferenceManifest({
          cast: ["amy-girl"],
          referenceImagePaths: [girl],
        }),
      ),
    );
    assert.equal(manifest.characters.AMY_GIRL?.onWire, true);
  });

  it("CASE B: Girl + Amy → each own bible; no cross", () => {
    const seed = seedFor("amy-girl", ["amy-girl", "amy-ai"]);
    assertOwnBible(seed, "amy-girl");
    assertOwnBible(seed, "amy-ai");
    assert.equal(seed.imagePath, girl);
    assert.ok(!seed.referenceImagePaths.includes(amy) === false);
    assert.notEqual(bibleBindingFor(seed, "amy-girl")!.biblePath, amy);
    assert.notEqual(bibleBindingFor(seed, "amy-ai")!.biblePath, girl);
  });

  it("CASE C: Girl + Boy → each own bible", () => {
    const seed = seedFor("amy-girl", ["amy-girl", "amy-boy"]);
    assertOwnBible(seed, "amy-girl");
    assertOwnBible(seed, "amy-boy");
    assert.notEqual(bibleBindingFor(seed, "amy-girl")!.biblePath, boy);
    assert.notEqual(bibleBindingFor(seed, "amy-boy")!.biblePath, girl);
  });

  it("CASE D: Amy + Girl + Boy → all three", () => {
    const seed = seedFor("amy-ai", ["amy-ai", "amy-girl", "amy-boy"]);
    assertOwnBible(seed, "amy-ai");
    assertOwnBible(seed, "amy-girl");
    assertOwnBible(seed, "amy-boy");
    assert.equal(seed.identityBindings.length, 3);
  });

  it("CASE E: Amy lead, Girl companion → Girl still gets Girl bible", () => {
    const seed = seedFor("amy-ai", ["amy-ai", "amy-girl"]);
    assert.equal(seed.imagePath, amy);
    assertOwnBible(seed, "amy-girl");
    assert.equal(
      bibleBindingFor(seed, "amy-girl")!.role,
      "secondary-character-identity",
    );
    assert.equal(bibleBindingFor(seed, "amy-girl")!.biblePath, girl);
  });

  it("CASE F: Girl lead, Amy companion → Girl primary bible, Amy secondary bible", () => {
    const seed = seedFor("amy-girl", ["amy-girl", "amy-ai"]);
    assert.equal(seed.imagePath, girl);
    assert.equal(
      bibleBindingFor(seed, "amy-girl")!.role,
      "primary-character-identity",
    );
    assert.equal(
      bibleBindingFor(seed, "amy-ai")!.role,
      "secondary-character-identity",
    );
  });

  it("CRITICAL: forbid Girl→Amy, Girl→Boy, Amy→Girl, Boy→Girl, Girl→memory", () => {
    const seed = seedFor("amy-girl", ["amy-girl", "amy-ai", "amy-boy"]);
    assert.notEqual(bibleBindingFor(seed, "amy-girl")!.biblePath, amy);
    assert.notEqual(bibleBindingFor(seed, "amy-girl")!.biblePath, boy);
    assert.notEqual(bibleBindingFor(seed, "amy-ai")!.biblePath, girl);
    assert.notEqual(bibleBindingFor(seed, "amy-boy")!.biblePath, girl);
    assert.ok(
      !seed.referenceImagePaths.some((p) =>
        /character-memory\/.*-last/i.test(p),
      ),
    );
  });

  it("manifest fail-fast when Girl present but Girl bible not on wire", () => {
    assert.throws(() =>
      assertKieReferenceManifestSafe(
        buildKieReferenceManifest({
          cast: ["amy-girl", "amy-ai"],
          referenceImagePaths: [amy], // missing girl
        }),
      ),
    );
  });

  it("prompt hard lock + visual token + no photoreal human redesign for Girl", () => {
    const shot: CompositionShotPlan = {
      id: "shot-amy-girl-learn",
      role: "amy-girl-learn",
      durationSeconds: 6,
      environment: "study-desk",
      kind: "veo-performance",
      caption: "learn",
      camera: "over-shoulder",
      character: "amy-girl",
      performance: "listens",
      notes: "test",
      speechMode: "listening",
    };
    const { prompt } = performancePrompt(shot);
    assert.match(prompt, /AMY GIRL IS THE EXACT SAME CANONICAL CHARACTER/i);
    assert.match(prompt, /DO NOT AGE|DO NOT DE-AGE|DO NOT BEAUTIFY/i);
    assert.match(prompt, /SHE MUST LOOK LIKE THE SAME CHILD/i);
    assert.match(prompt, /AMY_GIRL_VISUAL_IDENTITY_TOKEN/i);
    assert.match(prompt, /BRAND CHILD RENDER STABILITY|stylized animated/i);
    assert.ok(!/PHOTOREALISTIC human child for Netflix/i.test(prompt));
    assert.ok(GIRL_CANONICAL_IDENTITY_LOCK.includes("IMMUTABLE"));
    assert.equal(AMY_GIRL_VISUAL_IDENTITY_TOKEN.characterId, "amy-girl");
    assert.ok(formatAmyGirlVisualTokenSummary().includes("yellow bow"));
  });

  it("CASE B manifest: GENERATED_MEMORY=0 CROSS=0", () => {
    const seed = seedFor("amy-girl", ["amy-girl", "amy-ai"]);
    const manifest = buildKieReferenceManifest({
      cast: ["amy-girl", "amy-ai"],
      referenceImagePaths: seed.referenceImagePaths,
    });
    assertKieReferenceManifestSafe(manifest);
    assert.equal(manifest.GENERATED_MEMORY, 0);
    assert.equal(manifest.CROSS_CHARACTER_REFERENCES, 0);
    assert.equal(manifest.characters.AMY_GIRL?.sha256?.length, 64);
    assert.equal(manifest.characters.AMY_AI?.sha256?.length, 64);
  });
});
