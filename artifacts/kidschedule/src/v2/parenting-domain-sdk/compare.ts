/**
 * compareDomains — developer diff for DomainDefinition.
 * Pure. No ownership.
 */

import { freezeDomain } from "./freeze";
import type { DomainDefinition, DomainDiffEntry } from "./types";

export function compareDomains(
  before: DomainDefinition,
  after: DomainDefinition,
): ReadonlyArray<DomainDiffEntry> {
  const out: DomainDiffEntry[] = [];

  const push = (path: string, b: unknown, a: unknown) => {
    if (Object.is(b, a)) return;
    if (Array.isArray(b) && Array.isArray(a)) {
      if (b.length !== a.length) {
        out.push(freezeDomain({ path: path || "(root)", before: b, after: a }));
        return;
      }
      for (let i = 0; i < b.length; i += 1) {
        push(`${path}[${i}]`, b[i], a[i]);
      }
      return;
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
        push(childPath, bk[childKey], ak[childKey]);
      }
      return;
    }
    out.push(freezeDomain({ path: path || "(root)", before: b, after: a }));
  };

  push("experienceId", before.experienceId, after.experienceId);
  push("domainVersion", before.domainVersion, after.domainVersion);
  push("subdomainIds", before.subdomainIds, after.subdomainIds);
  push("subdomains", before.subdomains, after.subdomains);
  push("surfaces", before.surfaces, after.surfaces);
  push("journey", before.journey, after.journey);

  return Object.freeze(out);
}
