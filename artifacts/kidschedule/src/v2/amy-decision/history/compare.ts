import type { DecisionHistoryDiffEntry, DecisionHistoryDocument } from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function walk(
  before: unknown,
  after: unknown,
  path: string,
  out: DecisionHistoryDiffEntry[],
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
      walk(before[key], after[key], path ? `${path}.${key}` : key, out);
    }
    return;
  }
  out.push({ path: path || "(root)", before, after });
}

/** Diff two history documents — ignores updatedAt by default. */
export function compareHistory(
  before: DecisionHistoryDocument,
  after: DecisionHistoryDocument,
  options: { ignoreUpdatedAt?: boolean } = {},
): ReadonlyArray<DecisionHistoryDiffEntry> {
  const ignore = options.ignoreUpdatedAt ?? true;
  const left = ignore
    ? ({ ...before, updatedAt: after.updatedAt } as DecisionHistoryDocument)
    : before;
  const diffs: DecisionHistoryDiffEntry[] = [];
  walk(left, after, "", diffs);
  return Object.freeze(diffs.map((d) => Object.freeze(d)));
}
