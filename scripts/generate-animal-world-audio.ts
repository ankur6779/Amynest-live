/**
 * Generate Animal World audio via ElevenLabs (Sound API + TTS), upload to GCS.
 *
 *   pnpm run generate:animal-world-audio
 *   pnpm run generate:animal-world-audio -- --force
 *   pnpm run generate:animal-world-audio -- --only=cow,lion
 *
 * Requires: ELEVENLABS_API_KEY, GCS bucket + credentials (see phonics-library script).
 * Runtime NEVER calls ElevenLabs — assets must exist in GCS before deploy.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Storage } from "@google-cloud/storage";
import {
  collectAnimalWorldAudioJobs,
  getAllAnimals,
  getAnimalMetadataGcsPath,
  getAnimalWorldCatalog,
  validateAnimalWorldMp3Buffer,
  type AnimalAudioJob,
} from "@workspace/animal-world";
import {
  PHONICS_ELEVENLABS_MODEL_DEFAULT,
  PHONICS_ELEVENLABS_VOICE_ID_DEFAULT,
  PHONICS_ELEVENLABS_WORD_VOICE_SETTINGS,
} from "@workspace/phonics-sounds";

const REPO_ROOT = join(import.meta.dirname, "..");
const LOCAL_OUT = join(REPO_ROOT, "artifacts/kidschedule/public/animal-world-audio");
const MANIFEST_PATH = join(REPO_ROOT, "lib/animal-world/src/audio-manifest.json");

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.local`, override: true });
config({ path: `${REPO_ROOT}/.env.development`, override: true });
config({ path: `${REPO_ROOT}/Amynest-backend-dykj.env`, override: true });

const VOICE_ID =
  process.env.ANIMAL_WORLD_ELEVENLABS_VOICE_ID?.trim() ||
  process.env.ELEVENLABS_VOICE_ID?.trim() ||
  PHONICS_ELEVENLABS_VOICE_ID_DEFAULT;
const TTS_MODEL =
  process.env.ANIMAL_WORLD_ELEVENLABS_MODEL?.trim() ||
  process.env.ELEVENLABS_MODEL_ID?.trim() ||
  PHONICS_ELEVENLABS_MODEL_DEFAULT;
const INTER_REQUEST_MS = Number(process.env.ANIMAL_WORLD_AUDIO_INTER_MS ?? "500");
const TIMEOUT_MS = Number(process.env.ANIMAL_WORLD_ELEVENLABS_TIMEOUT_MS ?? "45000");
const MAX_ATTEMPTS = Number(process.env.ANIMAL_WORLD_GENERATION_RETRIES ?? "5");

function readEnvApiKey(): string {
  return (
    process.env.ELEVENLABS_API_KEY?.trim() ||
    process.env.ELEVEN_LABS_API_KEY?.trim() ||
    ""
  );
}

function getBucketName(): string {
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
    if (!creds) {
      throw new Error("GCS_SERVICE_ACCOUNT_JSON is set but not valid JSON");
    }
    return new Storage({
      credentials: creds as Storage["options"]["credentials"],
      projectId: typeof creds.project_id === "string" ? creds.project_id : undefined,
    });
  }
  return new Storage();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function callElevenLabsSoundEffect(job: AnimalAudioJob): Promise<Buffer> {
  const apiKey = readEnvApiKey();
  const url = `https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128`;
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
        text: job.prompt,
        duration_seconds: job.durationSec,
        prompt_influence: job.promptInfluence ?? 0.85,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ElevenLabs Sound HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function callElevenLabsNarration(text: string): Promise<Buffer> {
  const apiKey = readEnvApiKey();
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
        text,
        model_id: TTS_MODEL,
        voice_settings: { ...PHONICS_ELEVENLABS_WORD_VOICE_SETTINGS },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ElevenLabs TTS HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function synthesizeJob(job: AnimalAudioJob): Promise<Buffer> {
  let lastError = "unknown";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw =
        job.kind === "sound_effect"
          ? await callElevenLabsSoundEffect(job)
          : await callElevenLabsNarration(job.prompt);
      const validation = validateAnimalWorldMp3Buffer(raw);
      if (validation.ok) return raw;
      lastError = validation.reason ?? "invalid_mp3";
    } catch (err) {
      lastError = err instanceof Error ? err.message : "generation_failed";
    }
    if (attempt < MAX_ATTEMPTS) await sleep(INTER_REQUEST_MS * attempt);
  }
  throw new Error(lastError);
}

async function uploadToGcs(
  storage: Storage,
  bucket: string,
  gcsPath: string,
  buffer: Buffer,
): Promise<void> {
  const file = storage.bucket(bucket).file(gcsPath);
  await file.save(buffer, {
    contentType: "audio/mpeg",
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  });
  await file.makePublic().catch(() => {});
}

function localPathForGcs(gcsPath: string): string {
  return join(LOCAL_OUT, gcsPath.replace(/^animal-world\//, ""));
}

function parseOnlyAnimals(argv: string[]): Set<string> | null {
  const arg = argv.find((a) => a.startsWith("--only="));
  if (!arg) return null;
  return new Set(
    arg
      .slice("--only=".length)
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function main(): Promise<void> {
  const apiKey = readEnvApiKey();
  if (!apiKey) {
    console.error("[animal-world-audio] ELEVENLABS_API_KEY required");
    process.exit(1);
  }

  const force = process.argv.includes("--force");
  const onlyAnimals = parseOnlyAnimals(process.argv);
  const bucket = getBucketName();
  const storage = buildStorage();
  mkdirSync(LOCAL_OUT, { recursive: true });

  const animals = getAllAnimals().filter((a) => !onlyAnimals || onlyAnimals.has(a.id));
  const jobs = collectAnimalWorldAudioJobs(animals);

  console.log(
    `[animal-world-audio] ${jobs.length} clips for ${animals.length} animals → gs://${bucket}/animal-world/`,
  );

  const manifest: Record<
    string,
    { gcsPath: string; kind: string; source: string; bytes: number; durationMs?: number }
  > = {};

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const job of jobs) {
    const key = `${job.animalId}:${job.assetId}`;
    const localFile = localPathForGcs(job.gcsPath);
    mkdirSync(join(localFile, ".."), { recursive: true });

    if (!force) {
      try {
        const [exists] = await storage.bucket(bucket).file(job.gcsPath).exists();
        if (exists) {
          if (!existsSync(localFile)) {
            const [buf] = await storage.bucket(bucket).file(job.gcsPath).download();
            writeFileSync(localFile, buf);
            console.log(`[mirror-gcs] ${job.gcsPath}`);
          }
          skipped += 1;
          manifest[key] = { gcsPath: job.gcsPath, kind: job.kind, source: "gcs_existing", bytes: 0 };
          console.log(`[skip] ${job.gcsPath}`);
          continue;
        }
      } catch {
        /* regenerate */
      }
      if (existsSync(localFile) && !force) {
        const buffer = readFileSync(localFile);
        await uploadToGcs(storage, bucket, job.gcsPath, buffer);
        skipped += 1;
        manifest[key] = {
          gcsPath: job.gcsPath,
          kind: job.kind,
          source: "local_reupload",
          bytes: buffer.byteLength,
        };
        console.log(`[reupload-local] ${job.gcsPath}`);
        continue;
      }
    }

    console.log(
      `[gen] ${job.gcsPath} (${job.kind}) prompt="${job.prompt.slice(0, 72)}${job.prompt.length > 72 ? "…" : ""}"`,
    );

    try {
      const buffer = await synthesizeJob(job);
      writeFileSync(localFile, buffer);
      await uploadToGcs(storage, bucket, job.gcsPath, buffer);
      const validation = validateAnimalWorldMp3Buffer(buffer);
      manifest[key] = {
        gcsPath: job.gcsPath,
        kind: job.kind,
        source: job.kind === "sound_effect" ? "elevenlabs_sound" : "elevenlabs_tts",
        bytes: buffer.byteLength,
        durationMs: validation.estimatedDurationMs,
      };
      created += 1;
      console.log(`[ok] ${job.gcsPath} (${buffer.byteLength} bytes)`);
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[fail] ${job.gcsPath}: ${message}`);
    }

    await sleep(INTER_REQUEST_MS);
  }

  const catalogPath = getAnimalMetadataGcsPath();
  const catalogBody = readFileSync(join(REPO_ROOT, "lib/animal-world/src/animals.json"));
  await uploadToGcs(storage, bucket, catalogPath, catalogBody);

  writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(
      {
        version: getAnimalWorldCatalog().version,
        generatedAt: new Date().toISOString(),
        bucket,
        voiceId: VOICE_ID,
        ttsModel: TTS_MODEL,
        assets: manifest,
      },
      null,
      2,
    ),
  );

  console.log(
    `[animal-world-audio] done — created=${created} skipped=${skipped} failed=${failed} manifest=${MANIFEST_PATH}`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
