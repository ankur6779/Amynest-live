import {
  CANONICAL_PRODUCTION_ORIGIN,
  isAmyNestProductionHost,
  redirectApexToCanonicalWww,
} from "@/lib/canonical-domain";

const ALLOWED_HOSTS = new Set([
  "www.amynest.in",
  "amynest.in",
  "localhost",
  "127.0.0.1",
  "amynest-live-1.onrender.com",
  "amynest-frontend-dev.onrender.com",
]);

export function isAllowedAppHostname(hostname: string): boolean {
  if (ALLOWED_HOSTS.has(hostname)) return true;
  if (isAmyNestProductionHost(hostname)) return true;
  return false;
}

/** Redirect apex → www; block unexpected hosts. */
export function enforceProductionDomain(): "ok" | "redirecting" {
  if (typeof window === "undefined") return "ok";

  if (redirectApexToCanonicalWww()) return "redirecting";

  const { hostname, pathname, search, hash } = window.location;

  if (isAmyNestProductionHost(hostname)) return "ok";

  if (hostname === "localhost" || hostname === "127.0.0.1") return "ok";

  if (hostname.endsWith(".onrender.com")) return "ok";

  console.error("[amynest:domain] Unexpected hostname — redirecting to production", hostname);
  window.location.replace(`${CANONICAL_PRODUCTION_ORIGIN}${pathname}${search}${hash}`);
  return "redirecting";
}
