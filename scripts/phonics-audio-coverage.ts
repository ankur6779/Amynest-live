/**
 * Shared phonics audio coverage — inventory, manifest compare, GCS verify, generation helpers.
 */
import { readFileSync, existsSync } from "node:fs";
import {
  buildFullPhonicsAudioCatalog,
  buildFullPhonicsAudioInventory,
  mergePhonicsInventory,
  buildCorePhonicsInventory,
  auditPhonicsInventoryAgainstManifest,
  inventoryToCatalogEntries,
  registerPhonicsAudioInventoryProvider,
  type PhonicsAudioAuditReport,
  type PhonicsInventoryItem,
  type PhonicsCatalogEntry,
  getPhonicsCatalogKey,
  catalogEntryToManifestAsset,
  PHONICS_LIBRARY_VERSION,
  type PhonicsAudioLibraryManifest,
} from "@workspace/phonics-sounds";
import {
  loadPhonicsLibraryManifest,
  PHONICS_LIBRARY_MANIFEST_PATHS,
  writePhonicsLibraryManifest,
  manifestAssetFromBuffer,
} from "./phonics-library-io.js";

export type PhonicsAudioCertificationResult = PhonicsAudioAuditReport & {
  verdict: "PASS" | "FAIL";
  generatedThisRun: number;
  uploadStatus: "verified" | "skipped" | "partial";
  gcsVerificationStatus: "pass" | "fail" | "skipped";
  blockers: string[];
};

let _kidscheduleRegistered = false;

