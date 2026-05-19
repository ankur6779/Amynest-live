/**
 * Pre-generate ElevenLabs MP3s for all static TTS phrases and upload to GCS.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... DEFAULT_OBJECT_STORAGE_BUCKET_ID=... \
 *     GCS_SERVICE_ACCOUNT_JSON='...' \
 *     pnpm run generate:static-audio
 *
 * Fix only gaps (local catalog + optional API /api/static-audio/missing):
 *   pnpm run generate:static-audio -- --fix-missing
 *
 * Writes static-audio-map.json to kidschedule + api-server data dirs.
 */
import { config } from "dotenv";
import { Storage } from "@google-cloud/storage";
import {
  computeCatalogMissingStaticAudioKeys,
  extractTextFromMissingKey,
  getStaticAudioObjectKey,
  getStaticTtsEntries,
  mergeMissingStaticAudioKeys,
  normalizeStaticAudioKey,
  resolveStaticTtsFromMissingKey,
  type StaticAudioMap,
  type StaticAudioMode,
} from "@workspace/static-audio";
import {
  listCatalogMissingKeys,
  loadStaticAudioMap,
  REPO_ROOT,
  STATIC_AUDIO_MAP_PATHS,
  writeStaticAudioMap,
} from "./static-audio-paths.js";

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.local`, override: true });

const AMY_VOICE_ID = process.env.STATIC_AUDIO_VOICE_ID?.trim() || "QbQKfe9vgx5OsbZUvlFv";
const AMY_MODEL_ID = process.env.STATIC_AUDIO_MODEL_ID?.trim() || "eleven_turbo_v2_5";

const VOICE_SETTINGS: Record<
  StaticAudioMode,
  { stability: number; similarity_boost: number; style: number; use_speaker_boost: boolean }
> = {
  default: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true },
  phonics: { stability: 0.85, similarity_boost: 0.85, style: 0, use_speaker_boost: true },
};

function getBucketName(): string {
  return (
    process.env.GCS_BUCKET_NAME?.trim() ||
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim() ||
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET?.trim() ||
    ""
  );
}

function buildStorage(): Storage {
  const json = process.env.GCS_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    const creds = JSON.parse(json) as Record<string, unknown>;
    return new Storage({
      credentials: creds as Storage["options"]["credentials"],
      projectId: typeof creds.project_id === "string" ? creds.project_id : undefined,
    });
  }
  return new Storage();
}

async function generateAudio(text: string, mode: StaticAudioMode): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(AMY_VOICE_ID)}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: AMY_MODEL_ID,
      voice_settings: VOICE_SETTINGS[mode],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`TTS failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.byteLength) throw new Error("TTS returned empty audio");
  return buf;
}

async function uploadToGCS(
  storage: Storage,
  bucketName: string,
  buffer: Buffer,
  objectKey: string,
): Promise<string> {
  const fileName = `static-audio/${objectKey}.mp3`;
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);

  await file.save(buffer, {
    contentType: "audio/mpeg",
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  });

  await file.makePublic().catch(() => {});

  return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}

async function fetchMissingFromApi(): Promise<string[]> {
  const base = (
    process.env.API_PUBLIC_URL?.trim() ||
    process.env.VITE_APP_API_ORIGIN?.trim() ||
    "http://localhost:5000"
  ).replace(/\/$/, "");

  try {
    const res = await fetch(`${base}/api/static-audio/missing`);
    if (!res.ok) {
      console.warn("[static-audio] API missing list failed:", res.status);
      return [];
    }
    const body = (await res.json()) as { missing?: string[] };
    return Array.isArray(body.missing) ? body.missing : [];
  } catch (err) {
    console.warn("[static-audio] Could not fetch /api/static-audio/missing:", err);
    return [];
  }
}

async function collectMissingKeys(map: StaticAudioMap): Promise<string[]> {
  const catalogMissing = computeCatalogMissingStaticAudioKeys(map);
  const apiMissing = await fetchMissingFromApi();
  return mergeMissingStaticAudioKeys(catalogMissing, apiMissing);
}

