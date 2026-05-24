/**
 * Build demo phonics MP3 variants from production clips (no ElevenLabs calls).
 *
 *   pnpm run generate:phonics-audio-demos
 */
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  PHONICS_AUDIO_DEMO_VARIANTS,
  PHONICS_DEMO_PREVIEW_KEYS,
} from "@workspace/phonics-sounds";

const execFileAsync = promisify(execFile);
const REPO_ROOT = join(import.meta.dirname, "..");
const PROD_DIR = join(REPO_ROOT, "artifacts/kidschedule/public/phonics-audio");
const DEMO_DIR = join(PROD_DIR, "demos");

async function masterVariant(
  inputPath: string,
  outputPath: string,
  filterChain: string,
): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-af",
    filterChain,
    "-ar",
    "44100",
    "-ac",
    "1",
    outputPath,
  ]);
}

async function main(): Promise<void> {
  const generated: Record<string, string[]> = {};

  for (const variant of PHONICS_AUDIO_DEMO_VARIANTS) {
    if (!variant.filterChain) continue;

    const outDir = join(DEMO_DIR, variant.id);
    mkdirSync(outDir, { recursive: true });
    generated[variant.id] = [];

    for (const key of PHONICS_DEMO_PREVIEW_KEYS) {
      const src = join(PROD_DIR, `${key}.mp3`);
      const dest = join(outDir, `${key}.mp3`);
      if (!existsSync(src)) {
        console.warn(`[skip] missing production clip: ${key}.mp3`);
        continue;
      }
      await masterVariant(src, dest, variant.filterChain);
      const size = readFileSync(dest).byteLength;
      if (size < 400) {
        throw new Error(`Demo ${variant.id}/${key}.mp3 too small (${size} bytes)`);
      }
      generated[variant.id]!.push(key);
      console.log(`[ok] ${variant.id}/${key}.mp3 (${size} bytes)`);
    }
  }

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    previewKeys: [...PHONICS_DEMO_PREVIEW_KEYS],
    variants: PHONICS_AUDIO_DEMO_VARIANTS.map((v) => ({
      id: v.id,
      label: v.label,
      labelHi: v.labelHi,
      description: v.description,
      hasFiles: v.filterChain ? (generated[v.id]?.length ?? 0) > 0 : true,
    })),
  };

  writeFileSync(join(DEMO_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nWrote ${join(DEMO_DIR, "manifest.json")}`);
  console.log("Open /dev/phonics-audio-preview after deploy to compare variants.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
