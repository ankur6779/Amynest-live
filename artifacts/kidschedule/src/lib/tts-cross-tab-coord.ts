/**
 * Cross-tab coordination for TTS generate — one tab generates, others wait.
 */

const LOCK_PREFIX = "amynest:tts-lock:";
const LOCK_TTL_MS = 120_000;
const TAB_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tab-${Date.now()}`;

type LockRow = { tabId: string; exp: number };

function readLock(key: string): LockRow | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${LOCK_PREFIX}${key}`);
    if (!raw) return null;
    const row = JSON.parse(raw) as LockRow;
    if (!row?.exp || Date.now() >= row.exp) return null;
    return row;
  } catch {
    return null;
  }
}

function writeLock(key: string): boolean {
  if (typeof localStorage === "undefined") return true;
  const existing = readLock(key);
  if (existing && existing.tabId !== TAB_ID) return false;
  try {
    localStorage.setItem(
      `${LOCK_PREFIX}${key}`,
      JSON.stringify({ tabId: TAB_ID, exp: Date.now() + LOCK_TTL_MS } satisfies LockRow),
    );
    return true;
  } catch {
    return true;
  }
}

function releaseLock(key: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    const row = readLock(key);
    if (row?.tabId === TAB_ID) {
      localStorage.removeItem(`${LOCK_PREFIX}${key}`);
    }
  } catch {
    /* ignore */
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Stable lock key from TTS request body fields. */
export function ttsCrossTabLockKey(body: Record<string, unknown>): string {
  const parts = [
    String(body.mode ?? "default"),
    String(body.text ?? ""),
    String(body.letter ?? ""),
    String(body.phoneme ?? ""),
    String(body.word ?? ""),
    String(body.blend ?? ""),
    String(body.voice ?? body.voiceId ?? ""),
  ];
  return parts.join("|").slice(0, 240);
}

/**
 * Serialize TTS generation for the same phrase across browser tabs.
 * Other tabs poll until the lock holder finishes or TTL expires.
 */
export async function withCrossTabTtsLock<T>(
  lockKey: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!lockKey.trim() || typeof window === "undefined") {
    return fn();
  }

  const deadline = Date.now() + LOCK_TTL_MS;
  while (Date.now() < deadline) {
    if (writeLock(lockKey)) break;
    await sleep(150);
  }

  try {
    return await fn();
  } finally {
    releaseLock(lockKey);
  }
}

/** Test-only reset. */
export function resetTtsCrossTabCoordForTests(): void {
  if (typeof localStorage === "undefined") return;
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const k = localStorage.key(i);
    if (k?.startsWith(LOCK_PREFIX)) localStorage.removeItem(k);
  }
}
