const STORAGE_PREFIXES = [
  "amynest:study:batch:",
  "amynest:phonics-v2-",
  "amynest:phonics-v3-",
  "amynest:phonics-adaptive:",
  "amynest:phonics-habit:",
];

function purgeStorage(storage: Storage | undefined): void {
  if (!storage) return;
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      keys.push(key);
    }
  }
  for (const key of keys) storage.removeItem(key);
}

export function clearLearningZonePremiumCaches(): void {
  if (typeof window === "undefined") return;
  try {
    purgeStorage(window.localStorage);
    purgeStorage(window.sessionStorage);
  } catch {
    /* storage may be blocked */
  }

  if ("indexedDB" in window) {
    try {
      window.indexedDB.deleteDatabase("amynest_amy_voice_cache");
    } catch {
      /* best-effort */
    }
  }

  if ("caches" in window) {
    void window.caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith("amynest-audio-"))
          .map((name) => window.caches.delete(name)),
      ),
    );
  }
}
