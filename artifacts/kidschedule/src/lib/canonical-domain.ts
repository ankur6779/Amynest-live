export const APEX_PRODUCTION_HOST = "amynest.in";
export const CANONICAL_PRODUCTION_HOST = "www.amynest.in";
export const CANONICAL_PRODUCTION_ORIGIN = `https://${CANONICAL_PRODUCTION_HOST}`;
export const PRODUCTION_COOKIE_DOMAIN = ".amynest.in";
export const FIREBASE_PHONE_AUTH_DOMAINS = [
  APEX_PRODUCTION_HOST,
  CANONICAL_PRODUCTION_HOST,
  "localhost",
  "127.0.0.1",
  "amynest-live-1.onrender.com",
  "amynest-frontend-dev.onrender.com",
] as const;

export function isAmyNestProductionHost(hostname: string): boolean {
  return hostname === APEX_PRODUCTION_HOST || hostname === CANONICAL_PRODUCTION_HOST;
}

export function redirectApexToCanonicalWww(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.hostname !== APEX_PRODUCTION_HOST) return false;
  window.location.replace(
    `${CANONICAL_PRODUCTION_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
  return true;
}

export function redirectWwwToCanonicalApex(): boolean {
  return false;
}

export function getProductionWebOrigin(): string {
  if (typeof window === "undefined") return CANONICAL_PRODUCTION_ORIGIN;
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return origin;
  if (isAmyNestProductionHost(hostname)) return CANONICAL_PRODUCTION_ORIGIN;
  return origin;
}
