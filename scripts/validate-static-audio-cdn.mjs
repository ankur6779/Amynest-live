#!/usr/bin/env node
/**
 * Post-purge validation: every P0 curriculum static-audio URL must return a real MP3.
 *
 *   node scripts/validate-static-audio-cdn.mjs
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const urlsFile = join(repoRoot, "scripts/data/p0-cloudflare-purge-urls.txt");

const urls = readFileSync(urlsFile, "utf8")
  .split(/\n/)
  .map((l) => l.trim())
  .filter((l) => l.startsWith("http"));

const failures = [];
const rows = [];

function isMp3(buf) {
  if (buf.length < 3) return false;
  // ID3 or frame sync
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true;
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return true;
  return false;
}

for (const url of urls) {
  const r = await fetch(url, {
    headers: { "User-Agent": "AmyNest-CDN-Validate/1.0", "Cache-Control": "no-cache" },
  });
  const buf = Buffer.from(await r.arrayBuffer());
  const src = r.headers.get("x-amynest-static-source") || "";
  const cf = r.headers.get("cf-cache-status") || "";
  const ct = r.headers.get("content-type") || "";
  const cc = r.headers.get("cache-control") || "";
  const etag = r.headers.get("etag") || "";
  const hashMatch = url.match(/([a-f0-9]{32})/i)?.[1] ?? "";
  const sha = createHash("sha256").update(buf).digest("hex").slice(0, 12);

  const pass =
    r.status === 200 &&
    buf.length > 2000 &&
    src === "asset" &&
    /audio\/mpeg/i.test(ct) &&
    isMp3(buf);

  rows.push({
    hash: hashMatch.slice(0, 8),
    status: r.status,
    bytes: buf.length,
    src,
    cf,
    ct: ct.slice(0, 20),
    etag: etag.slice(0, 20),
    sha,
    pass: pass ? "PASS" : "FAIL",
  });

  if (!pass) {
    failures.push({
      url,
      status: r.status,
      bytes: buf.length,
      src,
      cf,
      ct,
      cc: cc.slice(0, 80),
      etag,
    });
  }
}

// Also verify cache-bust still matches canonical after purge (same size)
const sample = urls[0];
if (sample) {
  const a = await fetch(sample);
  const b = await fetch(`${sample}?cb=${Date.now()}`);
  const ab = Buffer.from(await a.arrayBuffer());
  const bb = Buffer.from(await b.arrayBuffer());
  const match = ab.length === bb.length && ab.length > 2000;
  console.log(
    `canonical_vs_bust: ${match ? "MATCH" : "MISMATCH"} canonical=${ab.length} bust=${bb.length} cf=${a.headers.get("cf-cache-status")}/${b.headers.get("cf-cache-status")}`,
  );
  if (!match) {
    failures.push({
      url: sample,
      reason: "canonical_vs_bust_mismatch",
      canonical: ab.length,
      bust: bb.length,
    });
  }
}

console.table(rows);
console.log(
  JSON.stringify(
    {
      total: urls.length,
      pass: rows.filter((r) => r.pass === "PASS").length,
      fail: failures.length,
    },
    null,
    2,
  ),
);

if (failures.length) {
  console.error("FAILURES:", JSON.stringify(failures, null, 2));
  process.exit(1);
}
console.log("CDN validation PASS — all P0 URLs serve real MP3 assets.");
