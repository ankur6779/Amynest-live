/**
 * Visual Asset Completion Tracker — hero/card/thumbnail per catalog item.
 * Run: pnpm run report:discovery-worlds-assets
 *
 * Writes:
 *   artifacts/kidschedule/public/discovery-worlds-coverage.json
 *   artifacts/kidschedule/public/discovery-worlds-visual-upload-manifest.json
 *
 * Exit 0 when coverage >= 95% (production GCS when credentials available).
 */
import { config } from "dotenv";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAllAnimals } from "@workspace/animal-world";
import { getVehicleWorldManifest } from "@workspace/vehicle-world";
import { getNatureWorldManifest } from "@workspace/nature-sounds-world";
import { getHomeSoundsManifest } from "@workspace/home-sounds-world";
import { getInstrumentWorldManifest } from "@workspace/instrument-world";
import {
  buildAssetCoverageReport,
  expectedVisualAssetsForManifest,
  type AssetCoverageReport,
  type ExpectedVisualAsset,
} from "@workspace/world-engine";
import {
  buildGcsStorage,
  gcsObjectExists,
  getGcsBucketName,
  hasGcsCredentials,
} from "./lib/gcs-storage.js";

const COVERAGE_GATE_PCT = Number(process.env.DISCOVERY_WORLDS_VISUAL_GATE_PCT ?? "95");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_VISUAL = join(root, "artifacts/kidschedule/public/world-visuals");
const OUT_JSON = join(root, "artifacts/kidschedule/public/discovery-worlds-coverage.json");
const OUT_MANIFEST = join(
  root,
  "artifacts/kidschedule/public/discovery-worlds-visual-upload-manifest.json",
);

config({ path: `${root}/.env` });
config({ path: `${root}/.env.development`, override: true });
config({ path: `${root}/Amynest-backend-dykj.env`, override: true });

