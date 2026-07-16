/**
 * Publish acoustically QA'd phoneme clips (letters + digraphs) to GCS and
 * update both phonics-audio-map.json manifests.
 *
 * Input: a directory of mastered MP3s named {audioKey}.mp3 (a.mp3 … z.mp3,
 * sh.mp3, th1.mp3, …) that ALREADY passed the acoustic phoneme QA gate
 * (scripts/phonics-phoneme-qa.py). This script does not synthesize audio.
 *
 *   pnpm --filter @workspace/scripts run publish-phonics-reviewed -- --dir /path/to/clips
 *
 * Every clip is re-validated (duration bounds via ffprobe) before upload.
 */
import { execFile } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";
import { config } from "dotenv";
import { Storage } from "@google-cloud/storage";
import {
  buildPhonicsAudioCatalog,
  buildPhonicsProvenance,
  catalogEntryToManifestAsset,
  getPhonicsCatalogKey,
  getPhonicsGcsObjectPath,
  phonicsLibraryProxyPath,
  PHONICS_POST_NORM_MAX_MS,
  PHONICS_POST_NORM_MIN_MS,
  type PhonicsAudioLibraryManifest,
} from "@workspace/phonics-sounds";
import {
  loadPhonicsLibraryManifest,
  manifestAssetFromBuffer,
  REPO_ROOT,
  writePhonicsLibraryManifest,
} from "./phonics-library-io.js";

const execFileAsync = promisify(execFile);

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.local`, override: true });
config({ path: `${REPO_ROOT}/Amynest-backend-dykj.env`, override: true });

function getBucketName(): string {
  return (
    process.env.GCS_BUCKET_NAME?.trim() ||
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim() ||
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET?.trim() ||
    "amynest-audio-storage"
  );
}

function parseJsonMaybe(raw: string): Record<string, unknown> | null {
  const t = raw.trim();
  const candidates = [t];
  if (t.includes("\\n")) candidates.push(t.replace(/\\n/g, "\n"));
  if (t.includes('\\"')) candidates.push(t.replace(/\\"/g, '"'));
  let combo = t;
  if (combo.includes("\\n")) combo = combo.replace(/\\n/g, "\n");
  if (combo.includes('\\"')) combo = combo.replace(/\\"/g, '"');
  candidates.push(combo);
  for (const c of candidates) {
    try {
      let parsed: unknown = JSON.parse(c);
      // Render env files store the JSON as a quoted+escaped string — unwrap once more.
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      /* next */
    }
  }
  try {
    const decoded = JSON.parse(Buffer.from(raw.trim(), "base64").toString("utf8"));
    return decoded && typeof decoded === "object" ? decoded : null;
  } catch {
    return null;
  }
}

/** Render env files hold the JSON on one line — dotenv can mangle it, so parse directly. */
function loadGcsCredentialsFromRenderEnvFile(): Record<string, unknown> | null {
  try {
    const text = readFileSync(`${REPO_ROOT}/Amynest-backend-dykj.env`, "utf8");
    for (const key of ["GCS_SERVICE_ACCOUNT_JSON", "FIREBASE_SERVICE_ACCOUNT_JSON"]) {
      const line = text.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
      if (!line) continue;
      let val = line.slice(line.indexOf("=") + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      const creds = parseJsonMaybe(val);
      if (creds) return creds;
    }
  } catch {
    /* fall through */
  }
  return null;
}

function buildStorage(): Storage {
  const fromFile = loadGcsCredentialsFromRenderEnvFile();
  const creds = fromFile ?? parseJsonMaybe(process.env.GCS_SERVICE_ACCOUNT_JSON?.trim() ?? "");
  if (creds) {
    return new Storage({
      credentials: creds as Storage["options"]["credentials"],
      projectId: typeof creds.project_id === "string" ? creds.project_id : undefined,
    });
  }
  return new Storage();
}

async function probeDurationMs(path: string): Promise<number> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    path,
  ]);
  return Math.round(Number(stdout.trim()) * 1000);
}

function parseDirArg(): string {
  const idx = process.argv.indexOf("--dir");
  const dir = idx >= 0 ? process.argv[idx + 1] : undefined;
  if (!dir) {
    console.error("Usage: publish-phonics-reviewed -- --dir /path/to/clips");
    process.exit(1);
  }
  return resolve(dir);
}

async function main(): Promise<void> {
  const dir = parseDirArg();
  const bucket = getBucketName();
  const storage = buildStorage();

  const catalog = buildPhonicsAudioCatalog().filter(
    (e) => e.type === "letter" || e.type === "digraph",
  );
  const byId = new Map(catalog.map((e) => [e.id, e]));

  const files = readdirSync(dir).filter((f) => f.endsWith(".mp3"));
  if (files.length === 0) throw new Error(`No .mp3 files in ${dir}`);

  const manifest = loadPhonicsLibraryManifest();
  if (!manifest) throw new Error("Existing phonics-audio-map.json not found");
  const assets = { ...manifest.assets };

  let published = 0;
  const skipped: string[] = [];

  for (const file of files.sort()) {
    const key = basename(file, ".mp3").toLowerCase();
    const entry = byId.get(key);
    if (!entry) {
      skipped.push(key);
      continue;
    }

    const fullPath = join(dir, file);
    const buffer = readFileSync(fullPath);
    const durationMs = await probeDurationMs(fullPath);
    if (durationMs < PHONICS_POST_NORM_MIN_MS || durationMs > PHONICS_POST_NORM_MAX_MS) {
      throw new Error(
        `${key}: duration ${durationMs}ms outside [${PHONICS_POST_NORM_MIN_MS}, ${PHONICS_POST_NORM_MAX_MS}] — not publishing`,
      );
    }

    const gcsPath = getPhonicsGcsObjectPath(entry.type, entry.id);
    const gcsFile = storage.bucket(bucket).file(gcsPath);
    await gcsFile.save(buffer, {
      contentType: "audio/mpeg",
      metadata: { cacheControl: "public, max-age=31536000, immutable" },
    });
    await gcsFile.makePublic().catch(() => {});

    const catalogKey = getPhonicsCatalogKey(entry.type, entry.id);
    const url = phonicsLibraryProxyPath(gcsPath);
    const base = catalogEntryToManifestAsset(entry, bucket, { url, gcsPath, durationMs });
    assets[catalogKey] = {
      ...manifestAssetFromBuffer(base, buffer, "elevenlabs", durationMs),
      quality: "approved",
    };
    published += 1;
    console.log(`[publish] ${catalogKey} ← ${file} (${durationMs}ms)`);
  }

  const provenance = buildPhonicsProvenance({
    voiceId: manifest.voiceId,
    model: manifest.modelId,
  });
  const next: PhonicsAudioLibraryManifest = {
    ...manifest,
    generatedAt: provenance.generatedAt,
    provider: provenance.provider,
    curriculumVersion: provenance.curriculumVersion,
    phonemeVersion: provenance.phonemeVersion,
    normalizationVersion: provenance.normalizationVersion,
    assetCount: Object.keys(assets).length,
    assets,
  };
  writePhonicsLibraryManifest(next);

  console.log(`[publish] done — ${published} clips published to gs://${bucket}/phonics/`);
  if (skipped.length > 0) {
    console.warn(`[publish] skipped unknown keys: ${skipped.join(", ")}`);
  }
  console.log("[publish] manifests updated (kidschedule + api-server)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
