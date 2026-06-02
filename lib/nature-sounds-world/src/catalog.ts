import manifestJson from "./manifest.json";
import type { WorldManifest, WorldManifestItem } from "@workspace/world-engine";
import { isValidWorldsLibraryObjectPath, worldsLibraryProxyPath } from "@workspace/world-engine";

const manifest = manifestJson as WorldManifest;
const byId = new Map(manifest.items.map((item) => [item.id, item]));

export function getNatureWorldManifest(): WorldManifest {
  return manifest;
}

export function getAllNatureSounds(): WorldManifestItem[] {
  return manifest.items;
}

export function getNatureSoundById(id: string): WorldManifestItem | undefined {
  return byId.get(id);
}

export function resolveNatureAssetUrl(gcsPath: string): string {
  if (!isValidWorldsLibraryObjectPath("nature_world", gcsPath)) {
    throw new Error(`Invalid nature world path: ${gcsPath}`);
  }
  return worldsLibraryProxyPath("nature_world", gcsPath);
}
