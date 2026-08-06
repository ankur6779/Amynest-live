import type { AmyDecision, AmyDecisionDiffEntry } from "./types";
import type { AmyReasonCode } from "./reason-codes";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function walk(
  before: unknown,
  after: unknown,
  path: string,
  out: AmyDecisionDiffEntry[],
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

/** Decision diff — ignores generatedAt by default. */
export function compareAmyDecisions(
  before: AmyDecision,
  after: AmyDecision,
  options: { ignoreGeneratedAt?: boolean } = {},
): ReadonlyArray<AmyDecisionDiffEntry> {
  const ignoreGeneratedAt = options.ignoreGeneratedAt ?? true;
  const left = ignoreGeneratedAt
    ? ({ ...before, generatedAt: after.generatedAt } as AmyDecision)
    : before;
  const diffs: AmyDecisionDiffEntry[] = [];
  walk(left, after, "", diffs);
  return Object.freeze(diffs.map((d) => Object.freeze(d)));
}

/** Reason-code set diff. */
export function diffDecisionReasons(
  before: AmyDecision,
  after: AmyDecision,
): Readonly<{
  added: ReadonlyArray<AmyReasonCode>;
  removed: ReadonlyArray<AmyReasonCode>;
}> {
  const a = new Set(before.reasonCodes);
  const b = new Set(after.reasonCodes);
  const added = [...b].filter((c) => !a.has(c));
  const removed = [...a].filter((c) => !b.has(c));
  return Object.freeze({
    added: Object.freeze(added),
    removed: Object.freeze(removed),
  });
}
