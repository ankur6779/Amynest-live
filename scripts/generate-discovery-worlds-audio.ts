/**
 * Generate discovery world audio (vehicles, nature, home, instruments) via ElevenLabs.
 * Upload to GCS + write signed URL manifest for ops verification.
 *
 *   pnpm run generate:discovery-worlds-audio
 *   pnpm run generate:discovery-worlds-audio -- --force
 *   pnpm run generate:discovery-worlds-audio -- --world=vehicle_world
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Storage } from "@google-cloud/storage";
import { validateAnimalWorldMp3Buffer } from "@workspace/animal-world";
import {
  collectWorldAudioJobs,
  getWorldManifestGcsPath,
  type WorldAudioJob,
  type WorldId,
} from "@workspace/world-engine";
import { getVehicleWorldManifest } from "@workspace/vehicle-world";
import { getNatureWorldManifest } from "@workspace/nature-sounds-world";
import { getHomeSoundsManifest } from "@workspace/home-sounds-world";
import { getInstrumentWorldManifest } from "@workspace/instrument-world";
import {
  PHONICS_ELEVENLABS_MODEL_DEFAULT,
  PHONICS_ELEVENLABS_VOICE_ID_DEFAULT,
  PHONICS_ELEVENLABS_WORD_VOICE_SETTINGS,
} from "@workspace/phonics-sounds";

const REPO_ROOT = join(import.meta.dirname, "..");
const LOCAL_OUT = join(REPO_ROOT, "artifacts/kidschedule/public/discovery-worlds-audio");
const SIGNED_MANIFEST_OUT = join(REPO_ROOT, "lib/world-engine/src/discovery-worlds-signed-urls.json");

const WORLD_LOADERS: Record<
  Exclude<WorldId, "animal_world">,
  () => ReturnType<typeof getVehicleWorldManifest>
> = {
  vehicle_world: getVehicleWorldManifest,
  nature_world: getNatureWorldManifest,
  home_sounds_world: getHomeSoundsManifest,
  instrument_world: getInstrumentWorldManifest,
};

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.local`, override: true });
config({ path: `${REPO_ROOT}/.env.development`, override: true });
config({ path: `${REPO_ROOT}/Amynest-backend-dykj.env`, override: true });

const VOICE_ID =
  process.env.DISCOVERY_WORLDS_ELEVENLABS_VOICE_ID?.trim() ||
  process.env.ELEVENLABS_VOICE_ID?.trim() ||
  PHONICS_ELEVENLABS_VOICE_ID_DEFAULT;
const TTS_MODEL =
  process.env.DISCOVERY_WORLDS_ELEVENLABS_MODEL?.trim() ||
  process.env.ELEVENLABS_MODEL_ID?.trim() ||
  PHONICS_ELEVENLABS_MODEL_DEFAULT;
const INTER_REQUEST_MS = Number(process.env.DISCOVERY_WORLDS_AUDIO_INTER_MS ?? "500");
const TIMEOUT_MS = Number(process.env.DISCOVERY_WORLDS_ELEVENLABS_TIMEOUT_MS ?? "45000");
const MAX_ATTEMPTS = Number(process.env.DISCOVERY_WORLDS_GENERATION_RETRIES ?? "5");
const SIGNED_URL_TTL_MS = Number(process.env.DISCOVERY_WORLDS_SIGNED_URL_TTL_MS ?? String(7 * 24 * 60 * 60 * 1000));

function readEnvApiKey(): string {
  return process.env.ELEVENLABS_API_KEY?.trim() || process.env.ELEVEN_LABS_API_KEY?.trim() || "";
}

function getBucketName(): string {
  return (
    process.env.GCS_BUCKET_NAME?.trim() ||
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim() ||
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET?.trim() ||
    "amynest-audio-storage"
  );
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
    return JSON.parse(Buffer.from(raw.trim(), "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
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
    if (creds) {
      return new Storage({
        credentials: creds as Storage["options"]["credentials"],
        projectId: typeof creds.project_id === "string" ? creds.project_id : undefined,
      });
    }
  }
  return new Storage();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function callElevenLabsSoundEffect(job: WorldAudioJob): Promise<Buffer> {
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

async function synthesizeJob(job: WorldAudioJob): Promise<Buffer> {
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
  contentType = "audio/mpeg",
): Promise<void> {
  await storage.bucket(bucket).file(gcsPath).save(buffer, {
    contentType,
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  });
}

async function signedUrlFor(
  storage: Storage,
  bucket: string,
  gcsPath: string,
): Promise<string> {
  const [url] = await storage.bucket(bucket).file(gcsPath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + SIGNED_URL_TTL_MS,
  });
  return url;
}

function localPathForGcs(gcsPath: string): string {
  return join(LOCAL_OUT, gcsPath);
}

function parseWorldFilter(argv: string[]): Set<Exclude<WorldId, "animal_world">> | null {
  const arg = argv.find((a) => a.startsWith("--world="));
  if (!arg) return null;
  const id = arg.slice("--world=".length).trim() as Exclude<WorldId, "animal_world">;
  if (!(id in WORLD_LOADERS)) {
    throw new Error(`Unknown world: ${id}`);
  }
  return new Set([id]);
}

async function main(): Promise<void> {
  const apiKey = readEnvApiKey();
  if (!apiKey) {
    console.error("[discovery-worlds-audio] ELEVENLABS_API_KEY required");
    process.exit(1);
  }

  const force = process.argv.includes("--force");
  const worldFilter = parseWorldFilter(process.argv);
  const bucket = getBucketName();
  const storage = buildStorage();
  mkdirSync(LOCAL_OUT, { recursive: true });

  const worlds = (Object.keys(WORLD_LOADERS) as Array<Exclude<WorldId, "animal_world">>).filter(
    (w) => !worldFilter || worldFilter.has(w),
  );

  const signedManifest: Record<
    string,
    { gcsPath: string; signedUrl: string; proxyUrl: string; bytes?: number }
  > = {};

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const worldId of worlds) {
    const manifest = WORLD_LOADERS[worldId]();
    const jobs = collectWorldAudioJobs(worldId, manifest.items);
    console.log(`[discovery-worlds-audio] ${worldId}: ${jobs.length} clips → gs://${bucket}/`);

    for (const job of jobs) {
      const localFile = localPathForGcs(job.gcsPath);
      mkdirSync(join(localFile, ".."), { recursive: true });

      if (!force) {
        try {
          const [exists] = await storage.bucket(bucket).file(job.gcsPath).exists();
          if (exists) {
            skipped += 1;
            const signedUrl = await signedUrlFor(storage, bucket, job.gcsPath);
            signedManifest[job.gcsPath] = {
              gcsPath: job.gcsPath,
              signedUrl,
              proxyUrl: `/api/worlds-library/${job.gcsPath}`,
            };
            console.log(`[skip] ${job.gcsPath}`);
            continue;
          }
        } catch {
          /* regenerate */
        }
      }

      console.log(`[gen] ${job.gcsPath} (${job.kind})`);
      try {
        const buffer = await synthesizeJob(job);
        writeFileSync(localFile, buffer);
        await uploadToGcs(storage, bucket, job.gcsPath, buffer);
        const signedUrl = await signedUrlFor(storage, bucket, job.gcsPath);
        signedManifest[job.gcsPath] = {
          gcsPath: job.gcsPath,
          signedUrl,
          proxyUrl: `/api/worlds-library/${job.gcsPath}`,
          bytes: buffer.byteLength,
        };
        created += 1;
        console.log(`[ok] ${job.gcsPath} (${buffer.byteLength} bytes)`);
      } catch (err) {
        failed += 1;
        console.error(`[fail] ${job.gcsPath}:`, err instanceof Error ? err.message : err);
      }
      await sleep(INTER_REQUEST_MS);
    }

    const manifestPath = getWorldManifestGcsPath(worldId);
    try {
    const manifestBody = readFileSync(
      join(
        REPO_ROOT,
        worldId === "vehicle_world"
          ? "lib/vehicle-world/src/manifest.json"
          : worldId === "nature_world"
            ? "lib/nature-sounds-world/src/manifest.json"
            : worldId === "home_sounds_world"
              ? "lib/home-sounds-world/src/manifest.json"
              : "lib/instrument-world/src/manifest.json",
      ),
    );
    await uploadToGcs(storage, bucket, manifestPath, manifestBody, "application/json");
    console.log(`[catalog] uploaded ${manifestPath}`);
    } catch (err) {
      console.error(`[catalog-fail] ${manifestPath}:`, err instanceof Error ? err.message : err);
    }
  }

  writeFileSync(
    SIGNED_MANIFEST_OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        bucket,
        expiresAfterMs: SIGNED_URL_TTL_MS,
        assets: signedManifest,
      },
      null,
      2,
    ),
  );

  console.log(
    `[discovery-worlds-audio] done created=${created} skipped=${skipped} failed=${failed} signed=${SIGNED_MANIFEST_OUT}`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
