/**
 * compareSpeechExperience — developer diff only.
 * Ignores generatedAt by default.
 */

import { freezeDeep } from "./freeze";
import type {
  SpeechExperienceDiffEntry,
  SpeechExperiencePack,
} from "./types";

export function compareSpeechExperience(
  before: SpeechExperiencePack,
  after: SpeechExperiencePack,
  options: { ignoreGeneratedAt?: boolean } = {},
): ReadonlyArray<SpeechExperienceDiffEntry> {
  const ignoreGeneratedAt = options.ignoreGeneratedAt ?? true;
  const out: SpeechExperienceDiffEntry[] = [];

  const push = (path: string, key: string | null, b: unknown, a: unknown) => {
    if (ignoreGeneratedAt && key === "generatedAt") return;
    if (Object.is(b, a)) return;
    if (Array.isArray(b) && Array.isArray(a)) {
      if (b.length === a.length && b.every((v, i) => Object.is(v, a[i]))) {
        return;
      }
    }
    if (
      b &&
      a &&
      typeof b === "object" &&
      typeof a === "object" &&
      !Array.isArray(b) &&
      !Array.isArray(a)
    ) {
      const bk = b as Record<string, unknown>;
      const ak = a as Record<string, unknown>;
      const keys = new Set([...Object.keys(bk), ...Object.keys(ak)]);
      for (const childKey of keys) {
        const childPath = path ? `${path}.${childKey}` : childKey;
        push(childPath, childKey, bk[childKey], ak[childKey]);
      }
      return;
    }
    out.push(freezeDeep({ path: path || "(root)", before: b, after: a }));
  };

  push("experienceId", "experienceId", before.experienceId, after.experienceId);
  push(
    "experienceVersion",
    "experienceVersion",
    before.experienceVersion,
    after.experienceVersion,
  );
  push(
    "sharedExperienceId",
    "sharedExperienceId",
    before.sharedExperienceId,
    after.sharedExperienceId,
  );
  push("packVersion", "packVersion", before.packVersion, after.packVersion);
  push("content", "content", before.content, after.content);
  push("journey", "journey", before.journey, after.journey);
  push("surfaces", "surfaces", before.surfaces, after.surfaces);
  push("resolved", "resolved", before.resolved, after.resolved);
  push("generatedAt", "generatedAt", before.generatedAt, after.generatedAt);

  return Object.freeze(out);
}
