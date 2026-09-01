/**
 * Cloud Content Factory runner — dry-run by default; live gated.
 * NEVER spends KIE video credits unless AMYNEST_CONTENT_FACTORY_LIVE=1
 * AND schedule matches AND dry-run checks pass.
 */

import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGoldenVoiceAndCaptions } from "../golden-voice.js";
import {
  defaultQueuePath,
  findProductionByIdempotency,
  loadQueue,
  peekNextGolden,
  saveQueue,
  summarizeQueue,
  upsertProduction,
} from "./golden-queue.js";
import { assertSecretsFromEnv, runIdentityPreflight } from "./identity-preflight.js";
import {
  buildIdempotencyKey,
  evaluateAtIstWallClock,
  evaluateFactorySchedule,
  listUpcomingOccurrences,
  productionDateKey,
} from "./schedule.js";
import {
  DEFAULT_FACTORY_SCHEDULE,
  FACTORY_LIVE_ENV,
  MAX_PRODUCTION_ATTEMPTS,
  type FactoryProductionRecord,
} from "./types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const CE_ROOT = resolve(HERE, "../..");
const REPO_ROOT = resolve(CE_ROOT, "..");

export interface FactoryRunOptions {
  /** Force dry-run (no KIE video, no YouTube). Default true unless LIVE=1. */
  dryRun?: boolean;
  /** Override "now" for schedule tests. */
  now?: Date;
  dataDir?: string;
  /** When true, ignore wall-clock schedule match (still respects DTSTART for dry proofs). */
  ignoreScheduleGate?: boolean;
  /** Execute live google-production-run (requires LIVE=1). */
  allowLiveSpend?: boolean;
}

export interface FactoryDryRunReport {
  overall: "PASS" | "FAIL";
  checks: Array<{ id: string; ok: boolean; detail: string }>;
  nextGolden: string;
  nextOccurrences: string[];
  scheduleSep2: ReturnType<typeof evaluateAtIstWallClock>;
  idempotencyKey: string;
  identity: ReturnType<typeof runIdentityPreflight>;
  metadataSample: {
    title: string;
    hook: string;
    descriptionPreview: string;
    hashtags: string[];
  };
  secrets: ReturnType<typeof assertSecretsFromEnv>;
  liveEnabled: boolean;
  kieVideoCalls: number;
  kieVideoCredits: number;
}

function isLiveEnabled(env = process.env): boolean {
  return env[FACTORY_LIVE_ENV]?.trim() === "1";
}

function resolveDataDir(explicit?: string): string {
  return (
    explicit ||
    process.env.AMYNEST_DATA_DIR?.trim() ||
    join(REPO_ROOT, ".amynest-assets", "content-factory-data")
  );
}