export async function ensureKidscheduleInventoryRegistered(): Promise<void> {
  if (_kidscheduleRegistered) return;
  try {
    const mod = await import(
      "../artifacts/kidschedule/src/lib/phonics-audio-inventory-sources.ts"
    );
    registerPhonicsAudioInventoryProvider(mod.collectKidschedulePhonicsAudioInventory);
    _kidscheduleRegistered = true;
  } catch (err) {
    console.warn(
      "[phonics-audio] kidschedule inventory provider unavailable:",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function loadFullPhonicsInventory(): Promise<PhonicsInventoryItem[]> {
  await ensureKidscheduleInventoryRegistered();
  return buildFullPhonicsAudioInventory();
}

export async function loadFullPhonicsCatalog(): Promise<PhonicsCatalogEntry[]> {
  await ensureKidscheduleInventoryRegistered();
  return buildFullPhonicsAudioCatalog();
}

export function loadManifest(): PhonicsAudioLibraryManifest | null {
  return loadPhonicsLibraryManifest(PHONICS_LIBRARY_MANIFEST_PATHS[0]);
}

export async function runPhonicsAudioAudit(opts?: {
  verifyGcs?: boolean;
}): Promise<PhonicsAudioCertificationResult> {
  const inventory = await loadFullPhonicsInventory();
  const manifest = loadManifest();
  const report = auditPhonicsInventoryAgainstManifest(inventory, manifest?.assets);

  const blockers: string[] = [];
  if (report.audioMissing > 0) {
    blockers.push(`${report.audioMissing} assets missing from manifest`);
  }
  if (report.duplicateKeys.length > 0) {
    blockers.push(`${report.duplicateKeys.length} duplicate catalog keys`);
  }
  if (report.orphanKeys.length > 0) {
    blockers.push(`${report.orphanKeys.length} orphan manifest keys`);
  }
  if (report.coveragePct < 100) {
    blockers.push(`Audio coverage ${report.coveragePct}% (requires 100%)`);
  }
  if (report.runtimeTtsRequired > 0) {
    blockers.push(`Runtime TTS required for ${report.runtimeTtsRequired} assets`);
  }

  let gcsVerificationStatus: PhonicsAudioCertificationResult["gcsVerificationStatus"] = "skipped";
  if (opts?.verifyGcs && manifest?.bucket) {
    gcsVerificationStatus = await verifyGcsAssets(inventory, manifest, report)
      ? "pass"
      : "fail";
    if (gcsVerificationStatus === "fail") {
      blockers.push("GCS verification failed for one or more manifest assets");
    }
  }

  const verdict = blockers.length === 0 ? "PASS" : "FAIL";

  return {
    ...report,
    verdict,
    generatedThisRun: 0,
    uploadStatus: "skipped",
    gcsVerificationStatus,
    blockers,
  };
}

async function verifyGcsAssets(
  inventory: PhonicsInventoryItem[],
  manifest: PhonicsAudioLibraryManifest,
  report: PhonicsAudioAuditReport,
): Promise<boolean> {
  try {
    const { buildStorage, getBucketName } = await import("./phonics-audio-gcs.js");
    const storage = buildStorage();
    const bucket = manifest.bucket || getBucketName();
    let ok = true;
    for (const item of inventory) {
      const asset = manifest.assets[item.catalogKey];
      if (!asset?.gcsPath) continue;
      const [exists] = await storage.bucket(bucket).file(asset.gcsPath).exists();
      if (!exists) {
        console.warn(`[phonics-audio] GCS missing: ${asset.gcsPath}`);
        ok = false;
      }
    }
    if (!ok) report.runtimeTtsRequired += 1;
    return ok;
  } catch (err) {
    console.warn("[phonics-audio] GCS verify skipped:", err);
    return false;
  }
}

export function printPhonicsAudioAuditReport(
  result: PhonicsAudioCertificationResult,
  opts?: { verbose?: boolean },
): void {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Phonics Audio Coverage Audit");
  console.log("═══════════════════════════════════════════════════\n");
  console.log(`  Total assets:        ${result.totalAssets}`);
  console.log(`  Audio available:     ${result.audioAvailable}`);
  console.log(`  Audio missing:       ${result.audioMissing}`);
  console.log(`  Audio coverage:      ${result.coveragePct}%`);
  console.log(`  Generated this run:  ${result.generatedThisRun}`);
  console.log(`  Upload status:       ${result.uploadStatus}`);
  console.log(`  GCS verification:    ${result.gcsVerificationStatus}`);
  console.log(`  Runtime TTS required:${result.runtimeTtsRequired}`);
  console.log(`\n  Verdict: ${result.verdict}\n`);

  if (result.blockers.length > 0) {
    console.log("  Blockers:");
    for (const b of result.blockers) console.log(`    • ${b}`);
    console.log("");
  }

  if (result.missing.length > 0) {
    console.log("── Missing Audio ──\n");
    const show = opts?.verbose ? result.missing : result.missing.slice(0, 40);
    for (const m of show) {
      console.log(`  [${m.category}] ${m.item}`);
      console.log(`    source: ${m.sourceFile}`);
      console.log(`    key: ${m.catalogKey}`);
      console.log(`    gcs: ${m.gcsPath}`);
      console.log("");
    }
    if (!opts?.verbose && result.missing.length > 40) {
      console.log(`  … and ${result.missing.length - 40} more (use --verbose)\n`);
    }
  }

  if (result.duplicateKeys.length > 0) {
    console.log("── Duplicate keys ──");
    console.log(`  ${result.duplicateKeys.slice(0, 20).join(", ")}\n`);
  }

  if (result.orphanKeys.length > 0) {
    console.log("── Orphan manifest keys ──");
    console.log(`  ${result.orphanKeys.slice(0, 20).join(", ")}\n`);
  }
}

export async function mergeManifestWithInventory(
  generatedAssets: PhonicsAudioLibraryManifest["assets"],
  opts?: { includePlaceholders?: boolean },
): Promise<PhonicsAudioLibraryManifest> {
  const prior = loadManifest();
  const inventory = await loadFullPhonicsInventory();
  const bucket =
    prior?.bucket ??
    process.env.GCS_BUCKET_NAME?.trim() ??
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim() ??
    "amynest-audio-storage";

  const assets: PhonicsAudioLibraryManifest["assets"] = {
    ...generatedAssets,
  };

  if (opts?.includePlaceholders) {
    for (const item of inventory) {
      if (!assets[item.catalogKey]) {
        const entry = inventoryToCatalogEntries([item])[0]!;
        assets[item.catalogKey] = catalogEntryToManifestAsset(entry, bucket);
      }
    }
  }

  return {
    version: 1,
    libraryVersion: PHONICS_LIBRARY_VERSION,
    generatedAt: new Date().toISOString(),
    bucket,
    baseUrl: "",
    voiceId: prior?.voiceId ?? "",
    modelId: prior?.modelId ?? "",
    assetCount: Object.keys(assets).length,
    assets,
  };
}
