import * as FileSystem from "expo-file-system";
import { resolveMediaUrl } from "@/constants/api";
import { withTimeout } from "@/lib/fetch-with-timeout";
import { adaptiveTimeoutMs } from "@/lib/network-adaptive-timeout";

const CACHE_DIR = `${FileSystem.cacheDirectory ?? ""}tts/`;
/** Reject truncated / corrupt MP3 stubs (partial downloads). */
export const MIN_VALID_TTS_BYTES = 500;
const DOWNLOAD_TIMEOUT_FAST_MS = 10_000;
const DOWNLOAD_TIMEOUT_SLOW_MS = 20_000;
const MAX_CACHE_BYTES = 50 * 1024 * 1024;

type CacheEntryMeta = { cacheKey: string; path: string; size: number; mtime: number };

function localPath(cacheKey: string): string {
  return `${CACHE_DIR}${cacheKey}.mp3`;
}

export async function ensureTtsCacheDir(): Promise<void> {
  if (!FileSystem.cacheDirectory) return;
  try {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  } catch {
    /* exists */
  }
}

export async function isValidLocalTtsPath(path: string): Promise<boolean> {
  if (!path) return false;
  try {
    const info = await FileSystem.getInfoAsync(path);
    return Boolean(info.exists && (info.size ?? 0) >= MIN_VALID_TTS_BYTES);
  } catch {
    return false;
  }
}

export async function deleteLocalTts(cacheKey: string): Promise<void> {
  if (!cacheKey || !FileSystem.cacheDirectory) return;
  try {
    await FileSystem.deleteAsync(localPath(cacheKey), { idempotent: true });
  } catch {
    /* ignore */
  }
}

async function listCacheEntries(): Promise<CacheEntryMeta[]> {
  if (!FileSystem.cacheDirectory) return [];
  await ensureTtsCacheDir();
  try {
    const names = await FileSystem.readDirectoryAsync(CACHE_DIR);
    const entries: CacheEntryMeta[] = [];
    for (const name of names) {
      if (!name.endsWith(".mp3")) continue;
      const path = `${CACHE_DIR}${name}`;
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) continue;
      entries.push({
        cacheKey: name.replace(/\.mp3$/, ""),
        path,
        size: info.size ?? 0,
        mtime: info.modificationTime ?? 0,
      });
    }
    return entries;
  } catch {
    return [];
  }
}

/** LRU prune when device TTS cache exceeds 50 MB. */
export async function pruneTtsCacheIfNeeded(): Promise<void> {
  const entries = await listCacheEntries();
  let total = entries.reduce((sum, e) => sum + e.size, 0);
  if (total <= MAX_CACHE_BYTES) return;

  entries.sort((a, b) => a.mtime - b.mtime);
  for (const entry of entries) {
    if (total <= MAX_CACHE_BYTES) break;
    try {
      await FileSystem.deleteAsync(entry.path, { idempotent: true });
      total -= entry.size;
    } catch {
      /* ignore */
    }
  }
}

/** Local device URI when MP3 was saved under tts/{cacheKey}.mp3 */
export async function getLocalTtsUri(cacheKey: string): Promise<string | null> {
  if (!cacheKey || !FileSystem.cacheDirectory) return null;
  const path = localPath(cacheKey);
  if (await isValidLocalTtsPath(path)) return path;
  await deleteLocalTts(cacheKey);
  return null;
}

/** Download remote TTS proxy URL into device cache for instant replay. */
export async function saveLocalTtsFromUrl(
  cacheKey: string,
  audioUrl: string,
): Promise<string | null> {
  if (!cacheKey || !FileSystem.cacheDirectory) return null;
  await ensureTtsCacheDir();
  const dest = localPath(cacheKey);
  const remote = resolveMediaUrl(audioUrl);
  const timeoutMs = adaptiveTimeoutMs(DOWNLOAD_TIMEOUT_FAST_MS, DOWNLOAD_TIMEOUT_SLOW_MS);

  const download = FileSystem.downloadAsync(remote, dest);
  const result = await withTimeout(download, timeoutMs, "tts_download");
  if (!result || result.status < 200 || result.status >= 300) {
    await deleteLocalTts(cacheKey);
    return null;
  }

  if (!(await isValidLocalTtsPath(dest))) {
    await deleteLocalTts(cacheKey);
    return null;
  }

  await pruneTtsCacheIfNeeded();
  return dest;
}

export async function prefetchLocalTts(cacheKey: string, audioUrl: string): Promise<void> {
  const existing = await getLocalTtsUri(cacheKey);
  if (existing) return;
  await saveLocalTtsFromUrl(cacheKey, audioUrl);
}
