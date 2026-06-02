import type { WorldId } from "./types.js";

/**
 * GCS layout for discovery worlds.
 *
 * Animal World (reference) keeps legacy prefix `animal-world/` — unchanged for
 * backward compatibility. New worlds use `worlds/{folder}/`.
 */
export const WORLD_GCS_FOLDER: Record<WorldId, string> = {
  animal_world: "animal-world",
  vehicle_world: "worlds/vehicles",
  nature_world: "worlds/nature",
  home_sounds_world: "worlds/home",
  instrument_world: "worlds/instruments",
};

export const WORLD_MANIFEST_FILE = "manifest.json";

export function sanitizeWorldAssetId(id: string): string {
  return id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function getWorldItemAssetPath(
  worldId: WorldId,
  category: string,
  itemId: string,
  fileName: string,
): string {
  const root = WORLD_GCS_FOLDER[worldId];
  const safeCategory = sanitizeWorldAssetId(category);
  const safeItem = sanitizeWorldAssetId(itemId);
  const safeFile = fileName.trim().toLowerCase();
  return `${root}/${safeCategory}/${safeItem}/${safeFile}`;
}

export function getWorldManifestGcsPath(worldId: WorldId): string {
  const root = WORLD_GCS_FOLDER[worldId];
  if (worldId === "animal_world") {
    return `${root}/animals.json`;
  }
  return `${root}/${WORLD_MANIFEST_FILE}`;
}

/** Validates object paths for the generic worlds library proxy (new worlds only). */
export function buildWorldsLibraryPathRegex(worldId: WorldId): RegExp {
  const folder = WORLD_GCS_FOLDER[worldId].replace(/\//g, "\\/");
  return new RegExp(
    `^${folder}\\/[a-z0-9_-]+\\/[a-z0-9_-]+\\/[a-z0-9_.-]+\\.(mp3|webp|png|json)$`,
    "i",
  );
}

export function isValidWorldsLibraryObjectPath(worldId: WorldId, objectPath: string): boolean {
  if (worldId === "animal_world") return false;
  return buildWorldsLibraryPathRegex(worldId).test((objectPath ?? "").trim());
}

export function worldsLibraryProxyPath(worldId: WorldId, gcsObjectPath: string): string {
  if (!isValidWorldsLibraryObjectPath(worldId, gcsObjectPath)) {
    throw new Error(`Invalid worlds library path for ${worldId}: ${gcsObjectPath}`);
  }
  return `/api/worlds-library/${gcsObjectPath}`;
}
