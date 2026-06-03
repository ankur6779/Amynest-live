/**
 * Validates locally generated Discovery Worlds MP3 files (duration, headers).
 * Run after: pnpm run generate:discovery-worlds-audio
 *
 *   node --import tsx/esm scripts/validate-discovery-worlds-audio-local.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateAnimalWorldMp3Buffer } from "@workspace/animal-world";
import { getVehicleWorldManifest } from "@workspace/vehicle-world";
import { getNatureWorldManifest } from "@workspace/nature-sounds-world";
import { getHomeSoundsManifest } from "@workspace/home-sounds-world";
import { getInstrumentWorldManifest } from "@workspace/instrument-world";
import type { WorldManifest } from "@workspace/world-engine";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const LOCAL_ROOT = join(root, "artifacts/kidschedule/public/discovery-worlds-audio");

const manifests: WorldManifest[] = [
  getVehicleWorldManifest(),
  getNatureWorldManifest(),
  getHomeSoundsManifest(),
  getInstrumentWorldManifest(),
];

let missing = 0;
let invalid = 0;
let ok = 0;

for (const manifest of manifests) {
  console.log(`\n=== ${manifest.worldId} ===`);
  for (const item of manifest.items) {
    const paths = new Set<string>();
    for (const sound of item.sounds) paths.add(sound.gcsPath);
    if (item.narration?.introGcsPath) paths.add(item.narration.introGcsPath);
    if (item.narration?.soundCueGcsPath) paths.add(item.narration.soundCueGcsPath);

    for (const gcsPath of paths) {
      const local =
        [join(LOCAL_ROOT, gcsPath), join(LOCAL_ROOT, "..", "animal-world-audio", gcsPath.replace(/^animal-world\//, ""))]
          .map((p) => p)
          .find((p) => existsSync(p)) ?? join(LOCAL_ROOT, gcsPath);
      if (!existsSync(local)) {
        missing += 1;
        console.log(`  [missing] ${gcsPath}`);
        continue;
      }
      const buf = readFileSync(local);
      const result = validateAnimalWorldMp3Buffer(new Uint8Array(buf));
      if (!result.ok) {
        invalid += 1;
        console.log(`  [invalid] ${gcsPath} — ${result.reason ?? "bad_mp3"}`);
        continue;
      }
      ok += 1;
    }
  }
}

console.log(`\nSummary: ${ok} valid, ${missing} missing, ${invalid} invalid`);
console.log(`Local root: ${LOCAL_ROOT}`);

if (missing > 0 || invalid > 0) {
  console.log("\nRun pnpm run generate:discovery-worlds-audio to fill missing assets.");
  process.exit(1);
}

process.exit(0);
