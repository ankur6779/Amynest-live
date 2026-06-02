import manifestJson from "./manifest.json";
import type { WorldManifest, WorldManifestItem } from "@workspace/world-engine";
import { isValidWorldsLibraryObjectPath, worldsLibraryProxyPath } from "@workspace/world-engine";

const manifest = manifestJson as WorldManifest;

const byId = new Map(manifest.items.map((item) => [item.id, item]));

export function getVehicleWorldManifest(): WorldManifest {
  return manifest;
}

export function getAllVehicles(): WorldManifestItem[] {
  return manifest.items;
}

export function getVehicleById(id: string): WorldManifestItem | undefined {
  return byId.get(id);
}

export function resolveVehicleAssetUrl(gcsPath: string): string {
  if (!isValidWorldsLibraryObjectPath("vehicle_world", gcsPath)) {
    throw new Error(`Invalid vehicle world path: ${gcsPath}`);
  }
  return worldsLibraryProxyPath("vehicle_world", gcsPath);
}
