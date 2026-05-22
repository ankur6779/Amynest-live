/**
 * Fail CI when kidschedule source uses direct TTS/Audio outside Amy voice pipeline.
 *
 *   pnpm --filter @workspace/scripts run check-amy-voice-usage
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO_ROOT } from "./static-audio-paths.js";

const KIDSCHEDULE_SRC = join(REPO_ROOT, "artifacts/kidschedule/src");

const ALLOWLIST = new Set([
  "lib/audio-manager.ts",
  "lib/static-audio.ts",
  "lib/static-audio-guard.ts",
  "lib/static-audio-telemetry.ts",
  "lib/tts-playback.ts",
  "lib/amy-voice-pipeline.ts",
  "lib/emergency-audio.ts",
  "lib/local-tts-cache.ts",
  "lib/phonics-audio.ts",
  "lib/study-tts.ts",
  "lib/voice.ts",
  "hooks/use-amy-voice.ts",
  "hooks/use-spelling.ts",
  "hooks/use-poem-player.ts",
  "components/static-audio-test-button.tsx",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "data") continue;
      walk(path, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

const violations: string[] = [];

for (const file of walk(KIDSCHEDULE_SRC)) {
  const rel = relative(KIDSCHEDULE_SRC, file).replace(/\\/g, "/");
  if (ALLOWLIST.has(rel)) continue;
  const content = readFileSync(file, "utf8");
  if (/new\s+Audio\s*\(/.test(content) && !content.includes("audioManager")) {
    violations.push(`${rel}: direct new Audio()`);
  }
  if (/from\s+["']@\/lib\/tts-playback["']/.test(content) && !/use-amy-voice|amy-voice-pipeline/.test(content)) {
    if (/generateTts|synthesizeTts/.test(content)) {
      violations.push(`${rel}: direct generateTts import — use useAmyVoice`);
    }
  }
}

if (violations.length) {
  console.error("Amy voice enforcement failed:\n");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log("Amy voice usage check passed.");
