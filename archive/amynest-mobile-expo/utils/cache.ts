import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppDataResponse } from "@/services/api";

const CACHE_PREFIX = "APP_DATA_CACHE";

export type CachedAppData = {
  data: AppDataResponse;
  cachedAt: number;
  userId: string | null;
};

function keyFor(userId: string | null): string {
  return userId ? `${CACHE_PREFIX}:${userId}` : `${CACHE_PREFIX}:anon`;
}

export async function readAppDataCache(userId: string | null): Promise<CachedAppData | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAppData;
    if (!parsed?.data || typeof parsed.cachedAt !== "number") return null;
    if (parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeAppDataCache(
  data: AppDataResponse,
  userId: string | null,
): Promise<void> {
  try {
    const payload: CachedAppData = { data, cachedAt: Date.now(), userId };
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(payload));
  } catch {
    // best-effort cache write
  }
}

export async function clearAppDataCache(userId?: string | null): Promise<void> {
  try {
    if (typeof userId !== "undefined") {
      await AsyncStorage.removeItem(keyFor(userId));
      return;
    }
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((k) => k.startsWith(`${CACHE_PREFIX}:`));
    if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
  } catch {
    // ignore
  }
}
