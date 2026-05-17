/** Production apex host — all web traffic should land here (not www). */
export const CANONICAL_PRODUCTION_HOST = "amynest.in";

export const CANONICAL_PRODUCTION_ORIGIN = `https://${CANONICAL_PRODUCTION_HOST}`;

const WWW_HOST = `www.${CANONICAL_PRODUCTION_HOST}`;

/** Force www → apex before Firebase / React boot (no firebase imports). */
export function redirectWwwToCanonicalApex(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.hostname !== WWW_HOST) return false;

  const target = `${CANONICAL_PRODUCTION_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
  console.info("[canonical-domain] Redirecting www → apex", {
    from: window.location.href,
    to: target,
  });
  window.location.replace(target);
  return true;
}
