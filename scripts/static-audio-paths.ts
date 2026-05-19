import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeCatalogMissingStaticAudioKeys,
  normalizeStaticAudioKey,
  type StaticAudioMap,
} from "@workspace/static-audio";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, "..");

export const STATIC_AUDIO_MAP_PATHS = [
  resolve(REPO_ROOT, "artifacts/kidschedule/src/data/static-audio-map.json"),
  resolve(REPO_ROOT, "artifacts/api-server/src/data/static-audio-map.json"),
] as const;

function normalizeMapKeys(bucket: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!bucket) return out;
  for (const [key, url] of Object.entries(bucket)) {
    const nk = normalizeStaticAudioKey(key);
    if (nk) out[nk] = (url ?? "").trim();
  }
  return out;
}

export function loadStaticAudioMap(): StaticAudioMap {
  const mapPath = STATIC_AUDIO_MAP_PATHS.find((p) => existsSync(p));
  if (!mapPath) {
    return { default: {}, phonics: {} };
  }
  try {
    const raw = JSON.parse(readFileSync(mapPath, "utf8")) as StaticAudioMap;
    return {
      default: normalizeMapKeys(raw.default),
      phonics: normalizeMapKeys(raw.phonics),
    };
  } catch {
    return { default: {}, phonics: {} };
  }
}

export function writeStaticAudioMap(map: StaticAudioMap): void {
  const body = `${JSON.stringify(map, null, 2)}\n`;
  for (const path of STATIC_AUDIO_MAP_PATHS) {
    writeFileSync(path, body, "utf8");
  }
}

export function listCatalogMissingKeys(map: StaticAudioMap = loadStaticAudioMap()): string[] {
  return computeCatalogMissingStaticAudioKeys(map);
}
