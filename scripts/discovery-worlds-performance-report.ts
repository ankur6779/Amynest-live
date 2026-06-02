/**
 * Discovery Worlds performance & content readiness report (stdout).
 * Run: node --import tsx/esm scripts/discovery-worlds-performance-report.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  diagnoseWorldManifest,
  manifestDiagnosticsSummary,
  type WorldManifest,
} from "@workspace/world-engine";
import { getVehicleWorldManifest } from "@workspace/vehicle-world";
import { getNatureWorldManifest } from "@workspace/nature-sounds-world";
import { getHomeSoundsManifest } from "@workspace/home-sounds-world";
import { getInstrumentWorldManifest } from "@workspace/instrument-world";

const root = join(fileURLToPath(import.meta.url), "..");

const TARGETS: Record<string, number> = {
  vehicle_world: 25,
  nature_world: 20,
  home_sounds_world: 20,
  instrument_world: 20,
};

const manifests = [
  { label: "vehicles", manifest: getVehicleWorldManifest() },
  { label: "nature", manifest: getNatureWorldManifest() },
  { label: "home", manifest: getHomeSoundsManifest() },
  { label: "instruments", manifest: getInstrumentWorldManifest() },
];

console.log("=== Discovery Worlds Performance & Content Report ===\n");

let exitCode = 0;

for (const { label, manifest } of manifests) {
  const issues = diagnoseWorldManifest(manifest);
  const summary = manifestDiagnosticsSummary(issues);
  const target = TARGETS[manifest.worldId] ?? 0;
  const count = manifest.items.length;
  const met = count >= target;

  console.log(`## ${label} (${manifest.worldId})`);
  console.log(`  Items: ${count} (target ${target}) ${met ? "✓" : "✗"}`);
  console.log(`  Categories: ${manifest.categories.length} (all populated: ${issues.filter((i) => i.code === "empty_category").length === 0 ? "yes" : "no"})`);
  console.log(`  Diagnostics: ${summary.errors} errors, ${summary.warnings} warnings`);

  const withHero = manifest.items.filter((i) => i.imageGcsPath.endsWith("hero.webp")).length;
  const withCard = manifest.items.filter((i) => i.heroCartoonGcsPath?.endsWith("card.webp")).length;
  console.log(`  Visual paths: ${withHero}/${count} hero.webp, ${withCard}/${count} card.webp refs`);
  console.log(`  CLS: grid cards use fixed ${320}x${400} slots in world-visual-assets.ts`);
  console.log(`  Preload: first 8 items card+thumbnail+hero + primary sound per world open\n`);

  if (!met || !summary.ok) exitCode = 1;
}

console.log("## Runtime recommendations");
console.log("  - Upload hero.webp, thumbnail.webp, card.webp per item folder to GCS");
console.log("  - Run generate:discovery-worlds-audio for MP3 assets");
console.log("  - Lighthouse: test /discovery-worlds and /worlds/vehicles with throttling off");
console.log("  - Audio: discovery-world-audio-manager dedupes in-flight play by URL");

process.exit(exitCode);
