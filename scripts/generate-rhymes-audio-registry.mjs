#!/usr/bin/env node
/**
 * List Rhymes/ MP3s in GCS and generate lib/rhymes-audio registry JSON.
 *
 *   node scripts/generate-rhymes-audio-registry.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Storage } from "@google-cloud/storage";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

config({ path: join(REPO_ROOT, ".env") });
config({ path: join(REPO_ROOT, ".env.local"), override: true });
config({ path: join(REPO_ROOT, "Amynest-backend-dykj.env"), override: true });

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

function loadCreds() {
  const json = process.env.GCS_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    const creds = tryParseJsonObject(json);
    if (creds) return creds;
  }
  const envPath = join(REPO_ROOT, "Amynest-backend-dykj.env");
  const text = readFileSync(envPath, "utf8");
  const line = text.split(/\r?\n/).find((l) => l.startsWith("GCS_SERVICE_ACCOUNT_JSON="));
  if (!line) return null;
  let val = line.slice(line.indexOf("=") + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return tryParseJsonObject(val);
}

function slugify(filename) {
  return filename
    .replace(/\.mp3$/i, "")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function main() {
  const creds = loadCreds();
  if (!creds) {
    console.error("[rhymes-registry] GCS credentials required");
    process.exit(1);
  }

  const bucketId =
    process.env.GCS_BUCKET_NAME?.trim() ||
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim() ||
    "amynest-audio-storage";

  const storage = new Storage({
    credentials: creds,
    projectId: typeof creds.project_id === "string" ? creds.project_id : undefined,
  });

  const [files] = await storage.bucket(bucketId).getFiles({ prefix: "Rhymes/" });
  const mp3s = files.filter((f) => f.name.endsWith(".mp3")).sort((a, b) => a.name.localeCompare(b.name));

  console.log(`[rhymes-registry] Found ${mp3s.length} MP3 files in gs://${bucketId}/Rhymes/`);

  const idCounts = new Map();
  const entries = [];

  for (const file of mp3s) {
    const base = file.name.split("/").pop() ?? file.name;
    const title = base.replace(/\.mp3$/i, "");
    let id = slugify(base);
    const prev = idCounts.get(id) ?? 0;
    idCounts.set(id, prev + 1);
    if (prev > 0) id = `${id}-${prev + 1}`;

    const [meta] = await file.getMetadata();
    entries.push({
      id,
      title,
      objectPath: file.name,
      durationSec: null,
      category: "lullaby",
      sizeBytes: Number(meta.size ?? 0),
      contentType: meta.contentType ?? "audio/mpeg",
    });
  }

  const registry = {
    generatedAt: new Date().toISOString(),
    bucket: bucketId,
    prefix: "Rhymes/",
    count: entries.length,
    entries,
  };

  const outDir = join(REPO_ROOT, "lib/rhymes-audio/src");
  mkdirSync(outDir, { recursive: true });
  const paths = [
    join(outDir, "rhymes-gcs-registry.json"),
    join(REPO_ROOT, "artifacts/api-server/src/data/rhymes-gcs-registry.json"),
    join(REPO_ROOT, "artifacts/kidschedule/src/data/rhymes-gcs-registry.json"),
  ];
  for (const p of paths) {
    writeFileSync(p, `${JSON.stringify(registry, null, 2)}\n`);
  }

  console.log(`[rhymes-registry] Wrote ${entries.length} entries`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
