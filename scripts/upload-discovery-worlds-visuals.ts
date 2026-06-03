/**
 * Upload local world-visuals mirror to GCS (no regeneration).
 *   pnpm run upload:discovery-worlds-visuals
 */
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildGcsStorage,
  gcsObjectExists,
  getGcsBucketName,
  hasGcsCredentials,
} from "./lib/gcs-storage.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_VISUAL = join(REPO_ROOT, "artifacts/kidschedule/public/world-visuals");
const MANIFEST = join(
  REPO_ROOT,
  "artifacts/kidschedule/public/discovery-worlds-visual-upload-manifest.json",
);

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.development`, override: true });
config({ path: `${REPO_ROOT}/Amynest-backend-dykj.env`, override: true });

async function main(): Promise<void> {
  if (!hasGcsCredentials(REPO_ROOT)) {
    console.error("[upload-visuals] GCS credentials required (GCS_SERVICE_ACCOUNT_JSON or Amynest-backend-dykj.env)");
    process.exit(1);
  }
  if (!existsSync(MANIFEST)) {
    console.error("[upload-visuals] Run report:discovery-worlds-assets first to build manifest");
    process.exit(1);
  }

  const { entries } = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
    entries: Array<{ gcsPath: string; local: boolean; gcs: boolean }>;
  };

  const bucket = getGcsBucketName();
  const storage = buildGcsStorage(REPO_ROOT);
  const force = process.argv.includes("--force");

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of entries) {
    const localPath = join(LOCAL_VISUAL, entry.gcsPath);
    if (!existsSync(localPath)) {
      failed += 1;
      console.error(`[missing-local] ${entry.gcsPath}`);
      continue;
    }
    if (!force) {
      const onGcs = await gcsObjectExists(storage, bucket, entry.gcsPath);
      if (onGcs) {
        skipped += 1;
        continue;
      }
    }
    const buf = readFileSync(localPath);
    try {
      await storage.bucket(bucket).file(entry.gcsPath).save(buf, {
        contentType: "image/webp",
        metadata: { cacheControl: "public, max-age=31536000, immutable" },
      });
      uploaded += 1;
      if (uploaded % 50 === 0) console.log(`[upload] ${uploaded} files…`);
    } catch (err) {
      failed += 1;
      console.error(`[fail] ${entry.gcsPath}`, err);
    }
  }

  console.log(`\n=== Upload Visuals → gs://${bucket}/ ===`);
  console.log(`Uploaded: ${uploaded} · Skipped (on GCS): ${skipped} · Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
