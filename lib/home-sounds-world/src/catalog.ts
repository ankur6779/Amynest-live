import manifestJson from "./manifest.json";
import type { WorldManifest, WorldManifestItem } from "@workspace/world-engine";
import { isValidWorldsLibraryObjectPath, worldsLibraryProxyPath } from "@workspace/world-engine";

const manifest = manifestJson as WorldManifest;
const byId = new Map(manifest.items.map((item) => [item.id, item]));

export function getHomeSoundsManifest(): WorldManifest {
  return manifest;
}

export function getAllHomeSounds(): WorldManifestItem[] {
  return manifest.items;
}

export function getHomeSoundById(id: string): WorldManifestItem | undefined {
  return byId.get(id);
}

export function resolveHomeSoundAssetUrl(gcsPath: string): string {
  if (!isValidWorldsLibraryObjectPath("home_sounds_world", gcsPath)) {
    throw new Error(`Invalid home sounds path: ${gcsPath}`);
  }
  return worldsLibraryProxyPath("home_sounds_world", gcsPath);
}
