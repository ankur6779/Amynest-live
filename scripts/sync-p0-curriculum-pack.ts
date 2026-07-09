#!/usr/bin/env node
/**
 * Download P0 curriculum clips into audio-pack using authenticated GCS
 * (production /api/static-audio may serve placeholders while GCS has real files).
 *
 *   pnpm --filter @workspace/scripts exec tsx ./sync-p0-curriculum-pack.ts
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Storage } from "@google-cloud/storage";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
config({ path: join(repoRoot, ".env") });
config({ path: join(repoRoot, ".env.local"), override: true });
config({ path: join(repoRoot, "Amynest-backend-dykj.env"), override: true });

const packRoot = join(repoRoot, "artifacts/kidschedule/public/audio-pack");
const mapPath = join(repoRoot, "artifacts/kidschedule/src/data/static-audio-map.json");
const ORIGIN = process.env.STATIC_AUDIO_ORIGIN?.replace(/\/$/, "") ?? "https://www.amynest.in";

const CURRICULUM = [
  "sat", "fox", "mop", "top", "fin", "win", "lip", "zip", "kid", "lid",
  "mom", "yes", "car", "love", "home", "hello", "goodbye", "please", "thank you",
  "sorry", "small", "down", "look", "listen", "say", "read", "write", "draw",
  "pat", "hop", "pop", "jet",
];

function parseRender(text: string, key: string) {
  const line = text.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  if (!line) return null;
  let val = line.slice(line.indexOf("=") + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  val = val.replace(/\\"/g, '"');
  try {
    return JSON.parse(val) as Record<string, unknown>;
  } catch {
    try {
      return JSON.parse(val.replace(/\\n/g, "\n")) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function slug(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function buildStorage() {
  let creds: Record<string, unknown> | null = null;
  try {
    creds = parseRender(
      readFileSync(join(repoRoot, "Amynest-backend-dykj.env"), "utf8"),
      "GCS_SERVICE_ACCOUNT_JSON",
    );
  } catch {
    /* ignore */
  }
  if (!creds && process.env.GCS_SERVICE_ACCOUNT_JSON) {
    try {
      creds = JSON.parse(process.env.GCS_SERVICE_ACCOUNT_JSON) as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }
  if (!creds) throw new Error("GCS credentials required");
  return new Storage({
    credentials: creds as never,
    projectId: typeof creds.project_id === "string" ? creds.project_id : undefined,
  });
}

async function downloadPhonicsCvc(word: string): Promise<Buffer | null> {
  const res = await fetch(
    `${ORIGIN}/api/phonics-library/phonics/cvc/${encodeURIComponent(word)}.mp3`,
  );
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length >= 2000 ? buf : null;
}

async function downloadFromGcs(
  storage: Storage,
  bucketName: string,
  hash: string,
): Promise<Buffer | null> {
  const file = storage.bucket(bucketName).file(`static-audio/${hash}.mp3`);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [buf] = await file.download();
  return buf.length >= 2000 ? buf : null;
}

async function main() {
  const map = JSON.parse(readFileSync(mapPath, "utf8")) as {
    default?: Record<string, string>;
  };
  const defaultMap = map.default ?? {};
  const bucketName =
    process.env.GCS_BUCKET_NAME?.trim() ||
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim() ||
    "amynest-audio-storage";
  const storage = buildStorage();

  const manifestPath = join(packRoot, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    version?: number;
    tier?: string;
    entries: Record<string, string>;
    generatedAt?: string;
  };

  let ok = 0;
  let fail = 0;
  const results: Array<{ word: string; bytes: number; via: string }> = [];

  for (const word of CURRICULUM) {
    const key = word.toLowerCase();
    const mapUrl = defaultMap[key] ?? "";
    let buf: Buffer | null = null;
    let via = "";

    if (mapUrl.includes("/phonics-library/")) {
      buf = await downloadPhonicsCvc(key);
      via = "phonics-cvc";
    }

    if (!buf) {
      const hash =
        mapUrl.match(/\/static-audio\/([a-f0-9]{32})\.mp3/i)?.[1] ??
        createHash("md5").update(`default\0${key}`).digest("hex");
      buf = await downloadFromGcs(storage, bucketName, hash);
      via = "gcs";
    }

    if (!buf) {
      // last resort: phonics cvc even if map points elsewhere
      buf = await downloadPhonicsCvc(key);
      via = "phonics-cvc-fallback";
    }

    if (!buf) {
      console.warn("FAIL", key);
      fail += 1;
      continue;
    }

    const category = "phonics-word";
    const file = `${category}/${slug(key)}.mp3`;
    const dest = join(packRoot, file);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    const mk = `${category}:${key}`;
    manifest.entries[mk] = file;
    // also spelling alias for lookup
    manifest.entries[`spelling:${key}`] = file;
    ok += 1;
    results.push({ word: key, bytes: buf.length, via });
    console.log("OK", key, via, buf.length);
  }

  manifest.generatedAt = new Date().toISOString();
  manifest.version = Math.max(Number(manifest.version) || 1, 2);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ ok, fail, results }, null, 2));
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
