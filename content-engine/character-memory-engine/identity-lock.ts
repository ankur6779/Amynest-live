/**
 * Canonical character identity prompt locks + immutable visual tokens.
 * Pixel authority remains Official Character Bible images — tokens are descriptive only.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import type { BrandCharacterId } from "../brand/types.js";
import { wardrobeFor } from "./wardrobe.js";

function biblePathFor(character: BrandCharacterId): string {
  return wardrobeFor(character).bibleAsset;
}

/** Hard Amy lock — must never be redefined by cinematic style analogies. */
export const AMY_CANONICAL_IDENTITY_LOCK = [
  "AMY AI IDENTITY LOCK (mandatory — highest priority over style language):",
  "AMY AI IS THE EXACT CANONICAL AMYNEST CHARACTER SHOWN IN THE SUPPLIED AMY REFERENCE.",
  "PRESERVE HER EXACT FACE, PURPLE CAP, INTEGRATED HEADPHONES, AMYAI CAP BRANDING, PURPLE EYES, ROUNDED WHITE BODY, PROPORTIONS, SILHOUETTE AND FLOATING DESIGN.",
  "DO NOT REDESIGN AMY. DO NOT SUBSTITUTE AMY. DO NOT TURN AMY INTO A GENERIC ROBOT.",
  "DO NOT REMOVE HER CAP OR HEADPHONES. DO NOT CHANGE HER BODY DESIGN.",
].join(" ");

/**
 * Immutable descriptive visual token for Amy Girl (metadata only).
 * Official amy-girl-bible.jpeg remains the pixel authority.
 */
export const AMY_GIRL_VISUAL_IDENTITY_TOKEN = {
  characterId: "amy-girl" as const,
  version: "1.0.0",
  face: {
    structure: "exact canonical face structure from Girl Character Bible — immutable",
    eyeGeometry: "exact warm brown eye shape/size/spacing from Girl bible — immutable",
    eyebrows: "exact eyebrow structure from Girl bible — immutable",
    noseMouth: "exact nose/mouth proportions from Girl bible — immutable",
    skin: "exact skin tone/appearance from Girl bible — immutable; no beautify filter",
  },
  hair: {
    color: "exact dark brown",
    style: "exact side ponytail from Girl bible — immutable",
    fringe: "exact front fringe/bangs from Girl bible — immutable",
    bow: "exact bright yellow bow shape and placement from Girl bible — immutable",
  },
  body: {
    proportions: "exact child proportions from Girl bible — immutable",
    height: "exact height relationship vs companions from Girl bible — immutable",
    extremities: "exact hands/feet proportions from Girl bible — immutable",
  },
  wardrobe: {
    hoodie: "exact plain purple hoodie from Girl bible — immutable",
    pants: "exact dark purple leggings/pants from Girl bible — immutable",
    shoes: "exact purple sneakers with white soles/laces from Girl bible — immutable",
  },
  rendering: {
    style: "stylized premium animated child matching Girl bible — NOT photoreal human, NOT redesign",
    shading: "stable natural skin shading, hair highlights, fabric folds, believable eyes — identity locked",
  },
} as const;

/** Hard Amy Girl lock — frame-to-frame and shot-to-shot immutability. */
export const GIRL_CANONICAL_IDENTITY_LOCK = [
  "AMY GIRL IDENTITY LOCK (mandatory — highest priority over style language):",
  "AMY GIRL IS THE EXACT SAME CANONICAL CHARACTER SHOWN IN THE SUPPLIED AMY GIRL REFERENCE.",
  "PRESERVE HER EXACT FACE, EYES, EYEBROWS, HAIR, PONYTAIL, YELLOW BOW, SKIN TONE, BODY PROPORTIONS, PURPLE HOODIE, PURPLE PANTS AND PURPLE SHOES.",
  "CHARACTER IDENTITY IS IMMUTABLE.",
  "DO NOT REDESIGN. DO NOT REINTERPRET. DO NOT AGE. DO NOT DE-AGE. DO NOT BEAUTIFY.",
  "DO NOT CHANGE HAIR. DO NOT CHANGE BOW. DO NOT CHANGE FACE. DO NOT CHANGE EYES. DO NOT CHANGE BODY PROPORTIONS. DO NOT CHANGE CLOTHING.",
  "SHE MUST LOOK LIKE THE SAME CHILD IN EVERY SHOT AND EVERY FRAME.",
  "She remains a stylized animated AmyNest character matching the Girl bible — do NOT turn her into a photorealistic human and do NOT invent a new cartoon redesign.",
  `VISUAL TOKEN v${AMY_GIRL_VISUAL_IDENTITY_TOKEN.version}: face/eyes/brows/hair/bow/wardrobe/body locked to Official Amy Girl Character Bible pixels.`,
].join(" ");

export const BOY_CANONICAL_IDENTITY_LOCK = [
  "AMY BOY IDENTITY LOCK (mandatory):",
  "Amy Boy is the exact canonical AmyNest child in the supplied Boy reference — fluffy dark brown hair, plain purple hoodie, dark purple joggers, purple sneakers with white soles.",
  "CHARACTER IDENTITY IS IMMUTABLE. Do not redesign, substitute, age-drift, beautify, or change proportions.",
  "He remains a stylized animated AmyNest character matching the Boy bible — do NOT turn him into a photorealistic human.",
].join(" ");

