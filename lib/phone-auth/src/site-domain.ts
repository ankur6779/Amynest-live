/** Production apex (legacy links) — browsers are redirected to www before auth. */
export const APEX_PRODUCTION_HOST = "amynest.in";

/** Single canonical production host for SPA, auth, and cookies. */
export const CANONICAL_PRODUCTION_HOST = "www.amynest.in";

/** Shared parent domain for cookies set on www or apex during redirect. */
export const PRODUCTION_COOKIE_DOMAIN = ".amynest.in";

/** Must exist in Firebase Console → Authentication → Settings → Authorized domains. */
export const FIREBASE_PHONE_AUTH_DOMAINS = [
  APEX_PRODUCTION_HOST,
  CANONICAL_PRODUCTION_HOST,
  "localhost",
  "127.0.0.1",
  "amynest-live-1.onrender.com",
  "amynest-frontend-dev.onrender.com",
] as const;

export const CANONICAL_PRODUCTION_ORIGIN = `https://${CANONICAL_PRODUCTION_HOST}`;

export function isAmyNestProductionHost(hostname: string): boolean {
  return hostname === APEX_PRODUCTION_HOST || hostname === CANONICAL_PRODUCTION_HOST;
}

/**
 * Redirect bare apex → www before Firebase / Clerk / cookies initialize.
 * Returns true when navigation was started (caller should abort boot).
 */
export function redirectApexToCanonicalWww(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.hostname !== APEX_PRODUCTION_HOST) return false;
  window.location.replace(
    `${CANONICAL_PRODUCTION_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
  return true;
}

/** @deprecated Apex is no longer canonical — kept for mobile/web call sites. */
export function shouldRedirectWwwToApex(): boolean {
  return false;
}

/** @deprecated Use redirectApexToCanonicalWww — www is canonical. */
export function redirectWwwToCanonicalApex(): boolean {
  return false;
}

function getHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname;
}

export function getCanonicalWebOrigin(): string {
  if (typeof window === "undefined") return CANONICAL_PRODUCTION_ORIGIN;
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return origin;
  if (isAmyNestProductionHost(hostname)) return CANONICAL_PRODUCTION_ORIGIN;
  return origin;
}

export function logPhoneOtpDomainContext(phase: string): void {
  if (typeof window === "undefined") return;
  const host = window.location.hostname;
  console.info(`[phone-otp] ${phase}`, {
    hostname: host,
    origin: window.location.origin,
    canonical: CANONICAL_PRODUCTION_ORIGIN,
    firebaseAuthorizedDomains: FIREBASE_PHONE_AUTH_DOMAINS,
  });
  if (
    host &&
    !FIREBASE_PHONE_AUTH_DOMAINS.includes(host as (typeof FIREBASE_PHONE_AUTH_DOMAINS)[number])
  ) {
    console.warn(
      `[phone-otp] Add "${host}" in Firebase → Authentication → Settings → Authorized domains`,
    );
  }
}

export function warnIfPhoneAuthDomainMissingFromFirebase(): void {
  logPhoneOtpDomainContext("auth mount");
}

export function firebasePhoneAuthDomainHint(hostname = getHostname()): string {
  return (
    `Add "${hostname}" under Firebase Console → Authentication → Settings → Authorized domains. ` +
    `Required: ${APEX_PRODUCTION_HOST}, ${CANONICAL_PRODUCTION_HOST}`
  );
}
