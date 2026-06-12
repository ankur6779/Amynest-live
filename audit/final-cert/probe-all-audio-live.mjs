#!/usr/bin/env node
/**
 * Adversarial full audio certification — all manifest sources, live production probe.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "../..");
const BASE = "https://www.amynest.in";
const OUT = join(REPO, "audit/audio-cert-final.json");
const OUT_ALT = join(__dirname, "audio-cert-final.json");

function loadJson(rel) {
  const p = join(REPO, rel);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

function collectUrls() {
  const entries = []; // { url, source, id? }

  // static-audio-map
  const staticMap = loadJson("artifacts/kidschedule/src/data/static-audio-map.json");
  if (staticMap) {
    for (const [section, sectionData] of Object.entries(staticMap)) {
      for (const [key, v] of Object.entries(sectionData)) {
        if (typeof v === "string" && v.startsWith("/")) {
          entries.push({ url: v, source: "static-audio-map", id: `${section}:${key.slice(0, 40)}` });
        }
      }
    }
  }

  // phonics-audio-map
  const phonicsMap = loadJson("artifacts/kidschedule/src/data/phonics-audio-map.json");
  if (phonicsMap) {
    for (const [key, v] of Object.entries(phonicsMap)) {
      if (typeof v === "string" && v.startsWith("/")) {
        entries.push({ url: v, source: "phonics-audio-map", id: key });
      }
    }
  }

  // content-bank-audio-map
  const cbMap = loadJson("artifacts/kidschedule/src/data/content-bank-audio-map.json");
  if (cbMap?.entries) {
    for (const e of cbMap.entries) {
      const u = e.url || e.path || e.audioUrl;
      if (typeof u === "string" && u.startsWith("/")) {
        entries.push({ url: u, source: "content-bank-audio-map", id: e.id || e.key });
      }
    }
  } else if (cbMap && typeof cbMap === "object") {
    for (const [key, v] of Object.entries(cbMap)) {
      if (typeof v === "string" && v.startsWith("/")) {
        entries.push({ url: v, source: "content-bank-audio-map", id: key });
      }
    }
  }

  // spelling manifest
  const spelling = loadJson("artifacts/kidschedule/src/data/spelling-audio-manifest.json");
  if (spelling?.words) {
    for (const w of spelling.words) {
      const u = w.audioUrl || w.url;
      if (typeof u === "string" && u.startsWith("/")) {
        entries.push({ url: u, source: "spelling-audio-manifest", id: w.word || w.id });
      }
    }
  } else if (spelling && typeof spelling === "object") {
    for (const [key, v] of Object.entries(spelling)) {
      if (typeof v === "string" && v.startsWith("/")) {
        entries.push({ url: v, source: "spelling-audio-manifest", id: key });
      }
    }
  }

  // rhymes GCS registry (production URLs via API proxy or direct GCS)
  const rhymes = loadJson("artifacts/kidschedule/src/data/rhymes-gcs-registry.json");
  if (rhymes?.entries) {
    for (const e of rhymes.entries) {
      const u = e.publicUrl || e.url || e.gcsUrl;
      if (typeof u === "string") {
        const path = u.startsWith("http") ? new URL(u).pathname : u.startsWith("/") ? u : null;
        if (path) entries.push({ url: path, source: "rhymes-gcs-registry", id: e.id || e.slug });
      }
    }
  }

  // infant sleep manifest
  const infant = loadJson("artifacts/kidschedule/public/infant-sleep-audio/manifest.json");
  if (infant?.items) {
    for (const item of infant.items) {
      const p = `/infant-sleep-audio/${item.assetPath}`;
      entries.push({ url: p, source: "infant-sleep-manifest", id: item.id });
    }
  }

  // discovery worlds — probe audio paths from coverage (GCS-backed, may use /api proxy)
  const dw = loadJson("artifacts/kidschedule/public/discovery-worlds-coverage.json");
  if (dw?.worlds) {
    // coverage file doesn't list individual audio URLs; count as metadata only
  }

  // Dedupe by URL, keep sources
  const byUrl = new Map();
  for (const e of entries) {
    if (!byUrl.has(e.url)) byUrl.set(e.url, { url: e.url, sources: new Set(), ids: [] });
    const rec = byUrl.get(e.url);
    rec.sources.add(e.source);
    if (e.id) rec.ids.push(e.id);
  }
  return [...byUrl.values()].map((r) => ({
    url: r.url,
    sources: [...r.sources],
    idSample: r.ids.slice(0, 2),
  }));
}

const urlRecords = collectUrls();
console.log(`Collected ${urlRecords.length} unique audio URLs from manifests`);

const CONCURRENCY = 25;
const failures = [];
let ok = 0;
let idx = 0;
const sourceStats = {};

async function probe(rec) {
  const url = rec.url.startsWith("http") ? rec.url : `${BASE}${rec.url}`;
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(20000) });
    const cl = Number(res.headers.get("content-length") || 0);
    const ct = res.headers.get("content-type") || "";
    if (!res.ok) {
      return { ...rec, status: res.status, error: `HTTP ${res.status}` };
    }
    if (cl === 0) {
      const res2 = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const buf = await res2.arrayBuffer();
      if (buf.byteLength === 0) return { ...rec, status: res2.status, error: "zero_bytes" };
      return { ...rec, status: res2.status, bytes: buf.byteLength, contentType: ct, ok: true };
    }
    return { ...rec, status: res.status, bytes: cl, contentType: ct, ok: true };
  } catch (e) {
    return { ...rec, error: e.message };
  }
}

async function worker() {
  while (idx < urlRecords.length) {
    const i = idx++;
    const r = await probe(urlRecords[i]);
    for (const s of urlRecords[i].sources) {
      sourceStats[s] = sourceStats[s] || { required: 0, playable: 0 };
      sourceStats[s].required++;
      if (r.ok) sourceStats[s].playable++;
    }
    if (r.ok) ok++;
    else failures.push(r);
    if ((i + 1) % 200 === 0) console.log(`  ${i + 1}/${urlRecords.length} ok=${ok} fail=${failures.length}`);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

const required = urlRecords.length;
const playable = ok;
const coveragePct = required > 0 ? (playable / required) * 100 : 0;
const pass = coveragePct >= 99.5 && failures.length === 0;

const report = {
  validatedAt: new Date().toISOString(),
  baseURL: BASE,
  methodology: "Live HEAD/GET probe of all manifest-derived URLs; adversarial — no trust of prior audits",
  sources: Object.fromEntries(
    Object.entries(sourceStats).map(([k, v]) => [
      k,
      { Required: v.required, Playable: v.playable, "Coverage %": Number(((v.playable / v.required) * 100).toFixed(4)) },
    ])
  ),
  Required: required,
  Playable: playable,
  Failed: failures.length,
  "Coverage %": Number(coveragePct.toFixed(4)),
  passThreshold: 99.5,
  verdict: pass ? "PASS" : "FAIL",
  synthesizeOnDemandNote: "TTS/dynamic routes not enumerated — counted as coverage gap if manifests incomplete",
  failureSample: failures.slice(0, 100),
  failureBySource: failures.reduce((acc, f) => {
    for (const s of f.sources || ["unknown"]) {
      acc[s] = (acc[s] || 0) + 1;
    }
    return acc;
  }, {}),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
writeFileSync(OUT_ALT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ Required: required, Playable: playable, "Coverage %": report["Coverage %"], verdict: report.verdict }, null, 2));
process.exit(pass ? 0 : 1);