/** Style / filmmaking only — never character identity. */
export const CINEMATIC_STYLE_SEPARATION = [
  "CINEMATIC STYLE SEPARATION (mandatory):",
  "References to Disney+/Pixar-quality / DreamWorks-like cinematic quality, Netflix family-film energy, Paddington/Ted/Detective Pikachu integration, soft-robot staging, or cinematic animated film language may influence ONLY lighting, camera movement, pacing, environment, emotional staging, depth of field, and filmmaking craft.",
  "They MUST NEVER define, redesign, replace, age, beautify, or invent Amy AI, Amy Girl, or Amy Boy identity — Official Character Bible references are the sole identity authority.",
].join(" ");

export function canonicalIdentityLocksForCast(
  cast: BrandCharacterId[],
): string {
  const locks: string[] = [CINEMATIC_STYLE_SEPARATION];
  if (cast.includes("amy-ai")) locks.push(AMY_CANONICAL_IDENTITY_LOCK);
  if (cast.includes("amy-girl")) locks.push(GIRL_CANONICAL_IDENTITY_LOCK);
  if (cast.includes("amy-boy")) locks.push(BOY_CANONICAL_IDENTITY_LOCK);
  return locks.join(" ");
}

export function formatAmyGirlVisualTokenSummary(): string {
  const t = AMY_GIRL_VISUAL_IDENTITY_TOKEN;
  return [
    `AMY_GIRL_VISUAL_IDENTITY_TOKEN v${t.version} (descriptive only; bible pixels authoritative):`,
    `FACE: ${t.face.structure}; eyes ${t.face.eyeGeometry}; brows ${t.face.eyebrows}; nose/mouth ${t.face.noseMouth}; skin ${t.face.skin}.`,
    `HAIR: ${t.hair.color}; ${t.hair.style}; fringe ${t.hair.fringe}; bow ${t.hair.bow}.`,
    `BODY: ${t.body.proportions}; ${t.body.height}; ${t.body.extremities}.`,
    `WARDROBE: ${t.wardrobe.hoodie}; ${t.wardrobe.pants}; ${t.wardrobe.shoes}.`,
    `RENDER: ${t.rendering.style}; ${t.rendering.shading}.`,
  ].join(" ");
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/**
 * Redacted KIE reference manifest — character-ID → canonical bible SHA.
 * GENERATED_MEMORY and CROSS_CHARACTER must be 0 before send.
 */
export function buildKieReferenceManifest(input: {
  cast: BrandCharacterId[];
  referenceImagePaths: string[];
  localMemoryFreezePath?: string | null;
}): {
  characters: Record<
    string,
    { biblePath: string; sha256: string | null; onWire: boolean }
  >;
  GENERATED_MEMORY: number;
  CROSS_CHARACTER_REFERENCES: number;
  missingCanonical: BrandCharacterId[];
} {
  const characters: Record<
    string,
    { biblePath: string; sha256: string | null; onWire: boolean }
  > = {};
  const missingCanonical: BrandCharacterId[] = [];
  const wire = new Set(input.referenceImagePaths);

  for (const id of ["amy-ai", "amy-girl", "amy-boy"] as BrandCharacterId[]) {
    if (!input.cast.includes(id)) continue;
    const biblePath = biblePathFor(id);
    const onDisk = existsSync(biblePath);
    if (!onDisk) missingCanonical.push(id);
    characters[id.toUpperCase().replace("-", "_")] = {
      biblePath,
      sha256: onDisk ? sha256File(biblePath) : null,
      onWire: wire.has(biblePath),
    };
  }

  let cross = 0;
  const multiCast = input.cast.length > 1;
  for (const p of input.referenceImagePaths) {
    // non-bible paths that look like other character bases/keyframes count as cross risk
    const n = p.replace(/\\/g, "/").toLowerCase();
    if (/amy-(ai|girl|boy)-bible/.test(n)) continue;
    if (/character-memory\/.*-last\./.test(n)) continue;
    // Same-character env keyframe/base is allowed for single-cast staging only.
    // Multi-cast must stay bible-only — any keyframe/base on the wire is cross risk.
    if (/amy-(ai|girl|boy)-base|keyframes\/|identity\./.test(n)) {
      if (multiCast) cross += 1;
      continue;
    }
  }

  const generatedMemory =
    input.localMemoryFreezePath &&
    input.referenceImagePaths.includes(input.localMemoryFreezePath)
      ? 1
      : input.referenceImagePaths.filter((p) =>
          /character-memory\/.*-last\./i.test(p),
        ).length;

  return {
    characters,
    GENERATED_MEMORY: generatedMemory,
    CROSS_CHARACTER_REFERENCES: cross,
    missingCanonical,
  };
}

export function assertKieReferenceManifestSafe(
  manifest: ReturnType<typeof buildKieReferenceManifest>,
): void {
  if (manifest.missingCanonical.length) {
    throw new Error(
      `CANONICAL IDENTITY FAIL: missing bible for ${manifest.missingCanonical.join(", ")}`,
    );
  }
  for (const [key, row] of Object.entries(manifest.characters)) {
    if (!row.onWire) {
      throw new Error(
        `CANONICAL IDENTITY FAIL: ${key} canonical bible not on KIE wire`,
      );
    }
  }
  if (manifest.GENERATED_MEMORY !== 0) {
    throw new Error("CANONICAL IDENTITY FAIL: GENERATED_MEMORY ≠ 0 on wire");
  }
  if (manifest.CROSS_CHARACTER_REFERENCES !== 0) {
    throw new Error(
      "CANONICAL IDENTITY FAIL: CROSS_CHARACTER_REFERENCES ≠ 0 on wire",
    );
  }
}
