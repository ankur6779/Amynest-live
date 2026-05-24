/**
 * Batch-normalize all phonics MP3s for consistent loudness and clean edges.
 *
 * Pipeline per file: trim silence → loudnorm (-16 LUFS) → peak limiter
 *
 *   pnpm run normalize:phonics-audio
 *   pnpm run normalize:phonics-audio -- --only=b,c,a,t
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getAllPhonicsAudioKeys } from "@workspace/phonics-sounds";
import { isFfmpegAvailable, processPhonemeAudioFile } from "./phonics-audio-process.js";
import {
  loadPhonicsManifestFile,
  rebuildManifestClips,
  writePhonicsManifestFile,
} from "./phonics-manifest-io.js";

const REPO_ROOT = join(import.meta.dirname, "..");
const OUT_DIR = join(REPO_ROOT, "artifacts/kidschedule/public/phonics-audio");
const MANIFEST_PATH = join(OUT_DIR, "manifest.json");

function parseOnlyKeys(argv: string[]): Set<string> | null {
  const onlyArg = argv.find((a) => a.startsWith("--only="));
  if (!onlyArg) return null;
  return new Set(
    onlyArg
      .slice("--only=".length)
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean),
  );
}

function listPhonicsMp3Keys(): string[] {
  if (!existsSync(OUT_DIR)) return [];
  return readdirSync(OUT_DIR)
    .filter((f) => f.endsWith(".mp3") && !f.includes(".trim.") && !f.includes(".norm."))
    .map((f) => f.replace(/\.mp3$/, ""));
}

async function main(): Promise<void> {
  if (!(await isFfmpegAvailable())) {
    console.error("[normalize:phonics-audio] ffmpeg is required");
    process.exit(1);
  }

  const only = parseOnlyKeys(process.argv);
  let keys = listPhonicsMp3Keys();
  const catalog = new Set(getAllPhonicsAudioKeys());
  keys = keys.filter((k) => catalog.has(k));

  if (only) {
    keys = keys.filter((k) => only.has(k));
  }

  if (keys.length === 0) {
    console.error("[normalize:phonics-audio] no MP3 files found to normalize");
    process.exit(1);
  }

  const priorManifest = loadPhonicsManifestFile(MANIFEST_PATH);
  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (const key of keys) {
    const clipMeta = priorManifest.clips?.[key];
    if (clipMeta?.source === "fallback_tone") {
      console.log(`[normalize:phonics-audio] skip ${key} (fallback_tone)`);
      skipped += 1;
      continue;
    }

    const filePath = join(OUT_DIR, `${key}.mp3`);
    try {
      const stats = await processPhonemeAudioFile(filePath, key);
      console.log(`[normalize:phonics-audio] ${key}: ${stats.durationMs}ms, ${stats.size} bytes`);
      ok += 1;
    } catch (err) {
      failed += 1;
      console.error(
        `[normalize:phonics-audio] failed ${key}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  const clips = rebuildManifestClips(OUT_DIR, priorManifest);
  writePhonicsManifestFile(MANIFEST_PATH, {
    ...priorManifest,
    version: 5,
    normalizedAt: new Date().toISOString(),
    mastering: {
      pipeline: ["silenceremove", "loudnorm_I-16", "alimiter", "afade_in_20ms", "afade_out_30ms"],
      output: { sampleRate: 44100, channels: 1 },
    },
    clips,
  });

  console.log(
    `[normalize:phonics-audio] done — ok ${ok}, skipped ${skipped}, failed ${failed}, total ${keys.length}`,
  );

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
