/**
 * Phase 3–8 — Generate complete phonics library via ElevenLabs, upload to GCS,
 * write manifest, seed DB, prewarm metadata.
 *
 *   ELEVENLABS_API_KEY=... DEFAULT_OBJECT_STORAGE_BUCKET_ID=... \
 *     GCS_SERVICE_ACCOUNT_JSON='...' \
 *     pnpm run generate:phonics-library -- --force
 *
 * Runtime NEVER calls ElevenLabs — all assets must exist before deploy.
 */
import { readFileSync } from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Storage } from "@google-cloud/storage";
import {
  buildPhonicsProvenance,
  catalogEntryToManifestAsset,
  getPhonicsCatalogKey,
  getPhonicsGcsObjectPath,
  getPhonicsGenerationProfile,
  modeForAssetType,
  PHONICS_LIBRARY_VERSION,
  type PhonicsAudioLibraryManifest,
  type PhonicsCatalogEntry,
  type PhonicsVoiceProfile,
} from "@workspace/phonics-sounds";
import { loadFullPhonicsCatalog } from "./phonics-audio-coverage.js";
import {
  PHONICS_ELEVENLABS_MODEL_DEFAULT,
  PHONICS_ELEVENLABS_VOICE_ID_DEFAULT,
  validatePhonicsMp3Buffer,
} from "@workspace/phonics-sounds";
import { describeFallbackTone, generateFallbackToneMp3 } from "./phonics-audio-fallback.js";
import {
  isFfmpegAvailable,
  normalizePhonicsAudioBuffer,
  processPhonemeAudioBuffer,
} from "./phonics-audio-process.js";
import { PHONICS_MODE_DURATION_MS } from "@workspace/phonics-sounds";
import {
  loadPhonicsLibraryManifest,
  manifestAssetFromBuffer,
  REPO_ROOT,
  sha256Hex,
  writePhonicsLibraryManifest,
} from "./phonics-library-io.js";

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.local`, override: true });
config({ path: `${REPO_ROOT}/Amynest-backend-dykj.env`, override: true });

const VOICE_ID =
  process.env.PHONICS_ELEVENLABS_VOICE_ID?.trim() ||
  process.env.ELEVENLABS_VOICE_ID?.trim() ||
  PHONICS_ELEVENLABS_VOICE_ID_DEFAULT;
const MODEL_ID =
  process.env.PHONICS_ELEVENLABS_MODEL?.trim() ||
  process.env.ELEVENLABS_MODEL_ID?.trim() ||
  PHONICS_ELEVENLABS_MODEL_DEFAULT;
const INTER_REQUEST_MS = Number(process.env.PHONICS_AUDIO_INTER_MS ?? "400");
const TIMEOUT_MS = Number(process.env.PHONICS_ELEVENLABS_TIMEOUT_MS ?? "20000");
const MAX_ATTEMPTS = Number(process.env.PHONICS_GENERATION_RETRIES ?? "6");
const SKIP_FFMPEG = process.env.PHONICS_SKIP_FFMPEG_TRIM === "1";

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

async function callElevenLabs(
  speakText: string,
  profile: PhonicsVoiceProfile,
): Promise<Buffer> {
  const apiKey = readEnvApiKey();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY required");

  // Phase H — fixed 44.1kHz / 128kbps mono-friendly MP3 for every clip.
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
        voice_settings: {
          stability: profile.stability,
          similarity_boost: profile.similarity_boost,
          style: profile.style,
          use_speaker_boost: profile.use_speaker_boost,
          speed: profile.speed,
        },
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
  if (!useFfmpeg) return buffer;
  // Isolated phonemes: strict 250–900ms phoneme mastering + assertions.
  if (entry.isolatedPhoneme) return processPhonemeAudioBuffer(buffer, entry.id);
  // Words / sentences / stories: same loudness/sample-rate/trim profile, with
  // mode-aware duration bounds (Phase H — uniform normalization everywhere).
  const mode = modeForAssetType(entry.type);
  return normalizePhonicsAudioBuffer(buffer, {
    durationBounds: PHONICS_MODE_DURATION_MS[mode],
    label: entry.id,
  });
}

async function synthesizeEntry(
  entry: PhonicsCatalogEntry,
  useFfmpeg: boolean,
): Promise<{ buffer: Buffer; durationMs: number; source: "elevenlabs" | "fallback_tone" }> {
  const profile = getPhonicsGenerationProfile(modeForAssetType(entry.type));
  let lastError = "unknown";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callElevenLabs(entry.speakText, profile);
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

  console.warn(`[phonics-library] ${entry.id}: fallback tone — ${describeFallbackTone(entry.id)} (${lastError})`);
  const buffer = await generateFallbackToneMp3(entry.id);
  const validation = validatePhonicsMp3Buffer(buffer, entry.isolatedPhoneme ? entry.id : undefined);
  return { buffer, durationMs: validation.estimatedDurationMs, source: "fallback_tone" };
}

async function uploadToGcs(
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

async function seedDatabaseAsset(
  entry: PhonicsCatalogEntry,
  asset: ReturnType<typeof manifestAssetFromBuffer>,
): Promise<void> {
  if (!process.env.DATABASE_URL?.trim() || process.env.PHONICS_SEED_DB !== "1") return;

  const { db, phonicsAudioAssetsTable } = await import("@workspace/db");
  const rowId = getPhonicsCatalogKey(entry.type, entry.id);
  await db
    .insert(phonicsAudioAssetsTable)
    .values({
      id: rowId,
      type: entry.type,
      text: entry.text,
      phoneme: entry.phoneme ?? null,
      alternatePhoneme: entry.alternatePhoneme ?? null,
      difficulty: entry.difficulty ?? null,
      curriculumLevel: entry.curriculumLevel ?? null,
      gcsPath: asset.gcsPath,
      publicUrl: asset.url,
      durationMs: asset.durationMs ?? null,
      checksum: asset.checksum ?? null,
      version: PHONICS_LIBRARY_VERSION,
      source: asset.source ?? "elevenlabs",
      quality: asset.quality ?? "auto",
    })
    .onConflictDoUpdate({
      target: phonicsAudioAssetsTable.id,
      set: {
        text: entry.text,
        phoneme: entry.phoneme ?? null,
        gcsPath: asset.gcsPath,
        publicUrl: asset.url,
        durationMs: asset.durationMs ?? null,
        checksum: asset.checksum ?? null,
        version: PHONICS_LIBRARY_VERSION,
        source: asset.source ?? "elevenlabs",
        quality: asset.quality ?? "auto",
        updatedAt: new Date(),
      },
    });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseOnlyTypes(argv: string[]): Set<string> | null {
  const arg = argv.find((a) => a.startsWith("--only-type="));
  if (!arg) return null;
  return new Set(arg.slice("--only-type=".length).split(",").map((s) => s.trim()).filter(Boolean));
}

/** Targeted regen of specific catalog keys (e.g. "sentence:score,quiz:what_is_this"). */
function parseOnlyIds(argv: string[]): Set<string> | null {
  const arg = argv.find((a) => a.startsWith("--only-ids="));
  if (!arg) return null;
  return new Set(arg.slice("--only-ids=".length).split(",").map((s) => s.trim()).filter(Boolean));
}

async function main(): Promise<void> {
  const apiKey = readEnvApiKey();
  if (!apiKey) {
    console.error("[phonics-library] ELEVENLABS_API_KEY required");
    process.exit(1);
  }

  const ffmpegOk = await isFfmpegAvailable();
  const useFfmpeg = ffmpegOk && !SKIP_FFMPEG;
  if (!ffmpegOk && !SKIP_FFMPEG) {
    console.warn("[phonics-library] ffmpeg missing — phoneme mastering disabled");
  }

  const onlyTypes = parseOnlyTypes(process.argv);
  const onlyIds = parseOnlyIds(process.argv);
  // Targeted runs (--only-ids) always regenerate the named assets even if they
  // already exist in GCS (that is the whole point of a placeholder re-run).
  const force = process.argv.includes("--force") || onlyIds !== null;
  const partial = onlyTypes !== null || onlyIds !== null;
  const bucket = getBucketName();
  const storage = buildStorage();
  const catalog = (await loadFullPhonicsCatalog()).filter((e) => {
    if (onlyTypes && !onlyTypes.has(e.type)) return false;
    if (onlyIds && !onlyIds.has(getPhonicsCatalogKey(e.type, e.id))) return false;
    return true;
  });

  console.log(`[phonics-library] generating ${catalog.length} assets → gs://${bucket}/phonics/`);

  // Partial runs MERGE into the existing manifest so untouched assets survive.
  const assets: PhonicsAudioLibraryManifest["assets"] = partial
    ? { ...(loadPhonicsLibraryManifest()?.assets ?? {}) }
    : {};
  let created = 0;
  let skipped = 0;
  let fallbacks = 0;

  for (const entry of catalog) {
    const catalogKey = getPhonicsCatalogKey(entry.type, entry.id);
    const gcsPath = getPhonicsGcsObjectPath(entry.type, entry.id);

    if (!force) {
      try {
        const [exists] = await storage.bucket(bucket).file(gcsPath).exists();
        if (exists) {
          skipped += 1;
          const url = `https://storage.googleapis.com/${bucket}/${gcsPath}`;
          assets[catalogKey] = catalogEntryToManifestAsset(entry, bucket, { url, gcsPath });
          continue;
        }
      } catch {
        /* regenerate */
      }
    }

    console.log(`[phonics-library] ${catalogKey} speak="${entry.speakText}"`);
    const { buffer, durationMs, source } = await synthesizeEntry(entry, useFfmpeg);
    const url = await uploadToGcs(storage, bucket, gcsPath, buffer);

    const base = catalogEntryToManifestAsset(entry, bucket, { url, gcsPath, durationMs });
    const asset = manifestAssetFromBuffer(base, buffer, source, durationMs);
    assets[catalogKey] = asset;

    try {
      await seedDatabaseAsset(entry, asset);
    } catch (err) {
      console.warn(`[phonics-library] DB seed skip for ${catalogKey}:`, err);
    }

    created += 1;
    if (source === "fallback_tone") fallbacks += 1;
    await sleep(INTER_REQUEST_MS);
  }

  const provenance = buildPhonicsProvenance({ voiceId: VOICE_ID, model: MODEL_ID });
  const manifest: PhonicsAudioLibraryManifest = {
    version: 1,
    libraryVersion: PHONICS_LIBRARY_VERSION,
    generatedAt: provenance.generatedAt,
    bucket,
    baseUrl: "",
    voiceId: VOICE_ID,
    modelId: MODEL_ID,
    provider: provenance.provider,
    curriculumVersion: provenance.curriculumVersion,
    phonemeVersion: provenance.phonemeVersion,
    normalizationVersion: provenance.normalizationVersion,
    assetCount: Object.keys(assets).length,
    assets,
  };

  writePhonicsLibraryManifest(manifest);

  // Prewarm log — CDN inherits GCS cache-control; client prewarm uses manifest tiers.
  const prewarmLog = {
    high: ["letter:a", "letter:b", "letter:c", "letter:d", "letter:e"],
    medium: ["digraph:sh", "digraph:ch", "cvc:cat", "cvc:bat"],
    note: "Client global-audio-warmup reads PHONICS_PREWARM_* from @workspace/phonics-sounds",
  };
  const logsDir = join(REPO_ROOT, "scripts/logs");
  mkdirSync(logsDir, { recursive: true });
  writeFileSync(
    join(logsDir, "phonics-library-prewarm.json"),
    `${JSON.stringify(prewarmLog, null, 2)}\n`,
  );

  console.log(
    `[phonics-library] done — created ${created}, skipped ${skipped}, fallbacks ${fallbacks}, total ${catalog.length}`,
  );
  console.log("[phonics-library] manifest written to artifacts/*/src/data/phonics-audio-map.json");
  console.log("[phonics-library] run: pnpm run check:phonics-library");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
