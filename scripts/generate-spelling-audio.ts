/**
 * Generate OpenAI TTS for every unique spelling catalog word, upload to GCS,
 * and refresh spelling-audio-manifest.json with durations.
 *
 *   OPENAI_API_KEY=... DEFAULT_OBJECT_STORAGE_BUCKET_ID=... \
 *     GCS_SERVICE_ACCOUNT_JSON='...' \
 *     pnpm run generate:spelling-audio
 *
 * Options:
 *   --force     Regenerate even if object exists in GCS
 *   --dry-run   List words only, no API/GCS calls
 */
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { Storage } from "@google-cloud/storage";
import { getAllCatalogEntries } from "@workspace/spelling-catalog";
import {
  buildSpellingAudioManifestFromCatalog,
  getSpellingGcsObjectPath,
  sanitizeSpellingWordSlug,
  SPELLING_AUDIO_MODEL_DEFAULT,
  SPELLING_AUDIO_VERSION,
  SPELLING_AUDIO_VOICE_DEFAULT,
} from "@workspace/spelling-audio";
import {
  loadSpellingAudioManifest,
  REPO_ROOT,
  sha256Hex,
  writeSpellingAudioManifest,
} from "./spelling-audio-io.js";

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.local`, override: true });
config({ path: `${REPO_ROOT}/Amynest-backend-dykj.env`, override: true });

const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");

const OPENAI_VOICE =
  process.env.SPELLING_AUDIO_VOICE?.trim() ||
  process.env.OPENAI_TTS_VOICE?.trim() ||
  SPELLING_AUDIO_VOICE_DEFAULT;
const OPENAI_MODEL =
  process.env.SPELLING_AUDIO_MODEL?.trim() ||
  process.env.STATIC_AUDIO_MODEL?.trim() ||
  SPELLING_AUDIO_MODEL_DEFAULT;

function parseEnvMs(name: string, fallbackMs: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallbackMs;
  const n = Number(raw.replace(/_/g, ""));
  return Number.isFinite(n) && n > 0 ? n : fallbackMs;
}

const TTS_TIMEOUT_MS = parseEnvMs("SPELLING_AUDIO_TTS_TIMEOUT_MS", 30_000);
const INTER_REQUEST_MS = parseEnvMs("SPELLING_AUDIO_INTER_REQUEST_MS", 350);

function getBucketName(): string {
  const b =
    process.env.GCS_BUCKET_NAME?.trim() ||
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim() ||
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET?.trim() ||
    "";
  if (!b) throw new Error("GCS bucket not configured");
  return b;
}

function parseRenderEnvJsonLine(text: string, key: string): Record<string, unknown> | null {
  const line = text.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  if (!line) return null;
  const eq = line.indexOf("=");
  let val = line.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
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

function loadGcsCredentialsFromRenderEnvFile(): Record<string, unknown> | null {
  const envPath = `${REPO_ROOT}/Amynest-backend-dykj.env`;
  try {
    const text = readFileSync(envPath, "utf8");
    return (
      parseRenderEnvJsonLine(text, "GCS_SERVICE_ACCOUNT_JSON") ??
      parseRenderEnvJsonLine(text, "FIREBASE_SERVICE_ACCOUNT_JSON")
    );
  } catch {
    return null;
  }
}

function tryParseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    try {
      return JSON.parse(raw.replace(/\\n/g, "\n")) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function buildStorage(): Storage {
  const fromFile = loadGcsCredentialsFromRenderEnvFile();
  if (fromFile) {
    return new Storage({
      credentials: fromFile as Storage["options"]["credentials"],
      projectId: typeof fromFile.project_id === "string" ? fromFile.project_id : undefined,
    });
  }
  const json = process.env.GCS_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    const creds = tryParseJsonObject(json);
    if (!creds) throw new Error("GCS_SERVICE_ACCOUNT_JSON is set but not valid JSON");
    return new Storage({
      credentials: creds as Storage["options"]["credentials"],
      projectId: typeof creds.project_id === "string" ? creds.project_id : undefined,
    });
  }
  return new Storage();
}

function estimateMp3DurationSec(buffer: Buffer): number {
  if (buffer.byteLength < 128) return 0.5;
  const bitrateKbps = 128;
  return Math.max(0.3, Math.round((buffer.byteLength * 8) / (bitrateKbps * 1000) * 10) / 10);
}

async function generateOpenAiTts(text: string): Promise<Buffer> {
  const apiKey =
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const base = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim();
  const url = base
    ? `${base.replace(/\/$/, "")}/audio/speech`
    : "https://api.openai.com/v1/audio/speech";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        voice: OPENAI_VOICE,
        input: text,
        instructions:
          "Warm, clear Indian English for children learning to spell. Pronounce the word naturally once.",
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`OpenAI TTS failed (${res.status}): ${detail.slice(0, 200)}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.byteLength) throw new Error("TTS returned empty audio");
    return buf;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function gcsObjectExists(
  storage: Storage,
  bucketName: string,
  objectPath: string,
): Promise<boolean> {
  try {
    const [exists] = await storage.bucket(bucketName).file(objectPath).exists();
    return exists;
  } catch {
    return false;
  }
}

