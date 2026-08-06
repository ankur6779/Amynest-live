/**
 * Exactly-once engine — duplicate onceKey → AlreadyTracked.
 *
 * Default store = in-memory (Sprint 3C-3).
 * Swap `OnceStore` implementations later (localStorage / SQLite / server)
 * without changing bus behavior.
 */

export type OnceClaimResult = "claimed" | "already_tracked";

/**
 * Pluggable exactly-once persistence.
 *
 * Memory → localStorage → SQLite → Server: replace the store only.
 */
export interface OnceStore {
  /** Atomically claim key. Duplicate → already_tracked. */
  claim(key: string): OnceClaimResult;
  /** Release a previously claimed key (future: sink failure rollback). */
  release(key: string): void;
  has(key: string): boolean;
}

/** Test / session helpers — not required of every backend. */
export type OnceStoreLifecycle = OnceStore & {
  clear(): void;
  size(): number;
};

/** @deprecated Use OnceStore — kept as alias for call-site clarity. */
export type OnceKeyStore = OnceStore;

function normalizeKey(onceKey: string): string {
  return onceKey.trim();
}

export function createMemoryOnceStore(): OnceStoreLifecycle {
  const keys = new Set<string>();
  return {
    claim(key: string): OnceClaimResult {
      const k = normalizeKey(key);
      if (!k) return "already_tracked";
      if (keys.has(k)) return "already_tracked";
      keys.add(k);
      return "claimed";
    },
    release(key: string): void {
      keys.delete(normalizeKey(key));
    },
    has(key: string): boolean {
      return keys.has(normalizeKey(key));
    },
    clear(): void {
      keys.clear();
    },
    size(): number {
      return keys.size;
    },
  };
}

const LS_PREFIX = "amynest.v2.analytics.once.";

/**
 * Durable browser store (future wiring). Not used by default bus yet.
 * Implements OnceStore; memory mirrors for fast has() within session.
 */
export function createLocalStorageOnceStore(
  storage: Storage | null | undefined = typeof localStorage !== "undefined"
    ? localStorage
    : null,
): OnceStoreLifecycle {
  const memory = createMemoryOnceStore();
  if (!storage) return memory;

  const store: OnceStoreLifecycle = {
    claim(key: string): OnceClaimResult {
      const k = normalizeKey(key);
      if (!k) return "already_tracked";
      if (store.has(k)) return "already_tracked";
      memory.claim(k);
      try {
        storage.setItem(LS_PREFIX + k, "1");
      } catch {
        /* quota — memory still guards session */
      }
      return "claimed";
    },
    release(key: string): void {
      const k = normalizeKey(key);
      memory.release(k);
      try {
        storage.removeItem(LS_PREFIX + k);
      } catch {
        /* ignore */
      }
    },
    has(key: string): boolean {
      const k = normalizeKey(key);
      if (memory.has(k)) return true;
      try {
        if (storage.getItem(LS_PREFIX + k) === "1") {
          memory.claim(k);
          return true;
        }
      } catch {
        return memory.has(k);
      }
      return false;
    },
    clear(): void {
      memory.clear();
      try {
        const toRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k?.startsWith(LS_PREFIX)) toRemove.push(k);
        }
        for (const k of toRemove) storage.removeItem(k);
      } catch {
        /* ignore */
      }
    },
    size: () => memory.size(),
  };
  return store;
}

export type OnceEngine = {
  /** Returns already_tracked if key seen; otherwise claims and returns claimed. */
  claim(onceKey: string): OnceClaimResult;
  /** Undo a claim (future: failed sink write). */
  release(onceKey: string): void;
  has(onceKey: string): boolean;
  reset(): void;
};

/**
 * Thin façade over OnceStore. Bus depends on OnceEngine; swap stores underneath.
 */
export function createOnceEngine(
  store: OnceStore = createMemoryOnceStore(),
): OnceEngine {
  return {
    claim(onceKey: string): OnceClaimResult {
      return store.claim(normalizeKey(onceKey));
    },
    release(onceKey: string): void {
      store.release(normalizeKey(onceKey));
    },
    has(onceKey: string): boolean {
      return store.has(normalizeKey(onceKey));
    },
    reset() {
      const lifecycle = store as OnceStore & { clear?: () => void };
      if (typeof lifecycle.clear === "function") {
        lifecycle.clear();
        return;
      }
      throw new Error("OnceStore does not support clear/reset");
    },
  };
}

/** Fill `{token}` placeholders from a flat string map. */
export function materializeOnceKey(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name: string) => {
    const v = values[name];
    if (v === undefined || v === "") {
      throw new Error(`onceKey missing value for {${name}}`);
    }
    return v;
  });
}
