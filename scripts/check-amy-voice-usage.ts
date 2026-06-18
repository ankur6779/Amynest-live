/**
 * Fail CI when kidschedule source uses direct TTS/Audio outside Amy voice pipeline.
 *
 *   pnpm --filter @workspace/scripts run check:amy-voice-usage
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO_ROOT } from "./static-audio-paths.js";

const KIDSCHEDULE_SRC = join(REPO_ROOT, "artifacts/kidschedule/src");

/** Files allowed to touch low-level playback / TTS resolution. */
const ALLOWLIST = new Set([
  "lib/audio-manager.ts",
  "lib/audio-playback-events.ts",
  "lib/static-audio.ts",
  "lib/static-audio-guard.ts",
  "lib/static-audio-telemetry.ts",
  "lib/tts-playback.ts",
  "lib/amy-voice-pipeline.ts",
  "lib/amy-voice-pipeline-optimizer.ts",
  "lib/amy-voice-session.ts",
  "lib/amy-speech-mode.ts",
  "lib/amy-voice-emotion.ts",
  "lib/amy-voice-intent.ts",
  "lib/amy-voice-teacher.ts",
  "lib/amy-voice-preload.ts",
  "lib/amy-voice-learning.ts",
  "lib/amy-voice-difficulty.ts",
  "lib/amy-voice-health.ts",
  "lib/amy-voice-analytics.ts",
  "lib/amy-voice-golden.ts",
  "lib/amy-voice-field-validation.ts",
  "lib/amy-voice-delivery-profile.ts",
  "lib/amy-voice-cohorts.ts",
  "lib/amy-voice-experiments.ts",
  "lib/amy-voice-struggle-insights.ts",
  "lib/amy-voice-invariants.ts",
  "lib/amy-voice-governance.ts",
  "lib/amy-voice-personality.ts",
  "lib/amy-voice-audio-diag.ts",
  "lib/elevenlabs-fallback-tts.ts",
  "lib/emergency-audio.ts",
  "lib/local-tts-cache.ts",
  "lib/phonics-audio.ts",
  "lib/phonics-player.ts",
  "lib/phonics-static-audio.ts",
  "lib/phonics-playback-fallback.ts",
  "lib/phonics-safe-audio.ts",
  "lib/local-audio-playback.ts",
  "lib/local-audio-pack.ts",
  "lib/local-audio-recovery.ts",
  "lib/phonics-local-playback.ts",
  "lib/coach-local-playback.ts",
  "lib/spelling-local-playback.ts",
  "lib/audio-session-coordinator.ts",
  "lib/voice.ts",
  "lib/pregenerate-tts.ts",
  "lib/amy-voice-controller.ts",
  "lib/amy-voice-ownership.ts",
  "lib/amy-voice-safety.ts",
  "hooks/use-lesson-playback.ts",
  "lib/amy-voice-telemetry.ts",
  "contexts/amy-voice-provider.tsx",
  "hooks/use-amy-voice.ts",
  "hooks/use-poem-player.ts",
  "lib/phonics-audio-engine.ts",
  "lib/amy-voice-pipeline-types.ts",
  "lib/amy-voice-pipeline-fallback-layers.ts",
  "lib/procedural-sfx.ts",
  "lib/talking-amy-echo.ts",
  "hooks/use-sound-engine.ts",
  "pages/phonics-audio-preview.tsx",
  // Self-contained game background-music module (looping MP3, not Amy voice/TTS).
  "features/health-lab/components/games/crystal-garden/crystal-garden-audio.ts",
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

  if (/speechSynthesis\.(?:speak|cancel)/.test(content)) {
    violations.push(`${rel}: direct speechSynthesis — use useAmyVoice`);
  }

  if (/from\s+["']@\/lib\/tts-playback["']/.test(content) && /generateTts|synthesizeTts/.test(content)) {
    violations.push(`${rel}: direct generateTts/synthesizeTts — use useAmyVoice`);
  }

  if (/from\s+["']@\/lib\/study-tts["']/.test(content)) {
    violations.push(`${rel}: study-tts removed — use useAmyVoice`);
  }
}

if (violations.length) {
  console.error("Amy voice enforcement failed:\n");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log("Amy voice usage check passed.");