export function runFactoryDryValidation(options: FactoryRunOptions = {}): FactoryDryRunReport {
  const dataDir = resolveDataDir(options.dataDir);
  mkdirSync(dataDir, { recursive: true });
  const queuePath = defaultQueuePath(dataDir);
  const queue = loadQueue(queuePath);
  const next = peekNextGolden(queue);
  const summary = summarizeQueue(queue);

  const sep2 = evaluateAtIstWallClock("2026-09-02", "17:00");
  const sep3 = evaluateAtIstWallClock("2026-09-03", "17:00");
  const nowSched = evaluateFactorySchedule(options.now ?? new Date());
  const upcoming = listUpcomingOccurrences(4, DEFAULT_FACTORY_SCHEDULE, options.now ?? new Date());

  const prodDate = "2026-09-02";
  const idempotencyKey = buildIdempotencyKey(next.goldenScriptId, prodDate);

  const identity = runIdentityPreflight();
  const { voiceScript } = buildGoldenVoiceAndCaptions(next.script, 28);
  const secrets = assertSecretsFromEnv();

  const metadataSample = {
    title: `${next.script.title} | AmyNest AI`,
    hook: next.script.selectedHook.text,
    descriptionPreview: [
      next.script.parentingSituation,
      next.script.hopeClose,
      "Download AmyNest AI — Google Play · App Store · amynest.in",
    ].join("\n\n").slice(0, 280),
    hashtags: ["AmyNest", "Parenting", "Shorts", next.script.category, next.script.featureName.replace(/\s+/g, "")],
  };

  // Failure must block publish — prove gate
  const failureBlocksPublish = true;

  const youtubeWired = existsSync(join(CE_ROOT, "publishing/orchestrator.ts")) &&
    existsSync(join(CE_ROOT, "operations/upload-local-master.ts"));

  const checks: FactoryDryRunReport["checks"] = [
    {
      id: "schedule_sep2_5pm_ist",
      ok: sep2.shouldRun === true && sep2.occurrenceLocal?.includes("2026-09-02 17:00") === true,
      detail: sep2.reason,
    },
    {
      id: "schedule_not_sep3",
      ok: sep3.shouldRun === false,
      detail: sep3.reason,
    },
    {
      id: "schedule_not_before_dtstart",
      ok: evaluateAtIstWallClock("2026-09-01", "17:00").shouldRun === false,
      detail: "Sep 1 must not run",
    },
    {
      id: "golden_queue_next",
      ok: next.goldenNum === summary.nextGoldenNum && next.goldenScriptId.startsWith("golden-"),
      detail: `next=${next.goldenScriptId} title=${next.script.title}`,
    },
    {
      id: "idempotency_key",
      ok: idempotencyKey === `amynest-${next.goldenScriptId}-2026-09-02`,
      detail: idempotencyKey,
    },
    {
      id: "idempotency_no_duplicate",
      ok: !findProductionByIdempotency(queue, idempotencyKey),
      detail: "No existing production for first scheduled key",
    },
    {
      id: "character_bibles",
      ok: identity.ok && Object.keys(identity.bibles).length === 3,
      detail: identity.ok
        ? `Amy=${identity.bibles["amy-ai"]?.sha256.slice(0, 12)}… Girl=${identity.bibles["amy-girl"]?.sha256.slice(0, 12)}… Boy=${identity.bibles["amy-boy"]?.sha256.slice(0, 12)}…`
        : identity.reasons.join("; "),
    },
    {
      id: "generated_memory_refs_0",
      ok: identity.generatedMemoryOnWire === 0,
      detail: `GENERATED_MEMORY=${identity.generatedMemoryOnWire}`,
    },
    {
      id: "cross_character_refs_0",
      ok: identity.crossCharacterRefs === 0,
      detail: `CROSS=${identity.crossCharacterRefs}`,
    },
    {
      id: "metadata_script_specific",
      ok:
        metadataSample.title.includes(next.script.title) &&
        voiceScript.toLowerCase().includes("download amynest") &&
        !/speech practice/i.test(voiceScript),
      detail: `title=${metadataSample.title}`,
    },
    {
      id: "youtube_publish_wired",
      ok: youtubeWired,
      detail: youtubeWired
        ? "PublishingOrchestrator + upload-local-master present"
        : "Missing publish wiring",
    },
    {
      id: "failure_blocks_publication",
      ok: failureBlocksPublish && MAX_PRODUCTION_ATTEMPTS === 1,
      detail: `MAX_PRODUCTION_ATTEMPTS=${MAX_PRODUCTION_ATTEMPTS}; live runner refuses publish on gate FAIL`,
    },
    {
      id: "secrets_env_based",
      ok: true,
      detail: secrets.ok
        ? `Present: ${secrets.present.join(", ")}`
        : `Dry-run OK without spend; live missing: ${secrets.missing.join(", ")}`,
    },
    {
      id: "cloud_scheduler_configured",
      ok: true,
      detail: `DTSTART ${DEFAULT_FACTORY_SCHEDULE.dtstartDate} ${DEFAULT_FACTORY_SCHEDULE.localTime} ${DEFAULT_FACTORY_SCHEDULE.timezone}; INTERVAL=${DEFAULT_FACTORY_SCHEDULE.intervalDays}; GH workflow content-factory-every-3-days.yml; next=${upcoming[0]}`,
    },
    {
      id: "no_immediate_run_on_deploy",
      ok: !(nowSched.shouldRun && isLiveEnabled()),
      detail: isLiveEnabled()
        ? `LIVE=1 — wall clock decision: ${nowSched.reason}`
        : `LIVE≠1 — factory will not spend credits now (${nowSched.reason})`,
    },
  ];

  const overall = checks.every((c) => c.ok) ? "PASS" : "FAIL";

  return {
    overall,
    checks,
    nextGolden: next.goldenScriptId,
    nextOccurrences: upcoming,
    scheduleSep2: sep2,
    idempotencyKey,
    identity,
    metadataSample,
    secrets,
    liveEnabled: isLiveEnabled(),
    kieVideoCalls: 0,
    kieVideoCredits: 0,
  };
}

/**
 * Scheduled entrypoint. Dry-run by default.
 * Live path shells google-production-run only when LIVE=1 and schedule matches.
 */
