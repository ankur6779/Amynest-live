import {
  CANONICAL_PRODUCTION_HOST,
  CANONICAL_PRODUCTION_ORIGIN,
  isAmyNestProductionHost,
} from "@/lib/canonical-domain";

const ALLOWED_HOSTS = new Set([
  CANONICAL_PRODUCTION_HOST,
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

/** Block render only for unexpected hosts — www and apex are both OK. */
export function enforceProductionDomain(): "ok" | "redirecting" {
  if (typeof window === "undefined") return "ok";

  const { hostname, pathname, search, hash } = window.location;

  if (isAmyNestProductionHost(hostname)) return "ok";

  if (hostname === "localhost" || hostname === "127.0.0.1") return "ok";

  if (hostname.endsWith(".onrender.com")) return "ok";

  console.error("[amynest:domain] Unexpected hostname — redirecting to production", hostname);
  window.location.replace(`${CANONICAL_PRODUCTION_ORIGIN}${pathname}${search}${hash}`);
  return "redirecting";
}
