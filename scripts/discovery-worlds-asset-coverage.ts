/**
 * Asset Coverage Dashboard — visual assets (hero/card/thumbnail) across all worlds.
 * Run: node --import tsx/esm scripts/discovery-worlds-asset-coverage.ts
 * Optional: GCS_BUCKET_NAME + credentials to check remote objects.
 */
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAllAnimals } from "@workspace/animal-world";
import { getVehicleWorldManifest } from "@workspace/vehicle-world";
import { getNatureWorldManifest } from "@workspace/nature-sounds-world";
import { getHomeSoundsManifest } from "@workspace/home-sounds-world";
import { getInstrumentWorldManifest } from "@workspace/instrument-world";
import { buildAssetCoverageReport, type AssetCoverageReport } from "@workspace/world-engine";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_DISCOVERY = join(root, "artifacts/kidschedule/public/discovery-worlds-audio");
const LOCAL_ANIMAL = join(root, "artifacts/kidschedule/public/animal-world-audio");
const OUT_JSON = join(root, "artifacts/kidschedule/public/discovery-worlds-coverage.json");

function localExists(gcsPath: string): boolean {
  const candidates = [
    join(LOCAL_DISCOVERY, gcsPath),
    join(LOCAL_ANIMAL, gcsPath.replace(/^animal-world\//, "")),
    join(LOCAL_ANIMAL, gcsPath),
  ];
  return candidates.some((p) => existsSync(p));
}

async function gcsExists(gcsPath: string, bucket: import("@google-cloud/storage").Storage, bucketId: string): Promise<boolean> {
  try {
    const [ok] = await bucket.file(gcsPath).exists();
    return ok;
  } catch {
    return false;
  }
}

function animalManifestAdapter() {
  const items = getAllAnimals().map((a) => {
    const base = a.imageGcsPath.replace(/\/?hero\.webp$/i, "");
    return {
      id: a.id,
      name: a.name,
      category: a.category,
      emoji: a.emoji,
      imageGcsPath: a.imageGcsPath,
      heroRealGcsPath: a.heroRealGcsPath ?? a.imageGcsPath,
      heroCartoonGcsPath: a.heroCartoonGcsPath ?? `${base}/card.webp`,
      funFact: a.funFact,
      quizSoundId: a.quizSoundId,
      quizPrompt: a.quizPrompt,
      narration: a.narration,
      sounds: a.sounds.map((s) => ({
        id: s.id,
        label: s.label,
        gcsPath: s.gcsPath,
        durationSec: s.durationSec,
        waveform: s.waveform,
      })),
    };
  });
  return {
    version: 1 as const,
    worldId: "animal_world" as const,
    categories: [],
    items,
  };
}

async function main(): Promise<void> {
  const bucketId =
    process.env.GCS_BUCKET_NAME?.trim() ||
    process.env.GCS_BUCKET?.trim() ||
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim();

  let existsFn: (path: string) => boolean = localExists;
  let mode = "local";

  if (bucketId && process.env.SKIP_GCS_ASSET_CHECK !== "1") {
    try {
      const { Storage } = await import("@google-cloud/storage");
      const storage = new Storage();
      const bucket = storage.bucket(bucketId);
      const cache = new Map<string, boolean>();
      existsFn = (path: string) => {
        if (cache.has(path)) return cache.get(path)!;
        return localExists(path);
      };
      const worlds = [
        { worldId: "animal_world", label: "Animal World", manifest: animalManifestAdapter() },
        { worldId: "vehicle_world", label: "Vehicles", manifest: getVehicleWorldManifest() },
        { worldId: "nature_world", label: "Nature", manifest: getNatureWorldManifest() },
        { worldId: "home_sounds_world", label: "Home", manifest: getHomeSoundsManifest() },
        { worldId: "instrument_world", label: "Instruments", manifest: getInstrumentWorldManifest() },
      ];
      for (const w of worlds) {
        const { expectedVisualAssetsForManifest } = await import("@workspace/world-engine");
        for (const asset of expectedVisualAssetsForManifest(w.manifest)) {
          if (localExists(asset.gcsPath)) {
            cache.set(asset.gcsPath, true);
            continue;
          }
          cache.set(asset.gcsPath, await gcsExists(asset.gcsPath, storage, bucketId));
        }
      }
      existsFn = (path: string) => cache.get(path) ?? localExists(path);
      mode = `gcs:${bucketId}+local`;
    } catch (e) {
      console.warn("[asset-coverage] GCS check skipped:", e);
    }
  }

  const report: AssetCoverageReport = buildAssetCoverageReport({
    worlds: [
      { worldId: "animal_world", label: "Animal World (flagship)", manifest: animalManifestAdapter() },
      { worldId: "vehicle_world", label: "Vehicles", manifest: getVehicleWorldManifest() },
      { worldId: "nature_world", label: "Nature", manifest: getNatureWorldManifest() },
      { worldId: "home_sounds_world", label: "Home", manifest: getHomeSoundsManifest() },
      { worldId: "instrument_world", label: "Instruments", manifest: getInstrumentWorldManifest() },
    ],
    exists: existsFn,
  });

  const payload = { mode, ...report };
  writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  console.log("\n=== Asset Coverage Dashboard ===\n");
  console.log(`Mode: ${mode}`);
  console.log(`Total assets: ${report.totalAssets}`);
  console.log(`Present: ${report.presentAssets} | Missing: ${report.missingAssets}`);
  console.log(`Coverage: ${report.coveragePct}%\n`);
  for (const w of report.worlds) {
    console.log(
      `  ${w.label}: ${w.coveragePct}% (${w.presentAssets}/${w.totalAssets}) · ${w.itemCount} items`,
    );
  }
  if (report.blockers.length) {
    console.log("\nBlockers:");
    for (const b of report.blockers) console.log(`  ✗ ${b}`);
  } else {
    console.log("\n✓ No blockers — 100% visual coverage");
  }
  console.log(`\nWrote ${OUT_JSON}`);

  if (report.missingAssets > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
