/**
 * Remove duplicate static-audio-map entries that collapse to the same speak-normalized key.
 * Keeps the preferred key (no newlines, then shortest raw key) and drops the rest.
 *
 *   pnpm --filter @workspace/scripts run dedupe-static-audio-map
 *   pnpm --filter @workspace/scripts run dedupe-static-audio-map -- --write
 */
import { readFileSync, writeFileSync } from "node:fs";
import { normalizeSpeakTextForLookup } from "@workspace/static-audio";
import { REPO_ROOT } from "./static-audio-paths.js";

const WRITE = process.argv.includes("--write");

const MAP_PATHS = [
  `${REPO_ROOT}/artifacts/kidschedule/src/data/static-audio-map.json`,
  `${REPO_ROOT}/artifacts/api-server/src/data/static-audio-map.json`,
];

type MapFile = { default: Record<string, string>; phonics: Record<string, string> };

function preferKey(a: string, b: string): string {
  const aNl = a.includes("\n");
  const bNl = b.includes("\n");
  if (aNl !== bNl) return aNl ? b : a;
  if (a.length !== b.length) return a.length <= b.length ? a : b;
  return a.localeCompare(b) <= 0 ? a : b;
}

function dedupeBucket(bucket: Record<string, string>): {
  next: Record<string, string>;
  removed: string[];
} {
  const byNorm = new Map<string, Array<{ key: string; url: string }>>();
  for (const [key, url] of Object.entries(bucket)) {
    const normalized = normalizeSpeakTextForLookup(key);
    if (!normalized) continue;
    const list = byNorm.get(normalized) ?? [];
    list.push({ key, url: String(url).trim() });
    byNorm.set(normalized, list);
  }

  const next: Record<string, string> = {};
  const removed: string[] = [];

  for (const entries of byNorm.values()) {
    if (entries.length === 1) {
      next[entries[0]!.key] = entries[0]!.url;
      continue;
    }
    let keep = entries[0]!;
    for (let i = 1; i < entries.length; i++) {
      const candidate = entries[i]!;
      const preferredKey = preferKey(keep.key, candidate.key);
      if (preferredKey !== keep.key) keep = candidate;
    }
    next[keep.key] = keep.url;
    for (const e of entries) {
      if (e.key !== keep.key) removed.push(e.key);
    }
  }

  return { next, removed };
}

function dedupeMap(raw: MapFile): { next: MapFile; removed: string[] } {
  const defaultResult = dedupeBucket(raw.default ?? {});
  const phonicsResult = dedupeBucket(raw.phonics ?? {});
  return {
    next: { default: defaultResult.next, phonics: phonicsResult.next },
    removed: [...defaultResult.removed, ...phonicsResult.removed],
  };
}

let totalRemoved = 0;

for (const path of MAP_PATHS) {
  const raw = JSON.parse(readFileSync(path, "utf8")) as MapFile;
  const { next, removed } = dedupeMap(raw);
  console.log(`\n${path}`);
  console.log(`  removed: ${removed.length}`);
  if (removed.length > 0 && removed.length <= 8) {
    for (const k of removed) console.log(`    - ${JSON.stringify(k.slice(0, 80))}`);
  } else if (removed.length > 8) {
    for (const k of removed.slice(0, 5)) console.log(`    - ${JSON.stringify(k.slice(0, 80))}`);
    console.log(`    … and ${removed.length - 5} more`);
  }
  totalRemoved += removed.length;

  if (WRITE && removed.length > 0) {
    writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    console.log("  written");
  }
}

console.log(`\nTotal duplicate keys ${WRITE ? "removed" : "to remove"}: ${totalRemoved}`);
if (!WRITE && totalRemoved > 0) {
  console.log("Dry run — pass --write to apply.");
  process.exitCode = 1;
}
