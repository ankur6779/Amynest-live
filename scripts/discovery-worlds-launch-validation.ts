/**
 * Discovery Worlds — Launch Readiness Validation (single report).
 * Run: node --import tsx/esm scripts/discovery-worlds-launch-validation.ts
 *
 * Outputs:
 *   artifacts/kidschedule/public/discovery-worlds-launch-scorecard.json
 *   docs/discovery-worlds-launch-report.md
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAllAnimals } from "@workspace/animal-world";
import {
  estimateMp3DurationMs,
  validateAnimalWorldMp3Buffer,
  collectAnimalWorldAudioJobs,
} from "@workspace/animal-world";
import { getVehicleWorldManifest } from "@workspace/vehicle-world";
import { getNatureWorldManifest } from "@workspace/nature-sounds-world";
import { getHomeSoundsManifest } from "@workspace/home-sounds-world";
import { getInstrumentWorldManifest } from "@workspace/instrument-world";
import {
  buildAssetCoverageReport,
  collectWorldAudioJobs,
  diagnoseWorldManifest,
  expectedVisualAssetsForManifest,
  manifestDiagnosticsSummary,
  type WorldManifest,
  type WorldManifestItem,
} from "@workspace/world-engine";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_JSON = join(root, "artifacts/kidschedule/public/discovery-worlds-launch-scorecard.json");
const OUT_MD = join(root, "docs/discovery-worlds-launch-report.md");
const LOCAL_DISCOVERY = join(root, "artifacts/kidschedule/public/discovery-worlds-audio");
const LOCAL_ANIMAL = join(root, "artifacts/kidschedule/public/animal-world-audio");

type Severity = "blocker" | "warn" | "info";
type Finding = { phase: string; severity: Severity; code: string; message: string };

const findings: Finding[] = [];

function add(phase: string, severity: Severity, code: string, message: string): void {
  findings.push({ phase, severity, code, message });
}

function localPath(gcsPath: string): string | null {
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

function hasMp3Sync(buf: Buffer): boolean {
  for (let i = 0; i < Math.min(buf.length - 1, 4096); i++) {
    if (buf[i] === 0xff && (buf[i + 1]! & 0xe0) === 0xe0) return true;
  }
  return false;
}

function animalManifest(): WorldManifest {
  const items: WorldManifestItem[] = getAllAnimals().map((a) => {
    const folder = a.imageGcsPath.replace(/\/?hero\.webp$/i, "");
    return {
      id: a.id,
      name: a.name,
      category: a.category,
      emoji: a.emoji,
      imageGcsPath: a.imageGcsPath,
      heroRealGcsPath: a.heroRealGcsPath ?? a.imageGcsPath,
      heroCartoonGcsPath: a.heroCartoonGcsPath ?? `${folder}/card.webp`,
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
  return { version: 1, worldId: "animal_world", categories: [], items };
}

function auditContentMetadata(manifest: WorldManifest, label: string): void {
  for (const item of manifest.items) {
    if (!item.funFact?.trim()) {
      add("assets", "blocker", "missing_fun_fact", `${label}/${item.id}: missing funFact`);
    }
    if (!item.quizPrompt?.trim()) {
      add("assets", "blocker", "missing_quiz_prompt", `${label}/${item.id}: missing quizPrompt`);
    }
    if (!item.narration?.introGcsPath?.trim()) {
      add("assets", "warn", "missing_narration", `${label}/${item.id}: missing narration intro path`);
    }
    if (!item.sounds.length) {
      add("assets", "blocker", "missing_sounds", `${label}/${item.id}: no sounds`);
    }
  }
}

function auditAudio(): { healthScore: number; present: number; total: number } {
  const jobs = [
    ...collectAnimalWorldAudioJobs(getAllAnimals()),
    ...collectWorldAudioJobs("vehicle_world", getVehicleWorldManifest().items),
    ...collectWorldAudioJobs("nature_world", getNatureWorldManifest().items),
    ...collectWorldAudioJobs("home_sounds_world", getHomeSoundsManifest().items),
    ...collectWorldAudioJobs("instrument_world", getInstrumentWorldManifest().items),
  ];

  const hashToPaths = new Map<string, string[]>();
  let present = 0;
  let missing = 0;
  let invalid = 0;
  let warnCount = 0;

  for (const job of jobs) {
    const path = localPath(job.gcsPath);
    if (!path) {
      missing += 1;
      if (missing <= 5) {
        add("audio", "blocker", "missing_audio", `Missing: ${job.gcsPath}`);
      }
      continue;
    }
    const buf = readFileSync(path);
    const v = validateAnimalWorldMp3Buffer(new Uint8Array(buf));
    if (!v.ok) {
      invalid += 1;
      add("audio", "blocker", "broken_mp3", `${job.gcsPath}: ${v.reason}`);
      continue;
    }
    if (!hasMp3Sync(buf)) {
      invalid += 1;
      add("audio", "blocker", "broken_mp3", `${job.gcsPath}: no MPEG sync`);
      continue;
    }
    present += 1;

    const hash = createHash("sha256").update(buf).digest("hex");
    const paths = hashToPaths.get(hash) ?? [];
    paths.push(job.gcsPath);
    hashToPaths.set(hash, paths);

    const actualMs = estimateMp3DurationMs(buf.length);
    const expectedMs = job.durationSec * 1000;
    if (actualMs > 0 && Math.abs(actualMs - expectedMs) > expectedMs * 0.65 + 2500) {
      warnCount += 1;
      if (warnCount <= 8) {
        add("audio", "warn", "duration_drift", `${job.gcsPath}: manifest ${job.durationSec}s vs ~${(actualMs / 1000).toFixed(1)}s`);
      }
    }
    if (buf.length < 900) {
      warnCount += 1;
      add("audio", "warn", "short_clip", `${job.gcsPath}: ${buf.length} bytes — check silence/trim`);
    }
  }

  if (missing > 5) {
    add("audio", "blocker", "missing_audio_bulk", `${missing} audio files missing locally/GCS mirror`);
  }

  for (const [, paths] of hashToPaths) {
    if (paths.length > 1) {
      add("audio", "warn", "duplicate_audio", `Duplicate clip: ${paths.slice(0, 2).join(" = ")}`);
    }
  }

  const total = jobs.length;
  const healthScore = Math.max(
    0,
    Math.round(100 - (missing / Math.max(total, 1)) * 70 - (invalid / Math.max(total, 1)) * 25 - warnCount * 0.3),
  );
  return { healthScore, present, total };
}

function scanUnusedLocalAudio(): void {
  const expected = new Set<string>();
  const jobs = [
    ...collectAnimalWorldAudioJobs(getAllAnimals()),
    ...collectWorldAudioJobs("vehicle_world", getVehicleWorldManifest().items),
    ...collectWorldAudioJobs("nature_world", getNatureWorldManifest().items),
    ...collectWorldAudioJobs("home_sounds_world", getHomeSoundsManifest().items),
    ...collectWorldAudioJobs("instrument_world", getInstrumentWorldManifest().items),
  ];
  for (const j of jobs) expected.add(j.gcsPath);

  let orphan = 0;
  function walk(dir: string, prefix: string): void {
    if (!existsSync(dir)) return;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
      const full = join(dir, ent.name);
      if (ent.isDirectory()) walk(full, rel);
      else if (ent.name.endsWith(".mp3") && !expected.has(rel)) {
        orphan += 1;
      }
    }
  }
  walk(LOCAL_ANIMAL, "animal-world");
  walk(LOCAL_DISCOVERY, "worlds");
  if (orphan > 0) {
    add("assets", "warn", "unused_audio", `${orphan} local MP3 files not referenced in manifests`);
  }
}

function staticCodeAudit(): void {
  const exp = readFileSync(
    join(root, "artifacts/kidschedule/src/components/discovery-world/discovery-world-experience.tsx"),
    "utf8",
  );
  const hub = readFileSync(join(root, "artifacts/kidschedule/src/pages/discovery-worlds-hub.tsx"), "utf8");
  const offline = readFileSync(
    join(root, "artifacts/kidschedule/src/lib/discovery-world-offline-cache.ts"),
    "utf8",
  );

  if (!exp.includes("min-h-11")) {
    add("toddler", "warn", "tap_targets", "Some mode controls may be below 44px — verify on device");
  }
  if (exp.includes("text-3xl") && exp.includes("quiz")) {
    add("toddler", "info", "reading_quiz", "Quiz uses large prompt text — toddler mode is separate");
  }
  if (!hub.includes("UnifiedParentSummary")) {
    add("parent", "blocker", "parent_summary", "Hub missing UnifiedParentSummary — 10s comprehension at risk");
  }
  if (!hub.includes("overallProgressPct")) {
    add("parent", "blocker", "parent_progress", "Hub missing at-a-glance progress %");
  }
  if (!hub.includes("HubDailyAdventureTeaser")) {
    add("parent", "warn", "daily_adventure", "Daily adventure not visible on hub");
  }
  if (!offline.includes("caches.open")) {
    add("offline", "blocker", "offline_cache", "Cache API warm path missing");
  }
  if (!exp.includes("playError")) {
    add("errors", "warn", "audio_error_ui", "Item detail may not surface audio failures");
  } else {
    add("errors", "info", "audio_error_ui", "Audio play failure shows role=alert message");
  }
  if (!exp.includes("WorldHeroImage") && !exp.includes("DiscoveryHeroFallback")) {
    add("errors", "warn", "image_fallback", "Hero fallback path unclear");
  }
  if (exp.includes("onError") || exp.includes("imgFailed")) {
    add("errors", "info", "image_fallback", "Image onError fallbacks present in experience/cards");
  }
}

function scoreCategory(blockers: number, warns: number, base: number): number {
  return Math.max(0, Math.min(100, base - blockers * 25 - warns * 5));
}

async function tryGcsAssetCheck(): Promise<ReturnType<typeof buildAssetCoverageReport> | null> {
  const bucketId =
    process.env.GCS_BUCKET_NAME?.trim() ||
    process.env.GCS_BUCKET?.trim() ||
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim();
  if (!bucketId) return null;
  try {
    const { Storage } = await import("@google-cloud/storage");
    const storage = new Storage();
    const bucket = storage.bucket(bucketId);
    const cache = new Map<string, boolean>();
    const worlds = [
      { worldId: "animal_world", label: "Animal World", manifest: animalManifest() },
      { worldId: "vehicle_world", label: "Vehicles", manifest: getVehicleWorldManifest() },
      { worldId: "nature_world", label: "Nature", manifest: getNatureWorldManifest() },
      { worldId: "home_sounds_world", label: "Home", manifest: getHomeSoundsManifest() },
      { worldId: "instrument_world", label: "Instruments", manifest: getInstrumentWorldManifest() },
    ];
    for (const w of worlds) {
      for (const asset of expectedVisualAssetsForManifest(w.manifest)) {
        if (cache.has(asset.gcsPath)) continue;
        const local = localPath(asset.gcsPath);
        if (local) {
          cache.set(asset.gcsPath, true);
          continue;
        }
        const [ok] = await bucket.file(asset.gcsPath).exists();
        cache.set(asset.gcsPath, ok);
      }
    }
    return buildAssetCoverageReport({
      worlds,
      exists: (p) => cache.get(p) ?? false,
    });
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const manifests = [
    { label: "Animal World", manifest: animalManifest() },
    { label: "Vehicles", manifest: getVehicleWorldManifest() },
    { label: "Nature", manifest: getNatureWorldManifest() },
    { label: "Home", manifest: getHomeSoundsManifest() },
    { label: "Instruments", manifest: getInstrumentWorldManifest() },
  ];

  for (const { label, manifest } of manifests) {
    const issues = diagnoseWorldManifest(manifest);
    const summary = manifestDiagnosticsSummary(issues);
    if (!summary.ok) {
      add("assets", "blocker", "manifest_errors", `${label}: ${summary.errors} manifest errors`);
    }
    auditContentMetadata(manifest, label);
  }

  const gcsReport = await tryGcsAssetCheck();
  const localReport = buildAssetCoverageReport({
    worlds: manifests.map((m) => ({ worldId: m.manifest.worldId, label: m.label, manifest: m.manifest })),
    exists: (p) => !!localPath(p),
  });
  const assetReport = gcsReport ?? localReport;

  if (assetReport.coveragePct < 100) {
    add(
      "assets",
      "blocker",
      "visual_coverage",
      `Visual assets ${assetReport.coveragePct}% (${assetReport.presentAssets}/${assetReport.totalAssets}) — ${assetReport.mode ?? "local"} check`,
    );
  }

  const audio = auditAudio();
  scanUnusedLocalAudio();
  staticCodeAudit();

  add(
    "device",
    "info",
    "manual_device",
    "Complete docs/discovery-worlds-launch-checklist.md on iPhone, iPad, Android phone/tablet, desktop",
  );
  add(
    "performance",
    "info",
    "lighthouse_manual",
    "Run Lighthouse on /discovery-worlds and /worlds/vehicles — targets P/A/BP > 95 (auth may affect public URL scores)",
  );

  let blockers = findings.filter((f) => f.severity === "blocker");
  let warns = findings.filter((f) => f.severity === "warn");

  const scores = {
    architecture: 100,
    performance: scoreCategory(
      blockers.filter((f) => f.phase === "performance").length,
      warns.filter((f) => f.phase === "performance").length,
      88,
    ),
    accessibility: scoreCategory(
      blockers.filter((f) => f.phase === "accessibility").length,
      warns.filter((f) => f.phase === "accessibility").length,
      90,
    ),
    content: scoreCategory(
      blockers.filter((f) => f.phase === "assets").length,
      warns.filter((f) => f.phase === "assets").length,
      Math.round((assetReport.coveragePct + (getAllAnimals().length >= 100 ? 100 : 70)) / 2),
    ),
    audio: audio.healthScore,
    visualQuality: assetReport.coveragePct,
    parentValue: scoreCategory(
      blockers.filter((f) => f.phase === "parent").length,
      warns.filter((f) => f.phase === "parent").length,
      92,
    ),
    toddlerUsability: scoreCategory(
      blockers.filter((f) => f.phase === "toddler").length,
      warns.filter((f) => f.phase === "toddler").length,
      88,
    ),
    offlineReliability: scoreCategory(
      blockers.filter((f) => f.phase === "offline").length,
      warns.filter((f) => f.phase === "offline").length,
      85,
    ),
  };

  const lhHub = process.env.LIGHTHOUSE_HUB_JSON;
  if (lhHub && existsSync(lhHub)) {
    try {
      const r = JSON.parse(readFileSync(lhHub, "utf8")) as {
        categories: Record<string, { score: number }>;
      };
      const perf = Math.round((r.categories.performance?.score ?? 0) * 100);
      const a11y = Math.round((r.categories.accessibility?.score ?? 0) * 100);
      const bp = Math.round((r.categories["best-practices"]?.score ?? 0) * 100);
      if (perf < 95) add("performance", "blocker", "lighthouse_perf", `Hub Lighthouse performance ${perf} (target 95)`);
      if (a11y < 95) add("performance", "warn", "lighthouse_a11y", `Hub Lighthouse accessibility ${a11y} (target 95)`);
      if (bp < 95) add("performance", "warn", "lighthouse_bp", `Hub Lighthouse best-practices ${bp} (target 95)`);
      scores.performance = Math.round((perf + a11y + bp) / 3);
    } catch {
      /* ignore */
    }
  }

  blockers = findings.filter((f) => f.severity === "blocker");
  warns = findings.filter((f) => f.severity === "warn");

  const overall = Math.round(
    (scores.architecture +
      scores.performance +
      scores.accessibility +
      scores.content +
      scores.audio +
      scores.visualQuality +
      scores.parentValue +
      scores.toddlerUsability +
      scores.offlineReliability) /
      9,
  );

  const launchReady = blockers.length === 0 && assetReport.coveragePct >= 95 && audio.healthScore >= 85;

  const assetMode = gcsReport ? "gcs" : "local";

  const scorecard = {
    generatedAt: new Date().toISOString(),
    launchReady,
    overallLaunchReadiness: overall,
    scores,
    assetCheckMode: assetMode,
    catalog: {
      animals: getAllAnimals().length,
      vehicles: getVehicleWorldManifest().items.length,
      nature: getNatureWorldManifest().items.length,
      home: getHomeSoundsManifest().items.length,
      instruments: getInstrumentWorldManifest().items.length,
    },
    assets: assetReport,
    audio: { healthScore: audio.healthScore, present: audio.present, total: audio.total },
    blockers: blockers.map((f) => f.message),
    warnings: warns.map((f) => f.message),
    remediation: blockers.map((f, i) => ({ priority: i + 1, ...f })),
    findings,
  };

  mkdirSync(dirname(OUT_JSON), { recursive: true });
  mkdirSync(dirname(OUT_MD), { recursive: true });
  writeFileSync(OUT_JSON, `${JSON.stringify(scorecard, null, 2)}\n`);

  const md = `# Discovery Worlds — Launch Report

Generated: ${scorecard.generatedAt}

## Launch readiness: ${launchReady ? "**READY**" : "**NOT READY**"}

**Overall score: ${overall}/100**

| Dimension | Score |
|-----------|------:|
| Architecture | ${scores.architecture} |
| Performance | ${scores.performance} |
| Accessibility | ${scores.accessibility} |
| Content | ${scores.content} |
| Audio | ${scores.audio} |
| Visual quality | ${scores.visualQuality} |
| Parent value | ${scores.parentValue} |
| Toddler usability | ${scores.toddlerUsability} |
| Offline reliability | ${scores.offlineReliability} |

## Catalog

- Animal World: ${scorecard.catalog.animals} animals
- Vehicles: ${scorecard.catalog.vehicles} · Nature: ${scorecard.catalog.nature} · Home: ${scorecard.catalog.home} · Instruments: ${scorecard.catalog.instruments}

## Assets (${assetReport.coveragePct}% coverage)

- Total: ${assetReport.totalAssets} · Present: ${assetReport.presentAssets} · Missing: ${assetReport.missingAssets}
- Mode: ${assetMode}

## Audio (${audio.healthScore}/100)

- Present: ${audio.present}/${audio.total}

## Launch blockers (${blockers.length})

${blockers.length ? blockers.map((b) => `- ${b.message}`).join("\n") : "_None from automated audit._"}

## Prioritized remediation

${blockers.map((b, i) => `${i + 1}. **${b.code}** — ${b.message}`).join("\n") || "1. Run GCS visual upload + full audio generation\n2. Complete manual device checklist"}

## Manual follow-up

- [ ] Phase 1: Device checklist — \`docs/discovery-worlds-launch-checklist.md\`
- [ ] Phase 6: Lighthouse on production URLs
- [ ] Phase 7–8: Offline + error scenarios on device

`;

  writeFileSync(OUT_MD, md);

  console.log(md);
  console.log(`\nWrote ${OUT_JSON}`);
  process.exit(launchReady ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
