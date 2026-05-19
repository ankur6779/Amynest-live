import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StaticAudioMap } from "@workspace/static-audio";

const EMPTY_MAP: StaticAudioMap = { default: {}, phonics: {} };

function loadShippedStaticAudioMap(): StaticAudioMap {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "../data/static-audio-map.json"),
    resolve(process.cwd(), "artifacts/kidschedule/src/data/static-audio-map.json"),
    resolve(process.cwd(), "../kidschedule/src/data/static-audio-map.json"),
  ];

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as StaticAudioMap;
      return {
        default: raw.default ?? {},
        phonics: raw.phonics ?? {},
      };
    } catch {
      continue;
    }
  }

  return EMPTY_MAP;
}

let cached: StaticAudioMap | null = null;

export function getShippedStaticAudioMap(): StaticAudioMap {
  if (!cached) cached = loadShippedStaticAudioMap();
  return cached;
}