async function uploadToGcs(
  storage: Storage,
  bucketName: string,
  objectPath: string,
  buffer: Buffer,
): Promise<void> {
  const file = storage.bucket(bucketName).file(objectPath);
  await file.save(buffer, {
    contentType: "audio/mpeg",
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  });
  await file.makePublic().catch(() => {});
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const bucket = getBucketName();
  const catalog = getAllCatalogEntries();
  const uniqueWords = [...new Map(catalog.map((e) => [sanitizeSpellingWordSlug(e.word), e.word])).entries()]
    .filter(([slug]) => slug.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  console.log(
    `[generate:spelling-audio] ${uniqueWords.length} unique words (${catalog.length} catalog entries) → spelling/${SPELLING_AUDIO_VERSION}/`,
  );

  if (DRY_RUN) {
    for (const [slug, word] of uniqueWords.slice(0, 20)) {
      console.log(`  ${slug} ← "${word}"`);
    }
    if (uniqueWords.length > 20) console.log(`  … and ${uniqueWords.length - 20} more`);
    return;
  }

  const storage = buildStorage();
  const durations = new Map<string, number>();
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const [slug, word] of uniqueWords) {
    const objectPath = getSpellingGcsObjectPath(word, SPELLING_AUDIO_VERSION);
    try {
      const exists = !FORCE && (await gcsObjectExists(storage, bucket, objectPath));
      if (exists) {
        skipped++;
        continue;
      }

      console.log(`[generate:spelling-audio] ${slug} "${word}"`);
      const buffer = await generateOpenAiTts(word);
      await uploadToGcs(storage, bucket, objectPath, buffer);
      durations.set(slug, estimateMp3DurationSec(buffer));
      created++;
      if (INTER_REQUEST_MS > 0) await sleep(INTER_REQUEST_MS);
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[generate:spelling-audio] FAIL ${slug}: ${msg}`);
    }
  }

  const existing = loadSpellingAudioManifest();
  const manifest = buildSpellingAudioManifestFromCatalog(bucket, {
    existing,
    voice: OPENAI_VOICE,
    model: OPENAI_MODEL,
  });

  for (const entry of Object.values(manifest.entries)) {
    const slug = sanitizeSpellingWordSlug(entry.word);
    const dur = durations.get(slug);
    if (dur != null) entry.durationSec = dur;
  }

  manifest.meta.generatedAt = new Date().toISOString();
  writeSpellingAudioManifest(manifest);

  console.log(
    `[generate:spelling-audio] done — created ${created}, skipped ${skipped}, failed ${failed}`,
  );
  console.log("[generate:spelling-audio] run: pnpm run check:spelling-audio");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
