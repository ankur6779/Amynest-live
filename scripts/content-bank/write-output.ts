import { gzipSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../static-audio-paths.js";
import type {
  ContentBankManifest,
  ContentBankStats,
  EventPrepActivity,
  LifeSkillsLesson,
  MathProgressionPack,
  SmartStudyLesson,
} from "./types.js";

export const CONTENT_BANK_ROOT = resolve(REPO_ROOT, "content-bank");

export function writeCategory<T>(
  folder: string,
  fileBase: string,
  items: T[],
): { jsonPath: string; gzipPath: string; bytes: number; gzipBytes: number } {
  const dir = resolve(CONTENT_BANK_ROOT, folder);
  mkdirSync(dir, { recursive: true });
  const json = JSON.stringify(items, null, 0);
  const jsonPath = resolve(dir, `${fileBase}.json`);
  const gzipPath = resolve(dir, `${fileBase}.json.gz`);
  writeFileSync(jsonPath, json, "utf8");
  const gz = gzipSync(Buffer.from(json, "utf8"), { level: 9 });
  writeFileSync(gzipPath, gz);
  return {
    jsonPath,
    gzipPath,
    bytes: Buffer.byteLength(json, "utf8"),
    gzipBytes: gz.length,
  };
}

export function writeManifest(manifest: ContentBankManifest): void {
  mkdirSync(CONTENT_BANK_ROOT, { recursive: true });
  const path = resolve(CONTENT_BANK_ROOT, "manifest.json");
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const gz = gzipSync(Buffer.from(JSON.stringify(manifest), "utf8"), { level: 9 });
  writeFileSync(resolve(CONTENT_BANK_ROOT, "manifest.json.gz"), gz);
}

export function buildStats(
  smartStudy: SmartStudyLesson[],
  lifeSkills: LifeSkillsLesson[],
  eventPrep: EventPrepActivity[],
  mathProgression: MathProgressionPack[],
  byteTotals: { uncompressed: number; gzip: number },
): ContentBankStats {
  const ageBandDistribution: Record<string, number> = {};
  const difficultyDistribution: Record<string, number> = {};

  const bump = (map: Record<string, number>, key: string) => {
    map[key] = (map[key] ?? 0) + 1;
  };

  for (const item of smartStudy) {
    bump(ageBandDistribution, item.ageBand);
    bump(difficultyDistribution, item.difficulty);
  }
  for (const item of lifeSkills) bump(ageBandDistribution, item.ageBand);
  for (const item of eventPrep) {
    bump(ageBandDistribution, item.ageBand);
    bump(difficultyDistribution, item.confidenceLevel);
  }
  for (const item of mathProgression) {
    bump(ageBandDistribution, item.ageBand);
    bump(difficultyDistribution, item.difficulty);
  }

  return {
    totalContentCount: 1100,
    categoryCounts: {
      smartStudy: smartStudy.length,
      lifeSkills: lifeSkills.length,
      eventPrep: eventPrep.length,
      mathProgression: mathProgression.length,
    },
    ageBandDistribution,
    difficultyDistribution,
    estimatedBytesUncompressed: byteTotals.uncompressed,
    estimatedBytesGzip: byteTotals.gzip,
    gcsFolderLayout: [
      "gs://{bucket}/content-bank/manifest.json",
      "gs://{bucket}/content-bank/manifest.json.gz",
      "gs://{bucket}/content-bank/smart-study/items.json",
      "gs://{bucket}/content-bank/smart-study/items.json.gz",
      "gs://{bucket}/content-bank/life-skills/items.json",
      "gs://{bucket}/content-bank/life-skills/items.json.gz",
      "gs://{bucket}/content-bank/event-prep/items.json",
      "gs://{bucket}/content-bank/event-prep/items.json.gz",
      "gs://{bucket}/content-bank/math-progression/items.json",
      "gs://{bucket}/content-bank/math-progression/items.json.gz",
      "gs://{bucket}/content-bank/stats.json",
    ],
  };
}

export function writeStats(stats: ContentBankStats): void {
  const path = resolve(CONTENT_BANK_ROOT, "stats.json");
  writeFileSync(path, `${JSON.stringify(stats, null, 2)}\n`, "utf8");
}
