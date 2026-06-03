/**
 * Audio Completion Dashboard — per-world coverage, narration/SFX gaps, validation.
 * Run: pnpm run report:discovery-worlds-audio-qa
 *
 * Exit 0 when healthScore >= 95 and each world coverage >= 95%.
 */
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { collectAnimalWorldAudioJobs, getAllAnimals } from "@workspace/animal-world";
import { getVehicleWorldManifest } from "@workspace/vehicle-world";
import { getNatureWorldManifest } from "@workspace/nature-sounds-world";
import { getHomeSoundsManifest } from "@workspace/home-sounds-world";
import { getInstrumentWorldManifest } from "@workspace/instrument-world";
import { collectWorldAudioJobs } from "@workspace/world-engine";
import {
  validateDiscoveryClip,
  isNarrationPath,
  isSoundEffectPath,
} from "./lib/discovery-audio-validate.js";
import {
  buildGcsStorage,
  downloadGcsObject,
  gcsObjectExists,
  getGcsBucketName,
  hasGcsCredentials,
} from "./lib/gcs-storage.js";

const HEALTH_GATE = Number(process.env.DISCOVERY_WORLDS_AUDIO_HEALTH_GATE ?? "95");
const WORLD_GATE = Number(process.env.DISCOVERY_WORLDS_WORLD_AUDIO_GATE_PCT ?? "95");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_DISCOVERY = join(root, "artifacts/kidschedule/public/discovery-worlds-audio");
const LOCAL_ANIMAL = join(root, "artifacts/kidschedule/public/animal-world-audio");
const OUT_JSON = join(root, "artifacts/kidschedule/public/discovery-worlds-audio-qa.json");
const OUT_MANIFEST = join(root, "artifacts/kidschedule/public/discovery-worlds-audio-missing-manifest.json");
const OUT_WORLD_REPORT = join(root, "artifacts/kidschedule/public/discovery-worlds-audio-by-world.json");

config({ path: `${root}/.env` });
config({ path: `${root}/.env.development`, override: true });
config({ path: `${root}/Amynest-backend-dykj.env`, override: true });

type AudioIssue = {
  severity: "error" | "warn";
  code: string;
  path: string;
  message: string;
  worldId?: string;
};

type WorldAudioReport = {
  worldId: string;
  label: string;
  total: number;
  present: number;
  missing: number;
  invalid: number;
  coveragePct: number;
  healthScore: number;
  missingNarration: number;
  missingSoundEffects: number;
  duplicateHashes: number;
  warnings: number;
  gatePassed: boolean;
  blockers: string[];
};

