/**
 * Generate AmyNest push notification sounds via ElevenLabs Sound Generation API.
 * Writes Android (res/raw/*.mp3) and iOS bundle (.caf) assets.
 *
 *   pnpm run generate:notification-sounds
 *   pnpm run generate:notification-sounds -- --force
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

const REPO_ROOT = join(import.meta.dirname, "..");

config({ path: join(REPO_ROOT, ".env") });
config({ path: join(REPO_ROOT, ".env.local"), override: true });
config({ path: join(REPO_ROOT, ".env.development"), override: true });
config({ path: join(REPO_ROOT, "Amynest-backend-dykj.env"), override: true });

const ANDROID_RAW = join(REPO_ROOT, "android/app/src/main/res/raw");
const WEB_PUBLIC = join(
  REPO_ROOT,
  "artifacts/kidschedule/public/sounds/notifications",
);
const IOS_SOUNDS = join(
  REPO_ROOT,
  "artifacts/amynest-capacitor/ios/App/App/NotificationSounds",
);
const SOURCE_OUT = join(REPO_ROOT, "assets/notification-sounds/source");
const MANIFEST_OUT = join(REPO_ROOT, "assets/notification-sounds/manifest.json");

const TIMEOUT_MS = 45_000;
const INTER_REQUEST_MS = 1_200;
const MAX_ATTEMPTS = 3;

interface NotifSoundSpec {
  id: string;
  /** Android res/raw basename (lowercase, underscores). */
  androidName: string;
  /** iOS APNs sound filename including extension. */
  iosFile: string;
  durationSec: number;
  promptInfluence: number;
  prompt: string;
  categories: string[];
}

const SOUNDS: NotifSoundSpec[] = [
  {
    id: "nest_chime",
    androidName: "amynest_nest_chime",
    iosFile: "amynest_nest_chime.caf",
    durationSec: 1.4,
    promptInfluence: 0.88,
    prompt:
      "Soft warm two-note ascending chime, cozy home nest feeling, gentle parenting app notification, no voice, no music bed, clean fade out, mobile UI alert",
    categories: ["routine", "routine_item", "good_night"],
  },
  {
    id: "sparkle",
    androidName: "amynest_sparkle",
    iosFile: "amynest_sparkle.caf",
    durationSec: 1.2,
    promptInfluence: 0.9,
    prompt:
      "Light magical sparkle twinkle sound, brief celebratory shimmer, child milestone achievement, friendly not loud, no voice, single short burst",
    categories: ["milestone", "weekly", "engagement"],
  },
  {
    id: "soft_bell",
    androidName: "amynest_soft_bell",
    iosFile: "amynest_soft_bell.caf",
    durationSec: 1.6,
    promptInfluence: 0.87,
    prompt:
      "Soft wind chime single gentle bell tone, calm thoughtful parenting insight notification, warm and reassuring, no voice, quiet mobile alert",
    categories: ["insights", "parenting_tips", "infant_care"],
  },
  {
    id: "story_ping",
    androidName: "amynest_story_ping",
    iosFile: "amynest_story_ping.caf",
    durationSec: 1.5,
    promptInfluence: 0.88,
    prompt:
      "Soft music box single note bedtime story reminder, soothing lullaby ping, very gentle nighttime notification, no voice, minimal reverb",
    categories: ["story_time", "good_night"],
  },
  {
    id: "learning_pop",
    androidName: "amynest_learning_pop",
    iosFile: "amynest_learning_pop.caf",
    durationSec: 0.9,
    promptInfluence: 0.9,
    prompt:
      "Friendly playful UI bloop pop, short upbeat learning activity cue for kids education app, crisp clean digital tone, no voice, not annoying",
    categories: ["phonics", "learning_activity", "nutrition"],
  },
];

