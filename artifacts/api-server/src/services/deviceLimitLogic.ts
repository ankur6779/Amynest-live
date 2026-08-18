export const UNLIMITED_DEVICES_EMAILS = new Set(["demo@amynest.in"]);

/** Pure helper — new devices blocked at limit; existing grandfathered elsewhere. */
export function canAddNewDevice(activeCount: number, limit: number): boolean {
  return activeCount < limit;
}

export function isDeviceLimitExempt(email?: string | null): boolean {
  if (!email) return false;
  return UNLIMITED_DEVICES_EMAILS.has(email.toLowerCase().trim());
}

/**
 * How to treat this installation for the current account.
 *
 * A physical device is reusable. Historical rows must not permanently bind
 * hardware to one email. Free-plan `devicesMax: 1` means one *active* session,
 * so a new installation (reinstall / account switch onto a new device id)
 * replaces the previous active slot instead of blocking forever.
 *
 * Premium multi-device limits still require an explicit replace when all
 * slots are occupied by other installations.
 */
export type DeviceRegistrationAction =
  | "refresh"
  | "register"
  | "reactivate"
  | "replace_oldest"
  | "block";

export function decideDeviceRegistration(opts: {
  thisUserHasActiveRow: boolean;
  thisUserHasInactiveRow: boolean;
  activeCountForUser: number;
  limit: number;
}): DeviceRegistrationAction {
  if (opts.thisUserHasActiveRow) return "refresh";
  if (canAddNewDevice(opts.activeCountForUser, opts.limit)) {
    return opts.thisUserHasInactiveRow ? "reactivate" : "register";
  }
  // Single-session plans: the previous installation is no longer this device.
  if (opts.limit <= 1) return "replace_oldest";
  return "block";
}
