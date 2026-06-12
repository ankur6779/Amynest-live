#!/usr/bin/env node
/**
 * Live probe of the 4 rhymes GCS assets flagged in rhymes-gcs-audio-audit.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUDIT = join(REPO, "lib/rhymes-audio/audit/rhymes-gcs-audio-audit.json");
const BASE_GCS = "https://storage.googleapis.com/amynest-audio-storage";
const PROD_API = "https://www.amynest.in";

const audit = JSON.parse(readFileSync(AUDIT, "utf8"));
const failing = audit.files.filter((f) => f.error);

const FAILING_IDS = [
  "beneath-the-moss-blanket",
  "beyond-the-rainbow",
  "little-star-shine-bright",
  "london-bridge-piano-version",
];

async function probeUrl(url, method = "HEAD") {
  try {
    const res = await fetch(url, { method, redirect: "follow" });
    const ct = res.headers.get("content-type") ?? "";
    const cl = Number(res.headers.get("content-length") || 0);
    let bytes = cl;
    if (method === "GET" && res.ok) {
      const buf = await res.arrayBuffer();
      bytes = buf.byteLength;
    }
    return { url, status: res.status, contentType: ct, bytes, ok: res.ok };
  } catch (e) {
    return { url, status: 0, error: e.message, ok: false };
  }
}

async function probeSignedUrl(id) {
  const apiUrl = `${PROD_API}/api/audio/signed-url/${encodeURIComponent(id)}`;
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) return { apiUrl, apiStatus: res.status, signedUrl: null };
    const data = await res.json();
    const signed = data.url || data.signedUrl || data.signed_url;
    if (!signed) return { apiUrl, apiStatus: res.status, signedUrl: null, body: data };
    const head = await probeUrl(signed, "HEAD");
    return { apiUrl, apiStatus: res.status, signedUrl: signed, ...head };
  } catch (e) {
    return { apiUrl, error: e.message };
  }
}

const results = [];
for (const id of FAILING_IDS) {
  const entry = failing.find((f) => f.id === id) ?? audit.files.find((f) => f.id === id);
  const objectPath = entry?.objectPath ?? `Rhymes/${id}.mp3`;
  const publicUrl = `${BASE_GCS}/${objectPath.split("/").map(encodeURIComponent).join("/").replace(/Rhymes%2F/, "Rhymes/")}`;
  const encodedUrl = `${BASE_GCS}/${objectPath.split("/").map((p, i) => (i === 0 ? p : encodeURIComponent(p))).join("/")}`;

  const publicProbe = await probeUrl(encodedUrl, "GET");
  const signedProbe = await probeSignedUrl(id);

  results.push({
    id,
    title: entry?.title,
    objectPath,
    auditError: entry?.error?.slice(0, 120) ?? null,
    auditSizeBytes: entry?.sizeBytes ?? null,
    publicUrl: encodedUrl,
    publicProbe,
    signedProbe,
    livePlayable:
      publicProbe.ok && publicProbe.bytes > 1000 && publicProbe.contentType?.includes("audio"),
    ffprobeLikelyCorrupt:
      publicProbe.ok &&
      publicProbe.bytes > 0 &&
      publicProbe.bytes < 200_000 &&
      !publicProbe.contentType?.includes("audio"),
  });
}

const liveFailing = results.filter((r) => !r.livePlayable).length;
const out = {
  validatedAt: new Date().toISOString(),
  failingAssetCount: liveFailing,
  totalAuditedFailures: FAILING_IDS.length,
  assets: results,
};

const outPath = join(REPO, "audit", "blocker-d-rhyme-probe.json");
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ failingAssetCount: liveFailing, outPath }, null, 2));
