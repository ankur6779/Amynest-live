#!/usr/bin/env node
/**
 * Upload Animal World catalog metadata to GCS.
 * Audio/image assets should be placed under animal-world/{category}/{animalId}/
 * before running this script.
 *
 * Usage:
 *   GCS_BUCKET=your-bucket node scripts/upload-animal-world-catalog.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Storage } from "@google-cloud/storage";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(root, "lib/animal-world/src/animals.json");
const bucketId = process.env.GCS_BUCKET ?? process.env.GCS_BUCKET_ID;

if (!bucketId) {
  console.error("Set GCS_BUCKET or GCS_BUCKET_ID");
  process.exit(1);
}

const storage = new Storage();
const body = readFileSync(catalogPath);
await storage.bucket(bucketId).file("animal-world/animals.json").save(body, {
  contentType: "application/json",
  metadata: { cacheControl: "public, max-age=3600" },
});

console.log(`Uploaded animal-world/animals.json to gs://${bucketId}/animal-world/animals.json`);
