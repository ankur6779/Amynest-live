/**
 * Generate and upload missing phonics audio to GCS; update manifest automatically.
 *
 *   ELEVENLABS_API_KEY=... pnpm phonics:audio:generate-missing
 *   ELEVENLABS_API_KEY=... pnpm phonics:audio:generate-missing -- --force
 *
 * Production build env:
 *   PHONICS_GENERATION_RETRIES=3 PHONICS_NO_FALLBACK=1 PHONICS_AUDIO_CONCURRENCY=4
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  catalogEntryToManifestAsset,
  getPhonicsCatalogKey,
  getPhonicsGcsObjectPath,
  inventoryToCatalogEntries,
  type PhonicsInventoryItem,
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
  verifyGcsUpload,
  VOICE_ID,
  MODEL_ID,
} from "./phonics-audio-gcs.js";
import { manifestAssetFromBuffer, REPO_ROOT, writePhonicsLibraryManifest } from "./phonics-library-io.js";

const CONCURRENCY = Number(process.env.PHONICS_AUDIO_CONCURRENCY ?? "4");
const BATCH_SIZE = Number(process.env.PHONICS_AUDIO_BATCH_SIZE ?? "20");
const INTER_MS = Number(process.env.PHONICS_AUDIO_INTER_MS ?? "400");

type GenerationFailure = {
  catalogKey: string;
  speakText: string;
  gcsPath: string;
  stage: "synthesis" | "upload" | "verify";
  error: string;
};

type GenerationSuccess = {
  catalogKey: string;
  asset: ReturnType<typeof catalogEntryToManifestAsset>;
};

async function runPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function processItem(
  item: PhonicsInventoryItem,
  opts: {
    force: boolean;
    useFfmpeg: boolean;
    storage: ReturnType<typeof buildStorage>;
    bucket: string;
  },
): Promise<
  | { ok: true; skipped: boolean; success: GenerationSuccess }
  | { ok: false; failure: GenerationFailure }
> {
  const entry = inventoryToCatalogEntries([item])[0]!;
  const catalogKey = getPhonicsCatalogKey(entry.type, entry.id);
  const gcsPath = getPhonicsGcsObjectPath(entry.type, entry.id);

  if (!opts.force) {
    try {
      const exists = await verifyGcsUpload(opts.storage, opts.bucket, gcsPath);
      if (exists) {
        return {
          ok: true,
          skipped: true,
          success: {
            catalogKey,
            asset: catalogEntryToManifestAsset(entry, opts.bucket, { gcsPath }),
          },
        };
      }
    } catch {
      /* generate */
    }
  }

  try {
    const { buffer, durationMs, source } = await synthesizeCatalogEntry(entry, opts.useFfmpeg, {
      allowFallback: process.env.PHONICS_NO_FALLBACK !== "1",
    });
    await uploadToGcs(opts.storage, opts.bucket, gcsPath, buffer);
    const verified = await verifyGcsUpload(opts.storage, opts.bucket, gcsPath);
    if (!verified) {
      return {
        ok: false,
        failure: {
          catalogKey,
          speakText: entry.speakText,
          gcsPath,
          stage: "verify",
          error: "GCS object not found after upload",
        },
      };
    }
    const base = catalogEntryToManifestAsset(entry, opts.bucket, { gcsPath, durationMs });
    return {
      ok: true,
      skipped: false,
      success: {
        catalogKey,
        asset: manifestAssetFromBuffer(base, buffer, source, durationMs),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stage: GenerationFailure["stage"] = message.includes("upload") ? "upload" : "synthesis";
    return {
      ok: false,
      failure: {
        catalogKey,
        speakText: entry.speakText,
        gcsPath,
        stage,
        error: message,
      },
    };
  }
}

function writeFailureReport(failures: GenerationFailure[]): string {
  const path = join(REPO_ROOT, "artifacts/phonics-audio-build-failures.json");
  writeFileSync(path, `${JSON.stringify({ generatedAt: new Date().toISOString(), failures }, null, 2)}\n`, "utf8");
  return path;
}

function printBuildSummary(opts: {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  uploadFailures: number;
  manifestEntries: number;
  failures: GenerationFailure[];
}): void {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Phonics Audio Production Build Summary");
  console.log("═══════════════════════════════════════════════════\n");
  console.log(`  Total assets:        ${opts.total}`);
  console.log(`  Generated assets:  ${opts.created}`);
  console.log(`  Skipped (existing):  ${opts.skipped}`);
  console.log(`  Failed assets:       ${opts.failed}`);
  console.log(`  Upload failures:     ${opts.uploadFailures}`);
  console.log(`  Manifest entries:    ${opts.manifestEntries}`);
  if (opts.failures.length > 0) {
    console.log("\n── Failures (first 20) ──\n");
    for (const f of opts.failures.slice(0, 20)) {
      console.log(`  ${f.catalogKey} [${f.stage}] ${f.error}`);
    }
    if (opts.failures.length > 20) {
      console.log(`  … and ${opts.failures.length - 20} more`);
    }
  }
  console.log("");
}

async function rebuildManifestFromGcs(
  inventory: PhonicsInventoryItem[],
  storage: ReturnType<typeof buildStorage>,
  bucket: string,
): Promise<Record<string, ReturnType<typeof catalogEntryToManifestAsset>>> {
  const assets: Record<string, ReturnType<typeof catalogEntryToManifestAsset>> = {};
  for (const item of inventory) {
    const exists = await verifyGcsUpload(storage, bucket, item.gcsPath);
    if (!exists) continue;
    const entry = inventoryToCatalogEntries([item])[0]!;
    assets[item.catalogKey] = catalogEntryToManifestAsset(entry, bucket, { gcsPath: item.gcsPath });
  }
  return assets;
}

async function findAssetsNeedingGeneration(
  inventory: PhonicsInventoryItem[],
  force: boolean,
  storage: ReturnType<typeof buildStorage>,
  bucket: string,
): Promise<PhonicsInventoryItem[]> {
  if (force) return inventory;

  const manifest = await runPhonicsAudioAudit();
  const manifestMissing = new Set(manifest.missing.map((m) => m.catalogKey));
  const needsWork: PhonicsInventoryItem[] = [];

  for (const item of inventory) {
    if (manifestMissing.has(item.catalogKey)) {
      needsWork.push(item);
      continue;
    }
    const exists = await verifyGcsUpload(storage, bucket, item.gcsPath);
    if (!exists) needsWork.push(item);
  }

  return needsWork;
}

async function main(): Promise<void> {
  if (!readEnvApiKey()) {
    console.error("[phonics-audio:generate-missing] ELEVENLABS_API_KEY required");
    process.exit(1);
  }

  const force = process.argv.includes("--force");
  const inventory = await loadFullPhonicsInventory();
  const storage = buildStorage();
  const bucket = getBucketName();

  const verifiedAssets = await rebuildManifestFromGcs(inventory, storage, bucket);
  const cleaned = await mergeManifestWithInventory(verifiedAssets, { includePlaceholders: false });
  cleaned.voiceId = VOICE_ID;
  cleaned.modelId = MODEL_ID;
  writePhonicsLibraryManifest(cleaned);
  console.log(
    `[phonics-audio:generate-missing] manifest reset to ${cleaned.assetCount} GCS-verified assets`,
  );

  const before = await runPhonicsAudioAudit();
  const toGenerate = await findAssetsNeedingGeneration(inventory, force, storage, bucket);

  if (toGenerate.length === 0) {
    console.log("[phonics-audio:generate-missing] No missing assets — catalog complete.");
    printPhonicsAudioAuditReport(before);
    return;
  }

  const useFfmpeg = await resolveUseFfmpeg();
  const generatedAssets: Record<string, ReturnType<typeof catalogEntryToManifestAsset>> = {};
  let created = 0;
  let skipped = 0;
  const failures: GenerationFailure[] = [];

  console.log(
    `[phonics-audio:generate-missing] generating ${toGenerate.length} assets ` +
      `(concurrency=${CONCURRENCY}, batch=${BATCH_SIZE}, voice=${VOICE_ID}, model=${MODEL_ID})…`,
  );

  for (let offset = 0; offset < toGenerate.length; offset += BATCH_SIZE) {
    const batch = toGenerate.slice(offset, offset + BATCH_SIZE);
    const batchNum = Math.floor(offset / BATCH_SIZE) + 1;
    const batchTotal = Math.ceil(toGenerate.length / BATCH_SIZE);
    console.log(`\n[batch ${batchNum}/${batchTotal}] processing ${batch.length} assets…`);

    const results = await runPool(batch, CONCURRENCY, (item) =>
      processItem(item, { force, useFfmpeg, storage, bucket }),
    );

    let batchCreated = 0;
    let batchSkipped = 0;
    let batchFailed = 0;

    for (const result of results) {
      if (result.ok) {
        generatedAssets[result.success.catalogKey] = result.success.asset;
        if (result.skipped) {
          skipped += 1;
          batchSkipped += 1;
        } else {
          created += 1;
          batchCreated += 1;
        }
      } else {
        failures.push(result.failure);
        batchFailed += 1;
        console.warn(`[fail] ${result.failure.catalogKey}: ${result.failure.error}`);
      }
    }

    const manifest = await mergeManifestWithInventory(generatedAssets);
    manifest.voiceId = VOICE_ID;
    manifest.modelId = MODEL_ID;
    writePhonicsLibraryManifest(manifest);

    console.log(
      `[batch ${batchNum}/${batchTotal}] created=${batchCreated} skipped=${batchSkipped} failed=${batchFailed} manifest=${Object.keys(generatedAssets).length}`,
    );

    if (offset + BATCH_SIZE < toGenerate.length) {
      await sleep(INTER_MS);
    }
  }

  const uploadFailures = failures.filter((f) => f.stage === "upload" || f.stage === "verify").length;
  const failureReportPath = failures.length > 0 ? writeFailureReport(failures) : null;

  const finalGenerated = { ...generatedAssets };
  for (const item of inventory) {
    const exists = await verifyGcsUpload(storage, bucket, item.gcsPath);
    if (exists && !finalGenerated[item.catalogKey]) {
      const entry = inventoryToCatalogEntries([item])[0]!;
      finalGenerated[item.catalogKey] = catalogEntryToManifestAsset(entry, bucket, {
        gcsPath: item.gcsPath,
      });
    }
  }
  const finalManifest = await mergeManifestWithInventory(finalGenerated, { includePlaceholders: false });
  finalManifest.voiceId = VOICE_ID;
  finalManifest.modelId = MODEL_ID;
  writePhonicsLibraryManifest(finalManifest);

  const after = await runPhonicsAudioAudit({ verifyGcs: true });
  after.generatedThisRun = created;
  after.uploadStatus = failures.length === 0 ? "verified" : created > 0 ? "partial" : "skipped";

  printBuildSummary({
    total: inventory.length,
    created,
    skipped,
    failed: failures.length,
    uploadFailures,
    manifestEntries: finalManifest.assetCount,
    failures,
  });

  if (failureReportPath) {
    console.log(`[phonics-audio:generate-missing] failure report: ${failureReportPath}`);
  }

  printPhonicsAudioAuditReport(after, { verbose: process.argv.includes("--verbose") });

  if (after.verdict === "FAIL") process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
