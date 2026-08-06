import type {
  ResolvedDecision,
  ResolvedDecisionDiffEntry,
} from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function walk(
  before: unknown,
  after: unknown,
  path: string,
  out: ResolvedDecisionDiffEntry[],
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

/** Diff ResolvedDecision — ignores resolvedAt by default. */
export function compareResolvedDecisions(
  before: ResolvedDecision,
  after: ResolvedDecision,
  options: { ignoreResolvedAt?: boolean } = {},
): ReadonlyArray<ResolvedDecisionDiffEntry> {
  const ignoreKeys = new Set<string>();
  if (options.ignoreResolvedAt ?? true) ignoreKeys.add("resolvedAt");
  const diffs: ResolvedDecisionDiffEntry[] = [];
  walk(before, after, "", diffs, ignoreKeys);
  return Object.freeze(diffs.map((d) => Object.freeze(d)));
}
