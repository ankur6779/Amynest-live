/**
 * Upload missing CVC phonics-library assets from local audio-pack/phonics-word/*.mp3
 * and patch phonics-audio-map.json (kidschedule + api-server copies).
 *
 *   pnpm --filter @workspace/scripts exec tsx ./seed-missing-cvc-from-local-pack.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  catalogEntryToManifestAsset,
  getPhonicsCatalogKey,
  getPhonicsGcsObjectPath,
  type PhonicsAudioLibraryManifest,
} from "@workspace/phonics-sounds";
import { loadFullPhonicsCatalog } from "./phonics-audio-coverage.js";
import { buildStorage, getBucketName, uploadToGcs, verifyGcsUpload } from "./phonics-audio-gcs.js";
import {
  manifestAssetFromBuffer,
  REPO_ROOT,
  writePhonicsLibraryManifest,
} from "./phonics-library-io.js";

const LOCAL_PACK = join(REPO_ROOT, "artifacts/kidschedule/public/audio-pack/phonics-word");
const MANIFEST_PATH = join(REPO_ROOT, "artifacts/kidschedule/src/data/phonics-audio-map.json");

function isValidUrl(url: string | undefined): boolean {
  const u = (url ?? "").trim();
  return u.startsWith("https://") || u.startsWith("/api/phonics-library/phonics/");
}

async function main(): Promise<void> {
  const catalog = await loadFullPhonicsCatalog();
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as PhonicsAudioLibraryManifest;
  const storage = buildStorage();
  const bucket = getBucketName();

  const missing = catalog.filter((entry) => {
    const key = getPhonicsCatalogKey(entry.type, entry.id);
    return !isValidUrl(manifest.assets[key]?.url);
  });

  if (missing.length === 0) {
    console.log("[seed-missing-cvc] No missing catalog assets.");
    return;
  }

  console.log(`[seed-missing-cvc] ${missing.length} missing — uploading from local pack…`);
  let uploaded = 0;
  let failed = 0;

  for (const entry of missing) {
    const key = getPhonicsCatalogKey(entry.type, entry.id);
    const gcsPath = getPhonicsGcsObjectPath(entry.type, entry.id);
    const localPath = join(LOCAL_PACK, `${entry.id}.mp3`);

    if (!existsSync(localPath)) {
      console.error(`[fail] ${key}: no local file at ${localPath}`);
      failed += 1;
      continue;
    }

    const buf = readFileSync(localPath);
    if (buf.byteLength < 500) {
      console.error(`[fail] ${key}: local file too small (${buf.byteLength})`);
      failed += 1;
      continue;
    }

    try {
      await uploadToGcs(storage, bucket, gcsPath, buf);
      const ok = await verifyGcsUpload(storage, bucket, gcsPath);
      if (!ok) throw new Error("verify failed after upload");

      const base = catalogEntryToManifestAsset(entry, bucket, { gcsPath });
      manifest.assets[key] = manifestAssetFromBuffer(
        base,
        buf,
        "elevenlabs",
        Math.max(300, Math.round((buf.byteLength / 4000) * 1000)),
      );
      uploaded += 1;
      console.log(`[ok] ${key} → gs://${bucket}/${gcsPath} (${buf.byteLength}B)`);
    } catch (err) {
      failed += 1;
      console.error(`[fail] ${key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  manifest.assetCount = Object.keys(manifest.assets).length;
  manifest.generatedAt = new Date().toISOString();
  writePhonicsLibraryManifest(manifest);

  console.log(
    `[seed-missing-cvc] done uploaded=${uploaded} failed=${failed} assetCount=${manifest.assetCount}`,
  );
  if (failed > 0) process.exit(1);
}

void main();
