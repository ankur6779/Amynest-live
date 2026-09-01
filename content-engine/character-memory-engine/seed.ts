/**
 * Resolve KIE visual identity seeds — canonical Character Bible is ALWAYS authoritative.
 *
 * Rules (Canonical Identity Fix V1):
 * - Each cast member maps to THEIR OWN bible — scene lead never defines companions.
 * - Primary imagePath = lead character's canonical bible (not another character's keyframe).
 * - Generated Character Memory freezes stay LOCAL ONLY (never imageUrls).
 * - Lead identity keyframes are environment/staging only; omitted when multi-cast
 *   so they cannot crowd out companion bibles (exact Amy-identity regression).
 */

import { existsSync } from "node:fs";
import type { BrandCharacterId } from "../brand/types.js";
import { wardrobeFor } from "./wardrobe.js";
import type { SceneCharacterMemory } from "./types.js";

export type KieVisualReferenceRole =
  | "primary-character-identity"
  | "secondary-character-identity"
  | "environment-reference";

export interface CharacterIdentityBinding {
  character: BrandCharacterId;
  role: "primary-character-identity" | "secondary-character-identity";
  biblePath: string;
}

export interface KieVisualReference {
  path: string;
  role: KieVisualReferenceRole;
  character?: BrandCharacterId;
}

export interface GenerationSeed {
  /** Primary KIE seed — ALWAYS the lead character's canonical Character Bible. */
  imagePath: string;
  /** Ordered KIE refs: cast canonical bibles (+ optional single-cast env keyframe). */
  referenceImagePaths: string[];
  /** Per-character bible bindings (authoritative identity map). */
  identityBindings: CharacterIdentityBinding[];
  /** Role-tagged refs for logging / payload evidence. */
  visualReferences: KieVisualReference[];
  /**
   * True when a prior-scene last-frame freeze exists and the lead continues —
   * semantic continuity only. Freeze is NEVER uploaded to KIE.
   */
  usedPreviousFrame: boolean;
  bibleAssetPaths: string[];
  /** Local ffmpeg freeze path when present (audit / QA only — not for KIE). */
  localMemoryFreezePath?: string;
  /** Lead identity keyframe kept for local staging; may be omitted from KIE stack. */
  localIdentityKeyframePath?: string;
  note: string;
}

const BRAND_CHARS: BrandCharacterId[] = ["amy-ai", "amy-girl", "amy-boy"];

export function isBrandCharacterId(value: string): value is BrandCharacterId {
  return (BRAND_CHARS as string[]).includes(value);
}

export function canonicalBiblePath(character: BrandCharacterId): string {
  return wardrobeFor(character).bibleAsset;
}

/** Detect which character a bible path belongs to (if any). */
export function characterFromBiblePath(path: string): BrandCharacterId | null {
  const n = path.replace(/\\/g, "/").toLowerCase();
  if (/amy-ai-bible/.test(n)) return "amy-ai";
  if (/amy-girl-bible/.test(n)) return "amy-girl";
  if (/amy-boy-bible/.test(n)) return "amy-boy";
  return null;
}

export function isCanonicalBiblePath(path: string): boolean {
  return characterFromBiblePath(path) != null;
}

/** Identity keyframes / bases that must never be treated as another character's bible. */
export function isIdentityKeyframePath(path: string): boolean {
  const n = path.replace(/\\/g, "/").toLowerCase();
  return (
    /-identity\.(png|jpe?g|webp)$/.test(n) ||
    /\/keyframes\//.test(n) ||
    /amy-(ai|girl|boy)-base\.(png|jpe?g|webp)$/.test(n)
  );
}

/**
 * Fail-fast: every cast member must have a resolvable canonical bible on disk.
 * Never silently substitute another character's identity.
 */
export function assertCanonicalIdentitiesForCast(cast: BrandCharacterId[]): void {
  const unique = uniqueCharacters(cast);
  for (const c of unique) {
    const bible = canonicalBiblePath(c);
    if (!bible || !existsSync(bible)) {
      throw new Error(
        `CANONICAL IDENTITY FAIL: ${c} present in cast but canonical bible missing (${bible ?? "n/a"}) — no substitute`,
      );
    }
  }
}

/**
 * Critical: Amy must never resolve to Girl/Boy identity assets (and vice versa).
 */
