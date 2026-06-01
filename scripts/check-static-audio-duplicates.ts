/**
 * Fail when static-audio-map has speak-normalized collisions with different URLs.
 *
 *   pnpm --filter @workspace/scripts run check-static-audio-duplicates
 */
import { readFileSync } from "node:fs";
import { normalizeSpeakTextForLookup } from "@workspace/static-audio";
import { loadStaticAudioMap, REPO_ROOT } from "./static-audio-paths.js";

type Collision = {
  bucket: string;
  normalized: string;
  entries: Array<{ key: string; url: string }>;
};

function findSpeakNormalizedCollisions(): Collision[] {
  const raw = JSON.parse(
    readFileSync(`${REPO_ROOT}/artifacts/kidschedule/src/data/static-audio-map.json`, "utf8"),
  ) as { default?: Record<string, string>; phonics?: Record<string, string> };

  const collisions: Collision[] = [];

  for (const bucket of ["default", "phonics"] as const) {
    const byNorm = new Map<string, Array<{ key: string; url: string }>>();
    for (const [key, url] of Object.entries(raw[bucket] ?? {})) {
      const normalized = normalizeSpeakTextForLookup(key);
      if (!normalized) continue;
      const list = byNorm.get(normalized) ?? [];
      list.push({ key, url: String(url).trim() });
      byNorm.set(normalized, list);
    }
    for (const [normalized, entries] of byNorm) {
      if (entries.length <= 1) continue;
      const urls = new Set(entries.map((e) => e.url));
      if (urls.size > 1) {
        collisions.push({ bucket, normalized, entries });
      }
    }
  }

  return collisions;
}

const collisions = findSpeakNormalizedCollisions();

console.log("\n=== Static audio speak-normalized collision check ===\n");

if (collisions.length === 0) {
  console.log("No speak-normalized collisions with different URLs.");
  process.exit(0);
}

console.error(`Found ${collisions.length} collision(s) with different URLs:\n`);
for (const c of collisions.slice(0, 20)) {
  console.error(`  [${c.bucket}] "${c.normalized.slice(0, 72)}${c.normalized.length > 72 ? "…" : ""}"`);
  for (const e of c.entries) {
    console.error(`    - "${e.key.slice(0, 60)}${e.key.length > 60 ? "…" : ""}" → ${e.url.slice(-48)}`);
  }
  console.error("");
}

if (collisions.length > 20) {
  console.error(`  … and ${collisions.length - 20} more`);
}

console.error("Run: pnpm --filter @workspace/scripts run dedupe-static-audio-map -- --write\n");
process.exit(1);
