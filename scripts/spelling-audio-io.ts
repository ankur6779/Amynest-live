/**
 * Read/write spelling-audio-manifest.json (client + api-server copies).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import type { SpellingAudioManifest, SpellingAudioManifestEntry } from "@workspace/spelling-audio";

export const REPO_ROOT = join(import.meta.dirname, "..");

export const SPELLING_AUDIO_MANIFEST_PATHS = [
  join(REPO_ROOT, "artifacts/kidschedule/src/data/spelling-audio-manifest.json"),
  join(REPO_ROOT, "artifacts/api-server/src/data/spelling-audio-manifest.json"),
] as const;

export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function loadSpellingAudioManifest(
  path = SPELLING_AUDIO_MANIFEST_PATHS[0],
): SpellingAudioManifest | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as SpellingAudioManifest;
  } catch {
    return null;
  }
}

export function writeSpellingAudioManifest(
  manifest: SpellingAudioManifest,
  paths: readonly string[] = SPELLING_AUDIO_MANIFEST_PATHS,
): void {
  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  for (const p of paths) {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, json, "utf8");
  }
}

export function patchManifestEntryDuration(
  manifest: SpellingAudioManifest,
  catalogId: string,
  durationSec: number,
  checksum?: string,
): void {
  const entry = manifest.entries[catalogId];
  if (!entry) return;
  manifest.entries[catalogId] = {
    ...entry,
    durationSec,
    ...(checksum ? { checksum } : {}),
  } as SpellingAudioManifestEntry & { checksum?: string };
}
