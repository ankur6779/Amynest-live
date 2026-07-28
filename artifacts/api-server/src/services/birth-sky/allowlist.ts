/**
 * Birth Sky public GA gate (server).
 *
 * Public enablement defaults ON (matches client VITE_FF_BIRTH_SKY).
 * Kill switch: BIRTH_SKY_PUBLIC_ENABLED=0
 * Extra canary emails when killed: BIRTH_SKY_ALLOWLIST=comma,separated
 * Hardcoded canary: demo@amynest.in
 */

export const BIRTH_SKY_INTERNAL_ALLOWLIST = ["demo@amynest.in"] as const;

function parseExtraAllowlist(): string[] {
  return (process.env.BIRTH_SKY_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Public GA default ON. Explicitly disable with 0 / false / off for rollback.
 */
export function isBirthSkyPublicEnabled(): boolean {
  const raw = process.env.BIRTH_SKY_PUBLIC_ENABLED;
  if (raw === undefined || raw === "") return true;
  const v = raw.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off" || v === "no") return false;
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

export function isBirthSkyApiAllowed(email: string | null | undefined): boolean {
  if (isBirthSkyPublicEnabled()) return true;
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  if ((BIRTH_SKY_INTERNAL_ALLOWLIST as readonly string[]).includes(normalized)) {
    return true;
  }
  return parseExtraAllowlist().includes(normalized);
}
