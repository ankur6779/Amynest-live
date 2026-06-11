/**
 * Generate and upload missing phonics audio to GCS; update manifest automatically.
 *
 *   ELEVENLABS_API_KEY=... pnpm phonics:audio:generate-missing
 *   ELEVENLABS_API_KEY=... pnpm phonics:audio:generate-missing -- --force
 */
import {
  catalogEntryToManifestAsset,
  getPhonicsCatalogKey,
  getPhonicsGcsObjectPath,
  inventoryToCatalogEntries,
} from "@workspace/phonics-sounds";
import {
  loadFullPhonicsInventory,
  mergeManifestWithInventory,
  runPhonicsAudioAudit,
  printPhonicsAudioAuditReport,
} from "./phonics-audio-coverage.js";
import {
  buildStorage,
  getBucketName,
  readEnvApiKey,
  resolveUseFfmpeg,
  sleep,
  synthesizeCatalogEntry,
  uploadToGcs,
  VOICE_ID,
  MODEL_ID,
} from "./phonics-audio-gcs.js";
import { manifestAssetFromBuffer, writePhonicsLibraryManifest } from "./phonics-library-io.js";

async function main(): Promise<void> {
  if (!readEnvApiKey()) {
    console.error("[phonics-audio:generate-missing] ELEVENLABS_API_KEY required");
    process.exit(1);
  }

  const force = process.argv.includes("--force");
  const before = await runPhonicsAudioAudit();
  const inventory = await loadFullPhonicsInventory();
  const missingKeys = new Set(before.missing.map((m) => m.catalogKey));
  const toGenerate = force
    ? inventory
    : inventory.filter((item) => missingKeys.has(item.catalogKey));

  if (toGenerate.length === 0) {
    console.log("[phonics-audio:generate-missing] No missing assets — catalog complete.");
    printPhonicsAudioAuditReport(before);
    return;
  }

  const useFfmpeg = await resolveUseFfmpeg();
  const storage = buildStorage();
  const bucket = getBucketName();
  const generatedAssets: Record<string, ReturnType<typeof catalogEntryToManifestAsset>> = {};
  let created = 0;
  let skipped = 0;

  console.log(`[phonics-audio:generate-missing] generating ${toGenerate.length} assets…`);

  for (const item of toGenerate) {
    const entry = inventoryToCatalogEntries([item])[0]!;
    const catalogKey = getPhonicsCatalogKey(entry.type, entry.id);
    const gcsPath = getPhonicsGcsObjectPath(entry.type, entry.id);

    if (!force) {
      try {
        const [exists] = await storage.bucket(bucket).file(gcsPath).exists();
        if (exists) {
          skipped += 1;
          generatedAssets[catalogKey] = catalogEntryToManifestAsset(entry, bucket, { gcsPath });
          continue;
        }
      } catch {
        /* generate */
      }
    }

    console.log(`[phonics-audio:generate-missing] ${catalogKey} "${entry.speakText}"`);
    const { buffer, durationMs, source } = await synthesizeCatalogEntry(entry, useFfmpeg);
    const url = await uploadToGcs(storage, bucket, gcsPath, buffer);
    const base = catalogEntryToManifestAsset(entry, bucket, { url, gcsPath, durationMs });
    generatedAssets[catalogKey] = manifestAssetFromBuffer(base, buffer, source, durationMs);
    created += 1;
    await sleep(Number(process.env.PHONICS_AUDIO_INTER_MS ?? "400"));
  }

  const manifest = await mergeManifestWithInventory(generatedAssets);
  manifest.voiceId = VOICE_ID;
  manifest.modelId = MODEL_ID;
  writePhonicsLibraryManifest(manifest);

  const after = await runPhonicsAudioAudit({ verifyGcs: process.argv.includes("--verify-gcs") });
  after.generatedThisRun = created;
  after.uploadStatus = created > 0 ? "verified" : skipped > 0 ? "partial" : "skipped";

  console.log(`\n[phonics-audio:generate-missing] created=${created} skipped=${skipped}`);
  printPhonicsAudioAuditReport(after, { verbose: process.argv.includes("--verbose") });

  if (after.verdict === "FAIL") process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
