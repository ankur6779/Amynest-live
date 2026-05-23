import * as FileSystem from "expo-file-system";
import { resolveMediaUrl } from "@/constants/api";
import { withTimeout } from "@/lib/fetch-with-timeout";

const CACHE_DIR = `${FileSystem.cacheDirectory ?? ""}tts/`;
/** Reject truncated / corrupt MP3 stubs (partial downloads). */
export const MIN_VALID_TTS_BYTES = 500;
const DOWNLOAD_TIMEOUT_MS = 10_000;

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

  const download = FileSystem.downloadAsync(remote, dest);
  const result = await withTimeout(download, DOWNLOAD_TIMEOUT_MS, "tts_download");
  if (!result || result.status < 200 || result.status >= 300) {
    await deleteLocalTts(cacheKey);
    return null;
  }

  if (!(await isValidLocalTtsPath(dest))) {
    await deleteLocalTts(cacheKey);
    return null;
  }
  return dest;
}

export async function prefetchLocalTts(cacheKey: string, audioUrl: string): Promise<void> {
  const existing = await getLocalTtsUri(cacheKey);
  if (existing) return;
  await saveLocalTtsFromUrl(cacheKey, audioUrl);
}
