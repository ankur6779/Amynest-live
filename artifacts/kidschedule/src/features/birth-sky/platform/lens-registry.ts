/**
 * Lens Registry (Pack 9 Part 1, Pack 10 §1.5).
 * Idempotent registration, discovery, ordering, enable/disable, version compatibility, duplicate detection.
 */

import { trackBirthSkyEvent } from "../lib/analytics";
import { resolveLensPermissions } from "./permissions";
import { validateLensManifest } from "./lens-validate";
import type {
  LensDefinition,
  LensLifecycleState,
  LensMetadata,
  LensPlugins,
  RegisterLensResult,
  RegisteredLens,
} from "./lens-types";

const lenses = new Map<string, RegisteredLens>();
const duplicateReports: Array<{ lensId: string; reason: string; at: string }> = [];

function cloneMetadata(m: LensMetadata): LensMetadata {
  return {
    ...m,
    capabilities: [...m.capabilities],
    privacyScopes: [...m.privacyScopes],
    adrRefs: m.adrRefs ? [...m.adrRefs] : undefined,
    permissions: m.permissions ? [...m.permissions] : undefined,
  };
}

function metadataEqual(a: LensMetadata, b: LensMetadata): boolean {
  return (
    a.lensId === b.lensId &&
    a.lensVersion === b.lensVersion &&
    a.featureFlag === b.featureFlag &&
    a.sdkVersion === b.sdkVersion &&
    a.orderHint === b.orderHint &&
    JSON.stringify(a.capabilities) === JSON.stringify(b.capabilities)
  );
}

/**
 * Register a lens. Idempotent for identical manifests (Pack 9 / Pack 10).
 * Conflicting re-registration of an active different version → duplicate_conflict.
 */
export function registerLens(
  metadata: LensMetadata,
  plugins: LensPlugins = {},
  options?: { lifecycle?: LensDefinition["lifecycle"]; load?: LensDefinition["load"] },
): RegisterLensResult {
  const report = validateLensManifest(metadata, plugins);
  if (!report.ok) {
    return {
      ok: false,
      code: "invalid_manifest",
      error: report.issues.map((i) => i.message).join("; "),
    };
  }

  const existing = lenses.get(metadata.lensId);
  if (existing?.state === "retired") {
    return { ok: false, code: "retired", error: "Cannot re-register retired lens" };
  }

  if (existing) {
    if (metadataEqual(existing.metadata, metadata)) {
      // Idempotent — refresh plugins/lifecycle if provided, keep state.
      if (options?.lifecycle) existing.lifecycle = options.lifecycle;
      if (options?.load) existing.load = options.load;
      if (plugins && Object.keys(plugins).length > 0) existing.plugins = plugins;
      return { ok: true, lens: existing, idempotent: true };
    }
    if (existing.state === "active" && existing.metadata.lensVersion !== metadata.lensVersion) {
      duplicateReports.push({
        lensId: metadata.lensId,
        reason: `conflict_active_version:${existing.metadata.lensVersion}->${metadata.lensVersion}`,
        at: new Date().toISOString(),
      });
      return {
        ok: false,
        code: "duplicate_conflict",
        error: `Active lens ${metadata.lensId} cannot change version without disable`,
      };
    }
    // Non-active: allow metadata update (idempotent upgrade path).
    existing.metadata = cloneMetadata(metadata);
    existing.plugins = plugins;
    existing.permissions = resolveLensPermissions({
      capabilities: metadata.capabilities,
      declaredPermissions: metadata.permissions,
    });
    if (options?.lifecycle) existing.lifecycle = options.lifecycle;
    if (options?.load) existing.load = options.load;
    duplicateReports.push({
      lensId: metadata.lensId,
      reason: "reregister_metadata_update",
      at: new Date().toISOString(),
    });
    return { ok: true, lens: existing, idempotent: true };
  }

  const entry: RegisteredLens = {
    metadata: cloneMetadata(metadata),
    state: "registered",
    plugins,
    lifecycle: options?.lifecycle ?? {},
    load: options?.load,
    permissions: resolveLensPermissions({
      capabilities: metadata.capabilities,
      declaredPermissions: metadata.permissions,
    }),
    chunkLoaded: false,
  };
  lenses.set(metadata.lensId, entry);
  trackBirthSkyEvent("birth_sky.lens_registered", {
    lensId: metadata.lensId,
    lensVersion: metadata.lensVersion,
  });
  void entry.lifecycle.onRegister?.();
  return { ok: true, lens: entry, idempotent: false };
}

/** Convenience: register from a full LensDefinition. */
export function registerLensDefinition(def: LensDefinition): RegisterLensResult {
  return registerLens(def.metadata, def.plugins ?? {}, {
    lifecycle: def.lifecycle,
    load: def.load,
  });
}

export function getLens(lensId: string): RegisteredLens | undefined {
  return lenses.get(lensId);
}

export type ListLensesFilter = {
  state?: LensLifecycleState | LensLifecycleState[];
  capability?: string;
  /** Exclude retired by default when true. */
  includeRetired?: boolean;
};

export function listLenses(filter?: ListLensesFilter): RegisteredLens[] {
  let items = Array.from(lenses.values());
  if (!filter?.includeRetired) {
    items = items.filter((l) => l.state !== "retired");
  }
  if (filter?.state) {
    const states = Array.isArray(filter.state) ? filter.state : [filter.state];
    items = items.filter((l) => states.includes(l.state));
  }
  if (filter?.capability) {
    const cap = filter.capability;
    items = items.filter((l) =>
      (l.metadata.capabilities as string[]).includes(cap),
    );
  }
  return items.sort(
    (a, b) =>
      a.metadata.orderHint - b.metadata.orderHint ||
      a.metadata.lensId.localeCompare(b.metadata.lensId),
  );
}

/** Discovery for Extensions area — excludes primary birth_sky (Pack 9 §1.8). */
export function listExtensionLenses(): RegisteredLens[] {
  return listLenses({ state: ["available", "active"] }).filter(
    (l) => l.metadata.lensId !== "birth_sky",
  );
}

export function setLensState(
  lensId: string,
  state: LensLifecycleState,
): RegisteredLens | undefined {
  const entry = lenses.get(lensId);
  if (!entry) return undefined;
  if (entry.state === "retired" && state !== "retired") return entry;
  entry.state = state;
  if (state === "disabled") void entry.lifecycle.onDisable?.();
  if (state === "retired") {
    void entry.lifecycle.onRetire?.();
  }
  return entry;
}

export function enableLens(lensId: string): RegisteredLens | undefined {
  const entry = lenses.get(lensId);
  if (!entry || entry.state === "retired") return undefined;
  entry.state = "available";
  return entry;
}

export function disableLens(lensId: string): RegisteredLens | undefined {
  return setLensState(lensId, "disabled");
}

export function getDuplicateReports(): readonly {
  lensId: string;
  reason: string;
  at: string;
}[] {
  return duplicateReports;
}

/** Test helper — clears registry between unit tests. */
export function __resetLensRegistryForTests(): void {
  lenses.clear();
  duplicateReports.length = 0;
}
