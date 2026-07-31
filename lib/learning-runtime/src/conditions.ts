import type { RuleCondition, RuleContext } from "./types.js";

/** Resolve dotted path against rule context root. */
export function resolvePath(ctx: RuleContext, path: string): unknown {
  if (!path) return undefined;
  const root: Record<string, unknown> = {
    signal: ctx.signal,
    state: ctx.state,
    snapshots: ctx.snapshots,
    flags: ctx.signal.flags,
    featureFlags: ctx.featureFlags,
    nowMs: ctx.nowMs,
  };
  const parts = path.split(".");
  let cur: unknown = root;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function evaluateCondition(
  cond: RuleCondition,
  ctx: RuleContext,
): boolean {
  switch (cond.op) {
    case "and":
      return cond.all.every((c) => evaluateCondition(c, ctx));
    case "or":
      return cond.any.some((c) => evaluateCondition(c, ctx));
    case "not":
      return !evaluateCondition(cond.cond, ctx);
    case "eq":
      return resolvePath(ctx, cond.path) === cond.value;
    case "neq":
      return resolvePath(ctx, cond.path) !== cond.value;
    case "gte": {
      const v = Number(resolvePath(ctx, cond.path));
      return Number.isFinite(v) && v >= cond.value;
    }
    case "lte": {
      const v = Number(resolvePath(ctx, cond.path));
      return Number.isFinite(v) && v <= cond.value;
    }
    case "gt": {
      const v = Number(resolvePath(ctx, cond.path));
      return Number.isFinite(v) && v > cond.value;
    }
    case "lt": {
      const v = Number(resolvePath(ctx, cond.path));
      return Number.isFinite(v) && v < cond.value;
    }
    case "in": {
      const v = resolvePath(ctx, cond.path);
      return cond.value.includes(v as never);
    }
    case "truthy":
      return Boolean(resolvePath(ctx, cond.path));
    case "falsy":
      return !resolvePath(ctx, cond.path);
    default:
      return false;
  }
}
