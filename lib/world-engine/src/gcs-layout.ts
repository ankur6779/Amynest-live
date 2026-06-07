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

/** Vite/public mirror of generated clips (`artifacts/kidschedule/public/discovery-worlds-audio/`). */
export const WORLDS_LIBRARY_LOCAL_MIRROR_WEB_PREFIX = "/discovery-worlds-audio";

export function worldsLibraryLocalMirrorWebPath(gcsObjectPath: string): string {
  const trimmed = (gcsObjectPath ?? "").trim().replace(/^\/+/, "");
  return `${WORLDS_LIBRARY_LOCAL_MIRROR_WEB_PREFIX}/${trimmed}`;
}

/**
 * Pathname of an http(s) URL without relying on the ambient `URL` global,
 * so this stays type-safe across every tsconfig (no DOM/Node lib required)
 * and runs in both browser and Node.
 */
function httpUrlPathname(httpUrl: string): string {
  const afterScheme = httpUrl.replace(/^https?:\/\//i, "");
  const slashIndex = afterScheme.indexOf("/");
  if (slashIndex === -1) return "/";
  return afterScheme.slice(slashIndex).split(/[?#]/)[0];
}

/** Extract GCS object path from a worlds-library proxy URL or local mirror path. */
export function extractWorldsLibraryObjectPath(urlOrPath: string): string | null {
  const trimmed = (urlOrPath ?? "").trim();
  if (!trimmed) return null;
  try {
    const path = trimmed.startsWith("http") ? httpUrlPathname(trimmed) : trimmed;
    const proxyPrefix = "/api/worlds-library/";
    if (path.startsWith(proxyPrefix)) {
      return decodeURIComponent(path.slice(proxyPrefix.length)).replace(/^\/+/, "");
    }
    const mirrorPrefix = `${WORLDS_LIBRARY_LOCAL_MIRROR_WEB_PREFIX}/`;
    if (path.startsWith(mirrorPrefix)) {
      return decodeURIComponent(path.slice(mirrorPrefix.length)).replace(/^\/+/, "");
    }
    if (/^worlds\/(vehicles|nature|home|instruments)\//i.test(path.replace(/^\/+/, ""))) {
      return path.replace(/^\/+/, "");
    }
  } catch {
    return null;
  }
  return null;
}

function worldIdFromGcsPath(gcsPath: string): WorldId | null {
  if (gcsPath.startsWith("worlds/vehicles/")) return "vehicle_world";
  if (gcsPath.startsWith("worlds/nature/")) return "nature_world";
  if (gcsPath.startsWith("worlds/home/")) return "home_sounds_world";
  if (gcsPath.startsWith("worlds/instruments/")) return "instrument_world";
  return null;
}

/** Ordered playback URLs: API proxy first, then same-origin local mirror when present. */
export function worldsLibraryPlaybackCandidates(urlOrGcsPath: string): string[] {
  const trimmed = (urlOrGcsPath ?? "").trim();
  if (!trimmed) return [];
  const out: string[] = [];
  const push = (value: string) => {
    const v = value.trim();
    if (v && !out.includes(v)) out.push(v);
  };
  push(trimmed);
  const gcsPath =
    extractWorldsLibraryObjectPath(trimmed) ??
    (trimmed.replace(/^\/+/, "").startsWith("worlds/") ? trimmed.replace(/^\/+/, "") : null);
  if (!gcsPath) return out;
  const worldId = worldIdFromGcsPath(gcsPath);
  if (worldId && isValidWorldsLibraryObjectPath(worldId, gcsPath)) {
    push(worldsLibraryProxyPath(worldId, gcsPath));
  } else {
    push(`/api/worlds-library/${gcsPath}`);
  }
  push(worldsLibraryLocalMirrorWebPath(gcsPath));
  return out;
}
