/**
 * Map each content-bank item id → static audio hash + proxy URL (from static-audio-map).
 *
 * Usage: pnpm run build:content-bank-audio-map
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  getStaticAudioHash,
  normalizeStaticAudioKey,
} from "@workspace/static-audio";
import type { ContentBankAudioMap, ContentBankAudioMapEntry } from "@workspace/content-bank";
import { REPO_ROOT, loadStaticAudioMap } from "./static-audio-paths.js";

const CATEGORIES = [
  "smart-study",
  "life-skills",
  "event-prep",
  "math-progression",
] as const;

const OUT_PATHS = [
  resolve(REPO_ROOT, "content-bank/audio-map.json"),
  resolve(REPO_ROOT, "artifacts/kidschedule/src/data/content-bank-audio-map.json"),
  resolve(REPO_ROOT, "artifacts/api-server/src/data/content-bank-audio-map.json"),
] as const;

function main(): void {
  const staticMap = loadStaticAudioMap();
  const manifestPath = resolve(REPO_ROOT, "content-bank/manifest.json");
  const manifestVersion = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { version?: string }).version ?? "1.0.0"
    : "1.0.0";

  const items: Record<string, ContentBankAudioMapEntry> = {};
  let missingUrl = 0;

  for (const category of CATEGORIES) {
    const jsonPath = resolve(REPO_ROOT, "content-bank", category, "items.json");
    if (!existsSync(jsonPath)) {
      console.warn(`[content-bank-audio-map] skip missing ${jsonPath}`);
      continue;
    }
    const list = JSON.parse(readFileSync(jsonPath, "utf8")) as Array<{
      id: string;
      audioText?: string;
    }>;
    for (const row of list) {
      const audioText = (row.audioText ?? "").trim();
      if (!audioText || !row.id) continue;
      const normalizedKey = normalizeStaticAudioKey(audioText);
      const hash = getStaticAudioHash(audioText, "default");
      const staticAudioUrl = staticMap.default[normalizedKey] ?? null;
      if (!staticAudioUrl) missingUrl += 1;
      items[row.id] = {
        category,
        audioText,
        hash,
        normalizedKey,
        staticAudioUrl,
      };
    }
  }

  const map: ContentBankAudioMap = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    manifestVersion,
    items,
  };

  const body = `${JSON.stringify(map, null, 2)}\n`;
  for (const p of OUT_PATHS) {
    writeFileSync(p, body, "utf8");
  }

  console.log(
    `[content-bank-audio-map] ${Object.keys(items).length} items, ${missingUrl} without static URL (run generate:content-bank-audio)`,
  );
}

main();
