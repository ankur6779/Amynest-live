#!/usr/bin/env node
/**
 * Enforce Parent Hub audio identity safety contract.
 *
 *   node artifacts/kidschedule/scripts/check-parent-hub-audio-identity.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");

const PARENT_HUB_GUARD_FILES = [
  "components/parenting-articles.tsx",
  "components/amazing-facts.tsx",
  "components/daily-story-section.tsx",
  "components/age-based-sections.tsx",
  "components/toddler-preschool-mode.tsx",
  "components/daily-puzzle.tsx",
  "components/daily-kids-activity.tsx",
];

const ALLOWLIST = new Set([
  "lib/parent-hub-audio-identity.ts",
  "lib/parent-hub-audio-identity.test.ts",
  "lib/amy-voice-pipeline-optimizer.test.ts",
  "lib/amy-speech-mode.test.ts",
  "lib/amy-voice-pipeline-optimizer.ts",
  "lib/amy-speech-mode.ts",
  "lib/amy-voice-controller.ts",
  "lib/amy-voice-pipeline.ts",
  ...PARENT_HUB_GUARD_FILES,
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

const AUDIO_KEY_TRUNCATION =
  /(?:text|phrase|normalizedText|rawText|trimmed)\s*(?:\?\?[^\n]*)?\.(?:trim\(\)\.)?(?:toLowerCase\(\)\.)?slice\s*\(\s*0\s*,/;

for (const rel of PARENT_HUB_GUARD_FILES) {
  const file = join(SRC, rel);
  const content = readFileSync(file, "utf8");

  if (AUDIO_KEY_TRUNCATION.test(content)) {
    violations.push(`${rel}: prefix-based cache/key truncation is forbidden for Parent Hub audio`);
  }

  if (/speak\s*\(/.test(content) && !/parentHub:\s*true/.test(content)) {
    violations.push(`${rel}: Parent Hub speak() must pass parentHub: true with audioIdentity`);
  }

  if (/speak\s*\([^)]*parentHub:\s*true/.test(content) && !/audioIdentity/.test(content)) {
    violations.push(`${rel}: Parent Hub speak() must pass audioIdentity`);
  }
}

for (const file of walk(SRC)) {
  const rel = relative(SRC, file).replace(/\\/g, "/");
  if (!rel.includes("parent") && !rel.includes("hub") && !rel.includes("daily-")) continue;
  if (ALLOWLIST.has(rel)) continue;
  if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;

  const content = readFileSync(file, "utf8");
  if (/speak\s*\([^)]*parentHub:\s*true/.test(content) && !/audioIdentity/.test(content)) {
    violations.push(`${rel}: Parent Hub speak() must pass audioIdentity`);
  }
}

const optimizer = readFileSync(join(SRC, "lib/amy-voice-pipeline-optimizer.ts"), "utf8");
if (!optimizer.includes("prefetchParentHubItem(")) {
  violations.push("lib/amy-voice-pipeline-optimizer.ts: missing prefetchParentHubItem identity API");
}
if (!optimizer.includes("parentHubPipelineCacheKey")) {
  violations.push("lib/amy-voice-pipeline-optimizer.ts: must use parentHubPipelineCacheKey for Parent Hub");
}
const parentKeyBlock = optimizer.slice(
  optimizer.indexOf("if (opts?.parentHub)"),
  optimizer.indexOf("if (opts?.lessonParagraph)"),
);
if (/\.slice\s*\(\s*0\s*,/.test(parentKeyBlock)) {
  violations.push("lib/amy-voice-pipeline-optimizer.ts: Parent Hub cache keys must not truncate text");
}
if (/normalizedText/.test(optimizer.match(/prefetchParentHubItem\([\s\S]*?\n\}/)?.[0] ?? "")) {
  violations.push("lib/amy-voice-pipeline-optimizer.ts: prefetch must use raw identity text");
}

const identityModule = readFileSync(join(SRC, "lib/parent-hub-audio-identity.ts"), "utf8");
for (const symbol of [
  "ParentHubAudioIdentity",
  "createParentHubAudioIdentity",
  "parentHubPipelineCacheKey",
  "assertVerbatimParentHubText",
  "assertPlaybackMatchesUi",
  "assertPrefetchCacheKey",
]) {
  if (!identityModule.includes(symbol)) {
    violations.push(`lib/parent-hub-audio-identity.ts: missing required export ${symbol}`);
  }
}

if (violations.length) {
  console.error("Parent Hub audio identity contract check failed:\n");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log("Parent Hub audio identity contract check passed.");
