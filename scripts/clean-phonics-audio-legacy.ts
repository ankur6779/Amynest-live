/**
 * Phase 1 — Remove legacy phonics audio (local MP3s, demos, stale map entries).
 *
 *   pnpm run clean:phonics-audio-legacy
 *   pnpm run clean:phonics-audio-legacy -- --dry-run
 *
 * Writes migration log to scripts/logs/phonics-audio-cleanup-{timestamp}.json
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { REPO_ROOT } from "./phonics-library-io.js";

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.local`, override: true });

const LEGACY_PHONICS_DIR = join(REPO_ROOT, "artifacts/kidschedule/public/phonics-audio");
const STATIC_MAP_PATHS = [
  join(REPO_ROOT, "artifacts/kidschedule/src/data/static-audio-map.json"),
  join(REPO_ROOT, "artifacts/api-server/src/data/static-audio-map.json"),
];

type CleanupLog = {
  startedAt: string;
  dryRun: boolean;
  filesDeleted: Array<{ path: string; bytes: number }>;
  storageReclaimedBytes: number;
  staticMapPhonicsEntriesRemoved: number;
  staticMapDefaultPhonicsLegacyRemoved: number;
  orphanManifestRemoved: boolean;
  errors: string[];
};

const PHONICS_LEGACY_PATTERNS = [
  /^phonics_/,
  /^phoneme_/,
  /^word_/,
  / says (ah|buh|kuh|duh|eh|fff|guh|huh|ih|juh|lll|mmm|nnn|oh|puh|kwuh|rrr|sss|tuh|uh|vvv|wuh|ks|yuh|zzz)/,
  /^[a-z] says /,
  /^[a-z]\. [a-z]\. [a-z]\. /,
  /^sh says /,
  /^ch says /,
  /^th says /,
  /^ck says /,
  /^chuh$/,
  /^shhh$/,
  /^thhh$/,
  /^the word /,
];

function isLegacyPhonicsStaticKey(key: string, bucket: "default" | "phonics"): boolean {
  const norm = key.trim().toLowerCase();
  if (bucket === "phonics") return true;
  return PHONICS_LEGACY_PATTERNS.some((re) => re.test(norm));
}

function deleteTreeFiles(dir: string, dryRun: boolean, log: CleanupLog): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      deleteTreeFiles(full, dryRun, log);
      if (!dryRun) {
        try {
          rmSync(full, { recursive: true, force: true });
        } catch (err) {
          log.errors.push(`rm dir ${full}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      continue;
    }
    if (!name.endsWith(".mp3") && name !== "manifest.json") continue;
    log.filesDeleted.push({ path: full, bytes: st.size });
    log.storageReclaimedBytes += st.size;
    if (!dryRun) {
      try {
        unlinkSync(full);
      } catch (err) {
        log.errors.push(`unlink ${full}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}

function scrubStaticAudioMaps(dryRun: boolean, log: CleanupLog): void {
  for (const mapPath of STATIC_MAP_PATHS) {
    if (!existsSync(mapPath)) continue;
    const raw = JSON.parse(readFileSync(mapPath, "utf8")) as {
      default?: Record<string, string>;
      phonics?: Record<string, string>;
    };

    const nextDefault: Record<string, string> = {};
    let defaultRemoved = 0;
    for (const [key, url] of Object.entries(raw.default ?? {})) {
      if (isLegacyPhonicsStaticKey(key, "default")) {
        defaultRemoved += 1;
        continue;
      }
      nextDefault[key] = url;
    }

    const phonicsCount = Object.keys(raw.phonics ?? {}).length;
    log.staticMapPhonicsEntriesRemoved += phonicsCount;
    log.staticMapDefaultPhonicsLegacyRemoved += defaultRemoved;

    if (!dryRun) {
      writeFileSync(
        mapPath,
        `${JSON.stringify({ default: nextDefault, phonics: {} }, null, 2)}\n`,
        "utf8",
      );
    }
  }
}

function resetLegacyManifest(dryRun: boolean, log: CleanupLog): void {
  const manifestPath = join(LEGACY_PHONICS_DIR, "manifest.json");
  if (!existsSync(manifestPath)) return;
  log.orphanManifestRemoved = true;
  if (!dryRun) {
    try {
      unlinkSync(manifestPath);
    } catch (err) {
      log.errors.push(`manifest: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function cleanDatabaseOrphans(dryRun: boolean, log: CleanupLog): Promise<void> {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    log.errors.push("DATABASE_URL not set — skipped DB orphan cleanup (phonics_content.audio_url, tts_cache phonics keys)");
    return;
  }

  try {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: dbUrl });
    await client.connect();

    if (!dryRun) {
      const contentRes = await client.query(
        `UPDATE phonics_content SET audio_url = NULL WHERE audio_url IS NOT NULL`,
      );
      log.errors.push(`DB: cleared ${contentRes.rowCount ?? 0} phonics_content.audio_url rows`);

      const ttsRes = await client.query(
        `DELETE FROM tts_cache WHERE cache_key LIKE 'phonics:%' OR cache_key LIKE '%mode=phonics%'`,
      );
      log.errors.push(`DB: removed ${ttsRes.rowCount ?? 0} phonics tts_cache rows`);
    }

    await client.end();
  } catch (err) {
    log.errors.push(`DB cleanup failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const log: CleanupLog = {
    startedAt: new Date().toISOString(),
    dryRun,
    filesDeleted: [],
    storageReclaimedBytes: 0,
    staticMapPhonicsEntriesRemoved: 0,
    staticMapDefaultPhonicsLegacyRemoved: 0,
    orphanManifestRemoved: false,
    errors: [],
  };

  console.log(`[clean:phonics-audio-legacy] ${dryRun ? "DRY RUN" : "LIVE"} — removing legacy phonics audio`);

  deleteTreeFiles(join(LEGACY_PHONICS_DIR, "demos"), dryRun, log);
  deleteTreeFiles(LEGACY_PHONICS_DIR, dryRun, log);
  resetLegacyManifest(dryRun, log);
  scrubStaticAudioMaps(dryRun, log);
  await cleanDatabaseOrphans(dryRun, log);

  const logsDir = join(REPO_ROOT, "scripts/logs");
  mkdirSync(logsDir, { recursive: true });
  const logPath = join(
    logsDir,
    `phonics-audio-cleanup-${createHash("sha256").update(log.startedAt).digest("hex").slice(0, 8)}.json`,
  );
  writeFileSync(logPath, `${JSON.stringify(log, null, 2)}\n`, "utf8");

  console.log(`[clean:phonics-audio-legacy] files deleted: ${log.filesDeleted.length}`);
  console.log(`[clean:phonics-audio-legacy] storage reclaimed: ${(log.storageReclaimedBytes / 1024).toFixed(1)} KB`);
  console.log(
    `[clean:phonics-audio-legacy] static map — phonics bucket cleared: ${log.staticMapPhonicsEntriesRemoved}, legacy default keys: ${log.staticMapDefaultPhonicsLegacyRemoved}`,
  );
  console.log(`[clean:phonics-audio-legacy] migration log: ${logPath}`);

  if (log.errors.length > 0) {
    console.warn("[clean:phonics-audio-legacy] notes:");
    for (const e of log.errors) console.warn(`  - ${e}`);
  }

  if (!dryRun) {
    console.log(
      "\nNext: ELEVENLABS_API_KEY=... GCS credentials set → pnpm run generate:phonics-library -- --force\n",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
