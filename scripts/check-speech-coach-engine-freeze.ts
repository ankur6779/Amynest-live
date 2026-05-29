/**
 * Enforce Speech Coach engine freeze in UI layer.
 *
 *   pnpm --filter @workspace/scripts run check-speech-coach-engine-freeze
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO_ROOT } from "./static-audio-paths.js";

const SPEECH_COACH_UI = join(REPO_ROOT, "artifacts/kidschedule/src/pages/speech-coach");
const SPEECH_COACH_LIB = join(REPO_ROOT, "lib/speech-coach/src");

/** UI files may orchestrate; engines own resources. */
const UI_FORBIDDEN = [
  { pattern: /\bnew\s+Audio\s*\(/, label: "new Audio()" },
  { pattern: /\.play\s*\(/, label: "audio.play()" },
  { pattern: /\bMediaRecorder\b/, label: "MediaRecorder" },
  { pattern: /getUserMedia\s*\(/, label: "getUserMedia()" },
  { pattern: /speechSynthesis/, label: "speechSynthesis" },
  { pattern: /\bnew\s+AudioContext\s*\(/, label: "new AudioContext()" },
  { pattern: /webkitAudioContext/, label: "webkitAudioContext" },
];

const UI_ALLOWED_BYPASS = new Set<string>([
  // speech-coach-utils playSpeechCue uses AudioContext for brief UI cues — pre-existing
  "speech-coach-utils.ts",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

const violations: string[] = [];

for (const file of walk(SPEECH_COACH_UI)) {
  const rel = relative(SPEECH_COACH_UI, file).replace(/\\/g, "/");
  if (UI_ALLOWED_BYPASS.has(rel)) continue;
  const content = readFileSync(file, "utf8");
  for (const rule of UI_FORBIDDEN) {
    if (rule.pattern.test(content)) {
      violations.push(`pages/speech-coach/${rel}: forbidden ${rule.label}`);
    }
  }
  if (/const\s+AMY_REPLIES\s*:/.test(content)) {
    violations.push(`pages/speech-coach/${rel}: duplicate AMY_REPLIES — use @workspace/speech-coach coach-dialogue`);
  }
  if (/function\s+evaluate\s*\([^)]*PronouncePrompt/.test(content) && !rel.includes(".test.")) {
    violations.push(`pages/speech-coach/${rel}: local evaluate() — use evaluateCoachResponse from @workspace/speech-coach`);
  }
}

for (const file of walk(SPEECH_COACH_LIB)) {
  const rel = relative(SPEECH_COACH_LIB, file).replace(/\\/g, "/");
  const content = readFileSync(file, "utf8");
  if (/from\s+["']react["']/.test(content)) {
    violations.push(`lib/speech-coach/${rel}: React import in pure engine library`);
  }
}

if (violations.length) {
  console.error("Speech Coach engine freeze check failed:\n");
  for (const v of violations) console.error(`  - ${v}`);
  console.error("\nSee docs/speech-coach-engine-freeze.md");
  process.exit(1);
}

console.log("Speech Coach engine freeze check passed.");
