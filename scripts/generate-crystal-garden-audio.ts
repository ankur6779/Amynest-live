/**
 * Generate Crystal Garden dance music via ElevenLabs Sound Generation.
 *
 *   pnpm exec tsx scripts/generate-crystal-garden-audio.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

const REPO_ROOT = join(import.meta.dirname, "..");
const OUT_DIR = join(REPO_ROOT, "artifacts/kidschedule/public/health-lab-audio");
const OUT_FILE = join(OUT_DIR, "crystal-garden-dance.mp3");

const PROMPT =
  "Upbeat cheerful kids dance party music loop, bright electronic pop with bouncy rhythm, " +
  "tambourine claps and sparkly bells, playful magical crystal garden theme, " +
  "happy children's mobile game soundtrack, no vocals, no scary or dark tones, 120 BPM";

const DURATION_SEC = 6;
const TIMEOUT_MS = 45_000;

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.local`, override: true });
config({ path: `${REPO_ROOT}/.env.development`, override: true });
config({ path: `${REPO_ROOT}/Amynest-backend-dykj.env`, override: true });

function readApiKey(): string {
  return process.env.ELEVENLABS_API_KEY?.trim() || process.env.ELEVEN_LABS_API_KEY?.trim() || "";
}

async function generateDanceMusic(): Promise<Buffer> {
  const apiKey = readApiKey();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY required");

  const url = "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128";
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
        text: PROMPT,
        duration_seconds: DURATION_SEC,
        prompt_influence: 0.82,
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

async function main(): Promise<void> {
  console.log("[crystal-garden-audio] Generating dance music via ElevenLabs…");
  const buffer = await generateDanceMusic();
  if (buffer.length < 4_000) {
    throw new Error(`Unexpectedly small MP3 (${buffer.length} bytes)`);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, buffer);
  console.log(`[crystal-garden-audio] Wrote ${OUT_FILE} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error("[crystal-garden-audio] Failed:", err);
  process.exit(1);
});
