import manifestJson from "./manifest.json";
import type { WorldManifest, WorldManifestItem } from "@workspace/world-engine";
import { isValidWorldsLibraryObjectPath, worldsLibraryProxyPath } from "@workspace/world-engine";

const manifest = manifestJson as WorldManifest;
const byId = new Map(manifest.items.map((item) => [item.id, item]));

export function getInstrumentWorldManifest(): WorldManifest {
  return manifest;
}

export function getAllInstruments(): WorldManifestItem[] {
  return manifest.items;
}

export function getInstrumentById(id: string): WorldManifestItem | undefined {
  return byId.get(id);
}

export function resolveInstrumentAssetUrl(gcsPath: string): string {
  if (!isValidWorldsLibraryObjectPath("instrument_world", gcsPath)) {
    throw new Error(`Invalid instrument world path: ${gcsPath}`);
  }
  return worldsLibraryProxyPath("instrument_world", gcsPath);
}
