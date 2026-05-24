/**
 * Pre-generate curated phonics MP3s via ElevenLabs (female voice).
 *
 *   ELEVENLABS_API_KEY=... pnpm run generate:phonics-audio
 *   ELEVENLABS_API_KEY=... pnpm run generate:phonics-audio -- --upgrade-quality
 *   ELEVENLABS_API_KEY=... pnpm run generate:phonics-audio -- --force --only=b,c,a,t
 *
 * Runtime uses speech synthesis before tone for failed clips (see phonics-playback-fallback.ts).
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import {
  assertElevenLabsSpeakTextComplete,
  getAllPhonicsAudioKeys,
  getElevenLabsPhonemeSpeakText,
  getPhonicsGenerationPhonemeLabel,
  isUpgradeQualityCandidate,
  logPhonemeMetrics,
  PHONICS_CVC_SMOKE_KEYS,
  PHONICS_ELEVENLABS_MODEL_DEFAULT,
  PHONICS_ELEVENLABS_VOICE_ID_DEFAULT,
  PHONICS_ELEVENLABS_VOICE_SETTINGS,
  PHONICS_MIN_MP3_BYTES,
  type PhonicsAudioMeta,
  validatePhonicsMp3Buffer,
} from "@workspace/phonics-sounds";
import {
  describeFallbackTone,
  generateFallbackToneMp3,
} from "./phonics-audio-fallback.js";
import {
  filterKeysForUpgradeQuality,
  loadPhonicsManifestFile,
  metaFromMp3File,
  rebuildManifestClips,
  writePhonicsManifestFile,
} from "./phonics-manifest-io.js";
import { isFfmpegAvailable, processPhonemeAudioBuffer } from "./phonics-audio-process.js";

const REPO_ROOT = join(import.meta.dirname, "..");
const OUT_DIR = join(REPO_ROOT, "artifacts/kidschedule/public/phonics-audio");
const MANIFEST_PATH = join(OUT_DIR, "manifest.json");

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
const TIMEOUT_MS = Number(process.env.PHONICS_ELEVENLABS_TIMEOUT_MS ?? "15000");
const MAX_ATTEMPTS = Number(process.env.PHONICS_GENERATION_RETRIES ?? "8");
const SKIP_FFMPEG = process.env.PHONICS_SKIP_FFMPEG_TRIM === "1";

type SynthesizeResult = {
  buffer: Buffer;
  usedFallback: boolean;
  durationMs: number;
};

function readEnvApiKey(): string {
  return (
    process.env.ELEVENLABS_API_KEY?.trim() ||
    process.env.ELEVEN_LABS_API_KEY?.trim() ||
    ""
  );
}

function parseOnlyKeys(argv: string[]): Set<string> | null {
  const onlyArg = argv.find((a) => a.startsWith("--only="));
  if (!onlyArg) return null;
  const raw = onlyArg.slice("--only=".length);
  return new Set(
    raw
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function callElevenLabs(speakText: string): Promise<Buffer> {
  const apiKey = readEnvApiKey();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY required for generate:phonics-audio");
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(VOICE_ID)}?output_format=mp3_44100_128`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: speakText,
        model_id: MODEL_ID,
        voice_settings: { ...PHONICS_ELEVENLABS_VOICE_SETTINGS },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function postProcessMp3(raw: Buffer, audioKey: string, useFfmpeg: boolean): Promise<Buffer> {
  if (!useFfmpeg) return raw;
  const mastered = await processPhonemeAudioBuffer(raw, audioKey);
  console.log(
    `[phonics-audio] ${audioKey}: mastered ${raw.byteLength} → ${mastered.byteLength} bytes`,
  );
  return mastered;
}

async function synthesizeWithFallback(audioKey: string, useFfmpeg: boolean): Promise<SynthesizeResult> {
  const speakText = getElevenLabsPhonemeSpeakText(audioKey);
  const phoneme = getPhonicsGenerationPhonemeLabel(audioKey);

  console.log(
    `[phonics-audio] ${audioKey}: text="${speakText}" phoneme="${phoneme}" voice=${VOICE_ID}`,
  );

  let lastError = "unknown";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callElevenLabs(speakText);
      const rawValidation = validatePhonicsMp3Buffer(raw, audioKey);
      if (!rawValidation.ok) {
        lastError = `raw_${rawValidation.reason}`;
        console.warn(
          `[phonics-audio] ${audioKey}: reject raw attempt ${attempt}/${MAX_ATTEMPTS} — ${lastError} (~${rawValidation.estimatedDurationMs}ms)`,
        );
        continue;
      }

      const buffer = await postProcessMp3(raw, audioKey, useFfmpeg);
      const validation = validatePhonicsMp3Buffer(buffer, audioKey);

      logPhonemeMetrics({
        key: audioKey,
        durationMs: validation.estimatedDurationMs,
        size: validation.byteLength,
        accepted: validation.ok,
        reason: validation.reason,
      });

      if (validation.ok) {
        console.log(
          `[phonics-audio] ${audioKey}: accepted ~${validation.estimatedDurationMs}ms (${validation.byteLength} bytes)`,
        );
        return {
          buffer,
          usedFallback: false,
          durationMs: validation.estimatedDurationMs,
        };
      }

      lastError = validation.reason ?? "validation_failed";
      console.warn(
        `[phonics-audio] ${audioKey}: reject attempt ${attempt}/${MAX_ATTEMPTS} — ${lastError}`,
      );
    } catch (err) {
      lastError = err instanceof Error ? err.message : "elevenlabs_failed";
      console.warn(
        `[phonics-audio] ${audioKey}: attempt ${attempt}/${MAX_ATTEMPTS} error — ${lastError}`,
      );
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(INTER_REQUEST_MS);
    }
  }

  console.warn(
    `[phonics-audio] ${audioKey}: all retries failed (${lastError}) — ${describeFallbackTone(audioKey)} (runtime uses speech fallback)`,
  );
  const buffer = await generateFallbackToneMp3(audioKey);
  const validation = validatePhonicsMp3Buffer(buffer, audioKey);
  logPhonemeMetrics({
    key: audioKey,
    durationMs: validation.estimatedDurationMs,
    size: buffer.byteLength,
    fallback: true,
    accepted: true,
    reason: lastError,
  });
  return {
    buffer,
    usedFallback: true,
    durationMs: validation.estimatedDurationMs,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isValidExistingMp3(key: string, outPath: string): boolean {
  if (!existsSync(outPath)) return false;
  const buf = readFileSync(outPath);
  const validation = validatePhonicsMp3Buffer(buf, key);
  if (!validation.ok) {
    console.warn(`[phonics-audio] ${key}: existing file invalid (${validation.reason}) — regenerating`);
    try {
      unlinkSync(outPath);
    } catch {
      /* ignore */
    }
    return false;
  }
  return buf.length >= PHONICS_MIN_MP3_BYTES;
}