type AudioJob = {
  gcsPath: string;
  kind: string;
  durationSec: number;
  assetId: string;
  worldId: string;
  worldLabel: string;
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

function localPathForMirror(gcsPath: string): string {
  if (gcsPath.startsWith("animal-world/")) {
    return join(LOCAL_ANIMAL, gcsPath.replace(/^animal-world\//, ""));
  }
  return join(LOCAL_DISCOVERY, gcsPath);
}

async function loadClipBuffer(
  job: AudioJob,
  storage: ReturnType<typeof buildGcsStorage> | null,
  bucketId: string,
): Promise<{ buf: Buffer | null; source: "local" | "gcs" | "none" }> {
  const local = resolveLocal(job.gcsPath);
  if (local) return { buf: readFileSync(local), source: "local" };

  if (storage) {
    const onGcs = await gcsObjectExists(storage, bucketId, job.gcsPath);
    if (!onGcs) return { buf: null, source: "none" };
    const downloaded = await downloadGcsObject(storage, bucketId, job.gcsPath);
    if (downloaded) {
      const mirror = localPathForMirror(job.gcsPath);
      mkdirSync(dirname(mirror), { recursive: true });
      writeFileSync(mirror, downloaded);
      return { buf: downloaded, source: "gcs" };
    }
  }
  return { buf: null, source: "none" };
}

async function main(): Promise<void> {
  const jobs: AudioJob[] = [
    ...collectAnimalWorldAudioJobs(getAllAnimals()).map((j) => ({
      gcsPath: j.gcsPath,
      kind: j.kind,
      durationSec: j.durationSec,
      assetId: j.assetId,
      worldId: "animal_world",
      worldLabel: "Animal World",
    })),
    ...collectWorldAudioJobs("vehicle_world", getVehicleWorldManifest().items).map((j) => ({
      gcsPath: j.gcsPath,
      kind: j.kind,
      durationSec: j.durationSec,
      assetId: j.assetId,
      worldId: "vehicle_world",
      worldLabel: "Vehicle World",
    })),
    ...collectWorldAudioJobs("nature_world", getNatureWorldManifest().items).map((j) => ({
      gcsPath: j.gcsPath,
      kind: j.kind,
      durationSec: j.durationSec,
      assetId: j.assetId,
      worldId: "nature_world",
      worldLabel: "Nature World",
    })),
    ...collectWorldAudioJobs("home_sounds_world", getHomeSoundsManifest().items).map((j) => ({
      gcsPath: j.gcsPath,
      kind: j.kind,
      durationSec: j.durationSec,
      assetId: j.assetId,
      worldId: "home_sounds_world",
      worldLabel: "Home World",
    })),
    ...collectWorldAudioJobs("instrument_world", getInstrumentWorldManifest().items).map((j) => ({
      gcsPath: j.gcsPath,
      kind: j.kind,
      durationSec: j.durationSec,
      assetId: j.assetId,
      worldId: "instrument_world",
      worldLabel: "Instrument World",
    })),
  ];

  const useGcs = hasGcsCredentials(root) && process.env.SKIP_GCS_AUDIO_CHECK !== "1";
  const storage = useGcs ? buildGcsStorage(root) : null;
  const bucketId = getGcsBucketName();

  const issues: AudioIssue[] = [];
  const hashToPaths = new Map<string, string[]>();
  const missingPaths: string[] = [];
  const worldMap = new Map<string, WorldAudioReport>();

  const ensureWorld = (job: AudioJob): WorldAudioReport => {
    const existing = worldMap.get(job.worldId);
    if (existing) return existing;
    const row: WorldAudioReport = {
      worldId: job.worldId,
      label: job.worldLabel,
      total: 0,
      present: 0,
      missing: 0,
      invalid: 0,
      coveragePct: 0,
      healthScore: 0,
      missingNarration: 0,
      missingSoundEffects: 0,
      duplicateHashes: 0,
      warnings: 0,
      gatePassed: false,
      blockers: [],
    };
    worldMap.set(job.worldId, row);
    return row;
  };

  let present = 0;
  let missing = 0;
  let invalid = 0;

  for (const job of jobs) {
    const row = ensureWorld(job);
    row.total += 1;

    const { buf, source } = await loadClipBuffer(job, storage, bucketId);
    if (!buf) {
      missing += 1;
      row.missing += 1;
      missingPaths.push(job.gcsPath);
      if (isNarrationPath(job.gcsPath)) row.missingNarration += 1;
      else if (isSoundEffectPath(job.gcsPath)) row.missingSoundEffects += 1;
      issues.push({
        severity: "error",
        code: isNarrationPath(job.gcsPath) ? "missing_narration" : "missing_sound_effect",
        path: job.gcsPath,
        message: `Missing ${job.kind} (${job.assetId})`,
        worldId: job.worldId,
      });
      continue;
    }

    const v = validateDiscoveryClip(buf, job.durationSec);
    if (!v.ok) {
      invalid += 1;
      row.invalid += 1;
      const code = v.likelyCorrupt
        ? "corrupt_mp3"
        : v.likelySilent
          ? "empty_or_silent"
          : !v.durationOk
            ? "duration_out_of_range"
            : !v.nonEmpty
              ? "empty_file"
              : "invalid_mp3";
      issues.push({
        severity: "error",
        code,
        path: job.gcsPath,
        message: v.reason ?? code,
        worldId: job.worldId,
      });
      continue;
    }

    present += 1;
    row.present += 1;

    const hash = createHash("sha256").update(buf).digest("hex");
    const paths = hashToPaths.get(hash) ?? [];
    paths.push(job.gcsPath);
    hashToPaths.set(hash, paths);

    if (v.likelyClipping) {
      row.warnings += 1;
      issues.push({
        severity: "warn",
        code: "possible_clipping",
        path: job.gcsPath,
        message: "Possible clipping detected in MP3 frame region",
        worldId: job.worldId,
      });
    }
    if (!v.durationOk) {
      row.warnings += 1;
      issues.push({
        severity: "warn",
        code: "duration_drift",
        path: job.gcsPath,
        message: `Expected ~${job.durationSec}s, got ~${(v.durationMs / 1000).toFixed(1)}s`,
        worldId: job.worldId,
      });
    }

    if (source === "gcs") {
      issues.push({
        severity: "warn",
        code: "mirrored_from_gcs",
        path: job.gcsPath,
        message: "Downloaded from GCS for validation (now in local mirror)",
        worldId: job.worldId,
      });
    }
  }

  for (const [, paths] of hashToPaths) {
    if (paths.length > 1) {
      const worldId = paths[0]!.startsWith("animal-world")
        ? "animal_world"
        : paths[0]!.includes("worlds/vehicles")
          ? "vehicle_world"
          : paths[0]!.includes("worlds/nature")
            ? "nature_world"
            : paths[0]!.includes("worlds/home")
              ? "home_sounds_world"
              : "instrument_world";
      const row = worldMap.get(worldId);
      if (row) row.duplicateHashes += 1;
      issues.push({
        severity: "warn",
        code: "duplicate_audio",
        path: paths[0]!,
        message: `Duplicate clip hash across ${paths.length} files`,
        worldId,
      });
    }
  }

  const total = jobs.length;
  const warnings = issues.filter((i) => i.severity === "warn").length;
  const coveragePct = total > 0 ? Math.round((present / total) * 100) : 0;
  const healthScore = Math.max(
    0,
    Math.round(coveragePct - (invalid / Math.max(total, 1)) * 15 - warnings * 0.15),
  );

  const criticalBlockers: string[] = [];
  const worlds: WorldAudioReport[] = [];

  for (const row of worldMap.values()) {
    row.coveragePct = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0;
    row.healthScore = Math.max(
      0,
      Math.round(row.coveragePct - (row.invalid / Math.max(row.total, 1)) * 15 - row.warnings * 0.15),
    );
    row.gatePassed = row.coveragePct >= WORLD_GATE && row.invalid === 0;
    if (!row.gatePassed) {
      row.blockers.push(
        `${row.label}: ${row.coveragePct}% coverage (need ${WORLD_GATE}%), missing ${row.missing} (narration ${row.missingNarration}, sfx ${row.missingSoundEffects})`,
      );
      criticalBlockers.push(...row.blockers);
    }
    worlds.push(row);
  }
  worlds.sort((a, b) => a.worldId.localeCompare(b.worldId));

  if (healthScore < HEALTH_GATE) {
    criticalBlockers.unshift(`Global audio health ${healthScore}/100 below gate ${HEALTH_GATE}`);
  }
  if (missing > 0) {
    criticalBlockers.push(`${missing} clips missing — run generate:animal-world-audio and generate:discovery-worlds-audio`);
  }
  if (invalid > 0) {
    criticalBlockers.push(`${invalid} clips failed validation (corrupt/silent/duration)`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    healthGate: HEALTH_GATE,
    worldGatePct: WORLD_GATE,
    mode: useGcs ? `local+gcs:${bucketId}` : "local",
    totalAudioAssets: total,
    present,
    missing,
    invalid,
    coveragePct,
    warnings,
    healthScore,
    criticalBlockers,
    worlds,
    issues: issues.slice(0, 400),
    missingPaths,
  };

  writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(OUT_MANIFEST, `${JSON.stringify({ generatedAt: report.generatedAt, missing: missingPaths }, null, 2)}\n`);
  writeFileSync(OUT_WORLD_REPORT, `${JSON.stringify({ generatedAt: report.generatedAt, worlds }, null, 2)}\n`);

  console.log("\n=== Audio Completion Dashboard ===\n");
  console.log(`Gate: health >= ${HEALTH_GATE}, each world >= ${WORLD_GATE}%`);
  console.log(`Health: ${healthScore}/100 | Coverage: ${coveragePct}% (${present}/${total})`);
  console.log(`Missing: ${missing} | Invalid: ${invalid} | Warnings: ${warnings}\n`);

  for (const w of worlds) {
    const mark = w.gatePassed ? "PASS" : "BLOCKER";
    console.log(
      `  [${mark}] ${w.label}: ${w.coveragePct}% (${w.present}/${w.total}) · missing narr ${w.missingNarration} · missing sfx ${w.missingSoundEffects} · dup ${w.duplicateHashes}`,
    );
  }

  if (criticalBlockers.length) {
    console.log("\nBlockers:");
    for (const b of [...new Set(criticalBlockers)]) console.log(`  ✗ ${b}`);
  } else {
    console.log("\n✓ All audio gates passed");
  }

  console.log(`\nWrote ${OUT_JSON}`);

  const failedWorld = worlds.some((w) => !w.gatePassed);
  if (healthScore < HEALTH_GATE || failedWorld || missing > 0 || invalid > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
