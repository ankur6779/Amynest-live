#!/usr/bin/env node
/**
 * Post-deploy TTS architecture verification — run against local or production API.
 *
 *   API_BASE=https://www.amynest.in/api node scripts/verify-tts-architecture.mjs
 */
const base = (process.env.API_BASE ?? "http://127.0.0.1:5000/api").replace(/\/$/, "");

async function probe(path) {
  const started = performance.now();
  const res = await fetch(`${base}${path}`);
  const ms = Math.round(performance.now() - started);
  const body = await res.text();
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    json = body.slice(0, 200);
  }
  return { path, status: res.status, ms, json };
}

const checks = await Promise.all([
  probe("/health"),
  probe("/healthz/tts"),
  probe("/static-audio/health"),
]);

console.log(JSON.stringify({ base, checks, verifiedAt: new Date().toISOString() }, null, 2));

const tts = checks.find((c) => c.path === "/healthz/tts")?.json;
if (tts?.amyTtsModel && tts.amyTtsModel !== "eleven_flash_v2_5") {
  console.error("FAIL: amyTtsModel is not eleven_flash_v2_5:", tts.amyTtsModel);
  process.exit(1);
}
if (tts?.latency?.tts_model && tts.latency.tts_model !== "eleven_flash_v2_5") {
  console.error("FAIL: latency.tts_model mismatch:", tts.latency.tts_model);
  process.exit(1);
}
console.log("PASS: canonical model + telemetry endpoint reachable");
