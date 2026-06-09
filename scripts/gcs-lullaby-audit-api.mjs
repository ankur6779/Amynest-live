#!/usr/bin/env node
/**
 * Minimal signed-URL API for GCS lullaby production audits (no Postgres / tsx required).
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Storage } from "@google-cloud/storage";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.AUDIT_API_PORT ?? "5010");
const TTL_MS = Number(process.env.RHYMES_SIGNED_URL_TTL_MS) > 0
  ? Number(process.env.RHYMES_SIGNED_URL_TTL_MS)
  : 45 * 60 * 1000;
const CACHE_TTL_MS = Number(process.env.RHYMES_SIGNED_URL_CACHE_TTL_MS) > 0
  ? Number(process.env.RHYMES_SIGNED_URL_CACHE_TTL_MS)
  : 12 * 60 * 1000;

function tryParseJsonObject(raw) {
  const t = raw.trim();
  for (const s of [t, t.replace(/\\n/g, "\n"), t.replace(/\\"/g, '"')]) {
    try {
      return JSON.parse(s);
    } catch {
      /* next */
    }
  }
  try {
    return JSON.parse(Buffer.from(t, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function loadEnvFile(name) {
  try {
    const text = readFileSync(join(REPO, name), "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile("Amynest-backend-dykj.env");
loadEnvFile(".env.development");

function loadCreds() {
  const json = process.env.GCS_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    const creds = tryParseJsonObject(json);
    if (creds) return creds;
  }
  return null;
}

const creds = loadCreds();
const bucketId =
  process.env.GCS_BUCKET_NAME?.trim() ||
  process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim() ||
  "amynest-audio-storage";
const storage = creds
  ? new Storage({
      credentials: creds,
      projectId: typeof creds.project_id === "string" ? creds.project_id : undefined,
    })
  : null;

const registry = JSON.parse(
  readFileSync(join(REPO, "lib/rhymes-audio/src/rhymes-gcs-registry.json"), "utf8"),
);
const byId = new Map(registry.entries.map((e) => [e.id, e]));
const cache = new Map();
const RHYMES_128_PREFIX = "Rhymes-128/";

function objectPathForVariant(entry, variant) {
  const v = (variant ?? "320").toLowerCase();
  if (v === "128" || v === "rhymes-128" || v === "optimized") {
    return entry.objectPath.replace(/^Rhymes\//, RHYMES_128_PREFIX);
  }
  return entry.objectPath;
}

async function resolveSignedUrl(audioId, variant) {
  const entry = byId.get(audioId);
  if (!entry) return { ok: false, reason: "not_found" };
  const cacheKey = `${audioId}:${variant ?? "320"}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() < hit.expiresAt) {
    return { ok: true, ...hit.payload, cached: true };
  }
  if (!storage) return { ok: false, reason: "gcs_unconfigured" };
  const objectPath = objectPathForVariant(entry, variant);
  try {
    const [url] = await storage.bucket(bucketId).file(objectPath).getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + TTL_MS,
    });
    const payload = {
      audioId,
      title: entry.title,
      variant: variant ?? "320",
      objectPath,
      signedUrl: url,
      expiresIn: Math.floor(TTL_MS / 1000),
    };
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return { ok: true, ...payload, cached: false };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "sign_failed" };
  }
}

function loadReencodeReport() {
  const p = join(REPO, "lib/rhymes-audio/audit/rhymes-reencode-report.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function loadQualityAudit() {
  const p = join(REPO, "lib/rhymes-audio/audit/rhymes-reencode-quality-audit.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (url.pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, gcs: Boolean(storage), registry: registry.count }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/audio/rhymes-reencode-report") {
    const report = loadReencodeReport();
    if (!report) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "report_not_found" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, report }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/audio/rhymes-reencode-quality") {
    const quality = loadQualityAudit();
    if (!quality) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "quality_audit_not_found" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, quality }));
    return;
  }

  const match = url.pathname.match(/^\/api\/audio\/signed-url\/([a-z0-9-]+)$/i);
  if (req.method === "GET" && match) {
    const variant = url.searchParams.get("variant") ?? "320";
    const result = await resolveSignedUrl(decodeURIComponent(match[1]), variant);
    if (!result.ok) {
      res.writeHead(result.reason === "not_found" ? 404 : 503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: result.reason }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "private, max-age=600" });
    res.end(JSON.stringify({ success: true, ...result }));
    return;
  }

  res.writeHead(404);
  res.end("not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[gcs-lullaby-audit-api] http://127.0.0.1:${PORT} gcs=${Boolean(storage)} count=${registry.count}`);
});
