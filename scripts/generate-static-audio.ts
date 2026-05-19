/**
 * Pre-generate ElevenLabs MP3s for all static TTS phrases and upload to GCS.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... DEFAULT_OBJECT_STORAGE_BUCKET_ID=... \
 *     GCS_SERVICE_ACCOUNT_JSON='...' \
 *     pnpm run generate:static-audio
 *
 * Retries until 100% catalog coverage (max 5 passes). Use --force-all to re-upload everything.
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
  staticAudioMissingKey,
  type StaticAudioMap,
  type StaticAudioMode,
} from "@workspace/static-audio";
import {
  loadStaticAudioMap,
  REPO_ROOT,
  STATIC_AUDIO_MAP_PATHS,
  writeStaticAudioMap,
} from "./static-audio-paths.js";

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.local`, override: true });

const AMY_VOICE_ID = process.env.STATIC_AUDIO_VOICE_ID?.trim() || "QbQKfe9vgx5OsbZUvlFv";
const AMY_MODEL_ID = process.env.STATIC_AUDIO_MODEL_ID?.trim() || "eleven_turbo_v2_5";
const TTS_TIMEOUT_MS = Number(process.env.STATIC_AUDIO_TTS_TIMEOUT_MS ?? "10_000");
const MAX_PASS_RETRIES = Number(process.env.STATIC_AUDIO_MAX_RETRIES ?? "5");

const VOICE_SETTINGS: Record<
  StaticAudioMode,
  { stability: number; similarity_boost: number; style: number; use_speaker_boost: boolean }
> = {
  default: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true },
  phonics: { stability: 0.85, similarity_boost: 0.85, style: 0, use_speaker_boost: true },
};

const TOTAL_PHRASES = getStaticTtsEntries().length;

type PassStats = { generated: number; skipped: number; backfilled: number; failed: number };

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

function publicGcsUrl(bucketName: string, objectKey: string): string {
  return `https://storage.googleapis.com/${bucketName}/static-audio/${objectKey}.mp3`;
}

function isValidMapUrl(url: string | undefined): boolean {
  const u = (url ?? "").trim();
  return u.startsWith("https://") && !u.includes("undefined");
}

function isEntryComplete(map: StaticAudioMap, mode: StaticAudioMode, text: string): boolean {
  const mapKey = normalizeStaticAudioKey(text);
  return isValidMapUrl(map[mode]?.[mapKey]);
}

function logCoverageSummary(map: StaticAudioMap, passLabel: string): number {
  const missing = computeCatalogMissingStaticAudioKeys(map);
  const covered = TOTAL_PHRASES - missing.length;
  console.log(`[COVERAGE] ${passLabel}`, {
    totalPhrases: TOTAL_PHRASES,
    covered,
    missing: missing.length,
  });
  return missing.length;
}

async function gcsObjectExists(
  storage: Storage,
  bucketName: string,
  objectKey: string,
): Promise<boolean> {
  try {
    const [exists] = await storage
      .bucket(bucketName)
      .file(`static-audio/${objectKey}.mp3`)
      .exists();
    return exists;
  } catch {
    return false;
  }
}

async function generateAudio(text: string, mode: StaticAudioMode): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(AMY_VOICE_ID)}?output_format=mp3_44100_128`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

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
        model_id: AMY_MODEL_ID,
        voice_settings: VOICE_SETTINGS[mode],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`TTS failed (${res.status}): ${detail.slice(0, 200)}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.byteLength) throw new Error("TTS returned empty audio");
    return buf;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`TTS timeout after ${TTS_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
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

  return publicGcsUrl(bucketName, objectKey);
}

async function fetchMissingFromApi(): Promise<string[]> {
  const base = (
    process.env.API_PUBLIC_URL?.trim() ||
    process.env.VITE_APP_API_ORIGIN?.trim() ||
    "http://localhost:5000"
  ).replace(/\/$/, "");

  try {
    const res = await fetch(`${base}/api/static-audio/missing`, { signal: AbortSignal.timeout(15_000) });
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

async function tryBackfillFromGcs(
  text: string,
  mode: StaticAudioMode,
  map: StaticAudioMap,
  storage: Storage,
  bucketName: string,
): Promise<boolean> {
  const mapKey = normalizeStaticAudioKey(text);
  if (isEntryComplete(map, mode, text)) return false;

  const objectKey = getStaticAudioObjectKey(text, mode);
  const exists = await gcsObjectExists(storage, bucketName, objectKey);
  if (!exists) return false;

  map[mode][mapKey] = publicGcsUrl(bucketName, objectKey);
  writeStaticAudioMap(map);
  const key = staticAudioMissingKey(mode, mapKey);
  console.log("[BACKFILL GCS]", key, map[mode][mapKey]);
  return true;
}

async function ensureCatalogEntry(
  text: string,
  mode: StaticAudioMode,
  map: StaticAudioMap,
  storage: Storage,
  bucketName: string,
  skipExisting: boolean,
  stats: PassStats,
): Promise<void> {
  const mapKey = normalizeStaticAudioKey(text);
  const key = staticAudioMissingKey(mode, mapKey);

  if (skipExisting && isEntryComplete(map, mode, text)) {
    stats.skipped++;
    return;
  }

  if (skipExisting && (await tryBackfillFromGcs(text, mode, map, storage, bucketName))) {
    stats.backfilled++;
    return;
  }

  const success = await generateAndMapEntry(key, text, mode, map, storage, bucketName);
  if (success) stats.generated++;
  else stats.failed++;
}

async function runCatalogPass(
  map: StaticAudioMap,
  storage: Storage,
  bucketName: string,
  skipExisting: boolean,
): Promise<PassStats> {
  const stats: PassStats = { generated: 0, skipped: 0, backfilled: 0, failed: 0 };

  console.log(`[PASS] Full catalog (${TOTAL_PHRASES} phrases), skipExisting=${skipExisting}`);

  for (const { text, mode } of getStaticTtsEntries()) {
    await ensureCatalogEntry(text, mode, map, storage, bucketName, skipExisting, stats);
  }

  writeStaticAudioMap(map);
  return stats;
}

async function runMissingKeysPass(
  missingKeys: string[],
  map: StaticAudioMap,
  storage: Storage,
  bucketName: string,
  skipExisting: boolean,
): Promise<PassStats> {
  const stats: PassStats = { generated: 0, skipped: 0, backfilled: 0, failed: 0 };

  console.log(`[PASS] Missing-only (${missingKeys.length} keys), skipExisting=${skipExisting}`);

  for (const key of missingKeys) {
    const resolved = resolveStaticTtsFromMissingKey(key);
    if (!resolved) {
      console.error("[SKIP] Unknown missing key (not in catalog):", key, extractTextFromMissingKey(key) ?? "");
      stats.failed++;
      continue;
    }

    const { text, mode } = resolved;
    if (skipExisting && isEntryComplete(map, mode, text)) {
      stats.skipped++;
      continue;
    }

    if (skipExisting && (await tryBackfillFromGcs(text, mode, map, storage, bucketName))) {
      stats.backfilled++;
      continue;
    }

    const success = await generateAndMapEntry(key, text, mode, map, storage, bucketName);
    if (success) stats.generated++;
    else stats.failed++;
  }

  writeStaticAudioMap(map);
  return stats;
}

function mergeStats(into: PassStats, from: PassStats): void {
  into.generated += from.generated;
  into.skipped += from.skipped;
  into.backfilled += from.backfilled;
  into.failed += from.failed;
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
  const forceAll = process.argv.includes("--force-all");
  const skipExisting = !forceAll;

  console.log("[CONFIG]", {
    bucketName,
    totalPhrases: TOTAL_PHRASES,
    maxPassRetries: MAX_PASS_RETRIES,
    ttsTimeoutMs: TTS_TIMEOUT_MS,
    skipExisting,
  });

  const map = loadStaticAudioMap();
  const totals: PassStats = { generated: 0, skipped: 0, backfilled: 0, failed: 0 };

  let missingCount = logCoverageSummary(map, "initial");
  let retryCount = 0;

  if (missingCount > 0 || forceAll) {
    const firstPass = await runCatalogPass(map, storage, bucketName, skipExisting);
    mergeStats(totals, firstPass);
    Object.assign(map, loadStaticAudioMap());
    missingCount = logCoverageSummary(map, "after catalog pass");
    console.log("[PASS STATS] catalog", firstPass);
  }

  while (missingCount > 0 && retryCount < MAX_PASS_RETRIES) {
    retryCount++;
    const missingKeys = await collectMissingKeys(map);
    console.log(`[RETRY] Pass ${retryCount}/${MAX_PASS_RETRIES} — missing keys count: ${missingKeys.length}`);

    if (missingKeys.length === 0) break;

    const passStats = await runMissingKeysPass(missingKeys, map, storage, bucketName, skipExisting);
    mergeStats(totals, passStats);
    Object.assign(map, loadStaticAudioMap());
    missingCount = logCoverageSummary(map, `after retry ${retryCount}`);
    console.log("[PASS STATS] missing-only", passStats);
  }

  writeStaticAudioMap(map);
  const finalMissing = computeCatalogMissingStaticAudioKeys(map);

  console.log("[SUMMARY]", {
    totalPhrases: TOTAL_PHRASES,
    generated: totals.generated,
    backfilledFromGcs: totals.backfilled,
    skipped: totals.skipped,
    failed: totals.failed,
    retryPasses: retryCount,
    missing: finalMissing.length,
  });

  if (finalMissing.length > 0) {
    console.error("Still missing:", finalMissing);
    process.exit(1);
  }

  console.log("[DONE] All static audio generated — 100% catalog coverage");
  console.log(`Map written to:\n  ${STATIC_AUDIO_MAP_PATHS.join("\n  ")}`);

  if (totals.failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
