/** Production apex host — SEO / email links; www is also a live host. */
export const CANONICAL_PRODUCTION_HOST = "amynest.in";

/** Must exist in Firebase Console → Authentication → Settings → Authorized domains. */
export const FIREBASE_PHONE_AUTH_DOMAINS = [
  CANONICAL_PRODUCTION_HOST,
  `www.${CANONICAL_PRODUCTION_HOST}`,
  "localhost",
  "127.0.0.1",
  "amynest-live-1.onrender.com",
  "amynest-frontend-dev.onrender.com",
] as const;

export const CANONICAL_PRODUCTION_ORIGIN = `https://${CANONICAL_PRODUCTION_HOST}`;

const WWW_HOST = `www.${CANONICAL_PRODUCTION_HOST}`;

export function isAmyNestProductionHost(hostname: string): boolean {
  return hostname === CANONICAL_PRODUCTION_HOST || hostname === WWW_HOST;
}

export function shouldRedirectWwwToApex(_hostname = getHostname()): boolean {
  return false;
}

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
  if (isAmyNestProductionHost(hostname)) return origin;
  return origin;
}

export function logPhoneOtpDomainContext(phase: string): void {
  if (typeof window === "undefined") return;
  const host = window.location.hostname;
  console.info(`[phone-otp] ${phase}`, {
    hostname: host,
    origin: window.location.origin,
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
    `Required: amynest.in, www.amynest.in`
  );
}
