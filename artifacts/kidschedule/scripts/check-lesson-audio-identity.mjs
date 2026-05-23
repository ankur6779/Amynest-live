#!/usr/bin/env node
/**
 * Enforce lesson audio identity safety contract.
 *
 *   node artifacts/kidschedule/scripts/check-lesson-audio-identity.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");

const LESSON_GUARD_FILES = [
  "hooks/use-lesson-playback.ts",
  "components/audio-lessons/player-sheet.tsx",
];

const ALLOWLIST = new Set([
  "lib/lesson-audio-identity.ts",
  "lib/lesson-audio-identity.test.ts",
  "hooks/use-lesson-playback.test.ts",
  "lib/amy-voice-pipeline-optimizer.test.ts",
  "lib/amy-speech-mode.test.ts",
  "lib/amy-voice-pipeline-optimizer.ts",
  "lib/amy-speech-mode.ts",
  ...LESSON_GUARD_FILES,
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

for (const rel of LESSON_GUARD_FILES) {
  const file = join(SRC, rel);
  const content = readFileSync(file, "utf8");

  if (/\.slice\s*\(\s*0\s*,\s*\d+\s*\)/.test(content)) {
    violations.push(`${rel}: prefix-based cache/key truncation is forbidden for lesson audio`);
  }

  if (/prefetchLessonParagraphText\s*\(/.test(content) && rel !== "lib/amy-voice-pipeline-optimizer.ts") {
    violations.push(`${rel}: use prefetchLessonParagraph with AudioIdentity`);
  }
}

for (const file of walk(SRC)) {
  const rel = relative(SRC, file).replace(/\\/g, "/");
  if (!rel.includes("lesson") && !rel.includes("audio-lessons")) continue;
  if (ALLOWLIST.has(rel)) continue;
  if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;

  const content = readFileSync(file, "utf8");
  if (/speak\s*\([^)]*lessonParagraph:\s*true/.test(content) && !/audioIdentity/.test(content)) {
    violations.push(`${rel}: lesson speak() must pass audioIdentity`);
  }
}

const optimizer = readFileSync(join(SRC, "lib/amy-voice-pipeline-optimizer.ts"), "utf8");
if (!optimizer.includes("prefetchLessonParagraph(")) {
  violations.push("lib/amy-voice-pipeline-optimizer.ts: missing prefetchLessonParagraph identity API");
}
if (!optimizer.includes("lessonPipelineCacheKey")) {
  violations.push("lib/amy-voice-pipeline-optimizer.ts: must use lessonPipelineCacheKey for lessons");
}
const lessonKeyBlock = optimizer.slice(
  optimizer.indexOf("if (opts?.lessonParagraph)"),
  optimizer.indexOf("return `${kind}:${mode}:${text.trim"),
);
if (/\.slice\s*\(\s*0\s*,/.test(lessonKeyBlock)) {
  violations.push("lib/amy-voice-pipeline-optimizer.ts: lesson cache keys must not truncate text");
}
if (/normalizedText/.test(optimizer.match(/prefetchLessonParagraph\([\s\S]*?\n\}/)?.[0] ?? "")) {
  violations.push("lib/amy-voice-pipeline-optimizer.ts: prefetch must use raw identity text");
}

const identityModule = readFileSync(join(SRC, "lib/lesson-audio-identity.ts"), "utf8");
for (const symbol of [
  "AudioIdentity",
  "createAudioIdentity",
  "lessonPipelineCacheKey",
  "assertVerbatimLessonText",
  "assertPlaybackMatchesUi",
  "assertPrefetchCacheKey",
]) {
  if (!identityModule.includes(symbol)) {
    violations.push(`lib/lesson-audio-identity.ts: missing required export ${symbol}`);
  }
}

if (violations.length) {
  console.error("Lesson audio identity contract check failed:\n");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log("Lesson audio identity contract check passed.");
