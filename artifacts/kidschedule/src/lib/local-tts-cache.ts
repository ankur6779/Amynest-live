/**
 * Client-side TTS / static audio blob cache (IndexedDB).
 * Layer 2: replay previously fetched MP3s without API or GCS.
 */

import { normalizeStaticAudioKey, type StaticAudioMode } from "@workspace/static-audio/browser";

const DB_NAME = "amynest_amy_voice_cache";
const STORE = "audio";
const DB_VERSION = 1;
const MAX_ENTRIES = 80;
/** Reject truncated / corrupt MP3 blobs. */
export const MIN_LOCAL_BLOB_BYTES = 500;
const FETCH_TIMEOUT_MS = 10_000;

type CacheRow = { key: string; blob: Blob; updatedAt: number };

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = () => resolve(null);
        req.onsuccess = () => resolve(req.result);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, { keyPath: "key" });
          }
        };
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

export function localCacheKeyForPhrase(text: string, mode: StaticAudioMode = "default"): string {
  return `phrase:${mode}:${normalizeStaticAudioKey(text)}`;
}

export function localCacheKeyForTts(cacheKey: string): string {
  return `tts:${cacheKey}`;
}

export async function deleteLocalCachedAudio(key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

function isValidBlob(blob: Blob | null | undefined): blob is Blob {
  return Boolean(blob && blob.size >= MIN_LOCAL_BLOB_BYTES);
}

export async function getLocalCachedAudioUrl(key: string): Promise<string | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const row = await new Promise<CacheRow | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as CacheRow | undefined);
      req.onerror = () => reject(req.error);
    });
    if (!isValidBlob(row?.blob)) {
      if (row) void deleteLocalCachedAudio(key);
      return null;
    }
    return URL.createObjectURL(row!.blob);
  } catch {
    return null;
  }
}

export async function putLocalCachedAudio(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  if (!db || !isValidBlob(blob)) return;
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ key, blob, updatedAt: Date.now() } satisfies CacheRow);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await pruneLocalCache(db);
  } catch {
    /* best-effort */
  }
}

async function pruneLocalCache(db: IDBDatabase): Promise<void> {
  try {
    const rows = await new Promise<CacheRow[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as CacheRow[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    if (rows.length <= MAX_ENTRIES) return;
    rows.sort((a, b) => a.updatedAt - b.updatedAt);
    const toDrop = rows.slice(0, rows.length - MAX_ENTRIES);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const row of toDrop) store.delete(row.key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

/** Fetch URL and persist for offline replay (timeout + size validation). */
export async function warmLocalCacheFromUrl(key: string, url: string): Promise<void> {
  if (!url || typeof fetch === "undefined") return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      credentials: "omit",
      cache: "force-cache",
      signal: controller.signal,
    });
    if (!res.ok) return;
    const blob = await res.blob();
    if (isValidBlob(blob)) await putLocalCachedAudio(key, blob);
    else void deleteLocalCachedAudio(key);
  } catch {
    /* ignore */
  } finally {
    clearTimeout(timer);
  }
}
