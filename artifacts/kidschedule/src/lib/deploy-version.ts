/**
 * Single source of truth for deploy / cache-bust versioning.
 * Meta: <meta name="amynest-deploy" content="…" /> (injected at build).
 */

export const DEPLOY_VERSION_SESSION_KEY = "amynest:deploy-version";
/** @deprecated Migrated away — do not write. Removed on boot. */
export const LEGACY_DEPLOY_VERSION_LS_KEY = "app_build_version";

export function getDeployVersion(): string {
  if (typeof document === "undefined") return "";
  return (
    document.querySelector('meta[name="amynest-deploy"]')?.getAttribute("content") ??
    ""
  );
}

/**
 * One-time cleanup: legacy localStorage version caused full storage wipes.
 * Orchestrator session key remains authoritative.
 */
export function migrateLegacyDeployVersionStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const legacy = localStorage.getItem(LEGACY_DEPLOY_VERSION_LS_KEY);
    if (!legacy) return;
    const current = getDeployVersion();
    const sessionVersion = sessionStorage.getItem(DEPLOY_VERSION_SESSION_KEY);
    if (!sessionVersion && current) {
      sessionStorage.setItem(DEPLOY_VERSION_SESSION_KEY, legacy);
    }
    localStorage.removeItem(LEGACY_DEPLOY_VERSION_LS_KEY);
  } catch {
    /* ignore */
  }
}

export function readStoredDeployVersion(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(DEPLOY_VERSION_SESSION_KEY);
  } catch {
    return null;
  }
}

export function writeStoredDeployVersion(version: string): void {
  if (typeof window === "undefined" || !version) return;
  try {
    sessionStorage.setItem(DEPLOY_VERSION_SESSION_KEY, version);
  } catch {
    /* ignore */
  }
}

export function checkDeployVersionMismatch(): {
  mismatch: boolean;
  previous: string | null;
  current: string | null;
} {
  const current = getDeployVersion();
  const previous = readStoredDeployVersion();
  const mismatch = Boolean(previous && current && previous !== current);
  return { mismatch, previous, current };
}
