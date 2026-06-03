/**
 * Upload local animal-world hero-real.webp files to GCS (production CDN proxy).
 *   pnpm run upload:animal-world-visuals
 *   pnpm run upload:animal-world-visuals -- --force
 */
import { config } from "dotenv";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAllAnimals, getAnimalHeroRealGcsPath } from "@workspace/animal-world";
import {
  buildGcsStorage,
  gcsObjectExists,
  getGcsBucketName,
  hasGcsCredentials,
} from "./lib/gcs-storage.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_VISUAL = join(REPO_ROOT, "artifacts/kidschedule/public/world-visuals");

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.development`, override: true });
config({ path: `${REPO_ROOT}/Amynest-backend-dykj.env`, override: true });

function collectHeroRealPaths(): string[] {
  const fromCatalog = getAllAnimals().map((a) => getAnimalHeroRealGcsPath(a.category, a.id));
  const found = new Set(fromCatalog);
  const awRoot = join(LOCAL_VISUAL, "animal-world");
  if (existsSync(awRoot)) {
    for (const category of readdirSync(awRoot)) {
      const catDir = join(awRoot, category);
      if (!statSync(catDir).isDirectory()) continue;
      for (const animalId of readdirSync(catDir)) {
        const hero = join(catDir, animalId, "hero-real.webp");
        if (existsSync(hero)) {
          found.add(`animal-world/${category}/${animalId}/hero-real.webp`);
        }
      }
    }
  }
  return [...found].sort();
}

async function main(): Promise<void> {
  if (!hasGcsCredentials(REPO_ROOT)) {
    console.error("[upload-animal-visuals] GCS credentials required");
    process.exit(1);
  }

  const bucket = getGcsBucketName();
  const storage = buildGcsStorage(REPO_ROOT);
  const force = process.argv.includes("--force");
  const paths = collectHeroRealPaths();

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  const missingLocal: string[] = [];

  for (const gcsPath of paths) {
    const localPath = join(LOCAL_VISUAL, gcsPath);
    if (!existsSync(localPath)) {
      missingLocal.push(gcsPath);
      failed += 1;
      continue;
    }
    if (!force) {
      const onGcs = await gcsObjectExists(storage, bucket, gcsPath);
      if (onGcs) {
        skipped += 1;
        continue;
      }
    }
    const buf = readFileSync(localPath);
    try {
      await storage.bucket(bucket).file(gcsPath).save(buf, {
        contentType: "image/webp",
        metadata: { cacheControl: "public, max-age=31536000, immutable" },
      });
      uploaded += 1;
      if (uploaded % 25 === 0) console.log(`[upload] ${uploaded}…`);
    } catch (err) {
      failed += 1;
      console.error(`[fail] ${gcsPath}`, err);
    }
  }

  console.log(`\n=== Animal World hero-real → gs://${bucket}/ ===`);
  console.log(`Total paths: ${paths.length}`);
  console.log(`Uploaded: ${uploaded} · Skipped (on GCS): ${skipped} · Failed: ${failed}`);
  if (missingLocal.length) {
    console.log(`Missing local (${missingLocal.length}):`, missingLocal.slice(0, 10).join(", "));
  }
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
