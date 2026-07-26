/**
 * Stable deterministic rule codes (M-104 style) from engine rule keys.
 */

export type RulePrefix = "M" | "D" | "A" | "C" | "Z";

/** Deterministic 3-digit code in 100–999 from key string. */
export function stableRuleCode(prefix: RulePrefix, key: string): string {
  let h = 2166136261;
  const s = `${prefix}:${key}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = (h >>> 0) % 900 + 100;
  return `${prefix}-${n}`;
}

export function ruleRef(
  prefix: RulePrefix,
  key: string,
): { id: string; key: string } {
  return { id: stableRuleCode(prefix, key), key };
}
