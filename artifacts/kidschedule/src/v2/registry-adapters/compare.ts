import type { RegistrySnapshotDiffEntry } from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const DEFAULT_IGNORE_KEYS = new Set(["generatedAt", "adaptedAt"]);

function walk(
  before: unknown,
  after: unknown,
  path: string,
  out: RegistrySnapshotDiffEntry[],
  ignoreKeys: Set<string>,
): void {
  if (Object.is(before, after)) return;
  if (Array.isArray(before) && Array.isArray(after)) {
    const max = Math.max(before.length, after.length);
    for (let i = 0; i < max; i++) {
      walk(before[i], after[i], `${path}[${i}]`, out, ignoreKeys);
    }
    return;
  }
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      if (ignoreKeys.has(key)) continue;
      walk(
        before[key],
        after[key],
        path ? `${path}.${key}` : key,
        out,
        ignoreKeys,
      );
    }
    return;
  }
  out.push({ path: path || "(root)", before, after });
}

/**
 * Diff two adapter snapshots.
 * Ignores generatedAt / adaptedAt by default (time provenance).
 */
export function compareRegistrySnapshots(
  before: unknown,
  after: unknown,
  options: {
    ignoreGeneratedAt?: boolean;
    ignoreAdaptedAt?: boolean;
  } = {},
): ReadonlyArray<RegistrySnapshotDiffEntry> {
  const ignoreKeys = new Set<string>();
  if (options.ignoreGeneratedAt ?? true) ignoreKeys.add("generatedAt");
  if (options.ignoreAdaptedAt ?? true) ignoreKeys.add("adaptedAt");
  // Keep DEFAULT_IGNORE_KEYS in sync when both defaults true
  for (const key of DEFAULT_IGNORE_KEYS) {
    if (
      (key === "generatedAt" && (options.ignoreGeneratedAt ?? true)) ||
      (key === "adaptedAt" && (options.ignoreAdaptedAt ?? true))
    ) {
      ignoreKeys.add(key);
    }
  }

  const diffs: RegistrySnapshotDiffEntry[] = [];
  walk(before, after, "", diffs, ignoreKeys);
  return Object.freeze(diffs.map((d) => Object.freeze(d)));
}
