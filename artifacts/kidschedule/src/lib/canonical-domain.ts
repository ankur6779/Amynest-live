/** SEO / Firebase canonical apex — both apex and www are valid live hosts. */
export const CANONICAL_PRODUCTION_HOST = "amynest.in";

export const CANONICAL_PRODUCTION_ORIGIN = `https://${CANONICAL_PRODUCTION_HOST}`;

const WWW_HOST = `www.${CANONICAL_PRODUCTION_HOST}`;

/** Hosts that may run the production SPA (Cloudflare often serves www). */
export function isAmyNestProductionHost(hostname: string): boolean {
  return hostname === CANONICAL_PRODUCTION_HOST || hostname === WWW_HOST;
}

/**
 * Previously forced www → apex before React boot. That fights Cloudflare
 * (apex 301 → www at the edge) and left users on a blank page with no bundle.
 * Phone OTP works on www when www.amynest.in is in Firebase Authorized domains.
 */
export function redirectWwwToCanonicalApex(): boolean {
  return false;
}

export function getProductionWebOrigin(hostname = typeof window !== "undefined" ? window.location.hostname : ""): string {
  if (hostname === WWW_HOST) return `https://${WWW_HOST}`;
  if (hostname === CANONICAL_PRODUCTION_HOST) return CANONICAL_PRODUCTION_ORIGIN;
  return CANONICAL_PRODUCTION_ORIGIN;
}
