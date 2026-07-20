#!/usr/bin/env node
/**
 * AUDIO RECOVERY AUDIT — investigation only (no product changes).
 * Run: node scripts/audio-recovery-audit.mjs
 * Optional: AUDIO_AUDIT_SAMPLE=200 node scripts/audio-recovery-audit.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAP_PATH = join(ROOT, "artifacts/kidschedule/src/data/static-audio-map.json");
const CORPUS_PATH = join(ROOT, "artifacts/kidschedule/src/data/speakable-phrase-corpus.json");
const API_BASE =
  process.env.AUDIO_AUDIT_API_BASE?.replace(/\/$/, "") ??
  "https://www.amynest.in";
const SAMPLE_LIMIT = Number(process.env.AUDIO_AUDIT_SAMPLE || "0") || 0;
const CONCURRENCY = 12;
const FETCH_TIMEOUT_MS = 15_000;

const PRIORITY_PHRASES = [
  "have fun with sounds and words.",
  "listen carefully and say the word.",
  "we will take our time and",
  "i am so glad you",
  "came to practice with me",
  "i am so glad you came to practice with me.",
  "we will take our time and have fun with sounds and words.",
  "listen carefully and say the word after me.",
];

function normalizeKey(text) {
  return (text ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function extractHash(url) {
  const m = String(url).match(/\/static-audio\/([a-f0-9]{32})\.mp3/i);
  return m?.[1] ?? null;
}

function proxyPath(hash) {
  return `${API_BASE}/api/static-audio/${hash}.mp3`;
}

function loadMap() {
  const raw = JSON.parse(readFileSync(MAP_PATH, "utf8"));
  const entries = [];
  for (const bucket of ["default", "phonics"]) {
    for (const [key, url] of Object.entries(raw[bucket] ?? {})) {
      entries.push({ bucket, rawKey: key, normalized: normalizeKey(key), url: String(url).trim() });
    }
  }
  return { raw, entries };
}

function findDuplicateNormalized(entries) {
  const byNorm = new Map();
  for (const e of entries) {
    const list = byNorm.get(e.normalized) ?? [];
    list.push(e);
    byNorm.set(e.normalized, list);
  }
  const dupes = [];
  for (const [norm, list] of byNorm) {
    if (list.length > 1) dupes.push({ normalized: norm, keys: list.map((x) => `[${x.bucket}] ${x.rawKey}`) });
  }
  return dupes;
}

function loadCorpusMissing(mapEntries) {
  if (!existsSync(CORPUS_PATH)) return { missing: [], total: 0 };
  const corpus = JSON.parse(readFileSync(CORPUS_PATH, "utf8"));
  const phrases = Array.isArray(corpus) ? corpus : corpus.phrases ?? [];
  const mapNorm = new Set(mapEntries.map((e) => e.normalized));
  const mapByBucket = { default: new Set(), phonics: new Set() };
  for (const e of mapEntries) mapByBucket[e.bucket].add(e.normalized);

  const missing = [];
  for (const p of phrases) {
    const nk = p.normalizedKey ?? normalizeKey(p.text ?? "");
    const mode = p.mode === "phonics" ? "phonics" : "default";
    const hit = mapByBucket[mode]?.has(nk) || mapNorm.has(nk);
    if (!hit && nk) missing.push({ text: p.text, normalizedKey: nk, mode });
  }
  return { missing, total: phrases.length };
}

function isMp3Magic(buf) {
  if (!buf || buf.length < 3) return false;
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return true;
  if (buf.toString("ascii", 0, 3) === "ID3") return true;
  return false;
}

function looksLikeHtml(buf, contentType) {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("text/html")) return true;
  const head = buf.slice(0, 256).toString("utf8").trimStart().toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html");
}

async function probeUrl(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-8191" },
      signal: controller.signal,
      redirect: "follow",
    });
    const contentType = res.headers.get("content-type") ?? "";
    const contentLength = res.headers.get("content-length") ?? "";
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      url,
      status: res.status,
      contentType,
      contentLength: contentLength || String(buf.length),
      bytesSampled: buf.length,
      isAudioContentType: /^audio\//i.test(contentType),
      isMp3: isMp3Magic(buf),
      isHtml: looksLikeHtml(buf, contentType),
      is404: res.status === 404,
      ok: res.ok,
    };
  } catch (err) {
    return {
      url,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
      is404: false,
      isHtml: false,
      isMp3: false,
      isAudioContentType: false,
      ok: false,
    };
  } finally {
    clearTimeout(t);
  }
}

async function probePool(urls) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < urls.length) {
      const idx = i++;
      results[idx] = await probeUrl(urls[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, () => worker()));
  return results;
}

function resolvePriority(map) {
  const allKeys = new Set(map.entries.map((e) => e.rawKey.toLowerCase()));
  const allNorm = new Set(map.entries.map((e) => e.normalized));
  const report = [];
  for (const phrase of PRIORITY_PHRASES) {
    const norm = normalizeKey(phrase);
    const exact = map.entries.find((e) => e.rawKey.toLowerCase() === phrase.toLowerCase());
    const byNorm = map.entries.filter((e) => e.normalized === norm || e.normalized.includes(norm) || norm.includes(e.normalized));
    report.push({
      query: phrase,
      exactKeyInMap: Boolean(exact),
      exactEntry: exact ?? null,
      partialMatches: byNorm.slice(0, 5).map((e) => ({ key: e.rawKey, bucket: e.bucket, url: e.url })),
    });
  }
  return report;
}

async function main() {
  const map = loadMap();
  const dupes = findDuplicateNormalized(map.entries);
  const corpus = loadCorpusMissing(map.entries);

  console.log("═".repeat(72));
  console.log("AUDIO RECOVERY AUDIT — static-audio-map.json");
  console.log("═".repeat(72));
  console.log(`Map path: ${MAP_PATH}`);
  console.log(`Total raw keys: default=${Object.keys(map.raw.default ?? {}).length} phonics=${Object.keys(map.raw.phonics ?? {}).length} combined=${map.entries.length}`);
  console.log(`Duplicate normalized keys (collision): ${dupes.length}`);
  if (dupes.length > 0) {
    for (const d of dupes.slice(0, 15)) {
      console.log(`  • "${d.normalized}" → ${d.keys.join(" | ")}`);
    }
    if (dupes.length > 15) console.log(`  … and ${dupes.length - 15} more`);
  }
  console.log(`Corpus phrases: ${corpus.total}; missing from map: ${corpus.missing.length}`);
  if (corpus.missing.length > 0) {
    console.log("  (Runtime logs reportStaticAudioMissingUrl / check:static-audio track these at playback)");
    for (const m of corpus.missing.slice(0, 10)) {
      console.log(`  • [${m.mode}] ${m.normalizedKey}`);
    }
    if (corpus.missing.length > 10) console.log(`  … ${corpus.missing.length - 10} more`);
  }

  console.log("\n─ Priority phrase verification ─");
  const priority = resolvePriority(map);
  for (const p of priority) {
    console.log(`\nQuery: "${p.query}"`);
    console.log(`  exactKeyInMap: ${p.exactKeyInMap}`);
    if (p.exactEntry) {
      console.log(`  key: ${p.exactEntry.rawKey}`);
      console.log(`  url: ${p.exactEntry.url}`);
      console.log(`  proxy: ${proxyPath(extractHash(p.exactEntry.url) ?? "")}`);
    } else if (p.partialMatches.length) {
      console.log(`  partialMatches:`);
      for (const m of p.partialMatches) console.log(`    - [${m.bucket}] "${m.key}"`);
    } else {
      console.log(`  STATUS: NOT IN MAP`);
    }
  }

  const uniqueUrls = [
    ...new Set(
      map.entries
        .map((e) => extractHash(e.url))
        .filter(Boolean)
        .map((hash) => proxyPath(hash)),
    ),
  ];
  const toProbe = SAMPLE_LIMIT > 0 ? uniqueUrls.slice(0, SAMPLE_LIMIT) : uniqueUrls;
  console.log(`\n─ URL probe (API proxy ${API_BASE}, first ${toProbe.length}/${uniqueUrls.length} unique hashes) ─`);
  const probes = await probePool(toProbe);

  const stats = {
    ok: 0,
    status404: 0,
    html: 0,
    nonAudioCt: 0,
    notMp3Magic: 0,
    fetchError: 0,
  };
  const failures = [];
  for (const r of probes) {
    if (r.error) {
      stats.fetchError++;
      failures.push({ kind: "fetch_error", ...r });
      continue;
    }
    if (r.is404) {
      stats.status404++;
      failures.push({ kind: "404", ...r });
    } else if (r.isHtml) {
      stats.html++;
      failures.push({ kind: "html", ...r });
    } else if (!r.isAudioContentType && !r.isMp3) {
      stats.nonAudioCt++;
      failures.push({ kind: "non_audio_ct", ...r });
    } else if (!r.isMp3) {
      stats.notMp3Magic++;
      failures.push({ kind: "not_mp3_magic", ...r });
    } else {
      stats.ok++;
    }
  }
  console.log(`  OK (audio/mp3): ${stats.ok}`);
  console.log(`  404: ${stats.status404}`);
  console.log(`  HTML body: ${stats.html}`);
  console.log(`  Non-audio content-type (no mp3 magic): ${stats.nonAudioCt}`);
  console.log(`  MP3 magic fail (audio CT): ${stats.notMp3Magic}`);
  console.log(`  Fetch errors: ${stats.fetchError}`);
  if (failures.length) {
    console.log("\n  First failures:");
    for (const f of failures.slice(0, 12)) {
      console.log(`    [${f.kind}] ${f.status} ${f.contentType ?? f.error} ${f.url?.slice(-48)}`);
    }
  }

  const priorityUrls = priority
    .filter((p) => p.exactEntry)
    .map((p) => {
      const hash = extractHash(p.exactEntry.url);
      return hash ? proxyPath(hash) : null;
    })
    .filter(Boolean);
  if (priorityUrls.length) {
    console.log("\n─ Priority phrase URL probes (API proxy) ─");
    const pp = await probePool(priorityUrls);
    for (const r of pp) {
      const key =
        priority.find((p) => {
          const hash = extractHash(p.exactEntry?.url ?? "");
          return hash && r.url === proxyPath(hash);
        })?.exactEntry?.rawKey ?? "?";
      console.log(`  "${key}": status=${r.status} ct=${r.contentType} len=${r.contentLength} mp3=${r.isMp3} html=${r.isHtml}`);
    }
  }

  console.log("\n" + "═".repeat(72));
  console.log("CODE PATH AUDIT (what exists vs requested instrumentation)");
  console.log("═".repeat(72));
  const gaps = [
    ["2. Catalog playback per-URL log (URL, content-type, length, duration, decode)", "NOT IMPLEMENTED — only DEV/audioDebug blob_fetch logs status+bytes; no duration/decode; no startup fail on non-audio/*"],
    ["3. Blob before playback (size, mime, duration; reject size==0)", "PARTIAL — validateAudioBlob min 500 bytes; logAmyVoiceDiag blob_empty with bytes; NO decodeAudioData; NO duration log"],
    ["4. audio_start_timeout element state (muted, volume, readyState…)", "NOT IMPLEMENTED on timeout — waitForAudibleStart rejects with Error only; pipeline logs currentTime/paused/readyState on _play_verify failure only when audioDebug on"],
    ["5. /api/tts/generate provider timing", "PARTIAL — backend recordApiHealthSample latencyMs; OpenAI-only on /tts/generate; ElevenLabs separate /tts/elevenlabs-fallback; no per-provider timeout source field in response"],
  ];
  for (const [item, status] of gaps) console.log(`  • ${item}\n    → ${status}`);

  console.log("\n" + "═".repeat(72));
  console.log("ROOT-CAUSE RANKING (investigation synthesis — by likely frequency)");
  console.log("═".repeat(72));
  const ranking = [
    ["1", "playback_never_reaches_audible_start", "audio_start_timeout / controller_loading_timeout (800ms audible gate + 3s FSM) — silent or blocked play on Android WebView; no element-state capture at timeout"],
    ["2", "catalog_lookup_or_proxy_miss", "reportStaticAudioMissingUrl / lookup miss — 2052 extended corpus phrases not pre-generated; core catalog OK per check:static-audio"],
    ["3", "blob_or_small_payload", "Android blob path: fetch OK but blob <500 bytes → invalid_audio_blob; no decode step"],
    ["4", "wrong_content_at_url", `GCS probe failures in sample: 404=${stats.status404} html=${stats.html} nonAudio=${stats.nonAudioCt}`],
    ["5", "dynamic_tts_backend", "/api/tts/generate OpenAI cache-first; failures → 502/429; ElevenLabs only on explicit fallback route not primary generate"],
    ["6", "duplicate_normalized_key", `${dupes.length} normalized collisions — last writer wins in indexByNormalizedKey`],
  ];
  for (const [rank, id, desc] of ranking) console.log(`  ${rank}. [${id}] ${desc}`);

  const outPath = join(ROOT, "scripts/audio-recovery-audit-report.json");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(
    outPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), dupes: dupes.length, corpusMissing: corpus.missing.length, urlStats: stats, priority, failures: failures.slice(0, 50) }, null, 2),
  );
  console.log(`\nFull JSON: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
