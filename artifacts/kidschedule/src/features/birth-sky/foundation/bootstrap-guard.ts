/**
 * Ensures Birth Sky foundation bootstrap runs at most once per JS realm
 * (survives React StrictMode double-mount and soft HMR re-entry).
 */

const GLOBAL_KEY = "__amynest_birth_sky_foundation_bootstrapped__" as const;

type BootstrapGlobal = typeof globalThis & {
  [GLOBAL_KEY]?: boolean;
};

export function hasBirthSkyFoundationBootstrappedOnce(): boolean {
  return Boolean((globalThis as BootstrapGlobal)[GLOBAL_KEY]);
}

export function markBirthSkyFoundationBootstrappedOnce(): void {
  (globalThis as BootstrapGlobal)[GLOBAL_KEY] = true;
}

/** Test helper only. */
export function __resetBirthSkyBootstrapGuardForTests(): void {
  delete (globalThis as BootstrapGlobal)[GLOBAL_KEY];
}
