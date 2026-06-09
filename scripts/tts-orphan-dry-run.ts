/**
 * TTS GCS orphan cleanup — dry-run report (no deletes).
 *
 * Local (needs DATABASE_URL + GCS creds):
 *   pnpm run tts-orphan:dry-run
 *
 * Remote (admin Firebase JWT):
 *   ADMIN_AUTH_TOKEN=... API_URL=https://amynest-backend-dykj.onrender.com pnpm run tts-orphan:dry-run -- --remote
 */
import { config } from "dotenv";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: join(ROOT, ".env.development") });
config({ path: join(ROOT, ".env") });

const remote = process.argv.includes("--remote");
const API_URL = (
  process.env.API_URL ??
  process.env.API_PUBLIC_URL ??
  "https://amynest-backend-dykj.onrender.com"
).replace(/\/$/, "");

type Result = {
  ok?: boolean;
  scanned: number;
  orphans: number;
  deleted: number;
  dryRun: boolean;
};

async function runRemote(): Promise<Result> {
  const token =
    process.env.ADMIN_AUTH_TOKEN ??
    process.env.COACH_STRESS_AUTH_TOKEN ??
    process.env.STABILITY_AUTH_TOKEN ??
    "";
  if (!token.trim()) {
    console.error(
      "ADMIN_AUTH_TOKEN required for --remote (Firebase ID token from signed-in admin session).",
    );
    process.exit(1);
  }

  const res = await fetch(`${API_URL}/api/admin/tts-orphan-cleanup`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ dryRun: true }),
    signal: AbortSignal.timeout(120_000),
  });

  const body = (await res.json().catch(() => ({}))) as Result & { error?: string };
  if (!res.ok) {
    console.error(`Remote dry-run failed HTTP ${res.status}:`, body);
    process.exit(1);
  }
  return body;
}

async function runLocal(): Promise<Result> {
  process.env.TTS_ORPHAN_CLEANUP_DRY_RUN = "1";
  const { runTtsOrphanCleanup } = await import(
    "../artifacts/api-server/src/services/ttsOrphanCleanup.js"
  );
  return runTtsOrphanCleanup({ dryRun: true, batchSize: Number(process.env.TTS_ORPHAN_CLEANUP_BATCH ?? "200") });
}

function printReport(result: Result, mode: string): void {
  console.log("\n🧹 TTS orphan cleanup — dry run");
  console.log(`   mode:     ${mode}`);
  console.log(`   dryRun:   ${result.dryRun}`);
  console.log(`   scanned:  ${result.scanned} GCS object(s) in batch`);
  console.log(`   orphans:  ${result.orphans} (no Postgres tts_cache row)`);
  console.log(`   deleted:  ${result.deleted} (must be 0 in dry-run)\n`);

  if (result.deleted > 0) {
    console.error("❌ FAIL: dry-run must not delete objects.");
    process.exit(1);
  }

  if (result.scanned === 0) {
    console.warn("⚠️  No tts-cache/ objects scanned — check TTS_USE_GCS + GCS credentials.");
  } else if (result.orphans === 0) {
    console.log("✅ PASS: no orphans in this batch (GCS ↔ Postgres aligned).\n");
  } else {
    const pct = ((result.orphans / result.scanned) * 100).toFixed(1);
    console.log(`ℹ️  ${result.orphans}/${result.scanned} (${pct}%) would be deleted when live.`);
    console.log("   Review logs for tts.orphan_would_delete before setting DRY_RUN=0.\n");
  }
}

async function main(): Promise<void> {
  if (remote) {
    printReport(await runRemote(), `remote ${API_URL}`);
    return;
  }
  printReport(await runLocal(), "local (DATABASE_URL + GCS env)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