function shouldSkipGeneration(
  key: string,
  outPath: string,
  force: boolean,
  upgradeQuality: boolean,
  existingMeta?: PhonicsAudioMeta,
): boolean {
  if (force) return false;
  if (!isValidExistingMp3(key, outPath)) return false;
  if (upgradeQuality && isUpgradeQualityCandidate(existingMeta)) return false;
  return true;
}

async function main(): Promise<void> {
  assertElevenLabsSpeakTextComplete();

  const apiKey = readEnvApiKey();
  if (!apiKey) {
    console.error(
      "[phonics-audio] ELEVENLABS_API_KEY required — add to .env.local at repo root, then re-run:\n" +
        "  ELEVENLABS_API_KEY=sk_... pnpm run generate:phonics-audio\n" +
        "  (or export from Render: Amynest-backend-dykj → Environment → copy ELEVENLABS_API_KEY)\n",
    );
    process.exit(1);
  }

  const ffmpegOk = await isFfmpegAvailable();
  const useFfmpeg = ffmpegOk && !SKIP_FFMPEG;
  if (!ffmpegOk && !SKIP_FFMPEG) {
    console.error(
      "[phonics-audio] ffmpeg not found — install ffmpeg or set PHONICS_SKIP_FFMPEG_TRIM=1",
    );
    process.exit(1);
  }
  if (SKIP_FFMPEG) {
    console.warn("[phonics-audio] PHONICS_SKIP_FFMPEG_TRIM=1 — audio mastering disabled");
  }

  const force = process.argv.includes("--force");
  const upgradeQuality = process.argv.includes("--upgrade-quality");
  const only = parseOnlyKeys(process.argv);
  mkdirSync(OUT_DIR, { recursive: true });

  const priorManifest = loadPhonicsManifestFile(MANIFEST_PATH);
  let keys = getAllPhonicsAudioKeys();

  if (upgradeQuality) {
    keys = filterKeysForUpgradeQuality(keys, priorManifest);
    console.log(`[phonics-audio] --upgrade-quality: ${keys.length} non-approved keys`);
  }

  if (only) {
    keys = keys.filter((k) => only.has(k));
    if (keys.length === 0) {
      throw new Error(`--only matched no keys (available: ${getAllPhonicsAudioKeys().join(", ")})`);
    }
  }

  let created = 0;
  let skipped = 0;
  let fallbacks = 0;
  const sessionClips: Record<string, PhonicsAudioMeta> = {};

  for (const key of keys) {
    const outPath = join(OUT_DIR, `${key}.mp3`);
    const existingMeta = priorManifest.clips?.[key];

    if (shouldSkipGeneration(key, outPath, force, upgradeQuality, existingMeta)) {
      skipped += 1;
      continue;
    }

    console.log(`[phonics-audio] generating ${key}.mp3 …`);
    const { buffer, usedFallback } = await synthesizeWithFallback(key, useFfmpeg);
    writeFileSync(outPath, buffer);
    created += 1;
    if (usedFallback) fallbacks += 1;

    sessionClips[key] = metaFromMp3File(
      key,
      buffer,
      usedFallback ? "fallback_tone" : "elevenlabs",
      existingMeta,
      false,
    );

    await sleep(INTER_REQUEST_MS);
  }

  const clips = rebuildManifestClips(OUT_DIR, {
    ...priorManifest,
    clips: { ...priorManifest.clips, ...sessionClips },
  });

  const needsReview = Object.values(clips).filter((c) => c.quality === "needs_review").length;
  const approved = Object.values(clips).filter((c) => c.quality === "approved").length;

  writePhonicsManifestFile(MANIFEST_PATH, {
    version: 5,
    basePath: "/phonics-audio",
    provider: "elevenlabs",
    speakTextStyle: "minimal-phoneme-hint",
    voiceId: VOICE_ID,
    modelId: MODEL_ID,
    ffmpegTrim: useFfmpeg,
    mastering: useFfmpeg
      ? {
          pipeline: ["silenceremove", "loudnorm_I-16", "alimiter", "afade_in_20ms", "afade_out_30ms"],
          output: { sampleRate: 44100, channels: 1 },
        }
      : undefined,
    generatedAt: new Date().toISOString(),
    keys: getAllPhonicsAudioKeys(),
    cvcSmokeKeys: [...PHONICS_CVC_SMOKE_KEYS],
    fallbackCount: Object.values(clips).filter((c) => c.source === "fallback_tone").length,
    clips,
  });

  console.log(
    `[phonics-audio] done — created ${created}, skipped ${skipped}, fallbacks ${fallbacks}, total ${keys.length}`,
  );
  console.log(
    `[phonics-audio] quality — approved: ${approved}, needs_review: ${needsReview}, clips: ${Object.keys(clips).length}`,
  );

  if (created > 0 || skipped > 0) {
    const cvcReady = PHONICS_CVC_SMOKE_KEYS.every((k) =>
      existsSync(join(OUT_DIR, `${k}.mp3`)),
    );
    console.log(
      cvcReady
        ? `[phonics-audio] CVC smoke: ${PHONICS_CVC_SMOKE_KEYS.join(" + ")} → k-a-t (cat blend)`
        : `[phonics-audio] CVC smoke incomplete — generate: ${PHONICS_CVC_SMOKE_KEYS.join(",")}`,
    );
  }

  if (fallbacks > 0) {
    console.warn(
      `[phonics-audio] ${fallbacks} clip(s) used fallback tone asset — runtime will prefer speech synthesis`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
