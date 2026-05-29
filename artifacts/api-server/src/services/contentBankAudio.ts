import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getStaticAudioHash,
  normalizeStaticAudioKey,
} from "@workspace/static-audio";
import type { ContentBankCategory } from "@workspace/content-bank";

type AudioMapFile = {
  items?: Record<
    string,
    {
      hash: string;
      normalizedKey: string;
      staticAudioUrl: string | null;
      audioText: string;
    }
  >;
};

let cachedMap: AudioMapFile | null = null;

function findRepoRoot(): string {
  const starts = [
    process.cwd(),
    resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".."),
  ];
  for (const start of starts) {
    let dir = resolve(start);
    for (let i = 0; i < 8; i += 1) {
      if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) return dir;
      dir = dirname(dir);
      if (dir === dirname(dir)) break;
    }
  }
  return resolve(starts[0]!);
}

function loadAudioMap(): AudioMapFile {
  if (cachedMap) return cachedMap;
  const root = findRepoRoot();
  const candidates = [
    resolve(root, "artifacts/api-server/src/data/content-bank-audio-map.json"),
    resolve(root, "content-bank/audio-map.json"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      cachedMap = JSON.parse(readFileSync(p, "utf8")) as AudioMapFile;
      return cachedMap;
    } catch {
      /* try next */
    }
  }
  cachedMap = { items: {} };
  return cachedMap;
}

export type ContentBankAudioMeta = {
  audioHash: string;
  audioKey: string;
  staticAudioUrl: string | null;
};

export function audioMetaForItemId(itemId: string, audioText: string): ContentBankAudioMeta {
  const text = audioText.trim();
  const audioKey = normalizeStaticAudioKey(text);
  const audioHash = getStaticAudioHash(text, "default");
  const entry = loadAudioMap().items?.[itemId];
  return {
    audioHash: entry?.hash ?? audioHash,
    audioKey: entry?.normalizedKey ?? audioKey,
    staticAudioUrl: entry?.staticAudioUrl ?? null,
  };
}

export function enrichWithAudio<T extends { id: string; audioText?: string }>(
  _category: ContentBankCategory,
  items: T[],
): Array<T & ContentBankAudioMeta> {
  return items.map((item) => {
    const text = (item.audioText ?? "").trim();
    const meta = text
      ? audioMetaForItemId(item.id, text)
      : { audioHash: "", audioKey: "", staticAudioUrl: null };
    return { ...item, ...meta };
  });
}
