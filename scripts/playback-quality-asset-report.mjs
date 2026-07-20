#!/usr/bin/env node
/**
 * Offline asset report for Hear & Tap / CVC phonics clips (static catalog).
 * Resolves letters via getPhonicsAudioText (e.g. c → "k", q → "kw"), not bare letter keys.
 *
 * Usage: node scripts/playback-quality-asset-report.mjs [--base https://www.amynest.in]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const staticMapPath = join(
  repoRoot,
  "artifacts/kidschedule/src/data/static-audio-map.json",
);

const KEYS = [
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
  "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
  "sat", "cat", "bat",
];

const DEFAULT_API_BASE = "https://www.amynest.in";

const base =
  process.argv.includes("--base")
    ? process.argv[process.argv.indexOf("--base") + 1]
    : DEFAULT_API_BASE;

const { getPhonicsAudioText } = await import(
  pathToFileURL(join(repoRoot, "lib/phonics-sounds/src/index.ts")).href
);

function normalizeKey(text) {
  return (text ?? "").trim().toLowerCase();
}

const map = JSON.parse(readFileSync(staticMapPath, "utf8"));
const phonics = map.phonics ?? {};

function resolveMapKey(expected) {
  if (/^[a-z]$/.test(expected)) {
    const audioText = getPhonicsAudioText(expected);
    return { lookupKey: normalizeKey(audioText), audioText };
  }
  return { lookupKey: normalizeKey(expected), audioText: expected };
}

function proxyUrl(lookupKey) {
  const gcs = phonics[lookupKey] ?? null;
  if (!gcs || typeof gcs !== "string") return null;
  const hash = gcs.split("/").pop()?.replace(".mp3", "") ?? lookupKey;
  return `${base.replace(/\/$/, "")}/api/static-audio/${hash}.mp3`;
}

async function probe(url) {
  const started = Date.now();
  const res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-1" } });
  const contentType = res.headers.get("content-type") ?? "";
  const contentLength = res.headers.get("content-length");
  let durationSec = null;
  if (res.ok && contentLength && Number(contentLength) < 5_000_000) {
    const full = await fetch(url);
    const buf = Buffer.from(await full.arrayBuffer());
    durationSec = estimateMp3DurationSec(buf.length);
  }
  return {
    ok: res.ok,
    status: res.status,
    contentType,
    contentLength: contentLength ? Number(contentLength) : null,
    fetchMs: Date.now() - started,
    durationSecEstimate: durationSec,
  };
}

function estimateMp3DurationSec(bytes) {
  const bitrate = 64_000;
  return Math.round((bytes * 8) / bitrate * 100) / 100;
}

const rows = [];
for (const expected of KEYS) {
  const { lookupKey, audioText } = resolveMapKey(expected);
  const gcsUrl = phonics[lookupKey] ?? null;
  const url = proxyUrl(lookupKey);
  if (!url) {
    rows.push({
      expected,
      lookupKey,
      audioText,
      actualAsset: null,
      gcsUrl,
      proxyUrl: null,
      error: "missing_in_static_map",
    });
    continue;
  }
  try {
    const probeResult = await probe(url);
    rows.push({
      expected,
      lookupKey,
      audioText,
      actualAsset: url.split("/").pop(),
      gcsUrl,
      proxyUrl: url,
      ...probeResult,
    });
  } catch (err) {
    rows.push({
      expected,
      lookupKey,
      audioText,
      actualAsset: url.split("/").pop(),
      gcsUrl,
      proxyUrl: url,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

const outPath = join(__dirname, "playback-quality-asset-report.json");
writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), base, rows }, null, 2));
console.log(`Wrote ${outPath} (${rows.length} keys)`);
const missing = rows.filter((r) => r.error === "missing_in_static_map");
const failed = rows.filter((r) => r.ok === false);
if (missing.length) console.warn("Missing map keys:", missing.map((r) => r.expected).join(", "));
if (failed.length) console.warn("HTTP failures:", failed.map((r) => `${r.expected}:${r.status}`).join(", "));
