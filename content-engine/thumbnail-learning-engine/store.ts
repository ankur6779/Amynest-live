/**
 * Permanent thumbnail learning store (JSON on disk).
 * Never forgets previous A/B results.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  THUMBNAIL_LEARNING_ENGINE_VERSION,
  type ThumbnailLearningRecord,
  type ThumbnailLearningStoreSnapshot,
} from "./types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_LEARNING_STORE_PATH = join(
  HERE,
  "data",
  "thumbnail-learning-store.json",
);

export function emptyLearningStore(): ThumbnailLearningStoreSnapshot {
  return {
    version: THUMBNAIL_LEARNING_ENGINE_VERSION,
    records: [],
    patterns: null,
    recommendations: null,
    top100: [],
    worst100: [],
    updatedAt: new Date().toISOString(),
  };
}

export function loadLearningStore(
  path: string = DEFAULT_LEARNING_STORE_PATH,
): ThumbnailLearningStoreSnapshot {
  if (!existsSync(path)) return emptyLearningStore();
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as ThumbnailLearningStoreSnapshot;
    return {
      ...emptyLearningStore(),
      ...raw,
      records: Array.isArray(raw.records) ? raw.records : [],
      top100: Array.isArray(raw.top100) ? raw.top100 : [],
      worst100: Array.isArray(raw.worst100) ? raw.worst100 : [],
    };
  } catch {
    return emptyLearningStore();
  }
}

export function saveLearningStore(
  snapshot: ThumbnailLearningStoreSnapshot,
  path: string = DEFAULT_LEARNING_STORE_PATH,
): void {
  mkdirSync(dirname(path), { recursive: true });
  const next: ThumbnailLearningStoreSnapshot = {
    ...snapshot,
    version: THUMBNAIL_LEARNING_ENGINE_VERSION,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(path, JSON.stringify(next, null, 2), "utf8");
}

/** Upsert by videoId — each published video becomes training data. */
export function upsertLearningRecord(
  store: ThumbnailLearningStoreSnapshot,
  record: ThumbnailLearningRecord,
): ThumbnailLearningStoreSnapshot {
  const idx = store.records.findIndex((r) => r.videoId === record.videoId);
  const records = [...store.records];
  if (idx >= 0) {
    records[idx] = {
      ...record,
      id: records[idx]!.id,
      createdAt: records[idx]!.createdAt,
      updatedAt: new Date().toISOString(),
    };
  } else {
    records.push(record);
  }
  return { ...store, records, updatedAt: new Date().toISOString() };
}

export function recordsByCtr(
  records: ThumbnailLearningRecord[],
  direction: "desc" | "asc",
  limit = 100,
): ThumbnailLearningRecord[] {
  const sorted = [...records].sort((a, b) =>
    direction === "desc"
      ? b.outcomes.ctr - a.outcomes.ctr
      : a.outcomes.ctr - b.outcomes.ctr,
  );
  return sorted.slice(0, limit);
}
