/**
 * Build spelling-audio-manifest.json from the spelling catalog (deterministic GCS URLs).
 * Does not call OpenAI — run generate:spelling-audio to upload MP3s.
 *
 *   pnpm run build:spelling-audio-manifest
 */
import { buildSpellingAudioManifestFromCatalog } from "@workspace/spelling-audio";
import {
  loadSpellingAudioManifest,
  REPO_ROOT,
  writeSpellingAudioManifest,
} from "./spelling-audio-io.js";

function getBucketName(): string {
  return (
    process.env.GCS_BUCKET_NAME?.trim() ||
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim() ||
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET?.trim() ||
    "amynest-audio-storage"
  );
}

function main(): void {
  const bucket = getBucketName();
  const existing = loadSpellingAudioManifest();
  const manifest = buildSpellingAudioManifestFromCatalog(bucket, { existing });
  writeSpellingAudioManifest(manifest);
  console.log(
    `[build:spelling-audio-manifest] wrote ${manifest.meta.catalogEntryCount} entries (${manifest.meta.uniqueWordCount} unique words) → gs://${bucket}/spelling/${manifest.meta.version}/`,
  );
  console.log(`[build:spelling-audio-manifest] paths:`);
  console.log(`  ${REPO_ROOT}/artifacts/kidschedule/src/data/spelling-audio-manifest.json`);
}

main();
