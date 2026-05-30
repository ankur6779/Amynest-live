/**
 * Read/write phonics-audio-library manifest (client + api-server copies).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import type { PhonicsAudioLibraryManifest, PhonicsAudioManifestAsset } from "@workspace/phonics-sounds";

export const REPO_ROOT = join(import.meta.dirname, "..");

export const PHONICS_LIBRARY_MANIFEST_PATHS = [
  join(REPO_ROOT, "artifacts/kidschedule/src/data/phonics-audio-map.json"),
  join(REPO_ROOT, "artifacts/api-server/src/data/phonics-audio-map.json"),
] as const;

export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function loadPhonicsLibraryManifest(
  path = PHONICS_LIBRARY_MANIFEST_PATHS[0],
): PhonicsAudioLibraryManifest | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as PhonicsAudioLibraryManifest;
  } catch {
    return null;
  }
}

export function writePhonicsLibraryManifest(
  manifest: PhonicsAudioLibraryManifest,
  paths: readonly string[] = PHONICS_LIBRARY_MANIFEST_PATHS,
): void {
  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  for (const p of paths) {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, json, "utf8");
  }
}

export function manifestAssetFromBuffer(
  base: PhonicsAudioManifestAsset,
  buffer: Buffer,
  source: "elevenlabs" | "fallback_tone",
  durationMs: number,
): PhonicsAudioManifestAsset {
  return {
    ...base,
    durationMs,
    checksum: sha256Hex(buffer),
    source,
    quality: source === "fallback_tone" ? "needs_review" : base.quality ?? "auto",
  };
}
