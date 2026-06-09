/**
 * Audio Health Gate — deployment-blocking validation before production deploy.
 *
 * Usage:
 *   pnpm check:audio-health-gate
 *   AUDIO_GATE_API_URL=https://amynest-backend-dykj.onrender.com pnpm check:audio-health-gate
 *
 * Writes: artifacts/audio-health-gate/latest.json
 * Exit: 0 PASS/WARNING, 1 FAIL (blocks deploy)
 */
import { config } from "dotenv";
import { randomInt } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createCrashGateReport,
  runAudioHealthGate,
  type AudioHealthGateReport,
} from "../artifacts/api-server/src/services/audio-health-gate-runner.js";
import { loadStaticAudioMap } from "./static-audio-paths.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(ROOT, ".env.development") });
config({ path: join(ROOT, ".env") });

const args = new Set(process.argv.slice(2));
const offlineOnly = args.has("--offline");
const jsonOnly = args.has("--json");

const API_URL = (
  process.env.AUDIO_GATE_API_URL ??
  process.env.SMOKE_API_URL ??
  process.env.API_URL ??
  process.env.API_PUBLIC_URL ??
  "https://amynest-backend-dykj.onrender.com"
).replace(/\/$/, "");

const ADMIN_TOKEN =
  process.env.ADMIN_AUTH_TOKEN ??
  process.env.COACH_STRESS_AUTH_TOKEN ??
  process.env.STABILITY_AUTH_TOKEN ??
  "";

const INTERNAL_HEALTH_SECRET = process.env.INTERNAL_HEALTH_SECRET?.trim() ?? "";
const REQUIRE_PRODUCTION_SECRETS =
  process.env.CI === "true" ||
  process.env.CI === "1" ||
  process.env.AUDIO_GATE_REQUIRE_SECRETS === "1" ||
  process.env.AUDIO_GATE_REQUIRE_SECRETS === "true";

const STATIC_SAMPLE_COUNT = Math.max(1, Number(process.env.AUDIO_GATE_STATIC_SAMPLES ?? "10"));
const ORPHAN_BASELINE_PATH = join(ROOT, "artifacts/audio-health-gate/orphan-baseline.json");
const REPORT_PATH = join(ROOT, "artifacts/audio-health-gate/latest.json");

function loadOrphanBaseline(): number | null {
  if (!existsSync(ORPHAN_BASELINE_PATH)) return null;
  try {
    const raw = JSON.parse(readFileSync(ORPHAN_BASELINE_PATH, "utf8")) as {
      weeklyAverageOrphans?: number;
    };
    return raw.weeklyAverageOrphans ?? null;
  } catch {
    return null;
  }
}

function saveOrphanBaseline(orphans: number): void {
  mkdirSync(dirname(ORPHAN_BASELINE_PATH), { recursive: true });
  const prev = loadOrphanBaseline();
  const weeklyAverageOrphans = prev != null ? prev * 0.85 + orphans * 0.15 : orphans;
  writeFileSync(
    ORPHAN_BASELINE_PATH,
    `${JSON.stringify({ weeklyAverageOrphans, updatedAt: new Date().toISOString(), lastOrphans: orphans }, null, 2)}\n`,
    "utf8",
  );
}

function extractHashes(count: number): string[] {
  const map = loadStaticAudioMap();
  const urls = [...Object.values(map.default ?? {}), ...Object.values(map.phonics ?? {})];
  const hashes = urls
    .map((u) => u.match(/static-audio\/([a-f0-9]{32})\.mp3/i)?.[1]?.toLowerCase())
    .filter((h): h is string => !!h);
  const unique = [...new Set(hashes)];
  if (unique.length === 0) return ["ff74291468e5322c612357c6f74701e8"];

  const picked: string[] = [];
  while (picked.length < count && picked.length < unique.length) {
    const idx = randomInt(unique.length);
    const hash = unique[idx]!;
    if (!picked.includes(hash)) picked.push(hash);
  }
  return picked;
}

function runOfflineCorpusCheck(): string[] {
  const warnings: string[] = [];
  const map = loadStaticAudioMap();
  const keys = Object.keys(map.default ?? {}).length + Object.keys(map.phonics ?? {}).length;
  if (keys < 100) {
    warnings.push(`Static audio map appears small (${keys} entries)`);
  }
  return warnings;
}

function writeReport(report: AudioHealthGateReport): void {
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function printReport(report: AudioHealthGateReport): void {
  if (jsonOnly) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("\n🎧 AmyNest Audio Health Gate");
  console.log(`   API:      ${API_URL}`);
  console.log(`   Decision: ${report.decision}`);
  console.log(`   Score:    ${report.score}/100\n`);

  for (const phase of report.phases) {
    const icon =
      phase.status === "PASS"
        ? "✅"
        : phase.status === "WARNING"
          ? "⚠️"
          : phase.status === "SKIPPED"
            ? "⏭️"
            : "❌";
    console.log(`${icon} ${phase.name} (${phase.status})`);
    if (phase.status === "SKIPPED" && phase.metrics.skipReason) {
      console.log(`     ↷ ${phase.metrics.skipReason}`);
    }
    for (const b of phase.blockers) console.log(`     ✗ ${b}`);
    for (const w of phase.warnings) console.log(`     ⚠ ${w}`);
  }

  console.log("\nCategories:");
  for (const [name, cat] of Object.entries(report.categories)) {
    const scoreLabel = cat.score == null ? "—" : `${cat.score}/100`;
    console.log(`  ${name.padEnd(14)} ${scoreLabel}  ${cat.status}`);
  }

  if (report.warnings.length) {
    console.log("\nWarnings:");
    for (const w of report.warnings) console.log(`  ⚠ ${w}`);
  }

  if (report.blockers.length) {
    console.log("\nBlockers:");
    for (const b of report.blockers) console.log(`  ✗ ${b}`);
  }

  console.log("");
}

async function main(): Promise<void> {
  let report: AudioHealthGateReport | null = null;

  try {
    report = await runAudioHealthGate({
      apiUrl: API_URL,
      adminToken: ADMIN_TOKEN,
      internalHealthSecret: INTERNAL_HEALTH_SECRET,
      requireProductionSecrets: REQUIRE_PRODUCTION_SECRETS,
      staticSampleHashes: extractHashes(STATIC_SAMPLE_COUNT),
      staticSampleCount: STATIC_SAMPLE_COUNT,
      offlineOnly,
      orphanBaseline: {
        load: loadOrphanBaseline,
        save: saveOrphanBaseline,
      },
    });

    const offlineWarnings = offlineOnly ? runOfflineCorpusCheck() : [];
    report.warnings.push(...offlineWarnings);
    if (offlineWarnings.length && report.decision === "PASS") {
      report.decision = "WARNING";
    }
  } catch (err) {
    report = createCrashGateReport(err);
    console.error(err);
  } finally {
    if (report) writeReport(report);
  }

  if (!report) {
    process.exit(1);
    return;
  }

  printReport(report);

  if (report.decision === "FAIL") {
    console.error("[audio-health-gate] FAIL — deployment blocked.\n");
    process.exit(1);
  }

  console.log(`[audio-health-gate] ${report.decision} — report written to ${REPORT_PATH}\n`);
}

main();
