#!/usr/bin/env node
/** ffprobe signed rhyme URLs for duration/mime validity */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROD = "https://www.amynest.in";
const IDS = [
  "beneath-the-moss-blanket",
  "beyond-the-rainbow",
  "little-star-shine-bright",
  "london-bridge-piano-version",
];

async function getSignedUrl(id) {
  const res = await fetch(`${PROD}/api/audio/signed-url/${encodeURIComponent(id)}`);
  const data = await res.json();
  return { apiStatus: res.status, url: data.url || data.signedUrl };
}

async function ffprobe(url) {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", url,
    ], { maxBuffer: 10 * 1024 * 1024 });
    const j = JSON.parse(stdout);
    const stream = j.streams?.[0];
    return {
      ok: true,
      durationSec: Number(j.format?.duration ?? 0),
      codec: stream?.codec_name,
      mime: j.format?.format_name,
      bitrate: Number(j.format?.bit_rate ?? 0),
    };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 200) };
  }
}

const results = [];
for (const id of IDS) {
  const { apiStatus, url } = await getSignedUrl(id);
  const head = url ? await fetch(url, { method: "HEAD" }).then((r) => ({
    status: r.status,
    contentType: r.headers.get("content-type"),
    bytes: Number(r.headers.get("content-length") || 0),
  })) : null;
  const probe = url ? await ffprobe(url) : { ok: false, error: "no_signed_url" };
  results.push({ id, apiStatus, signedUrlTail: url?.slice(-80), head, ffprobe: probe });
}

const corrupt = results.filter((r) => !r.ffprobe.ok).length;
const out = { validatedAt: new Date().toISOString(), corruptCount: corrupt, assets: results };
writeFileSync(join(REPO, "audit", "blocker-d-rhyme-ffprobe.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ corruptCount: corrupt }, null, 2));
