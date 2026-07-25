/**
 * Lens Runtime (Pack 9 Part 3, Pack 10 §3.2) — load/unload/lazy/validate/isolate.
 * Pack 11 operational heartbeats/ORS are out of IM-6 scope (Operations).
 * One failing lens must never crash Birth Sky.
 */

import { trackBirthSkyEvent } from "../lib/analytics";
import { isBirthSkyEnabled } from "../lib/feature-flags";
import {
  buildLensReadonlyContext,
  type BuildLensContextInput,
  type LensReadonlyContext,
} from "./lens-context";
import { getLens, setLensState } from "./lens-registry";
import { validateLensManifest } from "./lens-validate";
import type { RegisteredLens } from "./lens-types";

export type LensRuntimeStatus = "idle" | "loading" | "loaded" | "failed" | "unloaded";

type RuntimeEntry = {
  status: LensRuntimeStatus;
  context: LensReadonlyContext | null;
  error: string | null;
};

const runtime = new Map<string, RuntimeEntry>();

function ensureEntry(lensId: string): RuntimeEntry {
  let e = runtime.get(lensId);
  if (!e) {
    e = { status: "idle", context: null, error: null };
    runtime.set(lensId, e);
  }
  return e;
}

export function getLensRuntimeStatus(lensId: string): LensRuntimeStatus {
  return runtime.get(lensId)?.status ?? "idle";
}

export function getLensRuntimeError(lensId: string): string | null {
  return runtime.get(lensId)?.error ?? null;
}

/**
 * Isolate async work — never rethrow to Birth Sky hosts.
 */
export async function isolateLensTask<T>(
  lensId: string,
  task: () => Promise<T> | T,
  fallback: T,
): Promise<T> {
  try {
    return await task();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const entry = ensureEntry(lensId);
    entry.status = "failed";
    entry.error = message;
    const lens = getLens(lensId);
    if (lens) lens.lastError = message;
    trackBirthSkyEvent("birth_sky.lens_failed", {
      lensId,
      error_code: "runtime_exception",
    });
    return fallback;
  }
}

export type ActivateLensInput = Omit<BuildLensContextInput, "lensId" | "lensVersion" | "permissions"> & {
  lensId: string;
  /** When true, skip lazy load factory. */
  skipLazyLoad?: boolean;
};

/**
 * Activation: master flag + validation + optional lazy chunk + hydrate.
 * Failures leave core Birth Sky unaffected (Pack 9 §4.4).
 */
export async function activateLens(input: ActivateLensInput): Promise<{
  ok: boolean;
  lens?: RegisteredLens;
  error?: string;
}> {
  if (!isBirthSkyEnabled()) {
    return { ok: false, error: "master_flag_off" };
  }

  const lens = getLens(input.lensId);
  if (!lens) return { ok: false, error: "not_registered" };
  if (lens.state === "retired" || lens.state === "disabled") {
    return { ok: false, error: `state_${lens.state}` };
  }

  const entry = ensureEntry(input.lensId);
  entry.status = "loading";

  const report = validateLensManifest(lens.metadata, lens.plugins);
  if (!report.ok) {
    entry.status = "failed";
    entry.error = "validation_failed";
    trackBirthSkyEvent("birth_sky.lens_failed", {
      lensId: input.lensId,
      error_code: "validation_failed",
    });
    setLensState(input.lensId, "disabled");
    return { ok: false, error: "validation_failed" };
  }

  type ActivateResult =
    | { ok: true; lens: typeof lens }
    | { ok: false; error: string };

  return isolateLensTask<ActivateResult>(
    input.lensId,
    async () => {
      if (!input.skipLazyLoad && lens.load && !lens.chunkLoaded) {
        const chunk = await lens.load();
        if (chunk?.plugins) lens.plugins = { ...lens.plugins, ...chunk.plugins };
        if (chunk?.lifecycle) lens.lifecycle = { ...lens.lifecycle, ...chunk.lifecycle };
        lens.chunkLoaded = true;
      }

      const ctx = buildLensReadonlyContext({
        lensId: input.lensId,
        lensVersion: lens.metadata.lensVersion,
        permissions: lens.permissions,
        authUserId: input.authUserId,
        childId: input.childId,
        profile: input.profile,
        snapshot: input.snapshot,
        aiEntitlement: input.aiEntitlement,
      });

      await lens.lifecycle.onActivate?.(ctx);
      await lens.lifecycle.onHydrate?.(ctx);

      entry.context = ctx;
      entry.status = "loaded";
      entry.error = null;
      setLensState(input.lensId, "active");
      trackBirthSkyEvent("birth_sky.lens_loaded", {
        lensId: input.lensId,
        lensVersion: lens.metadata.lensVersion,
      });
      return { ok: true, lens };
    },
    { ok: false, error: "activate_failed" },
  );
}

/** Soft refresh — version-aware; isolated. */
export async function refreshLens(lensId: string, input: ActivateLensInput): Promise<boolean> {
  const lens = getLens(lensId);
  const entry = runtime.get(lensId);
  if (!lens || !entry || entry.status !== "loaded") return false;

  return isolateLensTask(
    lensId,
    async () => {
      const ctx = buildLensReadonlyContext({
        lensId,
        lensVersion: lens.metadata.lensVersion,
        permissions: lens.permissions,
        authUserId: input.authUserId,
        childId: input.childId,
        profile: input.profile,
        snapshot: input.snapshot,
        aiEntitlement: input.aiEntitlement,
      });
      await lens.lifecycle.onRefresh?.(ctx);
      entry.context = ctx;
      return true;
    },
    false,
  );
}

export async function unloadLens(lensId: string): Promise<void> {
  const lens = getLens(lensId);
  const entry = ensureEntry(lensId);
  try {
    await lens?.lifecycle.onUnload?.();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    entry.error = message;
    if (lens) lens.lastError = message;
    trackBirthSkyEvent("birth_sky.lens_failed", {
      lensId,
      error_code: "unload_exception",
    });
  }
  entry.status = "unloaded";
  entry.context = null;
  if (lens && lens.state === "active") setLensState(lensId, "available");
  if (lens) lens.chunkLoaded = false;
  trackBirthSkyEvent("birth_sky.lens_unloaded", { lensId });
}

export function __resetLensRuntimeForTests(): void {
  runtime.clear();
}