function localExists(gcsPath: string): boolean {
  return existsSync(join(LOCAL_VISUAL, gcsPath));
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

const WORLDS = [
  { worldId: "animal_world", label: "Animal World (flagship)", manifest: animalManifestAdapter() },
  { worldId: "vehicle_world", label: "Vehicles", manifest: getVehicleWorldManifest() },
  { worldId: "nature_world", label: "Nature", manifest: getNatureWorldManifest() },
  { worldId: "home_sounds_world", label: "Home", manifest: getHomeSoundsManifest() },
  { worldId: "instrument_world", label: "Instruments", manifest: getInstrumentWorldManifest() },
];

type ManifestEntry = {
  gcsPath: string;
  kind: ExpectedVisualAsset["kind"];
  itemId: string;
  itemName: string;
  worldId: string;
  worldLabel: string;
  local: boolean;
  gcs: boolean;
  present: boolean;
};

async function main(): Promise<void> {
  const bucketId = getGcsBucketName();
  const useGcs = hasGcsCredentials(root) && process.env.SKIP_GCS_ASSET_CHECK !== "1";
  const storage = useGcs ? buildGcsStorage(root) : null;

  const manifestEntries: ManifestEntry[] = [];
  const gcsCache = new Map<string, boolean>();

  for (const w of WORLDS) {
    for (const asset of expectedVisualAssetsForManifest(w.manifest)) {
      const local = localExists(asset.gcsPath);
      let gcs = false;
      if (storage) {
        if (gcsCache.has(asset.gcsPath)) {
          gcs = gcsCache.get(asset.gcsPath)!;
        } else {
          gcs = await gcsObjectExists(storage, bucketId, asset.gcsPath);
          gcsCache.set(asset.gcsPath, gcs);
        }
      }
      const present = local || gcs;
      manifestEntries.push({
        gcsPath: asset.gcsPath,
        kind: asset.kind,
        itemId: asset.itemId,
        itemName: asset.itemName,
        worldId: w.worldId,
        worldLabel: w.label,
        local,
        gcs,
        present,
      });
    }
  }

  const existsFn = (gcsPath: string) => manifestEntries.find((e) => e.gcsPath === gcsPath)?.present ?? false;
  const report: AssetCoverageReport = buildAssetCoverageReport({
    worlds: WORLDS,
    exists: existsFn,
  });

  const gcsPresent = manifestEntries.filter((e) => e.gcs).length;
  const localPresent = manifestEntries.filter((e) => e.local).length;
  const missingEntries = manifestEntries.filter((e) => !e.present);
  const missingGcsOnly = manifestEntries.filter((e) => e.local && !e.gcs);
  const missingByKind = {
    hero: missingEntries.filter((e) => e.kind === "hero").length,
    card: missingEntries.filter((e) => e.kind === "card").length,
    thumbnail: missingEntries.filter((e) => e.kind === "thumbnail").length,
  };

  const criticalBlockers: string[] = [];
  if (report.coveragePct < COVERAGE_GATE_PCT) {
    criticalBlockers.push(
      `Visual coverage ${report.coveragePct}% is below ${COVERAGE_GATE_PCT}% gate (${report.presentAssets}/${report.totalAssets})`,
    );
  }
  if (useGcs && gcsPresent < report.totalAssets * (COVERAGE_GATE_PCT / 100)) {
    criticalBlockers.push(
      `Production GCS: ${gcsPresent}/${report.totalAssets} (${Math.round((gcsPresent / report.totalAssets) * 100)}%) — run pnpm run upload:discovery-worlds-visuals`,
    );
  }
  for (const w of report.worlds) {
    if (w.coveragePct < COVERAGE_GATE_PCT) {
      criticalBlockers.push(`${w.label}: ${w.coveragePct}% (${w.presentAssets}/${w.totalAssets})`);
    }
  }

  const mode = useGcs ? `production:gcs:${bucketId}+local` : "local-only";

  const payload = {
    mode,
    coverageGatePct: COVERAGE_GATE_PCT,
    gcsPresent,
    localPresent,
    missingByKind,
    criticalBlockers,
    missingPaths: missingEntries.map((e) => e.gcsPath),
    missingSample: missingEntries.slice(0, 50).map((e) => ({
      path: e.gcsPath,
      kind: e.kind,
      itemId: e.itemId,
      worldId: e.worldId,
      local: e.local,
      gcs: e.gcs,
    })),
    uploadPendingGcs: missingGcsOnly.map((e) => e.gcsPath),
    ...report,
  };

  writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  writeFileSync(
    OUT_MANIFEST,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        bucket: bucketId,
        totalAssets: report.totalAssets,
        entries: manifestEntries,
        uploadPending: missingGcsOnly.map((e) => ({
          gcsPath: e.gcsPath,
          localPath: join(LOCAL_VISUAL, e.gcsPath),
          kind: e.kind,
          itemId: e.itemId,
        })),
      },
      null,
      2,
    )}\n`,
  );

  console.log("\n=== Visual Asset Completion Tracker ===\n");
  console.log(`Mode: ${mode}`);
  console.log(`Gate: ${COVERAGE_GATE_PCT}%+`);
  console.log(`Total: ${report.totalAssets} | Present: ${report.presentAssets} | Missing: ${report.missingAssets}`);
  console.log(`Coverage: ${report.coveragePct}%`);
  console.log(`  Local mirror: ${localPresent} | GCS production: ${useGcs ? gcsPresent : "n/a (no creds)"}`);
  console.log(`  Missing by kind: hero ${missingByKind.hero}, card ${missingByKind.card}, thumb ${missingByKind.thumbnail}`);
  if (missingGcsOnly.length) {
    console.log(`  Pending GCS upload (local ready): ${missingGcsOnly.length}`);
  }
  console.log("");
  for (const w of report.worlds) {
    const status = w.coveragePct >= COVERAGE_GATE_PCT ? "✓" : "✗";
    console.log(`  ${status} ${w.label}: ${w.coveragePct}% (${w.presentAssets}/${w.totalAssets})`);
    if (w.missingPaths.length) {
      for (const p of w.missingPaths.slice(0, 3)) console.log(`      missing: ${p}`);
    }
  }
  if (criticalBlockers.length) {
    console.log("\nCritical blockers:");
    for (const b of criticalBlockers) console.log(`  ✗ ${b}`);
  } else {
    console.log(`\n✓ Visual gate passed (>= ${COVERAGE_GATE_PCT}%)`);
  }
  console.log(`\nWrote ${OUT_JSON}`);
  console.log(`Wrote ${OUT_MANIFEST}`);

  if (report.coveragePct < COVERAGE_GATE_PCT) process.exit(1);
  if (useGcs && gcsPresent < Math.ceil((report.totalAssets * COVERAGE_GATE_PCT) / 100)) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