function readApiKey(): string {
  const key =
    process.env.ELEVENLABS_API_KEY?.trim() ||
    process.env.PHONICS_ELEVENLABS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "ELEVENLABS_API_KEY required — set in .env.development or Amynest-backend-dykj.env",
    );
  }
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function callElevenLabsSoundEffect(spec: NotifSoundSpec): Promise<Buffer> {
  const apiKey = readApiKey();
  const url =
    "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128";
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
        text: spec.prompt,
        duration_seconds: spec.durationSec,
        prompt_influence: spec.promptInfluence,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ElevenLabs HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 512) throw new Error("MP3 buffer too small");
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

function copyMp3ForAndroid(mp3Path: string, androidPath: string): void {
  execSync(`cp "${mp3Path}" "${androidPath}"`, { stdio: "pipe" });
}

function mp3ToCaf(mp3Path: string, cafPath: string): void {
  execSync(
    `afconvert -f caff -d LEI16@44100 "${mp3Path}" "${cafPath}"`,
    { stdio: "pipe" },
  );
}

async function synthesize(spec: NotifSoundSpec): Promise<Buffer> {
  let lastError = "unknown";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await callElevenLabsSoundEffect(spec);
    } catch (err) {
      lastError = err instanceof Error ? err.message : "generation_failed";
      if (attempt < MAX_ATTEMPTS) await sleep(INTER_REQUEST_MS * attempt);
    }
  }
  throw new Error(`${spec.id}: ${lastError}`);
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");

  mkdirSync(ANDROID_RAW, { recursive: true });
  mkdirSync(WEB_PUBLIC, { recursive: true });
  mkdirSync(IOS_SOUNDS, { recursive: true });
  mkdirSync(SOURCE_OUT, { recursive: true });

  const manifest: {
    generatedAt: string;
    platformPaths: Record<string, string>;
    iosApnsPrefix: string;
    sounds: Array<{
      id: string;
      android: string;
      ios: string;
      web: string;
      categories: string[];
    }>;
  } = {
    generatedAt: new Date().toISOString(),
    platformPaths: {
      android: "android/app/src/main/res/raw/",
      ios: "artifacts/amynest-capacitor/ios/App/App/NotificationSounds/",
      web: "artifacts/kidschedule/public/sounds/notifications/",
      source: "assets/notification-sounds/source/",
    },
    iosApnsPrefix: "NotificationSounds/",
    sounds: [],
  };

  for (const spec of SOUNDS) {
    const mp3Path = join(SOURCE_OUT, `${spec.androidName}.mp3`);
    const androidPath = join(ANDROID_RAW, `${spec.androidName}.mp3`);
    const webPath = join(WEB_PUBLIC, `${spec.androidName}.mp3`);
    const cafPath = join(IOS_SOUNDS, spec.iosFile);

    if (!force && existsSync(androidPath) && existsSync(webPath) && existsSync(cafPath)) {
      console.log(`skip ${spec.id} (exists, use --force to regenerate)`);
      manifest.sounds.push({
        id: spec.id,
        android: `res/raw/${spec.androidName}.mp3`,
        ios: `NotificationSounds/${spec.iosFile}`,
        web: `/sounds/notifications/${spec.androidName}.mp3`,
        categories: spec.categories,
      });
      continue;
    }

    console.log(`generating ${spec.id}…`);
    const mp3 = await synthesize(spec);
    writeFileSync(mp3Path, mp3);
    copyMp3ForAndroid(mp3Path, androidPath);
    copyMp3ForAndroid(mp3Path, webPath);
    mp3ToCaf(mp3Path, cafPath);

    manifest.sounds.push({
      id: spec.id,
      android: `res/raw/${spec.androidName}.mp3`,
      ios: `NotificationSounds/${spec.iosFile}`,
      web: `/sounds/notifications/${spec.androidName}.mp3`,
      categories: spec.categories,
    });

    console.log(`  ✓ ${spec.androidName} → android + ios`);
    await sleep(INTER_REQUEST_MS);
  }

  writeFileSync(MANIFEST_OUT, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nDone. Manifest: ${MANIFEST_OUT}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
