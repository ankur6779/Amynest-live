/**
 * Character identity + KIE-safe memory preflight (offline-capable).
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { wardrobeFor } from "../../character-memory-engine/wardrobe.js";
import {
  assertKieReferenceManifestSafe,
  buildKieReferenceManifest,
} from "../../character-memory-engine/identity-lock.js";
import { resolveGenerationSeed } from "../../character-memory-engine/seed.js";
import type { BrandCharacterId } from "../../brand/types.js";
function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export interface IdentityPreflightResult {
  ok: boolean;
  reasons: string[];
  bibles: Record<string, { path: string; sha256: string }>;
  generatedMemoryOnWire: number;
  crossCharacterRefs: number;
  sampleCast: BrandCharacterId[];
}

export function runIdentityPreflight(): IdentityPreflightResult {
  const reasons: string[] = [];
  const ids: BrandCharacterId[] = ["amy-ai", "amy-girl", "amy-boy"];
  const bibles: IdentityPreflightResult["bibles"] = {};

  for (const id of ids) {
    const path = wardrobeFor(id).bibleAsset;
    if (!existsSync(path)) {
      reasons.push(`Missing canonical bible for ${id}: ${path}`);
      continue;
    }
    bibles[id] = { path, sha256: sha256File(path) };
  }

  const sampleCast: BrandCharacterId[] = ["amy-girl", "amy-ai"];
  const fakeKeyframe = join(tmpdir(), "amynest-factory-dry-keyframe-missing.png");

  try {
    const seed = resolveGenerationSeed({
      character: "amy-girl",
      cast: sampleCast,
      identityKeyframePath: fakeKeyframe,
      previousMemory: null,
    });

    const memOnWire = seed.referenceImagePaths.filter((p) =>
      /character-memory\/.*-last\./i.test(p),
    ).length;
    if (memOnWire !== 0) {
      reasons.push(`GENERATED_MEMORY on wire = ${memOnWire} (must be 0)`);
    }

    const manifest = buildKieReferenceManifest({
      cast: sampleCast,
      referenceImagePaths: seed.referenceImagePaths,
      localMemoryFreezePath: seed.localMemoryFreezePath,
    });
    assertKieReferenceManifestSafe(manifest);

    return {
      ok: reasons.length === 0,
      reasons,
      bibles,
      generatedMemoryOnWire: manifest.GENERATED_MEMORY,
      crossCharacterRefs: manifest.CROSS_CHARACTER_REFERENCES,
      sampleCast,
    };
  } catch (e) {
    reasons.push(e instanceof Error ? e.message : String(e));
    return {
      ok: false,
      reasons,
      bibles,
      generatedMemoryOnWire: -1,
      crossCharacterRefs: -1,
      sampleCast,
    };
  }
}

export function assertSecretsFromEnv(env: NodeJS.ProcessEnv = process.env): {
  ok: boolean;
  present: string[];
  missing: string[];
} {
  const requiredLive = [
    "KIE_API_KEY",
    "YOUTUBE_CLIENT_ID",
    "YOUTUBE_CLIENT_SECRET",
    "YOUTUBE_REFRESH_TOKEN",
  ];
  const present: string[] = [];
  const missing: string[] = [];
  for (const k of requiredLive) {
    if (env[k]?.trim()) present.push(k);
    else missing.push(k);
  }
  return { ok: missing.length === 0, present, missing };
}
