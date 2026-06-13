/**
 * Phase 2B certification — sample reel streams via Worker → GCS.
 *
 * Usage:
 *   pnpm run verify:reels-phase2b
 *   pnpm run verify:reels-phase2b -- --base https://www.amynest.in
 *
 * PASS requires REELS_GCS_ORIGIN=1 on Worker + GCS_SERVICE_ACCOUNT_JSON secret.
 */
import { readFileSync } from "node:fs";
import { randomInt } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_BASE = "https://www.amynest.in";
const SAMPLE_SIZE = 100;

function parseArgs() {
  const baseIdx = process.argv.indexOf("--base");
  const base = baseIdx >= 0 ? process.argv[baseIdx + 1] : DEFAULT_BASE;
  return { base: (base ?? DEFAULT_BASE).replace(/\/$/, "") };
}

function isValidMp4(buf) {
  return buf.length >= 12 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70;
}

function loadCatalogIds() {
  const path = join(REPO_ROOT, "content-bank/reels/phase1/catalog.v1.json");
  const catalog = JSON.parse(readFileSync(path, "utf8"));
  return catalog.entries.filter((e) => e.active !== false).map((e) => e.id);
}

async function probe(base, id) {
  const url = `${base}/api/reels/stream/${encodeURIComponent(id)}`;
  const head = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(25000) });
  const range = await fetch(url, {
    headers: { Range: "bytes=0-8191" },
    signal: AbortSignal.timeout(25000),
  });
  const buf = Buffer.from(await range.arrayBuffer());

  const renderOrigin = head.headers.get("x-render-origin-server");
  const reelsOrigin = head.headers.get("x-amynest-reels-origin");
  const reelsCache = head.headers.get("x-amynest-reels-cache");

  const ok =
    head.ok &&
    (range.ok || range.status === 206) &&
    isValidMp4(buf) &&
    reelsOrigin === "GCS" &&
    !renderOrigin;

  return {
    id,
    ok,
    headStatus: head.status,
    rangeStatus: range.status,
    headLen: head.headers.get("content-length"),
    contentType: head.headers.get("content-type"),
    contentRange: range.headers.get("content-range"),
    acceptRanges: head.headers.get("accept-ranges"),
    reelsOrigin,
    reelsCache,
    renderOrigin,
    validMp4: isValidMp4(buf),
  };
}

async function main() {
  const { base } = parseArgs();
  const ids = loadCatalogIds();
  const n = Math.min(SAMPLE_SIZE, ids.length);
  const picked = new Set();
  while (picked.size < n) picked.add(randomInt(ids.length));

  const results = [];
  let failures = 0;
  for (const idx of picked) {
    const id = ids[idx];
    try {
      const r = await probe(base, id);
      if (!r.ok) failures += 1;
      results.push(r);
    } catch (e) {
      failures += 1;
      results.push({
        id,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const pass = failures === 0;
  console.log(
    JSON.stringify(
      {
        base,
        sampleSize: n,
        failures,
        passRate: Math.round(((n - failures) / n) * 10000) / 100,
        pass,
        gcsOriginCount: results.filter((r) => r.reelsOrigin === "GCS").length,
        renderLeakCount: results.filter((r) => r.renderOrigin).length,
        failureExamples: results.filter((r) => !r.ok).slice(0, 15),
      },
      null,
      2,
    ),
  );
  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
