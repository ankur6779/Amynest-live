#!/usr/bin/env node
/**
 * Verify Layer 3 edge CDN — second fetch should show X-AmyNest-Edge-Cache: HIT
 * after Cloudflare worker deploy with audio caching.
 *
 * Usage: node scripts/verify-audio-edge-cache.mjs [--base https://www.amynest.in]
 */
const base = (
  process.argv.includes("--base")
    ? process.argv[process.argv.indexOf("--base") + 1]
    : "https://www.amynest.in"
).replace(/\/$/, "");

const sample =
  "/api/static-audio/f6b24e6cd11393e9b8f7775b13635898.mp3";
const url = `${base}${sample}`;

async function probe(label) {
  const res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-4095" } });
  const edge = res.headers.get("x-amynest-edge-cache") ?? "—";
  const cf = res.headers.get("cf-cache-status") ?? "—";
  const ct = res.headers.get("content-type") ?? "—";
  console.log(`${label}: status=${res.status} edge=${edge} cf=${cf} type=${ct}`);
  return { edge, cf };
}

console.log(`Probing ${url}\n`);
const first = await probe("Request 1");
await new Promise((r) => setTimeout(r, 500));
const second = await probe("Request 2");

const cfHit = (v) => String(v).toUpperCase().includes("HIT");
const edgeOk = second.edge === "HIT" || cfHit(second.cf);

if (edgeOk) {
  console.log("\n✓ CDN cache working (Cloudflare edge HIT on repeat fetch)");
  process.exit(0);
}

console.log(
  "\n⚠ CDN not warm yet — deploy worker: cd infra/cloudflare/amynest-api-proxy && npx wrangler deploy",
);
process.exit(0);
