/**
 * Pre-signup re-engagement feature flags — Phase A rollout controls.
 * Parent OFF disables the entire campaign and triggers cleanup on next app open.
 */

function envFlag(key: string, defaultValue = false): boolean {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "true" || raw === "1";
}

/** Master kill switch — must be true for any pre-signup campaign activity. */
export function isPreSignupReengagementEnabled(): boolean {
  return envFlag("VITE_FF_PRE_SIGNUP_REENGAGEMENT", false);
}

/** F1: use AndroidPush.getPermissionStatus() on Android WebView (not Notification.permission). */
export function isPreSignupPermNativeEnabled(): boolean {
  return isPreSignupReengagementEnabled() && envFlag("VITE_FF_PRE_SIGNUP_PERM_NATIVE", true);
}

/** F4: emit diagnostic analytics events (permission_checked, campaign_blocked, etc.). */
export function isPreSignupDiagnosticsEnabled(): boolean {
  return isPreSignupReengagementEnabled() && envFlag("VITE_FF_PRE_SIGNUP_DIAGNOSTICS", true);
}

export function readPreSignupFeatureFlags(): {
  parent: boolean;
  permNative: boolean;
  diagnostics: boolean;
} {
  const parent = isPreSignupReengagementEnabled();
  return {
    parent,
    permNative: parent && envFlag("VITE_FF_PRE_SIGNUP_PERM_NATIVE", true),
    diagnostics: parent && envFlag("VITE_FF_PRE_SIGNUP_DIAGNOSTICS", true),
  };
}
