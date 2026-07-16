/**
 * Fail when the shipped static-audio map does not cover the full catalog,
 * or when client code would play static audio directly from GCS.
 *
 *   pnpm run check:static-audio
 */
import { config } from "dotenv";
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { computeCorpusMissingStaticAudioKeys, normalizeStaticAudioKey } from "@workspace/static-audio";
import { LESSONS } from "@workspace/audio-lessons";
import { listCatalogMissingKeys, loadStaticAudioMap, REPO_ROOT } from "./static-audio-paths.js";

config({ path: `${REPO_ROOT}/.env` });

const KIDSCHEDULE_SRC = join(REPO_ROOT, "artifacts/kidschedule/src");

/** Files allowed to reference storage.googleapis.com (parse/proxy/guard only). */
const GCS_REFERENCE_ALLOWLIST = new Set([
  "lib/static-audio.ts",
  "lib/static-audio-guard.ts",
  "lib/static-audio-guard.test.ts",
  "lib/static-audio-telemetry.ts",
  "lib/tts-playback.ts",
  // Phonics / spelling library manifests store GCS URLs; playback uses API proxies.
  "lib/phonics-audio-map.ts",
  "lib/phonics-safe-audio.ts",
  "lib/phonics-safe-audio.test.ts",
  "lib/phonics-player.ts",
  "lib/phonics-manifest-validation.ts",
  "lib/phonics-manifest-validation.test.ts",
  "lib/spelling-audio-map.ts",
  "lib/spelling-audio-map.test.ts",
]);

function walkSourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "data") continue;
      walkSourceFiles(path, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

function assertNoClientDirectGcsPlayback(): void {
  const violations: string[] = [];

  for (const file of walkSourceFiles(KIDSCHEDULE_SRC)) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
    const relFromSrc = relative(KIDSCHEDULE_SRC, file).replace(/\\/g, "/");

    if (GCS_REFERENCE_ALLOWLIST.has(relFromSrc)) continue;

    const content = readFileSync(file, "utf8");

    if (/new\s+Audio\s*\(\s*[`'"][^`'"]*storage\.googleapis\.com/.test(content)) {
      violations.push(`${rel}: new Audio() with direct GCS URL`);
    }

    if (/fetch\s*\(\s*[`'"][^`'"]*storage\.googleapis\.com/.test(content)) {
      violations.push(`${rel}: fetch() to GCS URL`);
    }

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes("storage.googleapis.com")) continue;
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
      violations.push(`${rel}:${i + 1}: references storage.googleapis.com`);
    }
  }

  if (violations.length > 0) {
    console.error("Static audio client regression: direct GCS playback forbidden.\n");
    for (const v of violations) {
      console.error(`  - ${v}`);
    }
    console.error(
      "\nStatic catalog audio must use /api/static-audio/{hash}.mp3 via static-audio.ts only.\n",
    );
    process.exit(1);
  }
}

const missing = listCatalogMissingKeys();
const missingPhonics = missing.filter((k) => k.startsWith("phonics:"));
const missingDefault = missing.filter((k) => !k.startsWith("phonics:"));

if (missingPhonics.length > 0) {
  console.warn(
    `[static-audio] ${missingPhonics.length} OpenAI phonics phrase(s) not in map yet — ` +
      "runtime uses /api/tts/generate until you run: pnpm run generate:static-audio",
  );
}

if (missingDefault.length > 0) {
  console.error("Missing static audio (default catalog):", missingDefault);
  console.error(
    `\n${missingDefault.length} default phrase(s) lack pre-generated audio.\n` +
      "Run: pnpm run generate:static-audio\n",
  );
  process.exit(1);
}

assertNoClientDirectGcsPlayback();

function assertLessonParagraphStaticCoverage(): void {
  const map = loadStaticAudioMap();
  const missing: string[] = [];

  for (const lesson of LESSONS) {
    lesson.paragraphs.en.forEach((para, paragraphIdx) => {
      const text = para.trim();
      if (!text) return;
      const key = normalizeStaticAudioKey(text);
      const url = map.default[key];
      if (!url || !url.includes("/api/static-audio/")) {
        missing.push(`${lesson.id}[${paragraphIdx}] ${key.slice(0, 72)}…`);
      }
    });
  }

  if (missing.length > 0) {
    console.error("Lesson paragraph static-audio coverage failed:\n");
    for (const line of missing.slice(0, 30)) {
      console.error(`  - ${line}`);
    }
    if (missing.length > 30) {
      console.error(`  … and ${missing.length - 30} more`);
    }
    console.error(
      "\nEvery lesson paragraph must resolve via normalizeStaticAudioKey in static-audio-map.json.\n" +
        "Run: pnpm --filter @workspace/scripts run rebuild-static-audio-map\n",
    );
    process.exit(1);
  }

  console.log(`Lesson static-audio coverage: ${LESSONS.length} lessons, all paragraphs mapped.`);
}

assertLessonParagraphStaticCoverage();

const requireFullCorpus =
  process.env.STATIC_AUDIO_REQUIRE_FULL_CORPUS === "1" ||
  process.env.STATIC_AUDIO_REQUIRE_FULL_CORPUS === "true";

const corpusMissing = computeCorpusMissingStaticAudioKeys(loadStaticAudioMap());
if (corpusMissing.length > 0) {
  const msg =
    `[static-audio] ${corpusMissing.length} extended corpus phrase(s) not in map — ` +
    "run: pnpm run generate:static-audio";
  if (requireFullCorpus) {
    console.error(`${msg}\n`);
    console.error("Sample missing keys:", corpusMissing.slice(0, 20));
    process.exit(1);
  }
  console.warn(`${msg} (API on-demand TTS until pre-generated).`);
}

console.log(
  missingPhonics.length > 0
    ? `Static audio map: default 100%; phonics ${missingPhonics.length} pending OpenAI pre-generation.`
    : corpusMissing.length > 0
      ? `Static audio map: core catalog 100%; extended corpus ${corpusMissing.length} pending.`
      : "Static audio map: 100% full corpus coverage (core + extended).",
);
console.log("Static audio client: no direct GCS playback in source.");

try {
  execSync("tsx ./check-static-audio-duplicates.ts", {
    stdio: "inherit",
    cwd: import.meta.dirname,
  });
} catch {
  process.exit(1);
}
