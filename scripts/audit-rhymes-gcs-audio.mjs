#!/usr/bin/env node
/**
 * Audit all Rhymes/ MP3 files in GCS — bitrate, sample rate, size, re-encode estimates.
 *
 *   node scripts/audit-rhymes-gcs-audio.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Storage } from "@google-cloud/storage";

const execFileAsync = promisify(execFile);
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(REPO, "lib/rhymes-audio/audit");
const CONCURRENCY = 8;

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

async function probeUrl(url) {
  const { stdout } = await execFileAsync(
    "ffprobe",
    [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      url,
    ],
    { maxBuffer: 2 * 1024 * 1024, timeout: 120_000 },
  );
  const data = JSON.parse(stdout);
  const audioStream = (data.streams ?? []).find((s) => s.codec_type === "audio") ?? data.streams?.[0];
  const fmt = data.format ?? {};
  const durationSec = Number(fmt.duration ?? audioStream?.duration ?? 0) || null;
  const formatBitrate = Number(fmt.bit_rate ?? 0) || null;
  const streamBitrate = Number(audioStream?.bit_rate ?? 0) || null;
  const bitrateKbps = Math.round((streamBitrate || formatBitrate || 0) / 1000) || null;
  const sampleRate = Number(audioStream?.sample_rate ?? 0) || null;
  const codec = audioStream?.codec_name ?? "unknown";
  const channels = Number(audioStream?.channels ?? 0) || null;

  return {
    durationSec,
    bitrateKbps,
    formatBitrateKbps: formatBitrate ? Math.round(formatBitrate / 1000) : null,
    sampleRateHz: sampleRate,
    codec,
    channels,
  };
}

function estimateSizeBytes(durationSec, kbps) {
  if (!durationSec || durationSec <= 0) return null;
  // CBR estimate: kbps * 1000 bits/s * duration / 8
  return Math.round((kbps * 1000 * durationSec) / 8);
}

async function analyzeEntry(entry) {
  if (!storage) throw new Error("GCS credentials required");

  const [url] = await storage.bucket(bucketId).file(entry.objectPath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 15 * 60 * 1000,
  });

  const [meta] = await storage.bucket(bucketId).file(entry.objectPath).getMetadata();
  const sizeBytes = Number(meta.size ?? entry.sizeBytes ?? 0);

  let probe;
  try {
    probe = await probeUrl(url);
  } catch (err) {
    return {
      id: entry.id,
      title: entry.title,
      objectPath: entry.objectPath,
      sizeBytes,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const durationSec = probe.durationSec;
  const impliedKbps =
    durationSec && durationSec > 0 ? Math.round((sizeBytes * 8) / (durationSec * 1000)) : null;

  const est128Mp3 = estimateSizeBytes(durationSec, 128);
  const est96Aac = estimateSizeBytes(durationSec, 96);

  return {
    id: entry.id,
    title: entry.title,
    objectPath: entry.objectPath,
    sizeBytes,
    sizeMb: Number((sizeBytes / (1024 * 1024)).toFixed(2)),
    durationSec: durationSec ? Number(durationSec.toFixed(1)) : null,
    durationMin: durationSec ? Number((durationSec / 60).toFixed(2)) : null,
    bitrateKbps: probe.bitrateKbps ?? impliedKbps,
    formatBitrateKbps: probe.formatBitrateKbps,
    impliedKbpsFromSize: impliedKbps,
    sampleRateHz: probe.sampleRateHz,
    codec: probe.codec,
    channels: probe.channels,
    estimate128KbpsMp3Bytes: est128Mp3,
    estimate128KbpsMp3Mb: est128Mp3 ? Number((est128Mp3 / (1024 * 1024)).toFixed(2)) : null,
    estimate96KbpsAacBytes: est96Aac,
    estimate96KbpsAacMb: est96Aac ? Number((est96Aac / (1024 * 1024)).toFixed(2)) : null,
    savings128KbpsBytes: est128Mp3 ? sizeBytes - est128Mp3 : null,
    savings96AacBytes: est96Aac ? sizeBytes - est96Aac : null,
    savings128KbpsPct: est128Mp3 ? Number(((1 - est128Mp3 / sizeBytes) * 100).toFixed(1)) : null,
    savings96AacPct: est96Aac ? Number(((1 - est96Aac / sizeBytes) * 100).toFixed(1)) : null,
  };
}

async function pool(items, fn, limit) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
      if ((idx + 1) % 20 === 0) {
        console.log(`[audit] ${idx + 1}/${items.length} probed`);
      }
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

function summarize(files) {
  const ok = files.filter((f) => !f.error);
  const sum = (key) => ok.reduce((a, f) => a + (f[key] ?? 0), 0);

  const totalCurrent = sum("sizeBytes");
  const total128 = sum("estimate128KbpsMp3Bytes");
  const total96 = sum("estimate96KbpsAacBytes");
  const totalDuration = ok.reduce((a, f) => a + (f.durationSec ?? 0), 0);

  const bitrates = ok.map((f) => f.bitrateKbps).filter((x) => x != null);
  const sampleRates = ok.map((f) => f.sampleRateHz).filter((x) => x != null);

  return {
    fileCount: files.length,
    probedOk: ok.length,
    failed: files.length - ok.length,
    totalCurrentBytes: totalCurrent,
    totalCurrentGb: Number((totalCurrent / (1024 ** 3)).toFixed(3)),
    totalCurrentMb: Number((totalCurrent / (1024 * 1024)).toFixed(1)),
    totalDurationSec: Number(totalDuration.toFixed(1)),
    totalDurationHours: Number((totalDuration / 3600).toFixed(2)),
    estimate128KbpsMp3TotalBytes: total128,
    estimate128KbpsMp3TotalMb: Number((total128 / (1024 * 1024)).toFixed(1)),
    estimate96KbpsAacTotalBytes: total96,
    estimate96KbpsAacTotalMb: Number((total96 / (1024 * 1024)).toFixed(1)),
    storageReduction128KbpsBytes: totalCurrent - total128,
    storageReduction128KbpsPct: Number(((1 - total128 / totalCurrent) * 100).toFixed(1)),
    storageReduction96AacBytes: totalCurrent - total96,
    storageReduction96AacPct: Number(((1 - total96 / totalCurrent) * 100).toFixed(1)),
    bandwidthReduction128KbpsPct: Number(((1 - total128 / totalCurrent) * 100).toFixed(1)),
    bandwidthReduction96AacPct: Number(((1 - total96 / totalCurrent) * 100).toFixed(1)),
    bitrateKbps: {
      min: Math.min(...bitrates),
      max: Math.max(...bitrates),
      avg: Math.round(bitrates.reduce((a, b) => a + b, 0) / bitrates.length),
      median: bitrates.sort((a, b) => a - b)[Math.floor(bitrates.length / 2)],
    },
    sampleRateHz: {
      unique: [...new Set(sampleRates)].sort((a, b) => a - b),
      mostCommon: mode(sampleRates),
    },
    avgCurrentKbpsFromSize: Math.round((totalCurrent * 8) / (totalDuration * 1000)),
  };
}

function mode(arr) {
  const counts = new Map();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = arr[0];
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return best;
}

function toCsv(files) {
  const headers = [
    "id",
    "title",
    "sizeBytes",
    "sizeMb",
    "durationSec",
    "bitrateKbps",
    "sampleRateHz",
    "codec",
    "channels",
    "estimate128KbpsMp3Bytes",
    "estimate128KbpsMp3Mb",
    "estimate96KbpsAacBytes",
    "estimate96KbpsAacMb",
    "savings128KbpsPct",
    "savings96AacPct",
  ];
  const esc = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = files.map((f) => headers.map((h) => esc(f[h])).join(","));
  return [headers.join(","), ...rows].join("\n");
}

async function main() {
  if (!storage) {
    console.error("GCS credentials required");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[audit] Probing ${registry.entries.length} files in gs://${bucketId}/Rhymes/`);

  const files = await pool(registry.entries, analyzeEntry, CONCURRENCY);
  files.sort((a, b) => a.title.localeCompare(b.title));

  const summary = summarize(files);
  const report = {
    generatedAt: new Date().toISOString(),
    bucket: bucketId,
    prefix: "Rhymes/",
    summary,
    files,
  };

  writeFileSync(join(OUT_DIR, "rhymes-gcs-audio-audit.json"), JSON.stringify(report, null, 2));
  writeFileSync(join(OUT_DIR, "rhymes-gcs-audio-audit.csv"), toCsv(files));
  writeFileSync(join(OUT_DIR, "rhymes-gcs-audio-audit-summary.json"), JSON.stringify(summary, null, 2));

  console.log("\n=== RHymes GCS Audio Audit Summary ===");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
