#!/usr/bin/env node
/**
 * Probe production + local signed URL endpoints and GCS response headers.
 *
 *   node scripts/gcs-lullaby-prod-probe.mjs
 *   API_ORIGIN=http://127.0.0.1:5000 node scripts/gcs-lullaby-prod-probe.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(REPO, "artifacts/kidschedule/playwright/gcs-lullaby-prod-audit-artifacts");
mkdirSync(OUT, { recursive: true });

const PROD_ORIGINS = [
  "https://www.amynest.in",
  "https://amynest-backend-dykj.onrender.com",
];
const LOCAL_ORIGIN = process.env.API_ORIGIN?.replace(/\/$/, "") ?? "http://127.0.0.1:5000";

const TEST_IDS = [
  "twinkle-twinkle-little-star",
  (() => {
    const reg = JSON.parse(readFileSync(join(REPO, "lib/rhymes-audio/src/rhymes-gcs-registry.json"), "utf8"));
    return reg.entries[4]?.id ?? reg.entries[0]?.id;
  })(),
];

async function probeOrigin(origin, audioId) {
  const url = `${origin}/api/audio/signed-url/${encodeURIComponent(audioId)}`;
  const t0 = performance.now();
  let res;
  try {
    res = await fetch(url, { redirect: "follow" });
  } catch (err) {
    return { origin, audioId, error: err instanceof Error ? err.message : String(err) };
  }
  const elapsedMs = Math.round(performance.now() - t0);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }

  const result = {
    origin,
    audioId,
    httpStatus: res.status,
    elapsedMs,
    edgeCache: res.headers.get("x-amynest-edge-cache"),
    cacheControl: res.headers.get("cache-control"),
    bodyPreview: body,
  };

  if (body.success && body.signedUrl) {
    const gcsT0 = performance.now();
    const gcsRes = await fetch(body.signedUrl, { method: "HEAD", redirect: "follow" });
    result.gcs = {
      httpStatus: gcsRes.status,
      elapsedMs: Math.round(performance.now() - gcsT0),
      contentType: gcsRes.headers.get("content-type"),
      contentLength: gcsRes.headers.get("content-length"),
      acceptRanges: gcsRes.headers.get("accept-ranges"),
      accessControlAllowOrigin: gcsRes.headers.get("access-control-allow-origin"),
    };
    if (gcsRes.status === 403) result.fail = "GCS_403";
    if (gcsRes.status >= 400) result.fail = `GCS_${gcsRes.status}`;
  }

  if (res.status === 401) result.fail = "API_NOT_DEPLOYED_OR_AUTH_REQUIRED";
  return result;
}

async function main() {
  const report = {
    timestamp: new Date().toISOString(),
    registryCount: JSON.parse(
      readFileSync(join(REPO, "lib/rhymes-audio/src/rhymes-gcs-registry.json"), "utf8"),
    ).count,
    probes: [],
  };

  for (const origin of [...PROD_ORIGINS, LOCAL_ORIGIN]) {
    for (const audioId of TEST_IDS) {
      report.probes.push(await probeOrigin(origin, audioId));
    }
  }

  writeFileSync(join(OUT, "prod-probe-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
