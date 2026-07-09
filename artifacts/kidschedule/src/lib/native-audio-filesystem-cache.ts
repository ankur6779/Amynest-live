/**
 * Native filesystem-equivalent audio cache (Phase 6).
 *
 * Capacitor does not ship @capacitor/filesystem in this repo yet.
 * This layer persists downloaded MP3 blobs in IndexedDB under a dedicated
 * store so native shells (iOS Capacitor / Android WebView) — which skip the
 * service worker — never re-fetch unchanged assets.
 *
 * Lookup order (callers / pipeline):
 *   Memory → Filesystem (this) → IndexedDB phrase cache → CDN → TTS
 *
 * When @capacitor/filesystem is added, swap put/get to write File under
 * Directory.Data without changing the public API.
 */

import { resolveApiMediaUrl } from "@/lib/api";
import { adaptiveTimeoutMs } from "@/lib/network-adaptive-timeout";

const DB_NAME = "amynest_audio_filesystem";
const STORE = "files";
const DB_VERSION = 1;
const MAX_ENTRIES = 400;
const MAX_BYTES = 80 * 1024 * 1024;
const MIN_BYTES = 500;
const FETCH_FAST_MS = 12_000;
const FETCH_SLOW_MS = 25_000;
const PACK_VERSION_KEY = "amynest:fs-audio-pack-version";

type FsRow = { key: string; blob: Blob; updatedAt: number; packVersion?: string };

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

function isValidBlob(blob: Blob | null | undefined): blob is Blob {
  return Boolean(blob && blob.size >= MIN_BYTES);
}

export async function getFilesystemCachedAudioUrl(key: string): Promise<string | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const row = await new Promise<FsRow | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as FsRow | undefined);
      req.onerror = () => reject(req.error);
    });
    if (!isValidBlob(row?.blob)) return null;
    return URL.createObjectURL(row!.blob);
  } catch {
    return null;
  }
}

export async function putFilesystemCachedAudio(
  key: string,
  blob: Blob,
  packVersion?: string,
): Promise<void> {
  const db = await openDb();
  if (!db || !isValidBlob(blob)) return;
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({
        key,
        blob,
        updatedAt: Date.now(),
        packVersion,
      } satisfies FsRow);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await prune(db);
  } catch {
    /* best-effort */
  }
}

async function prune(db: IDBDatabase): Promise<void> {
  try {
    const rows = await new Promise<FsRow[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as FsRow[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    let total = rows.reduce((n, r) => n + (r.blob?.size ?? 0), 0);
    if (rows.length <= MAX_ENTRIES && total <= MAX_BYTES) return;
    const sorted = [...rows].sort((a, b) => a.updatedAt - b.updatedAt);
    const toDrop: string[] = [];
    while (sorted.length > 0 && (sorted.length > MAX_ENTRIES || total > MAX_BYTES)) {
      const drop = sorted.shift()!;
      toDrop.push(drop.key);
      total -= drop.blob?.size ?? 0;
    }
    if (toDrop.length === 0) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const key of toDrop) store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

/** Download once and persist — skip if already present (versioned). */
export async function ensureFilesystemCachedFromUrl(
  key: string,
  url: string,
  packVersion?: string,
): Promise<string | null> {
  const existing = await getFilesystemCachedAudioUrl(key);
  if (existing) return existing;
  if (!url || typeof fetch === "undefined") return null;

  const fetchUrl = resolveApiMediaUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    adaptiveTimeoutMs(FETCH_FAST_MS, FETCH_SLOW_MS),
  );
  try {
    const res = await fetch(fetchUrl, {
      mode: "cors",
      credentials: "include",
      cache: "force-cache",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!isValidBlob(blob)) return null;
    await putFilesystemCachedAudio(key, blob, packVersion);
    return URL.createObjectURL(blob);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function getStoredLearningPackVersion(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(PACK_VERSION_KEY);
  } catch {
    return null;
  }
}

export function setStoredLearningPackVersion(version: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PACK_VERSION_KEY, version);
  } catch {
    /* ignore */
  }
}

export async function getFilesystemCacheStats(): Promise<{
  entries: number;
  bytes: number;
}> {
  const db = await openDb();
  if (!db) return { entries: 0, bytes: 0 };
  try {
    const rows = await new Promise<FsRow[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as FsRow[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    return {
      entries: rows.length,
      bytes: rows.reduce((n, r) => n + (r.blob?.size ?? 0), 0),
    };
  } catch {
    return { entries: 0, bytes: 0 };
  }
}