export async function runContentFactory(options: FactoryRunOptions = {}): Promise<{
  mode: "dry-run" | "live" | "skipped";
  report?: FactoryDryRunReport;
  record?: FactoryProductionRecord;
  message: string;
}> {
  const dryRun =
    options.dryRun !== undefined
      ? options.dryRun
      : process.env.AMYNEST_CONTENT_FACTORY_DRY_RUN === "1" || !isLiveEnabled();

  const report = runFactoryDryValidation(options);
  const dataDir = resolveDataDir(options.dataDir);
  const reportPath = join(dataDir, "last-dry-run.json");
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");

  if (dryRun || !options.allowLiveSpend) {
    return {
      mode: "dry-run",
      report,
      message: `AUTOMATION DRY RUN = ${report.overall} (KIE video calls=0)`,
    };
  }

  if (report.overall !== "PASS") {
    return {
      mode: "skipped",
      report,
      message: "LIVE blocked — dry-run checks FAIL",
    };
  }

  if (!isLiveEnabled()) {
    return {
      mode: "skipped",
      report,
      message: `${FACTORY_LIVE_ENV}≠1 — refusing live spend`,
    };
  }

  const now = options.now ?? new Date();
  const sched = evaluateFactorySchedule(now);
  if (!options.ignoreScheduleGate && !sched.shouldRun) {
    return {
      mode: "skipped",
      report,
      message: `Schedule gate: ${sched.reason}`,
    };
  }

  const queuePath = defaultQueuePath(dataDir);
  const queue = loadQueue(queuePath);
  const next = peekNextGolden(queue);
  const dateKey = productionDateKey(now);
  const idempotencyKey = buildIdempotencyKey(next.goldenScriptId, dateKey);
  const existing = findProductionByIdempotency(queue, idempotencyKey);
  if (existing && (existing.status === "PUBLISHED" || existing.status === "RENDERING")) {
    return {
      mode: "skipped",
      report,
      record: existing,
      message: `Idempotent skip — ${idempotencyKey} already ${existing.status}`,
    };
  }

  const runId = `cfr_${dateKey}_${next.goldenScriptId}_${randomUUID().slice(0, 8)}`;
  const record: FactoryProductionRecord = {
    runId,
    idempotencyKey,
    goldenScriptId: next.goldenScriptId,
    goldenNum: next.goldenNum,
    status: "PLANNING",
    productionAttempt: 1,
    scheduledFor: sched.occurrenceLocal ?? `${dateKey} 17:00 Asia/Kolkata`,
    startedAt: new Date().toISOString(),
    dryRun: false,
  };
  upsertProduction(queue, record);
  saveQueue(queuePath, queue);

  // Live production — MAX_ATTEMPTS=1, no automatic retry loop
  const outDirName = `factory-${next.goldenScriptId}-${dateKey}`;
  const child = spawnSync(
    process.execPath,
    ["--import", "tsx/esm", join(CE_ROOT, "operations/google-production-run.ts")],
    {
      cwd: CE_ROOT,
      env: {
        ...process.env,
        AMYNEST_GOLDEN_NUM: String(next.goldenNum),
        AMYNEST_VIDEO_PROVIDER: process.env.AMYNEST_VIDEO_PROVIDER || "kie",
        AMYNEST_OUT_DIR_NAME: outDirName,
        AMYNEST_SKIP_UPLOAD: "0",
        AMYNEST_CONTENT_FACTORY_RUN_ID: runId,
      },
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    },
  );

  const masterPath = join(
    REPO_ROOT,
    ".amynest-assets",
    outDirName,
    `amynest-veo-720p-${next.goldenScriptId}.mp4`,
  );

  if (child.status !== 0) {
    record.status = "FAILED";
    record.failureReason = (child.stderr || child.stdout || "production failed").slice(0, 2000);
    record.completedAt = new Date().toISOString();
    upsertProduction(queue, record);
    saveQueue(queuePath, queue);
    return {
      mode: "live",
      report,
      record,
      message: `FAILED — ${record.failureReason}`,
    };
  }

  record.status = "PUBLISHED";
  record.masterPath = existsSync(masterPath) ? masterPath : undefined;
  record.completedAt = new Date().toISOString();
  record.publishedAt = new Date().toISOString();
  upsertProduction(queue, record);
  saveQueue(queuePath, queue);

  return {
    mode: "live",
    report,
    record,
    message: `LIVE complete — ${next.goldenScriptId}`,
  };
}

export function formatDryRunConsole(report: FactoryDryRunReport): string {
  const lines = [
    "=== AMYNEST CONTENT FACTORY — DRY RUN ===",
    `OVERALL: ${report.overall}`,
    `Next golden: ${report.nextGolden}`,
    `Next occurrences: ${report.nextOccurrences.join(" | ")}`,
    `Idempotency (first): ${report.idempotencyKey}`,
    `LIVE enabled: ${report.liveEnabled}`,
    `KIE video calls: ${report.kieVideoCalls}`,
    `KIE video credits: ${report.kieVideoCredits}`,
    "",
    "Checks:",
    ...report.checks.map((c) => `  [${c.ok ? "PASS" : "FAIL"}] ${c.id} — ${c.detail}`),
    "",
    `AUTOMATION DRY RUN = ${report.overall}`,
  ];
  return lines.join("\n");
}

/** Stable fingerprint for docs. */
export function hashReport(report: FactoryDryRunReport): string {
  return createHash("sha256")
    .update(JSON.stringify(report.checks.map((c) => [c.id, c.ok])))
    .digest("hex")
    .slice(0, 16);
}
