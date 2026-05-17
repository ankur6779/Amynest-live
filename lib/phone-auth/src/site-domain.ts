/** Production apex host — SEO / email links; www is also a live host. */
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

/** Kept for diagnostics — www is no longer redirected (Cloudflare serves www). */
export function shouldRedirectWwwToApex(hostname = getHostname()): boolean {
  return false;
}

function getHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname;
}

/**
 * Do not redirect www → apex in the browser; that prevented React from booting
 * when Cloudflare 301s apex → www. Both hosts are Firebase-authorized.
 */
export function redirectWwwToCanonicalApex(): boolean {
  return false;
}

/** Current production origin (www or apex) for reCAPTCHA / action URLs. */
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
    canonicalOrigin: getCanonicalWebOrigin(),
    href: window.location.href,
    wwwRedirectNeeded: shouldRedirectWwwToApex(host),
    firebaseAuthorizedDomains: FIREBASE_PHONE_AUTH_DOMAINS,
  });
}
