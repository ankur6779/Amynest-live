/**
 * Birth Sky internal allowlist canary gate (server).
 * Public enablement: BIRTH_SKY_PUBLIC_ENABLED=1
 * Extra emails: BIRTH_SKY_ALLOWLIST=comma,separated
 */

export const BIRTH_SKY_INTERNAL_ALLOWLIST = ["demo@amynest.in"] as const;

function parseExtraAllowlist(): string[] {
  return (process.env.BIRTH_SKY_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isBirthSkyPublicEnabled(): boolean {
  const v = process.env.BIRTH_SKY_PUBLIC_ENABLED ?? "";
  return v === "1" || v.toLowerCase() === "true";
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
