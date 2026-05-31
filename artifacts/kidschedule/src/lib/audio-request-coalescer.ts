/**
 * Coalesce duplicate audio requests for the same identity within 500ms.
 * One download/generation; multiple callers share the same result.
 */

const COALESCE_WINDOW_MS = 500;

type InFlightEntry<T> = {
  promise: Promise<T>;
  listeners: Array<{ resolve: (v: T) => void; reject: (e: unknown) => void }>;
  startedAt: number;
};

const inFlight = new Map<string, InFlightEntry<unknown>>();

export function resolveAudioCoalesceKey(
  identity: string,
  module?: string,
): string {
  const id = (identity ?? "").trim();
  if (!id) return "";
  return `${module ?? "any"}:${id}`;
}

/** Stable coalesce key from speak options — prefers identity hash over raw text. */
export function resolveSpeakCoalesceKey(
  text: string,
  opts?: {
    parentHub?: boolean;
    coach?: boolean;
    lessonParagraph?: boolean;
    audioIdentity?: unknown;
  },
  module?: string,
): string {
  const identity = opts?.audioIdentity;
  if (identity && typeof identity === "object" && "hash" in identity) {
    const h = (identity as { hash: string }).hash;
    const section =
      "sectionId" in identity ? String((identity as { sectionId?: string }).sectionId ?? "") : "";
    const lesson =
      "lessonId" in identity ? String((identity as { lessonId?: string }).lessonId ?? "") : "";
    const plan =
      "planCacheKey" in identity
        ? String((identity as { planCacheKey?: string }).planCacheKey ?? "")
        : "";
    const suffix = section || lesson || plan || h;
    return resolveAudioCoalesceKey(`${suffix}:${h}`, module);
  }
  const normalized = (text ?? "").trim().toLowerCase();
  if (!normalized) return "";
  return resolveAudioCoalesceKey(normalized, module);
}

/**
 * Run fn once per coalesce key within the window; duplicate callers await the same promise.
 */
export async function coalesceAudioRequest<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const trimmed = (key ?? "").trim();
  if (!trimmed) return fn();

  const now = Date.now();
  const existing = inFlight.get(trimmed) as InFlightEntry<T> | undefined;
  if (existing && now - existing.startedAt < COALESCE_WINDOW_MS) {
    return existing.promise;
  }

  const listeners: InFlightEntry<T>["listeners"] = [];
  const entry: InFlightEntry<T> = {
    listeners,
    startedAt: now,
    promise: undefined as unknown as Promise<T>,
  };

  entry.promise = fn()
    .then((result) => {
      for (const l of listeners) l.resolve(result);
      return result;
    })
    .catch((err) => {
      for (const l of listeners) l.reject(err);
      throw err;
    })
    .finally(() => {
      window.setTimeout(() => {
        if (inFlight.get(trimmed) === entry) inFlight.delete(trimmed);
      }, COALESCE_WINDOW_MS);
    });

  inFlight.set(trimmed, entry as InFlightEntry<unknown>);
  return entry.promise;
}

export function getCoalescerInFlightCount(): number {
  return inFlight.size;
}
