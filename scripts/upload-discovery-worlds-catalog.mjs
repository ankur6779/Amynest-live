#!/usr/bin/env node
/**
 * Upload discovery world manifest.json files to GCS and emit signed URLs for audio assets.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Storage } from "@google-cloud/storage";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bucketId =
  process.env.GCS_BUCKET_NAME?.trim() ||
  process.env.GCS_BUCKET?.trim() ||
  process.env.GCS_BUCKET_ID?.trim();

if (!bucketId) {
  console.error("Set GCS_BUCKET_NAME or GCS_BUCKET");
  process.exit(1);
}

const storage = new Storage();
const TTL_MS = Number(process.env.DISCOVERY_WORLDS_SIGNED_URL_TTL_MS ?? String(7 * 24 * 60 * 60 * 1000));

const manifests = [
  { local: "lib/vehicle-world/src/manifest.json", gcs: "worlds/vehicles/manifest.json" },
  { local: "lib/nature-sounds-world/src/manifest.json", gcs: "worlds/nature/manifest.json" },
  { local: "lib/home-sounds-world/src/manifest.json", gcs: "worlds/home/manifest.json" },
  { local: "lib/instrument-world/src/manifest.json", gcs: "worlds/instruments/manifest.json" },
];

const signed = {};

for (const { local, gcs } of manifests) {
  const body = readFileSync(join(root, local));
  await storage.bucket(bucketId).file(gcs).save(body, {
    contentType: "application/json",
    metadata: { cacheControl: "public, max-age=3600" },
  });
  console.log(`Uploaded gs://${bucketId}/${gcs}`);

  const manifest = JSON.parse(body.toString());
  for (const item of manifest.items ?? []) {
    for (const sound of item.sounds ?? []) {
      const path = sound.gcsPath;
      try {
        const [exists] = await storage.bucket(bucketId).file(path).exists();
        if (!exists) continue;
        const [url] = await storage.bucket(bucketId).file(path).getSignedUrl({
          version: "v4",
          action: "read",
          expires: Date.now() + TTL_MS,
        });
        signed[path] = { signedUrl: url, proxyUrl: `/api/worlds-library/${path}` };
      } catch {
        /* skip */
      }
    }
  }
}

const outPath = join(root, "lib/world-engine/src/discovery-worlds-signed-urls.json");
writeFileSync(
  outPath,
  JSON.stringify({ bucket: bucketId, generatedAt: new Date().toISOString(), assets: signed }, null, 2),
);
console.log(`Wrote ${outPath} (${Object.keys(signed).length} signed URLs)`);
