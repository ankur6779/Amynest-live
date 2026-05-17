/** Production apex host — all web traffic should land here (not www). */
export const CANONICAL_PRODUCTION_HOST = "amynest.in";

/** Domains that must appear in Firebase → Authentication → Authorized domains. */
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

/** True when the browser is on www and should 301/replace to apex before Firebase Phone OTP. */
export function shouldRedirectWwwToApex(hostname = getHostname()): boolean {
  return hostname === WWW_HOST;
}

function getHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname;
}

/**
 * Force www.amynest.in → amynest.in so reCAPTCHA hostname matches Firebase authorized domains.
 * Call as early as possible (index.html inline script + app bootstrap).
 */
export function redirectWwwToCanonicalApex(): boolean {
  if (typeof window === "undefined") return false;
  if (!shouldRedirectWwwToApex()) return false;

  const { pathname, search, hash } = window.location;
  const target = `${CANONICAL_PRODUCTION_ORIGIN}${pathname}${search}${hash}`;
  console.info("[site-domain] Redirecting www → apex (Firebase Phone OTP / reCAPTCHA)", {
    from: window.location.href,
    to: target,
    firebaseAuthorizedDomains: FIREBASE_PHONE_AUTH_DOMAINS,
  });
  window.location.replace(target);
  return true;
}

/** Resolve a stable origin for config — never returns www on production. */
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
    canonicalOrigin: getCanonicalWebOrigin(),
    href: window.location.href,
    wwwRedirectNeeded: shouldRedirectWwwToApex(host),
    firebaseAuthorizedDomains: FIREBASE_PHONE_AUTH_DOMAINS,
  });
}
