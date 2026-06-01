#!/usr/bin/env node
/**
 * Enforce Amy voice ownership contract in kidschedule source.
 *
 *   node artifacts/kidschedule/scripts/check-amy-voice-contract.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");

const AUDIO_MANAGER_ALLOWLIST = new Set([
  "lib/audio-manager.ts",
  "lib/amy-voice-controller.ts",
  "lib/amy-voice-ownership.ts",
  "lib/amy-voice-pipeline.ts",
  "lib/emergency-audio.ts",
  "lib/static-audio.ts",
  "lib/tts-guard.ts",
  "lib/phonics-player.ts",
  "lib/phonics-static-audio.ts",
  "lib/phonics-audio.ts",
  "lib/voice.ts",
  "lib/audio-session-coordinator.ts",
  "hooks/use-poem-player.ts",
  "contexts/amy-voice-provider.tsx",
]);

const OWNERSHIP_ALLOWLIST = new Set([
  "lib/amy-voice-controller.ts",
  "lib/amy-voice-ownership.ts",
  "lib/amy-voice-safety.ts",
  "lib/amy-voice-pipeline.ts",
  "lib/amy-voice-pipeline-types.ts",
  "lib/amy-voice-pipeline-fallback-layers.ts",
  "lib/amy-voice-controller.test.ts",
]);

const UI_GLOB_SKIP = new Set([
  "pages/__tests__/ListenButton.test.tsx",
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

const violations = [];

for (const file of walk(SRC)) {
  const rel = relative(SRC, file).replace(/\\/g, "/");
  if (UI_GLOB_SKIP.has(rel)) continue;
  const content = readFileSync(file, "utf8");

  if (
    /useEffect\s*\(\s*\(\)\s*=>\s*\(\)\s*=>\s*\{[^}]*\b(?:stop|pause)\s*\(\)/.test(content) ||
    /useEffect\s*\(\s*\(\)\s*=>\s*\(\)\s*=>\s*\b(?:stop|pause)\s*\(\)/.test(content)
  ) {
    violations.push(`${rel}: lifecycle audio stop/pause in useEffect cleanup`);
  }

  if (
    /from\s+["']@\/lib\/amy-voice-ownership["']/.test(content) &&
    !OWNERSHIP_ALLOWLIST.has(rel)
  ) {
    violations.push(`${rel}: must not import amy-voice-ownership (internal only)`);
  }

  if (
    /\b(?:stop|pause)\s*,|\{\s*[^}]*\bstop\s*:\s*[^,}]/.test(content) &&
    /useAmyVoice\s*\(/.test(content) &&
    !rel.includes("__tests__")
  ) {
    const usesStop =
      /(?:const|let)\s*\{[^}]*\bstop\b[^}]*\}\s*=\s*useAmyVoice/.test(content) ||
      /useAmyVoice\([^)]*\)[^;]*\bstop\b/.test(content);
    if (usesStop) {
      violations.push(`${rel}: use useAmyVoice().pause() — stop is not allowed`);
    }
  }

  if (!AUDIO_MANAGER_ALLOWLIST.has(rel)) {
    if (/\baudioManager\.(?:stopAll|stop)\s*\(/.test(content)) {
      violations.push(`${rel}: direct audioManager.stop/stopAll — use useAmyVoice().pause()`);
    }
  }
}

if (violations.length) {
  console.error("Amy voice contract check failed:\n");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log("Amy voice contract check passed.");
