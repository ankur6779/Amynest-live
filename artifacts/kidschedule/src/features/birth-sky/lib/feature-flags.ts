/**
 * Birth Sky kill switch / capability flags (Pack 1 §1.7, Roadmap IM-0).
 * Master: birth_sky_enabled ↔ VITE_FF_BIRTH_SKY
 *
 * Internal allowlist canary: when master is off, enable only for allowlisted emails
 * (plus optional VITE_FF_BIRTH_SKY_ALLOWLIST=comma,separated).
 */

function envFlag(key: string, defaultValue = false): boolean {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "1" || raw === "true";
}

function parseAllowlist(): Set<string> {
  const fromEnv = String(import.meta.env.VITE_FF_BIRTH_SKY_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...BIRTH_SKY_INTERNAL_ALLOWLIST, ...fromEnv]);
}

/** Founder/QA internal allowlist — canary cohort (not public GA). */
export const BIRTH_SKY_INTERNAL_ALLOWLIST = ["demo@amynest.in"] as const;

/** Master kill switch. Default off — enable globally with VITE_FF_BIRTH_SKY=1. */
export const FF_BIRTH_SKY = envFlag("VITE_FF_BIRTH_SKY", false);

/** Hub tile visibility (defaults to master). */
export const FF_BIRTH_SKY_HUB_TILE = envFlag(
  "VITE_FF_BIRTH_SKY_HUB_TILE",
  FF_BIRTH_SKY,
);

/** Deep links into /birth-sky/* (defaults to master). */
export const FF_BIRTH_SKY_DEEP_LINKS = envFlag(
  "VITE_FF_BIRTH_SKY_DEEP_LINKS",
  FF_BIRTH_SKY,
);

let viewerEmail: string | null = null;

/** Called from auth snapshot so hub/tile checks see the signed-in user. */
export function setBirthSkyViewerEmail(email: string | null | undefined): void {
  viewerEmail = email?.trim().toLowerCase() || null;
}

export function getBirthSkyViewerEmail(): string | null {
  return viewerEmail;
}

export function isBirthSkyAllowlistedEmail(
  email: string | null | undefined,
): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return parseAllowlist().has(normalized);
}

function resolveEnabled(email?: string | null): boolean {
  if (FF_BIRTH_SKY) return true;
  // Prefer explicit email (React auth) so hub re-renders are not tied to a
  // module singleton that can desync across chunks / early auth snapshots.
  return isBirthSkyAllowlistedEmail(email ?? viewerEmail);
}

export function isBirthSkyEnabled(email?: string | null): boolean {
  return resolveEnabled(email);
}

export function isBirthSkyHubTileEnabled(email?: string | null): boolean {
  if (!resolveEnabled(email)) return false;
  // Hub tile follows master when global flag on; allowlist users always get tile.
  if (FF_BIRTH_SKY) return FF_BIRTH_SKY_HUB_TILE;
  return true;
}

export function isBirthSkyDeepLinksEnabled(email?: string | null): boolean {
  if (!resolveEnabled(email)) return false;
  if (FF_BIRTH_SKY) return FF_BIRTH_SKY_DEEP_LINKS;
  return true;
}
