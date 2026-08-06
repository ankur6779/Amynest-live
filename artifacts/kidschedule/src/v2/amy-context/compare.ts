import type { AmyContext, AmyContextDiffEntry } from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function walk(
  before: unknown,
  after: unknown,
  path: string,
  out: AmyContextDiffEntry[],
): void {
  if (Object.is(before, after)) return;

  if (Array.isArray(before) && Array.isArray(after)) {
    const max = Math.max(before.length, after.length);
    for (let i = 0; i < max; i++) {
      walk(before[i], after[i], `${path}[${i}]`, out);
    }
    return;
  }

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      const next = path ? `${path}.${key}` : key;
      walk(before[key], after[key], next, out);
    }
    return;
  }

  out.push({ path: path || "(root)", before, after });
}

/**
 * Context diff utility — developer only.
 * Ignores meta.generatedAt by default so clock noise does not dominate.
 */
export function compareAmyContexts(
  before: AmyContext,
  after: AmyContext,
  options: { ignoreGeneratedAt?: boolean } = {},
): ReadonlyArray<AmyContextDiffEntry> {
  const ignoreGeneratedAt = options.ignoreGeneratedAt ?? true;
  const left = ignoreGeneratedAt
    ? ({
        ...before,
        meta: { ...before.meta, generatedAt: after.meta.generatedAt },
      } as AmyContext)
    : before;

  const diffs: AmyContextDiffEntry[] = [];
  walk(left, after, "", diffs);
  return Object.freeze(diffs.map((d) => Object.freeze(d)));
}
