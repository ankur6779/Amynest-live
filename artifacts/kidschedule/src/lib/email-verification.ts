import type { ActionCodeSettings } from "firebase/auth";

const PRODUCTION_CALLBACK = "https://amynest.in/auth/callback";

/** Where Firebase email-verification links should land (must be an authorized domain). */
export function getEmailVerificationCallbackUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/auth/callback`;
  }
  return PRODUCTION_CALLBACK;
}

export function getEmailVerificationActionCodeSettings(): ActionCodeSettings {
  return {
    url: getEmailVerificationCallbackUrl(),
    handleCodeInApp: true,
  };
}
