/**
 * Pre-generate OpenAI TTS MP3s for all static TTS phrases and upload to GCS.
 *
 * Usage:
 *   OPENAI_API_KEY=... DEFAULT_OBJECT_STORAGE_BUCKET_ID=... \
 *     GCS_SERVICE_ACCOUNT_JSON='...' \
 *     pnpm run generate:static-audio
 *
 * Retries until 100% coverage for the selected scope (max 5 passes).
 *   --force-all            Regenerate entire corpus
 *   --audio-lessons-only   Regenerate all Amy Audio Lesson paragraphs + titles
 *
 * Writes static-audio-map.json to kidschedule + api-server data dirs.
 */
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { Storage } from "@google-cloud/storage";
import {
  computeCorpusMissingStaticAudioKeys,
  extractTextFromMissingKey,
  getStaticAudioObjectKey,
  collectAllSpeakablePhrases,
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
config({ path: `${REPO_ROOT}/Amynest-backend-dykj.env`, override: true });

/** Parse a Render .env line (single- or double-quoted JSON blob). */
function parseRenderEnvJsonLine(text: string, key: string): Record<string, unknown> | null {
  const line = text.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  if (!line) return null;
  const eq = line.indexOf("=");
  let val = line.slice(eq + 1).trim();
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

/** Read service-account JSON from Render export (dotenv breaks long GCS blobs). */
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

/** Female default — must match api-server getOpenAiTtsVoice() (coral / nova). */
const OPENAI_VOICE =
  process.env.STATIC_AUDIO_VOICE?.trim() ||
  process.env.OPENAI_TTS_VOICE?.trim() ||
  "coral";
const OPENAI_MODEL = process.env.STATIC_AUDIO_MODEL?.trim() || "gpt-4o-mini-tts";

/** `Number("30_000")` is NaN — strip `_` from env ms values. */
function parseEnvMs(name: string, fallbackMs: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallbackMs;
  const n = Number(raw.replace(/_/g, ""));
  return Number.isFinite(n) && n > 0 ? n : fallbackMs;
}

const TTS_TIMEOUT_MS = parseEnvMs("STATIC_AUDIO_TTS_TIMEOUT_MS", 30_000);
const MAX_PASS_RETRIES = Number(process.env.STATIC_AUDIO_MAX_RETRIES ?? "5");
/** Pause between OpenAI calls when generating (avoids rate limits in CI). */
const INTER_REQUEST_MS = parseEnvMs("STATIC_AUDIO_INTER_REQUEST_MS", 300);

const ALL_CORPUS_PHRASES = collectAllSpeakablePhrases();

function resolvePhraseScope(): {
  phrases: typeof ALL_CORPUS_PHRASES;
  label: string;
  audioLessonsOnly: boolean;
} {
  const audioLessonsOnly = process.argv.includes("--audio-lessons-only");
  if (audioLessonsOnly) {
    const phrases = ALL_CORPUS_PHRASES.filter((e) => e.source.startsWith("audio_lessons"));
    return { phrases, label: "audio_lessons", audioLessonsOnly: true };
  }
  const studyZoneOnly = process.argv.includes("--study-zone-only");
  if (studyZoneOnly) {
    const phrases = ALL_CORPUS_PHRASES.filter((e) => e.source.startsWith("study_zone"));
    return { phrases, label: "study_zone", audioLessonsOnly: false };
  }
  const spellingOnly = process.argv.includes("--spelling-only");
  if (spellingOnly) {
    const phrases = ALL_CORPUS_PHRASES.filter((e) => e.source === "spelling_mastery");
    return { phrases, label: "spelling_mastery", audioLessonsOnly: false };
  }
  const parentHubOnly = process.argv.includes("--parent-hub-only");
  if (parentHubOnly) {
    const phrases = ALL_CORPUS_PHRASES.filter((e) => e.source === "parent_hub");
    return { phrases, label: "parent_hub", audioLessonsOnly: false };
  }
  const speechCoachOnly = process.argv.includes("--speech-coach-only");
  if (speechCoachOnly) {
    const phrases = ALL_CORPUS_PHRASES.filter(
      (e) => e.source.startsWith("speech_coach") || e.source === "coach_dialogue",
    );
    return { phrases, label: "speech_coach", audioLessonsOnly: false };
  }
  const phonicsStaticOnly = process.argv.includes("--phonics-static-only");
  if (phonicsStaticOnly) {
    const phrases = ALL_CORPUS_PHRASES.filter((e) => e.source === "phonics_sounds");
    return { phrases, label: "phonics_static", audioLessonsOnly: false };
  }
  const contentBankOnly = process.argv.includes("--content-bank-only");
  if (contentBankOnly) {
    const phrases = ALL_CORPUS_PHRASES.filter((e) => e.source === "content_bank");
    return { phrases, label: "content_bank", audioLessonsOnly: false };
  }
  return { phrases: ALL_CORPUS_PHRASES, label: "full_corpus", audioLessonsOnly: false };
}

type PassStats = { generated: number; skipped: number; backfilled: number; failed: number };

function getBucketName(): string {
  return (
    process.env.GCS_BUCKET_NAME?.trim() ||
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim() ||
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET?.trim() ||
    ""
  );
}

/** Normalize Render .env exports where dotenv leaves \\\" and literal newlines. */
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
  if (t.startsWith('"') && t.endsWith('"')) {
    try {
      push(JSON.parse(t) as string);
    } catch {
      /* ignore */
    }
  }
  return [...out];
}

/** Parse service-account JSON from Render exports (escaped \\n, quoted string, or base64). */
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

function logCoverageSummary(
  map: StaticAudioMap,
  passLabel: string,
  scopePhrases: typeof ALL_CORPUS_PHRASES,
): number {
  const scopeKeys = new Set(
    scopePhrases.map((e) => staticAudioMissingKey(e.mode, e.normalizedKey)),
  );
  const missing = computeCorpusMissingStaticAudioKeys(map).filter((k) => scopeKeys.has(k));
  const covered = scopePhrases.length - missing.length;
  console.log(`[COVERAGE] ${passLabel}`, {
    scope: scopePhrases.length,
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
  const apiKey =
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const base = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim();
  const url = base
    ? `${base.replace(/\/$/, "")}/audio/speech`
    : "https://api.openai.com/v1/audio/speech";

  const instructions =
    mode === "phonics"
      ? "Speak clearly for young children learning phonics. Short crisp phoneme sounds; vowels use the example word."
      : "Warm, clear Indian English for parents and children.";

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
        instructions,
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
  const corpusMissing = computeCorpusMissingStaticAudioKeys(map);
  const apiMissing = await fetchMissingFromApi();
  return mergeMissingStaticAudioKeys(corpusMissing, apiMissing);
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

  const delay = () =>
    INTER_REQUEST_MS > 0
      ? new Promise((r) => setTimeout(r, INTER_REQUEST_MS))
      : Promise.resolve();

  try {
    await attempt();
    await delay();
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
  scopePhrases: typeof ALL_CORPUS_PHRASES,
): Promise<PassStats> {
  const stats: PassStats = { generated: 0, skipped: 0, backfilled: 0, failed: 0 };

  console.log(`[PASS] Scope (${scopePhrases.length} phrases), skipExisting=${skipExisting}`);

  for (const entry of scopePhrases) {
    await ensureCatalogEntry(entry.text, entry.mode, map, storage, bucketName, skipExisting, stats);
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
  const openAiKey =
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim();
  if (!openAiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env at the repo root, then run: pnpm run generate:static-audio",
    );
  }

  const bucketName = getBucketName();
  if (!bucketName) {
    throw new Error("Set GCS_BUCKET_NAME or DEFAULT_OBJECT_STORAGE_BUCKET_ID");
  }

  const storage = buildStorage();
  const forceAll = process.argv.includes("--force-all");
  const { phrases: scopePhrases, label: scopeLabel, audioLessonsOnly } = resolvePhraseScope();
  const skipExisting = audioLessonsOnly ? false : !forceAll;

  console.log("[CONFIG]", {
    bucketName,
    scope: scopeLabel,
    scopePhrases: scopePhrases.length,
    allCorpusPhrases: ALL_CORPUS_PHRASES.length,
    maxPassRetries: MAX_PASS_RETRIES,
    ttsTimeoutMs: TTS_TIMEOUT_MS,
    skipExisting,
    audioLessonsOnly,
    forceAll,
  });

  const map = loadStaticAudioMap();
  const totals: PassStats = { generated: 0, skipped: 0, backfilled: 0, failed: 0 };

  let missingCount = logCoverageSummary(map, "initial", scopePhrases);
  let retryCount = 0;

  if (missingCount === 0 && !forceAll && !audioLessonsOnly) {
    console.log(
      "[SKIP] Map already has 100% corpus coverage — no OpenAI TTS calls were made.",
    );
    console.log(
      "[HINT] To regenerate ALL MP3s (e.g. switch alloy → coral female voice), run:",
    );
    console.log("       pnpm run generate:static-audio -- --force-all");
    console.log(
      "[HINT] To regenerate only Amy Audio Lesson paragraphs, run:",
    );
    console.log("       pnpm run generate:static-audio -- --audio-lessons-only");
    console.log(
      "[HINT] To regenerate only Spelling Mastery words/chunks, run:",
    );
    console.log("       pnpm run generate:static-audio:spelling");
    console.log(`[CONFIG] Current voice=${OPENAI_VOICE} model=${OPENAI_MODEL}`);
  }

  if (missingCount > 0 || forceAll || audioLessonsOnly) {
    if (forceAll) {
      console.log(`[FORCE-ALL] Regenerating every phrase with voice=${OPENAI_VOICE} (~30–90 min in CI)`);
    }
    if (audioLessonsOnly) {
      console.log(
        `[AUDIO-LESSONS] Regenerating ${scopePhrases.length} lesson paragraph/title phrase(s) with voice=${OPENAI_VOICE}`,
      );
    }
    const firstPass = await runCatalogPass(
      map,
      storage,
      bucketName,
      skipExisting,
      forceAll ? ALL_CORPUS_PHRASES : scopePhrases,
    );
    mergeStats(totals, firstPass);
    Object.assign(map, loadStaticAudioMap());
    missingCount = logCoverageSummary(map, "after catalog pass", scopePhrases);
    console.log("[PASS STATS] catalog", firstPass);
  }

  const scopeKeySet = new Set(
    scopePhrases.map((e) => staticAudioMissingKey(e.mode, e.normalizedKey)),
  );

  while (missingCount > 0 && retryCount < MAX_PASS_RETRIES) {
    retryCount++;
    const missingKeys = (await collectMissingKeys(map)).filter((k) => scopeKeySet.has(k));
    console.log(`[RETRY] Pass ${retryCount}/${MAX_PASS_RETRIES} — missing keys count: ${missingKeys.length}`);

    if (missingKeys.length === 0) break;

    const passStats = await runMissingKeysPass(missingKeys, map, storage, bucketName, skipExisting);
    mergeStats(totals, passStats);
    Object.assign(map, loadStaticAudioMap());
    missingCount = logCoverageSummary(map, `after retry ${retryCount}`, scopePhrases);
    console.log("[PASS STATS] missing-only", passStats);
  }

  writeStaticAudioMap(map);
  const finalMissing = computeCorpusMissingStaticAudioKeys(map).filter((k) => scopeKeySet.has(k));

  console.log("[SUMMARY]", {
    scope: scopeLabel,
    scopePhrases: scopePhrases.length,
    generated: totals.generated,
    backfilledFromGcs: totals.backfilled,
    skipped: totals.skipped,
    failed: totals.failed,
    retryPasses: retryCount,
    missing: finalMissing.length,
  });

  if (finalMissing.length > 0) {
    console.error("Still missing:", finalMissing.slice(0, 50));
    if (finalMissing.length > 50) {
      console.error(`... and ${finalMissing.length - 50} more`);
    }
    process.exit(1);
  }

  if (!audioLessonsOnly) {
    const fullMissing = computeCorpusMissingStaticAudioKeys(map);
    if (fullMissing.length > 0) {
      console.error(
        `[WARN] Scope complete but full corpus still missing ${fullMissing.length} phrase(s). Run without --audio-lessons-only.`,
      );
      process.exit(1);
    }
  }

  console.log("[DONE] Static audio generated for scope — 100% coverage within scope");
  console.log(`Map written to:\n  ${STATIC_AUDIO_MAP_PATHS.join("\n  ")}`);

  if (totals.failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
