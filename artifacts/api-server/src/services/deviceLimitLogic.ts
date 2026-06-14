export const UNLIMITED_DEVICES_EMAILS = new Set(["demo@amynest.in"]);

/** Pure helper — new devices blocked at limit; existing grandfathered elsewhere. */
export function canAddNewDevice(activeCount: number, limit: number): boolean {
  return activeCount < limit;
}

export function isDeviceLimitExempt(email?: string | null): boolean {
  if (!email) return false;
  return UNLIMITED_DEVICES_EMAILS.has(email.toLowerCase().trim());
}
