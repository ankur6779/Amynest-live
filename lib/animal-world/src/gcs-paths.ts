/**
 * Deterministic GCS object paths for the Animal World audio/image library.
 * Pattern: animal-world/{category}/{animalId}/{file}
 */

import type { AnimalCategory } from "./types.js";

const CATEGORY_FOLDER: Record<AnimalCategory, string> = {
  farm: "farm",
  wild: "wild",
  sea: "sea",
  birds: "birds",
  insects: "insects",
  pets: "pets",
  jungle: "jungle",
  arctic: "arctic",
};

export function sanitizeAnimalAssetId(id: string): string {
  return id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Bounded object paths under animal-world/ (mp3, webp, png, json). */
export const ANIMAL_WORLD_GCS_OBJECT_PATH_RE =
  /^animal-world\/(farm|wild|sea|birds|insects|pets|jungle|arctic)\/[a-z0-9_-]+\/[a-z0-9_.-]+\.(mp3|webp|png|json)$/i;

export function isValidAnimalWorldGcsObjectPath(objectPath: string): boolean {
  return ANIMAL_WORLD_GCS_OBJECT_PATH_RE.test((objectPath ?? "").trim());
}

/** Same-origin API stream route — avoids browser CORS on public GCS objects. */
export function animalWorldLibraryProxyPath(gcsObjectPath: string): string {
  const trimmed = (gcsObjectPath ?? "").trim();
  if (!isValidAnimalWorldGcsObjectPath(trimmed)) {
    throw new Error(`Invalid animal-world GCS object path: ${gcsObjectPath}`);
  }
  return `/api/animal-world-library/${trimmed}`;
}

export function getAnimalSoundGcsPath(
  category: AnimalCategory,
  animalId: string,
  fileName: string,
): string {
  const folder = CATEGORY_FOLDER[category];
  const safeAnimal = sanitizeAnimalAssetId(animalId);
  const safeFile = fileName.trim().toLowerCase();
  if (!safeAnimal || !safeFile) {
    throw new Error(`Invalid animal sound path: ${category}/${animalId}/${fileName}`);
  }
  return `animal-world/${folder}/${safeAnimal}/${safeFile}`;
}

export function getAnimalHeroImageGcsPath(
  category: AnimalCategory,
  animalId: string,
): string {
  return getAnimalSoundGcsPath(category, animalId, "hero.webp");
}

export function getAnimalMetadataGcsPath(): string {
  return "animal-world/animals.json";
}

/** Public HTTPS URL for a GCS asset (upload scripts / server-side only). */
export function getAnimalWorldGcsPublicUrl(bucketId: string, objectPath: string): string {
  return `https://storage.googleapis.com/${bucketId}/${objectPath}`;
}
