import { readFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { logger } from "../lib/logger.js";
import { legacyGcsConfigured, readGcsObjectBytes } from "./ttsAudioStore.js";
import type {
  ContentBankCategory,
  ContentBankManifest,
  ContentBankItem,
  EventPrepActivity,
  LifeSkillsLesson,
  MathProgressionPack,
  SmartStudyLesson,
} from "@workspace/content-bank";

const GCS_PREFIX = "content-bank";
const CACHE_TTL_MS = Number(process.env.CONTENT_BANK_CACHE_TTL_MS ?? "3600000");

type CategoryCache = {
  loadedAt: number;
  items: ContentBankItem[];
};

let manifestCache: { loadedAt: number; manifest: ContentBankManifest } | null = null;
const categoryCaches = new Map<ContentBankCategory, CategoryCache>();

function repoContentBankRoot(): string {
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, "content-bank"),
    resolve(cwd, "../../content-bank"),
    resolve(cwd, "../content-bank"),
  ];
  for (const p of candidates) {
    if (existsSync(resolve(p, "manifest.json"))) return p;
  }
  return candidates[0]!;
}

function localPath(...parts: string[]): string {
  return resolve(repoContentBankRoot(), ...parts);
}

function readLocalJson(relativePath: string): unknown {
  const gzPath = localPath(`${relativePath}.gz`);
  const jsonPath = localPath(relativePath);
  if (existsSync(gzPath)) {
    const raw = gunzipSync(readFileSync(gzPath));
    return JSON.parse(raw.toString("utf8"));
  }
  if (existsSync(jsonPath)) {
    return JSON.parse(readFileSync(jsonPath, "utf8"));
  }
  throw new Error(`content_bank_local_missing:${relativePath}`);
}

async function readShard(relativePath: string): Promise<unknown> {
  const preferGz = !relativePath.endsWith(".gz");
  const gcsCandidates = preferGz
    ? [`${GCS_PREFIX}/${relativePath}.gz`, `${GCS_PREFIX}/${relativePath}`]
    : [`${GCS_PREFIX}/${relativePath}`];

  if (legacyGcsConfigured()) {
    for (const objectPath of gcsCandidates) {
      try {
        const buf = await readGcsObjectBytes(objectPath);
        if (!buf) continue;
        if (objectPath.endsWith(".gz")) {
          return JSON.parse(gunzipSync(buf).toString("utf8"));
        }
        return JSON.parse(buf.toString("utf8"));
      } catch (err) {
        logger.debug(
          {
            evt: "content_bank.gcs_miss",
            objectPath,
            message: err instanceof Error ? err.message : String(err),
          },
          "GCS content-bank object miss",
        );
      }
    }
  }

  try {
    return readLocalJson(relativePath);
  } catch (err) {
    throw new Error(
      `content_bank_unavailable:${relativePath} — upload to GCS or run pnpm run generate:content-bank (${err instanceof Error ? err.message : String(err)})`,
    );
  }
}

function isStale(loadedAt: number): boolean {
  return Date.now() - loadedAt > CACHE_TTL_MS;
}

export async function loadContentBankManifest(): Promise<ContentBankManifest> {
  if (manifestCache && !isStale(manifestCache.loadedAt)) {
    return manifestCache.manifest;
  }
  const raw = (await readShard("manifest.json")) as ContentBankManifest;
  manifestCache = { loadedAt: Date.now(), manifest: raw };
  return raw;
}

const SHARD_PATH: Record<ContentBankCategory, string> = {
  "smart-study": "smart-study/items.json",
  "life-skills": "life-skills/items.json",
  "event-prep": "event-prep/items.json",
  "math-progression": "math-progression/items.json",
};

export async function loadContentBankCategory<T extends ContentBankItem>(
  category: ContentBankCategory,
): Promise<T[]> {
  const cached = categoryCaches.get(category);
  if (cached && !isStale(cached.loadedAt)) {
    return cached.items as T[];
  }
  const raw = await readShard(SHARD_PATH[category]);
  if (!Array.isArray(raw)) {
    throw new Error(`content_bank_invalid_shard:${category}`);
  }
  categoryCaches.set(category, { loadedAt: Date.now(), items: raw as ContentBankItem[] });
  return raw as T[];
}

export async function warmContentBankCache(): Promise<void> {
  await loadContentBankManifest();
  const cats: ContentBankCategory[] = [
    "smart-study",
    "life-skills",
    "event-prep",
    "math-progression",
  ];
  for (const c of cats) {
    await loadContentBankCategory(c);
  }
  logger.info({ evt: "content_bank.warm_ok" }, "Content bank cache warmed");
}

export type {
  SmartStudyLesson,
  LifeSkillsLesson,
  EventPrepActivity,
  MathProgressionPack,
};
