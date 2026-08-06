/**
 * compareResolvedExperiences — developer diff only.
 * Ignores generatedAt by default.
 */

import { freezeDeep } from "./freeze";
import type {
  ResolvedExperience,
  ResolvedExperienceDiffEntry,
} from "./types";

export function compareResolvedExperiences(
  before: ResolvedExperience,
  after: ResolvedExperience,
  options: { ignoreGeneratedAt?: boolean } = {},
): ReadonlyArray<ResolvedExperienceDiffEntry> {
  const ignoreGeneratedAt = options.ignoreGeneratedAt ?? true;
  const keys = Object.keys(before) as Array<keyof ResolvedExperience>;
  const out: ResolvedExperienceDiffEntry[] = [];

  for (const key of keys) {
    if (ignoreGeneratedAt && key === "generatedAt") continue;
    const b = before[key];
    const a = after[key];
    if (Object.is(b, a)) continue;
    if (Array.isArray(b) && Array.isArray(a)) {
      if (
        b.length === a.length &&
        b.every((v, i) => Object.is(v, a[i]))
      ) {
        continue;
      }
    }
    out.push(freezeDeep({ path: key, before: b, after: a }));
  }

  return Object.freeze(out);
}
