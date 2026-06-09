#!/usr/bin/env node
/**
 * Batch re-encode Rhymes/*.mp3 → Rhymes-128/*.mp3 (128 kbps CBR, 44.1 kHz stereo).
 * Downloads originals from GCS, encodes locally, uploads to staging prefix, generates reports.
 *
 *   node scripts/reencode-rhymes-gcs-audio.mjs
 *   node scripts/reencode-rhymes-gcs-audio.mjs --dry-run
 *   node scripts/reencode-rhymes-gcs-audio.mjs --skip-upload
 *   node scripts/reencode-rhymes-gcs-audio.mjs --limit 5
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  statSync,
} from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Storage } from "@google-cloud/storage";

const execFileAsync = promisify(execFile);
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(REPO, "lib/rhymes-audio/audit");
const STAGING_ORIG = join(REPO, "lib/rhymes-audio/staging/Rhymes");
const STAGING_128 = join(REPO, "lib/rhymes-audio/staging/Rhymes-128");
const SRC_PREFIX = "Rhymes/";
const DST_PREFIX = "Rhymes-128/";
const QUALITY_DURATION_TOLERANCE_SEC = 0.5;
const QUALITY_RANDOM_SAMPLE = 20;
const QUALITY_SEED = 20260609;

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    skipDownload: false,
    skipEncode: false,
    skipUpload: false,
    uploadOnly: false,
    qualityOnly: false,
    retryFailed: false,
    force: false,
    limit: null,
    concurrency: 2,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--skip-download") opts.skipDownload = true;
    else if (a === "--skip-encode") opts.skipEncode = true;
    else if (a === "--skip-upload") opts.skipUpload = true;
    else if (a === "--upload-only") opts.uploadOnly = true;
    else if (a === "--quality-only") opts.qualityOnly = true;
    else if (a === "--retry-failed") opts.retryFailed = true;
    else if (a === "--force") opts.force = true;
    else if (a === "--limit" && argv[i + 1]) opts.limit = Number(argv[++i]);
    else if (a === "--concurrency" && argv[i + 1]) opts.concurrency = Number(argv[++i]);
  }
  return opts;
}

function tryParseJsonObject(raw) {
  const t = raw.trim();
  for (const s of [t, t.replace(/\\n/g, "\n"), t.replace(/\\"/g, '"')]) {
    try {
      return JSON.parse(s);
    } catch {
      /* next */
    }
  }
  try {
    return JSON.parse(Buffer.from(t, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function loadEnvFile(name) {
  try {
    const text = readFileSync(join(REPO, name), "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile("Amynest-backend-dykj.env");
loadEnvFile(".env.development");

const creds = tryParseJsonObject(process.env.GCS_SERVICE_ACCOUNT_JSON?.trim() ?? "");
const bucketId =
  process.env.GCS_BUCKET_NAME?.trim() ||
  process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim() ||
  "amynest-audio-storage";

const registry = JSON.parse(
  readFileSync(join(REPO, "lib/rhymes-audio/src/rhymes-gcs-registry.json"), "utf8"),
);

const storage = creds
  ? new Storage({
      credentials: creds,
      projectId: typeof creds.project_id === "string" ? creds.project_id : undefined,
    })
  : null;

function objectBasename(objectPath) {
  return basename(objectPath);
}

function dstObjectPath(srcObjectPath) {
  if (!srcObjectPath.startsWith(SRC_PREFIX)) {
    throw new Error(`Unexpected object path: ${srcObjectPath}`);
  }
  return DST_PREFIX + srcObjectPath.slice(SRC_PREFIX.length);
}

async function probeFile(filePath) {
  const { stdout } = await execFileAsync(
    "ffprobe",
    ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filePath],
    { maxBuffer: 2 * 1024 * 1024, timeout: 120_000 },
  );
  const data = JSON.parse(stdout);
  const audioStream = (data.streams ?? []).find((s) => s.codec_type === "audio") ?? data.streams?.[0];
  const fmt = data.format ?? {};
  const durationSec = Number(fmt.duration ?? audioStream?.duration ?? 0) || null;
  const bitrate = Number(audioStream?.bit_rate ?? fmt.bit_rate ?? 0) || null;
  const sampleRate = Number(audioStream?.sample_rate ?? 0) || null;
  return {
    durationSec,
    bitrateKbps: bitrate ? Math.round(bitrate / 1000) : null,
    sampleRateHz: sampleRate,
    codec: audioStream?.codec_name ?? "unknown",
    channels: Number(audioStream?.channels ?? 0) || null,
  };
}

async function decodeValid(filePath) {
  try {
    await execFileAsync(
      "ffmpeg",
      ["-v", "error", "-i", filePath, "-f", "null", "-"],
      { maxBuffer: 4 * 1024 * 1024, timeout: 180_000 },
    );
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function measurePeakDb(filePath) {
  try {
    const { stderr } = await execFileAsync(
      "ffmpeg",
      ["-hide_banner", "-i", filePath, "-af", "volumedetect", "-f", "null", "-"],
      { maxBuffer: 4 * 1024 * 1024, timeout: 180_000 },
    );
    const text = stderr ?? "";
    const m = text.match(/max_volume:\s*([-\d.]+)\s*dB/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

async function reencodeMp3(inputPath, outputPath) {
  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inputPath,
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "128k",
      "-ar",
      "44100",
      "-ac",
      "2",
      "-map_metadata",
      "0",
      outputPath,
    ],
    { maxBuffer: 4 * 1024 * 1024, timeout: 600_000 },
  );
}

async function downloadFromGcs(objectPath, localPath, expectedSizeBytes) {
  await storage.bucket(bucketId).file(objectPath).download({ destination: localPath });
  const got = statSync(localPath).size;
  if (expectedSizeBytes > 0 && got < expectedSizeBytes * 0.9) {
    throw new Error(`incomplete_download: got ${got} expected ~${expectedSizeBytes}`);
  }
}

async function uploadToGcs(localPath, objectPath, sizeBytes) {
  await storage.bucket(bucketId).upload(localPath, {
    destination: objectPath,
    metadata: {
      contentType: "audio/mpeg",
      metadata: {
        sourcePrefix: SRC_PREFIX,
        encodedBitrateKbps: "128",
        encodedSampleRateHz: "44100",
      },
    },
  });
  return sizeBytes;
}

async function gcsExists(objectPath) {
  const [ok] = await storage.bucket(bucketId).file(objectPath).exists();
  return ok;
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function pickQualitySampleIds(reportFiles) {
  const sorted = [...reportFiles].sort((a, b) => a.originalSizeBytes - b.originalSizeBytes);
  const picks = new Map();
  if (sorted.length === 0) return picks;

  picks.set(sorted[0].id, "smallest");
  picks.set(sorted[Math.floor(sorted.length / 2)].id, "median");
  picks.set(sorted[sorted.length - 1].id, "largest");

  const rng = seededRandom(QUALITY_SEED);
  const pool = sorted.filter((f) => !picks.has(f.id));
  for (let i = 0; i < QUALITY_RANDOM_SAMPLE && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    picks.set(pool.splice(idx, 1)[0].id, "random");
  }
  return picks;
}

async function runQualityAudit(reportFiles, localById) {
  const sampleMap = pickQualitySampleIds(reportFiles);
  const samples = [];

  for (const [id, reason] of sampleMap) {
    const row = reportFiles.find((f) => f.id === id);
    const paths = localById.get(id);
    if (!row || !paths) continue;

    const [origProbe, newProbe] = await Promise.all([
      probeFile(paths.original),
      probeFile(paths.encoded),
    ]);
    const [origDecode, newDecode] = await Promise.all([
      decodeValid(paths.original),
      decodeValid(paths.encoded),
    ]);
    const [origPeak, newPeak] = await Promise.all([
      measurePeakDb(paths.original),
      measurePeakDb(paths.encoded),
    ]);

    const durationDelta =
      origProbe.durationSec != null && newProbe.durationSec != null
        ? Math.abs(origProbe.durationSec - newProbe.durationSec)
        : null;

    const durationUnchanged =
      durationDelta != null && durationDelta <= QUALITY_DURATION_TOLERANCE_SEC;
    const playbackValid = origDecode.ok && newDecode.ok;
    const clippingDetected = newPeak != null && newPeak >= -0.1;
    const noCorruption = newDecode.ok && newProbe.durationSec != null && newProbe.durationSec > 0;

    samples.push({
      id,
      title: row.title,
      sampleReason: reason,
      originalDurationSec: origProbe.durationSec,
      encodedDurationSec: newProbe.durationSec,
      durationDeltaSec: durationDelta != null ? Number(durationDelta.toFixed(3)) : null,
      durationUnchanged,
      originalPeakDb: origPeak,
      encodedPeakDb: newPeak,
      clippingDetected,
      playbackValid,
      noCorruption,
      originalBitrateKbps: origProbe.bitrateKbps,
      encodedBitrateKbps: newProbe.bitrateKbps,
      encodedSampleRateHz: newProbe.sampleRateHz,
      encodedChannels: newProbe.channels,
      pass: durationUnchanged && playbackValid && !clippingDetected && noCorruption,
    });
  }

  const passed = samples.filter((s) => s.pass).length;
  return {
    generatedAt: new Date().toISOString(),
    toleranceDurationSec: QUALITY_DURATION_TOLERANCE_SEC,
    randomSampleCount: QUALITY_RANDOM_SAMPLE,
    seed: QUALITY_SEED,
    sampleCount: samples.length,
    passed,
    failed: samples.length - passed,
    allPassed: passed === samples.length,
    samples,
  };
}

function toCsv(rows) {
  const headers = [
    "id",
    "title",
    "originalSizeBytes",
    "originalSizeMb",
    "newSizeBytes",
    "newSizeMb",
    "durationSec",
    "reductionPct",
    "originalBitrateKbps",
    "newBitrateKbps",
    "gcsObjectPath",
    "uploaded",
    "error",
  ];
  const esc = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

function summarize(rows) {
  const ok = rows.filter((r) => !r.error);
  const sum = (key) => ok.reduce((a, r) => a + (r[key] ?? 0), 0);
  const totalOrig = sum("originalSizeBytes");
  const totalNew = sum("newSizeBytes");
  return {
    fileCount: rows.length,
    encodedOk: ok.length,
    failed: rows.length - ok.length,
    totalOriginalBytes: totalOrig,
    totalOriginalMb: Number((totalOrig / (1024 * 1024)).toFixed(1)),
    totalNewBytes: totalNew,
    totalNewMb: Number((totalNew / (1024 * 1024)).toFixed(1)),
    totalReductionBytes: totalOrig - totalNew,
    totalReductionMb: Number(((totalOrig - totalNew) / (1024 * 1024)).toFixed(1)),
    totalReductionPct: totalOrig > 0 ? Number(((1 - totalNew / totalOrig) * 100).toFixed(1)) : 0,
    bandwidthReductionPct: totalOrig > 0 ? Number(((1 - totalNew / totalOrig) * 100).toFixed(1)) : 0,
    targetMb: 284,
    targetDeltaMb: Number((totalNew / (1024 * 1024) - 284).toFixed(1)),
  };
}

async function processEntry(entry, opts, localById) {
  const name = objectBasename(entry.objectPath);
  const origLocal = join(STAGING_ORIG, name);
  const encLocal = join(STAGING_128, name);
  const gcsDst = dstObjectPath(entry.objectPath);

  const row = {
    id: entry.id,
    title: entry.title,
    originalSizeBytes: entry.sizeBytes,
    originalSizeMb: Number((entry.sizeBytes / (1024 * 1024)).toFixed(2)),
    newSizeBytes: null,
    newSizeMb: null,
    durationSec: null,
    reductionPct: null,
    originalBitrateKbps: null,
    newBitrateKbps: null,
    gcsObjectPath: gcsDst,
    uploaded: false,
    error: null,
  };

  try {
    if (opts.dryRun) {
      row.durationSec = entry.durationSec;
      row.newSizeBytes = Math.round((128 * 1000 * (entry.durationSec ?? 108)) / 8);
      row.newSizeMb = Number((row.newSizeBytes / (1024 * 1024)).toFixed(2));
      row.reductionPct = Number(((1 - row.newSizeBytes / entry.sizeBytes) * 100).toFixed(1));
      return row;
    }

    if (!opts.uploadOnly) {
      if (!opts.skipDownload) {
        const needDownload = opts.force || !existsSync(origLocal);
        if (needDownload) {
          await downloadFromGcs(entry.objectPath, origLocal, entry.sizeBytes);
        } else if (existsSync(origLocal) && statSync(origLocal).size < entry.sizeBytes * 0.9) {
          await downloadFromGcs(entry.objectPath, origLocal, entry.sizeBytes);
        }
      } else if (!existsSync(origLocal)) {
        throw new Error("missing_local_original");
      }

      if (!opts.skipEncode) {
        const needEncode = opts.force || !existsSync(encLocal);
        if (needEncode) {
          await reencodeMp3(origLocal, encLocal);
        }
      } else if (!existsSync(encLocal)) {
        throw new Error("missing_local_encoded");
      }

      const origProbe = await probeFile(origLocal);
      const newProbe = await probeFile(encLocal);
      const newStat = statSync(encLocal);

      row.durationSec = origProbe.durationSec ? Number(origProbe.durationSec.toFixed(1)) : null;
      row.originalBitrateKbps = origProbe.bitrateKbps;
      row.newBitrateKbps = newProbe.bitrateKbps;
      row.newSizeBytes = newStat.size;
      row.newSizeMb = Number((newStat.size / (1024 * 1024)).toFixed(2));
      row.reductionPct = Number(((1 - newStat.size / entry.sizeBytes) * 100).toFixed(1));

      localById.set(entry.id, { original: origLocal, encoded: encLocal });
    } else {
      if (!existsSync(encLocal)) throw new Error("missing_local_encoded_for_upload");
      const newStat = statSync(encLocal);
      row.newSizeBytes = newStat.size;
      row.newSizeMb = Number((newStat.size / (1024 * 1024)).toFixed(2));
      row.reductionPct = Number(((1 - newStat.size / entry.sizeBytes) * 100).toFixed(1));
      const newProbe = await probeFile(encLocal);
      row.durationSec = newProbe.durationSec ? Number(newProbe.durationSec.toFixed(1)) : null;
      row.newBitrateKbps = newProbe.bitrateKbps;
      localById.set(entry.id, { original: origLocal, encoded: encLocal });
    }

    if (!opts.skipUpload) {
      const already = await gcsExists(gcsDst);
      if (!already || opts.force) {
        await uploadToGcs(encLocal, gcsDst, row.newSizeBytes);
      }
      row.uploaded = true;
    }
  } catch (err) {
    row.error = err instanceof Error ? err.message : String(err);
  }

  return row;
}

async function pool(items, fn, limit) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
      if ((idx + 1) % 10 === 0 || idx + 1 === items.length) {
        console.log(`[reencode] ${idx + 1}/${items.length} processed`);
      }
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

async function main() {
  const opts = parseArgs(process.argv);

  if (!storage && !opts.dryRun) {
    console.error("[reencode] GCS credentials required (set GCS_SERVICE_ACCOUNT_JSON)");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(STAGING_ORIG, { recursive: true });
  mkdirSync(STAGING_128, { recursive: true });

  let entries = registry.entries;
  if (opts.retryFailed) {
    const priorPath = join(OUT_DIR, "rhymes-reencode-report.json");
    if (!existsSync(priorPath)) {
      console.error("[reencode] --retry-failed requires rhymes-reencode-report.json");
      process.exit(1);
    }
    const prior = JSON.parse(readFileSync(priorPath, "utf8"));
    const failedIds = new Set(prior.files.filter((f) => f.error).map((f) => f.id));
    entries = entries.filter((e) => failedIds.has(e.id));
    opts.force = true;
    console.log(`[reencode] Retrying ${entries.length} failed file(s)`);
  }
  if (opts.limit != null && opts.limit > 0) {
    entries = entries.slice(0, opts.limit);
  }

  console.log(
    `[reencode] ${entries.length} files | dryRun=${opts.dryRun} upload=${!opts.skipUpload} concurrency=${opts.concurrency}`,
  );

  const localById = new Map();
  let rows;

  if (opts.qualityOnly) {
    const existing = join(OUT_DIR, "rhymes-reencode-report.json");
    if (!existsSync(existing)) {
      console.error("[reencode] --quality-only requires rhymes-reencode-report.json");
      process.exit(1);
    }
    rows = JSON.parse(readFileSync(existing, "utf8")).files;
    for (const row of rows.filter((r) => !r.error)) {
      const entry = registry.entries.find((e) => e.id === row.id);
      if (!entry) continue;
      const name = objectBasename(entry.objectPath);
      const orig = join(STAGING_ORIG, name);
      const enc = join(STAGING_128, name);
      if (existsSync(orig) && existsSync(enc)) {
        localById.set(row.id, { original: orig, encoded: enc });
      }
    }
  } else {
    rows = await pool(entries, (e) => processEntry(e, opts, localById), opts.concurrency);
    if (opts.retryFailed && existsSync(join(OUT_DIR, "rhymes-reencode-report.json"))) {
      const prior = JSON.parse(readFileSync(join(OUT_DIR, "rhymes-reencode-report.json"), "utf8"));
      const retried = new Map(rows.map((r) => [r.id, r]));
      rows = prior.files.map((r) => retried.get(r.id) ?? r);
    }
  }

  rows.sort((a, b) => a.title.localeCompare(b.title));
  const summary = summarize(rows);

  const report = {
    generatedAt: new Date().toISOString(),
    bucket: bucketId,
    sourcePrefix: SRC_PREFIX,
    destinationPrefix: DST_PREFIX,
    encoding: { codec: "mp3", bitrateKbps: 128, sampleRateHz: 44100, channels: 2, mode: "cbr" },
    options: opts,
    summary,
    files: rows,
  };

  writeFileSync(join(OUT_DIR, "rhymes-reencode-report.json"), JSON.stringify(report, null, 2));
  writeFileSync(join(OUT_DIR, "rhymes-reencode-report.csv"), toCsv(rows));

  console.log("\n=== Rhymes Re-encode Summary ===");
  console.log(JSON.stringify(summary, null, 2));

  if (!opts.dryRun && rows.some((r) => !r.error)) {
    const quality = await runQualityAudit(rows.filter((r) => !r.error), localById);
    writeFileSync(join(OUT_DIR, "rhymes-reencode-quality-audit.json"), JSON.stringify(quality, null, 2));
    console.log("\n=== Quality Audit ===");
    console.log(`samples=${quality.sampleCount} passed=${quality.passed} failed=${quality.failed} allPassed=${quality.allPassed}`);
    if (quality.failed > 0) {
      for (const s of quality.samples.filter((x) => !x.pass)) {
        console.warn(`  FAIL ${s.title}: duration=${s.durationUnchanged} playback=${s.playbackValid} clip=${s.clippingDetected}`);
      }
    }
  }

  const failed = rows.filter((r) => r.error);
  if (failed.length > 0 && !opts.qualityOnly) {
    console.warn(`\n[reencode] ${failed.length} file(s) failed`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
