/**
 * Lens permission model (Pack 9 §2.1 inputs + Pack 10 least-privilege contribution gating).
 * Tokens map frozen read ports / contribution seams — not product features.
 */

import type { LensCapability } from "./lens-types";

/**
 * Least-privilege permission tokens derived from Pack 9 read ports + Pack 10 contributions.
 * Journal body is never granted (Pack 9 §2.1 / Pack 5–6).
 */
export type LensPermission =
  | "read_profile"
  | "read_snapshot"
  | "read_astronomy"
  | "read_tradition"
  | "read_reflection_metadata"
  | "ai_access"
  | "export";

export const ALL_LENS_PERMISSIONS: readonly LensPermission[] = [
  "read_profile",
  "read_snapshot",
  "read_astronomy",
  "read_tradition",
  "read_reflection_metadata",
  "ai_access",
  "export",
] as const;

/** Capability → default permission grants (fail closed when undeclared). */
const CAPABILITY_PERMISSIONS: Partial<Record<LensCapability, LensPermission[]>> = {
  requiresBirthProfile: ["read_profile"],
  requiresSkySnapshot: ["read_snapshot", "read_astronomy"],
  optionalTraditional: ["read_tradition"],
  contributesAiContext: ["ai_access", "read_reflection_metadata"],
  participatesExport: ["export"],
};

export function permissionsFromCapabilities(
  capabilities: readonly LensCapability[],
): ReadonlySet<LensPermission> {
  const set = new Set<LensPermission>();
  for (const cap of capabilities) {
    const granted = CAPABILITY_PERMISSIONS[cap];
    if (granted) for (const p of granted) set.add(p);
  }
  return set;
}

export function resolveLensPermissions(input: {
  capabilities: readonly LensCapability[];
  /** Explicit allowlist from manifest; intersected with capability-derived set. */
  declaredPermissions?: readonly LensPermission[];
}): ReadonlySet<LensPermission> {
  const derived = permissionsFromCapabilities(input.capabilities);
  if (!input.declaredPermissions || input.declaredPermissions.length === 0) {
    return derived;
  }
  const out = new Set<LensPermission>();
  for (const p of input.declaredPermissions) {
    if (derived.has(p)) out.add(p);
  }
  return out;
}

export function hasLensPermission(
  granted: ReadonlySet<LensPermission>,
  permission: LensPermission,
): boolean {
  return granted.has(permission);
}

/** Contribution API → required capability (Pack 10 §1.8 fail closed). */
export type ContributionKind =
  | "dashboard"
  | "settings"
  | "routes"
  | "ai"
  | "offline"
  | "export"
  | "delete"
  | "analytics";

const CONTRIBUTION_CAPABILITY: Record<ContributionKind, LensCapability | null> = {
  dashboard: "providesDashboardPanel",
  settings: "providesSettings",
  routes: null, // routes allowed for any registered lens (namespaced)
  ai: "contributesAiContext",
  offline: "supportsOfflineCache",
  export: "participatesExport",
  delete: "participatesDelete",
  analytics: null,
};

export function canContribute(
  capabilities: readonly LensCapability[],
  kind: ContributionKind,
): boolean {
  const required = CONTRIBUTION_CAPABILITY[kind];
  if (required == null) return true;
  return capabilities.includes(required);
}
