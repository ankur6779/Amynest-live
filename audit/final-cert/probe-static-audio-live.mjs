#!/usr/bin/env node
/**
 * Live production probe of static-audio-map URLs.
 * Adversarial: every unique URL must return HTTP 200 with non-zero body.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "../..");
const BASE = "https://www.amynest.in";
const MAP_PATH = join(REPO, "artifacts/kidschedule/src/data/static-audio-map.json");
const OUT = join(__dirname, "audio-cert-final.json");

const map = JSON.parse(readFileSync(MAP_PATH, "utf8"));
const urls = new Set();
for (const section of Object.values(map)) {
  for (const v of Object.values(section)) {
    if (typeof v === "string" && v.startsWith("/")) urls.add(v);
  }
}
const urlList = [...urls];
console.log(`Probing ${urlList.length} unique static-audio URLs on ${BASE}…`);

const CONCURRENCY = 20;
const failures = [];
let ok = 0;
let idx = 0;

async function probe(path) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    const cl = Number(res.headers.get("content-length") || 0);
    if (!res.ok) {
      return { path, status: res.status, error: `HTTP ${res.status}` };
    }
    if (cl === 0) {
      const res2 = await fetch(url);
      const buf = await res2.arrayBuffer();
      if (buf.byteLength === 0) return { path, status: res2.status, error: "zero_bytes" };
    }
    return { path, status: res.status, bytes: cl || null, ok: true };
  } catch (e) {
    return { path, error: e.message };
  }
}

async function worker() {
  while (idx < urlList.length) {
    const i = idx++;
    const r = await probe(urlList[i]);
    if (r.ok) ok++;
    else failures.push(r);
    if ((i + 1) % 500 === 0) console.log(`  ${i + 1}/${urlList.length} … ok=${ok} fail=${failures.length}`);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

const required = urlList.length;
const playable = ok;
const coveragePct = required > 0 ? (playable / required) * 100 : 0;
const pass = coveragePct >= 99.5 && failures.length === 0;

const report = {
  validatedAt: new Date().toISOString(),
  baseURL: BASE,
  source: "static-audio-map.json",
  Required: required,
  Playable: playable,
  Failed: failures.length,
  "Coverage %": Number(coveragePct.toFixed(4)),
  passThreshold: 99.5,
  verdict: pass ? "PASS" : "FAIL",
  failureSample: failures.slice(0, 50),
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ Required: required, Playable: playable, "Coverage %": report["Coverage %"], verdict: report.verdict }, null, 2));
process.exit(pass ? 0 : 1);
