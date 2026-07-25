/**
 * Client-side polished assistant bodies survive hydrate without API changes.
 * Server keeps the moderated raw text; UI always prefers the local polish when present.
 */

const KEY = "amynest:amy-astro:polished-messages:v1:";

type Store = Record<string, string>;

const memory = new Map<string, Store>();

function read(profileId: string): Store {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(KEY + profileId);
      if (raw) return { ...JSON.parse(raw) } as Store;
    }
  } catch {
    /* fall through */
  }
  return { ...(memory.get(profileId) ?? {}) };
}

function write(profileId: string, next: Store): Store {
  memory.set(profileId, next);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(KEY + profileId, JSON.stringify(next));
    }
  } catch {
    /* memory is enough */
  }
  return next;
}

export function savePolishedMessage(
  profileId: string,
  messageId: string,
  polishedBody: string,
): void {
  if (!messageId || !polishedBody.trim()) return;
  const prev = read(profileId);
  const next = { ...prev, [messageId]: polishedBody };
  // Cap store size — keep newest ~80 entries
  const ids = Object.keys(next);
  if (ids.length > 80) {
    for (const id of ids.slice(0, ids.length - 80)) {
      delete next[id];
    }
  }
  write(profileId, next);
}

export function getPolishedMessage(
  profileId: string,
  messageId: string,
): string | null {
  return read(profileId)[messageId] ?? null;
}

/** Apply stored polish onto server/local messages — never re-runs quality pass. */
export function applyPolishedBodies<T extends { messageId: string; role: string; body: string }>(
  profileId: string,
  messages: T[],
): T[] {
  const store = read(profileId);
  if (!Object.keys(store).length) return messages;
  return messages.map((m) => {
    if (m.role !== "assistant") return m;
    const polished = store[m.messageId];
    if (!polished || polished === m.body) return m;
    return { ...m, body: polished };
  });
}

export function __resetPolishedMessageStoreForTests(): void {
  memory.clear();
  try {
    if (typeof localStorage !== "undefined") {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(KEY)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    /* ignore */
  }
}
