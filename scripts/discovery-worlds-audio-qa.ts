/**
 * Audio Library QA Dashboard — missing, duplicate hash, duration anomalies.
 * Run: node --import tsx/esm scripts/discovery-worlds-audio-qa.ts
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateAnimalWorldMp3Buffer, estimateMp3DurationMs } from "@workspace/animal-world";
import { collectAnimalWorldAudioJobs, getAllAnimals } from "@workspace/animal-world";
import { getVehicleWorldManifest } from "@workspace/vehicle-world";
import { getNatureWorldManifest } from "@workspace/nature-sounds-world";
import { getHomeSoundsManifest } from "@workspace/home-sounds-world";
import { getInstrumentWorldManifest } from "@workspace/instrument-world";
import { collectWorldAudioJobs } from "@workspace/world-engine";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_DISCOVERY = join(root, "artifacts/kidschedule/public/discovery-worlds-audio");
const LOCAL_ANIMAL = join(root, "artifacts/kidschedule/public/animal-world-audio");
const OUT_JSON = join(root, "artifacts/kidschedule/public/discovery-worlds-audio-qa.json");

type AudioIssue = {
  severity: "error" | "warn";
  code: string;
  path: string;
  message: string;
};

function resolveLocal(gcsPath: string): string | null {
  const candidates = [
    join(LOCAL_DISCOVERY, gcsPath),
    join(LOCAL_ANIMAL, gcsPath.replace(/^animal-world\//, "")),
    join(LOCAL_ANIMAL, gcsPath),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

function main(): void {
  const jobs = [
    ...collectAnimalWorldAudioJobs(getAllAnimals()),
    ...collectWorldAudioJobs("vehicle_world", getVehicleWorldManifest().items),
    ...collectWorldAudioJobs("nature_world", getNatureWorldManifest().items),
    ...collectWorldAudioJobs("home_sounds_world", getHomeSoundsManifest().items),
    ...collectWorldAudioJobs("instrument_world", getInstrumentWorldManifest().items),
  ];

  const issues: AudioIssue[] = [];
  const hashToPaths = new Map<string, string[]>();
  let present = 0;
  let missing = 0;
  let invalid = 0;

  for (const job of jobs) {
    const local = resolveLocal(job.gcsPath);
    if (!local) {
      missing += 1;
      issues.push({
        severity: "error",
        code: "missing_audio",
        path: job.gcsPath,
        message: `Missing ${job.kind} for ${job.assetId}`,
      });
      continue;
    }
    const buf = readFileSync(local);
    const validation = validateAnimalWorldMp3Buffer(new Uint8Array(buf));
    if (!validation.ok) {
      invalid += 1;
      issues.push({
        severity: "error",
        code: "invalid_mp3",
        path: job.gcsPath,
        message: validation.reason ?? "invalid_mp3",
      });
      continue;
    }
    present += 1;

    const hash = createHash("sha256").update(buf).digest("hex");
    const paths = hashToPaths.get(hash) ?? [];
    paths.push(job.gcsPath);
    hashToPaths.set(hash, paths);

    const actualMs = estimateMp3DurationMs(buf);
    const expectedMs = job.durationSec * 1000;
    if (actualMs > 0 && Math.abs(actualMs - expectedMs) > expectedMs * 0.6 + 2000) {
      issues.push({
        severity: "warn",
        code: "duration_drift",
        path: job.gcsPath,
        message: `Expected ~${job.durationSec}s, measured ~${(actualMs / 1000).toFixed(1)}s`,
      });
    }
    if (buf.length < 800) {
      issues.push({
        severity: "warn",
        code: "abnormal_size",
        path: job.gcsPath,
        message: `Very small file (${buf.length} bytes)`,
      });
    }
  }

  for (const [hash, paths] of hashToPaths) {
    if (paths.length > 1) {
      issues.push({
        severity: "warn",
        code: "duplicate_audio",
        path: paths[0]!,
        message: `Duplicate audio hash shared by ${paths.length} files: ${paths.slice(0, 3).join(", ")}`,
      });
    }
  }

  const total = jobs.length;
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warn").length;
  const healthScore = Math.max(
    0,
    Math.round(100 - (missing / Math.max(total, 1)) * 70 - (invalid / Math.max(total, 1)) * 20 - warnings * 0.5),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    totalAudioAssets: total,
    present,
    missing,
    invalid,
    warnings,
    errors,
    healthScore,
    issues: issues.slice(0, 200),
  };

  writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);

  console.log("\n=== Audio Library QA ===\n");
  console.log(`Health score: ${healthScore}/100`);
  console.log(`Total: ${total} | Present: ${present} | Missing: ${missing} | Invalid: ${invalid}`);
  console.log(`Warnings: ${warnings} | Errors: ${errors}`);
  console.log(`\nWrote ${OUT_JSON}`);

  if (missing > 0 || invalid > 0) process.exit(1);
}

main();