export function assertNoCrossCharacterIdentitySwap(input: {
  character: BrandCharacterId;
  imagePath: string;
  referenceImagePaths: string[];
  identityBindings: CharacterIdentityBinding[];
}): void {
  for (const binding of input.identityBindings) {
    const owner = characterFromBiblePath(binding.biblePath);
    if (owner && owner !== binding.character) {
      throw new Error(
        `CANONICAL IDENTITY FAIL: ${binding.character} bound to wrong bible (${binding.biblePath} → ${owner})`,
      );
    }
  }

  const primaryOwner = characterFromBiblePath(input.imagePath);
  if (primaryOwner && primaryOwner !== input.character) {
    throw new Error(
      `CANONICAL IDENTITY FAIL: primary imagePath is ${primaryOwner} bible but lead is ${input.character}`,
    );
  }

  // Lead primary must be a bible, not a foreign keyframe standing in for identity.
  if (isIdentityKeyframePath(input.imagePath) && !isCanonicalBiblePath(input.imagePath)) {
    throw new Error(
      `CANONICAL IDENTITY FAIL: primary imagePath must be lead canonical bible, not identity keyframe (${input.imagePath})`,
    );
  }

  for (const c of input.identityBindings.map((b) => b.character)) {
    const bible = canonicalBiblePath(c);
    const present =
      input.imagePath === bible ||
      input.referenceImagePaths.includes(bible) ||
      input.identityBindings.some((b) => b.character === c && b.biblePath === bible);
    if (!present) {
      throw new Error(
        `CANONICAL IDENTITY FAIL: ${c} in cast but canonical bible not in resolved seed`,
      );
    }
  }
}

/**
 * Prefer official Character Bible as primary seed for the lead.
 * Attach every cast member's own bible. Never let lead keyframe redefine companions.
 */
export function resolveGenerationSeed(input: {
  character: BrandCharacterId;
  identityKeyframePath: string;
  previousMemory?: SceneCharacterMemory | null;
  /** Extra characters present in this shot (for bible stack). */
  cast?: BrandCharacterId[];
}): GenerationSeed {
  const cast = uniqueCharacters(
    input.cast?.length ? input.cast : [input.character],
  );
  // Ensure lead is first in cast ordering for primary/secondary roles.
  const orderedCast = [
    input.character,
    ...cast.filter((c) => c !== input.character),
  ];

  assertCanonicalIdentitiesForCast(orderedCast);

  const identityBindings: CharacterIdentityBinding[] = orderedCast.map(
    (c, i) => ({
      character: c,
      role:
        i === 0 ? "primary-character-identity" : "secondary-character-identity",
      biblePath: canonicalBiblePath(c),
    }),
  );

  const bibleAssetPaths = identityBindings.map((b) => b.biblePath);
  const leadBible = identityBindings[0]!.biblePath;

  const previousFrame = input.previousMemory?.lastFramePath;
  const freezeExists = Boolean(previousFrame) && existsSync(previousFrame!);
  const sameLeadContinues =
    freezeExists &&
    Boolean(input.previousMemory?.characters.includes(input.character));

  const visualReferences: KieVisualReference[] = identityBindings.map((b) => ({
    path: b.biblePath,
    role: b.role,
    character: b.character,
  }));

  // Multi-cast: bibles ONLY on the wire (max 3). Lead env keyframe stays local.
  // Single-cast: bible primary + optional lead identity keyframe as environment ref.
  const multiCast = orderedCast.length > 1;
  const keyframeOk =
    !multiCast &&
    Boolean(input.identityKeyframePath) &&
    existsSync(input.identityKeyframePath) &&
    !isCanonicalBiblePath(input.identityKeyframePath);

  if (keyframeOk) {
    visualReferences.push({
      path: input.identityKeyframePath,
      role: "environment-reference",
      character: input.character,
    });
  }

  const referenceImagePaths = uniquePaths(visualReferences.map((v) => v.path));

  const seed: GenerationSeed = {
    imagePath: leadBible,
    referenceImagePaths,
    identityBindings,
    visualReferences,
    usedPreviousFrame: sameLeadContinues,
    bibleAssetPaths,
    localMemoryFreezePath: freezeExists ? previousFrame! : undefined,
    localIdentityKeyframePath: existsSync(input.identityKeyframePath)
      ? input.identityKeyframePath
      : undefined,
    note: multiCast
      ? `CANONICAL IDENTITY: primary=${input.character} bible; secondary=${orderedCast
          .slice(1)
          .join(",")} bibles; lead keyframe local-only (multi-cast); memory freeze local-only.`
      : sameLeadContinues
        ? "CANONICAL IDENTITY: primary=lead bible (+ optional env keyframe); memory freeze local-only."
        : "CANONICAL IDENTITY: primary=lead bible (+ optional env keyframe); scene 1 / no prior freeze.",
  };

  assertNoCrossCharacterIdentitySwap({
    character: input.character,
    imagePath: seed.imagePath,
    referenceImagePaths: seed.referenceImagePaths,
    identityBindings: seed.identityBindings,
  });

  return seed;
}

/**
 * Lookup canonical bible for a character ID from a resolved seed (character-ID based).
 */
export function bibleBindingFor(
  seed: GenerationSeed,
  character: BrandCharacterId,
): CharacterIdentityBinding | undefined {
  return seed.identityBindings.find((b) => b.character === character);
}

function uniqueCharacters(ids: BrandCharacterId[]): BrandCharacterId[] {
  const out: BrandCharacterId[] = [];
  for (const id of ids) {
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.filter((p) => p && existsSync(p)))];
}
