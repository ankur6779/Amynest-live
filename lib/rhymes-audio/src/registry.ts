import registryJson from "./rhymes-gcs-registry.json";
import type { RhymesGcsRegistry, RhymesGcsRegistryEntry } from "./types.js";

const REGISTRY = registryJson as RhymesGcsRegistry;

const byId = new Map<string, RhymesGcsRegistryEntry>();
for (const entry of REGISTRY.entries) {
  byId.set(entry.id, entry);
}

/** GCS prefix for rhyme/lullaby MP3 objects — never expose bucket name to clients. */
export const RHYMES_GCS_PREFIX = "Rhymes/";

export function getRhymesGcsRegistry(): RhymesGcsRegistry {
  return REGISTRY;
}

export function getRhymesRegistryCount(): number {
  return REGISTRY.count;
}

export function getRhymesRegistryEntry(audioId: string): RhymesGcsRegistryEntry | undefined {
  return byId.get(audioId.trim());
}

export function listRhymesRegistryEntries(): readonly RhymesGcsRegistryEntry[] {
  return REGISTRY.entries;
}

/** Validate object path is under Rhymes/ and has no traversal. */
export function isValidRhymesGcsObjectPath(objectPath: string): boolean {
  const p = objectPath.trim();
  if (!p.startsWith(RHYMES_GCS_PREFIX)) return false;
  if (p.includes("..")) return false;
  if (!p.toLowerCase().endsWith(".mp3")) return false;
  return true;
}