async function generateAndMapEntry(
  key: string,
  text: string,
  mode: StaticAudioMode,
  map: StaticAudioMap,
  storage: Storage,
  bucketName: string,
): Promise<boolean> {
  const mapKey = normalizeStaticAudioKey(text);
  const objectKey = getStaticAudioObjectKey(text, mode);

  console.log("[GENERATE AUDIO]", key, text);

  const attempt = async (): Promise<void> => {
    const audio = await generateAudio(text, mode);
    const url = await uploadToGCS(storage, bucketName, audio, objectKey);
    map[mode][mapKey] = url;
    writeStaticAudioMap(map);
    console.log("[DONE]", key, url);
  };

  try {
    await attempt();
    return true;
  } catch (firstErr) {
    console.warn("[RETRY]", key, firstErr instanceof Error ? firstErr.message : firstErr);
    try {
      await attempt();
      return true;
    } catch (retryErr) {
      console.error("[FAILED]", key, text, retryErr);
      return false;
    }
  }
}

async function regenerateMissingEntries(
  missingKeys: string[],
  map: StaticAudioMap,
  storage: Storage,
  bucketName: string,
): Promise<{ ok: number; failed: number; skipped: number }> {
  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (const key of missingKeys) {
    const resolved = resolveStaticTtsFromMissingKey(key);
    const displayText = extractTextFromMissingKey(key);

    if (!resolved) {
      console.error("[SKIP] Unknown missing key (not in catalog):", key, displayText ?? "");
      skipped++;
      continue;
    }

    const success = await generateAndMapEntry(
      key,
      resolved.text,
      resolved.mode,
      map,
      storage,
      bucketName,
    );
    if (success) ok++;
    else failed++;
  }

  return { ok, failed, skipped };
}

function assertFullCoverage(map: StaticAudioMap): void {
  const stillMissing = computeCatalogMissingStaticAudioKeys(map);
  if (stillMissing.length > 0) {
    console.error("Still missing:", stillMissing);
    process.exit(1);
  }
}

async function run(): Promise<void> {
  if (!process.env.ELEVENLABS_API_KEY?.trim()) {
    throw new Error(
      "ELEVENLABS_API_KEY is not set. Add it to .env at the repo root, then run: pnpm run generate:static-audio",
    );
  }

  const bucketName = getBucketName();
  if (!bucketName) {
    throw new Error("Set GCS_BUCKET_NAME or DEFAULT_OBJECT_STORAGE_BUCKET_ID");
  }

  const storage = buildStorage();
  const missingOnly = process.argv.includes("--missing-only");
  const skipExisting = process.argv.includes("--skip-existing");
  const map = loadStaticAudioMap();

  let ok = 0;
  let failed = 0;
  let skipped = 0;

  const missingKeys = await collectMissingKeys(map);
  console.log(`Missing keys from API + catalog: ${missingKeys.length}`);

  if (missingKeys.length > 0) {
    const result = await regenerateMissingEntries(missingKeys, map, storage, bucketName);
    ok += result.ok;
    failed += result.failed;
    skipped += result.skipped;
    Object.assign(map, loadStaticAudioMap());
  }

  if (!missingOnly) {
    const entries = getStaticTtsEntries();
    console.log(`Full catalog pass: ${entries.length} entries → ${bucketName}`);

    for (const { text, mode } of entries) {
      const mapKey = normalizeStaticAudioKey(text);
      if (skipExisting && map[mode][mapKey]?.startsWith("https://")) {
        skipped++;
        continue;
      }

      const missingKey = `${mode}:${mapKey}`;
      const success = await generateAndMapEntry(
        missingKey,
        text,
        mode,
        map,
        storage,
        bucketName,
      );
      if (success) ok++;
      else failed++;
    }
  }

  writeStaticAudioMap(map);
  assertFullCoverage(map);

  console.log(`\nFinished. ok=${ok} skipped=${skipped} failed=${failed}`);
  console.log(`Map written to:\n  ${STATIC_AUDIO_MAP_PATHS.join("\n  ")}`);
  if (failed > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
