import type {
  AttentionBudgetDiffEntry,
  AttentionBudgetResult,
} from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function walk(
  before: unknown,
  after: unknown,
  path: string,
  out: AttentionBudgetDiffEntry[],
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

/** Diff two AttentionBudgetResult values — ignores generatedAt by default. */
export function compareAttentionBudgets(
  before: AttentionBudgetResult,
  after: AttentionBudgetResult,
  options: { ignoreGeneratedAt?: boolean } = {},
): ReadonlyArray<AttentionBudgetDiffEntry> {
  const ignore = options.ignoreGeneratedAt ?? true;
  const left = ignore
    ? ({ ...before, generatedAt: after.generatedAt } as AttentionBudgetResult)
    : before;
  const diffs: AttentionBudgetDiffEntry[] = [];
  walk(left, after, "", diffs);
  return Object.freeze(diffs.map((d) => Object.freeze(d)));
}
