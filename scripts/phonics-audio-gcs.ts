/**
 * GCS + ElevenLabs helpers shared by phonics audio generation scripts.
 */
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { Storage } from "@google-cloud/storage";
import {
  PHONICS_ELEVENLABS_MODEL_DEFAULT,
  PHONICS_ELEVENLABS_VOICE_ID_DEFAULT,
  PHONICS_ELEVENLABS_VOICE_SETTINGS,
  PHONICS_ELEVENLABS_WORD_VOICE_SETTINGS,
  validatePhonicsMp3Buffer,
  type PhonicsCatalogEntry,
} from "@workspace/phonics-sounds";
import { describeFallbackTone, generateFallbackToneMp3 } from "./phonics-audio-fallback.js";
import { isFfmpegAvailable, processPhonemeAudioBuffer } from "./phonics-audio-process.js";
import { REPO_ROOT } from "./phonics-library-io.js";

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.development`, override: true });
config({ path: `${REPO_ROOT}/.env.local`, override: true });
config({ path: `${REPO_ROOT}/Amynest-backend-dykj.env`, override: true });

export const VOICE_ID =
  process.env.PHONICS_ELEVENLABS_VOICE_ID?.trim() ||
  process.env.ELEVENLABS_VOICE_ID?.trim() ||
  PHONICS_ELEVENLABS_VOICE_ID_DEFAULT;
export const MODEL_ID =
  process.env.PHONICS_ELEVENLABS_MODEL?.trim() ||
  process.env.ELEVENLABS_MODEL_ID?.trim() ||
  PHONICS_ELEVENLABS_MODEL_DEFAULT;
const INTER_REQUEST_MS = Number(process.env.PHONICS_AUDIO_INTER_MS ?? "400");
const TIMEOUT_MS = Number(process.env.PHONICS_ELEVENLABS_TIMEOUT_MS ?? "20000");
const MAX_ATTEMPTS = Number(process.env.PHONICS_GENERATION_RETRIES ?? "6");

export function readEnvApiKey(): string {
  return (
    process.env.ELEVENLABS_API_KEY?.trim() ||
    process.env.ELEVEN_LABS_API_KEY?.trim() ||
    ""
  );
}

export function getBucketName(): string {
  return (
    process.env.GCS_BUCKET_NAME?.trim() ||
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim() ||
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET?.trim() ||
    "amynest-audio-storage"
  );
}

function parseRenderEnvJsonLine(text: string, key: string): Record<string, unknown> | null {
  const line = text.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  if (!line) return null;
  const eq = line.indexOf("=");
  let val = line.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return tryParseJsonObject(val);
}

function renderEnvJsonCandidates(raw: string): string[] {
  const t = raw.trim();
  const out = new Set<string>([t]);
  const push = (s: string) => {
    if (s.trim()) out.add(s);
  };
  if (t.includes("\\n")) push(t.replace(/\\n/g, "\n"));
  if (t.includes('\\"')) push(t.replace(/\\"/g, '"'));
  let combo = t;
  if (combo.includes("\\n")) combo = combo.replace(/\\n/g, "\n");
  if (combo.includes('\\"')) combo = combo.replace(/\\"/g, '"');
  push(combo);
  return [...out];
}

function tryParseJsonObject(raw: string): Record<string, unknown> | null {
  for (const s of renderEnvJsonCandidates(raw)) {
    try {
      return JSON.parse(s) as Record<string, unknown>;
    } catch {
      /* try next */
    }
  }
  try {
    const decoded = Buffer.from(raw.trim(), "base64").toString("utf8");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function loadGcsCredentialsFromRenderEnvFile(): Record<string, unknown> | null {
  try {
    const text = readFileSync(`${REPO_ROOT}/Amynest-backend-dykj.env`, "utf8");
    return (
      parseRenderEnvJsonLine(text, "GCS_SERVICE_ACCOUNT_JSON") ??
      parseRenderEnvJsonLine(text, "FIREBASE_SERVICE_ACCOUNT_JSON")
    );
  } catch {
    return null;
  }
}

export function buildStorage(): Storage {
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

export async function callElevenLabs(
  speakText: string,
  isolatedPhoneme: boolean,
): Promise<Buffer> {
  const apiKey = readEnvApiKey();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY required");

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(VOICE_ID)}?output_format=mp3_44100_128`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: speakText,
        model_id: MODEL_ID,
        voice_settings: isolatedPhoneme
          ? { ...PHONICS_ELEVENLABS_VOICE_SETTINGS }
          : { ...PHONICS_ELEVENLABS_WORD_VOICE_SETTINGS },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ElevenLabs HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function postProcess(buffer: Buffer, entry: PhonicsCatalogEntry, useFfmpeg: boolean): Promise<Buffer> {
  if (!useFfmpeg || !entry.isolatedPhoneme) return buffer;
  return processPhonemeAudioBuffer(buffer, entry.id);
}

export async function synthesizeCatalogEntry(
  entry: PhonicsCatalogEntry,
  useFfmpeg: boolean,
  opts?: { allowFallback?: boolean },
): Promise<{ buffer: Buffer; durationMs: number; source: "elevenlabs" | "fallback_tone" }> {
  const allowFallback = opts?.allowFallback ?? process.env.PHONICS_NO_FALLBACK !== "1";
  let lastError = "unknown";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callElevenLabs(entry.speakText, entry.isolatedPhoneme);
      const buffer = await postProcess(raw, entry, useFfmpeg);
      const validation = validatePhonicsMp3Buffer(
        buffer,
        entry.isolatedPhoneme ? entry.id : undefined,
      );
      if (validation.ok || !entry.isolatedPhoneme) {
        return { buffer, durationMs: validation.estimatedDurationMs, source: "elevenlabs" };
      }
      lastError = validation.reason ?? "validation_failed";
    } catch (err) {
      lastError = err instanceof Error ? err.message : "elevenlabs_failed";
    }
    if (attempt < MAX_ATTEMPTS) await sleep(INTER_REQUEST_MS);
  }
  if (!allowFallback) {
    throw new Error(`${entry.id}: synthesis failed after ${MAX_ATTEMPTS} attempts (${lastError})`);
  }
  console.warn(`[phonics-audio] ${entry.id}: fallback — ${describeFallbackTone(entry.id)} (${lastError})`);
  const buffer = await generateFallbackToneMp3(entry.id);
  const validation = validatePhonicsMp3Buffer(buffer, entry.isolatedPhoneme ? entry.id : undefined);
  return { buffer, durationMs: validation.estimatedDurationMs, source: "fallback_tone" };
}

export async function uploadToGcs(
  storage: Storage,
  bucket: string,
  gcsPath: string,
  buffer: Buffer,
): Promise<string> {
  const file = storage.bucket(bucket).file(gcsPath);
  await file.save(buffer, {
    contentType: "audio/mpeg",
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  });
  await file.makePublic().catch(() => {});
  return `https://storage.googleapis.com/${bucket}/${gcsPath}`;
}

export async function verifyGcsUpload(
  storage: Storage,
  bucket: string,
  gcsPath: string,
): Promise<boolean> {
  try {
    const [exists] = await storage.bucket(bucket).file(gcsPath).exists();
    return exists;
  } catch {
    return false;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function resolveUseFfmpeg(): Promise<boolean> {
  if (process.env.PHONICS_SKIP_FFMPEG_TRIM === "1") return false;
  return isFfmpegAvailable();
}
