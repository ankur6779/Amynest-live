/**
 * Generate hero-real.webp (photographic) per animal from Wikimedia Commons.
 *   pnpm run generate:animal-world-real-heroes
 *   pnpm run generate:animal-world-real-heroes -- --only=cow,lion
 */
import { config } from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAllAnimals, getAnimalHeroRealGcsPath } from "@workspace/animal-world";
import { buildGcsStorage, gcsObjectExists, getGcsBucketName, hasGcsCredentials } from "./lib/gcs-storage.js";
import { findCommonsPhotoUrl, renderRealHeroWebp } from "./lib/animal-real-photo.js";

const REPO_ROOT = join(import.meta.dirname, "..");
const LOCAL_VISUAL = join(REPO_ROOT, "artifacts/kidschedule/public/world-visuals");
const ANIMALS_JSON = join(REPO_ROOT, "lib/animal-world/src/animals.json");

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.development`, override: true });
config({ path: `${REPO_ROOT}/Amynest-backend-dykj.env`, override: true });

const INTER_MS = Number(process.env.ANIMAL_REAL_PHOTO_INTER_MS ?? "2200");

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseOnly(argv: string[]): Set<string> | null {
  const arg = argv.find((a) => a.startsWith("--only="));
  if (!arg) return null;
  return new Set(arg.slice("--only=".length).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
}

async function main(): Promise<void> {
  if (!hasGcsCredentials(REPO_ROOT)) {
    console.error("[real-heroes] GCS credentials required");
    process.exit(1);
  }

  const only = parseOnly(process.argv);
  const force = process.argv.includes("--force");
  const bucket = getGcsBucketName();
  const storage = buildGcsStorage(REPO_ROOT);
  const animals = getAllAnimals().filter((a) => {
    if (only && !only.has(a.id)) return false;
    if (force) return true;
    const gcsPath = getAnimalHeroRealGcsPath(a.category, a.id);
    return !existsSync(join(LOCAL_VISUAL, gcsPath));
  });

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const animal of animals) {
    const gcsPath = getAnimalHeroRealGcsPath(animal.category, animal.id);
    const localFile = join(LOCAL_VISUAL, gcsPath);
    mkdirSync(dirname(localFile), { recursive: true });

    if (!force) {
      if (existsSync(localFile)) {
        skipped += 1;
        console.log(`[skip-local] ${gcsPath}`);
        continue;
      }
      if (await gcsObjectExists(storage, bucket, gcsPath)) {
        skipped += 1;
        console.log(`[skip-gcs] ${gcsPath}`);
        continue;
      }
    }

    try {
      const photoUrl = await findCommonsPhotoUrl(animal.name, animal.id);
      if (!photoUrl) throw new Error("no_commons_photo");
      console.log(`[fetch] ${animal.id} ← ${photoUrl.slice(0, 80)}…`);
      const webp = await renderRealHeroWebp(photoUrl);
      writeFileSync(localFile, webp);
      await storage.bucket(bucket).file(gcsPath).save(webp, {
        contentType: "image/webp",
        metadata: { cacheControl: "public, max-age=31536000, immutable" },
      });
      created += 1;
      console.log(`[ok] ${gcsPath} (${webp.length} bytes)`);
    } catch (err) {
      failed += 1;
      console.error(`[fail] ${animal.id}:`, err instanceof Error ? err.message : err);
    }

    await sleep(INTER_MS);
  }

  const catalog = JSON.parse(readFileSync(ANIMALS_JSON, "utf8")) as {
    animals: Array<{ id: string; heroRealGcsPath?: string; category: string }>;
  };
  for (const a of catalog.animals) {
    const animal = animals.find((x) => x.id === a.id);
    if (!animal) continue;
    a.heroRealGcsPath = getAnimalHeroRealGcsPath(animal.category, animal.id);
  }
  writeFileSync(ANIMALS_JSON, `${JSON.stringify(catalog, null, 2)}\n`);

  console.log(`\n=== Real animal heroes ===\ncreated=${created} skipped=${skipped} failed=${failed}`);
  if (failed > 0 && created === 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
