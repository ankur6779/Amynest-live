/**
 * compareExperienceDefinitions — developer diff only.
 */

import { freezeDeep } from "./freeze";
import type {
  ExperienceDefinition,
  ExperienceDefinitionDiffEntry,
} from "./types";

export function compareExperienceDefinitions(
  before: ExperienceDefinition,
  after: ExperienceDefinition,
): ReadonlyArray<ExperienceDefinitionDiffEntry> {
  const out: ExperienceDefinitionDiffEntry[] = [];

  const push = (path: string, b: unknown, a: unknown) => {
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
      for (const key of keys) {
        push(path ? `${path}.${key}` : key, bk[key], ak[key]);
      }
      return;
    }
    out.push(freezeDeep({ path: path || "(root)", before: b, after: a }));
  };

  push("experienceId", before.experienceId, after.experienceId);
  push("experienceType", before.experienceType, after.experienceType);
  push("contentId", before.contentId, after.contentId);
  push("journeyId", before.journeyId, after.journeyId);
  push("surfaceBindings", before.surfaceBindings, after.surfaceBindings);
  push("premiumState", before.premiumState, after.premiumState);
  push("capabilities", before.capabilities, after.capabilities);
  push("metadata", before.metadata, after.metadata);
  push("version", before.version, after.version);

  return Object.freeze(out);
}
