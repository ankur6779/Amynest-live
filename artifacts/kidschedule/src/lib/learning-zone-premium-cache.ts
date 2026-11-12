/**
 * Revoke ephemeral Learning Zone *content* caches when premium is lost.
 *
 * Must NEVER delete durable phonics/study progress or offline sync queues —
 * free-journey users write mastery into `amynest:phonics-v3-*` and a broad
 * prefix purge permanently destroys unsynced completions.
 */

/** Regenerable question-batch cache only — not mastery / sync / habit state. */
const STORAGE_PREFIXES = ["amynest:study:batch:"] as const;

/**
 * Whether Learning Zone content caches should be purged for entitlement state.
 *
 * Must NOT clear on React Query UI placeholders (FREE paint) or before a real
 * fetch settles — that wiped caches for still-premium users on cold start.
 * Settled free still only clears regenerable study batches + audio caches,
 * never phonics progress keys (see STORAGE_PREFIXES).
 */
export function shouldClearLearningZonePremiumCaches(state: {
  isSignedIn: boolean;
  isFetched: boolean;
  isPlaceholderData: boolean;
  isPremium: boolean | undefined;
}): boolean {
  if (!state.isSignedIn) return true;
  if (!state.isFetched || state.isPlaceholderData) return false;
  return state.isPremium === false;
}

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
