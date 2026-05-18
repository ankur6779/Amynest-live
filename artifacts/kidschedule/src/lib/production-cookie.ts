import { PRODUCTION_COOKIE_DOMAIN, isAmyNestProductionHost } from "@/lib/canonical-domain";

/** Build a document.cookie assignment that works on www and during apex→www redirect. */
export function buildProductionCookieString(
  name: string,
  value: string,
  maxAgeSeconds: number,
): string {
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`,
    "path=/",
    `max-age=${maxAgeSeconds}`,
    "SameSite=Lax",
  ];
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (isAmyNestProductionHost(hostname)) {
      parts.push(`domain=${PRODUCTION_COOKIE_DOMAIN}`);
    }
    if (protocol === "https:" || isAmyNestProductionHost(hostname)) {
      parts.push("Secure");
    }
  }
  return parts.join("; ");
}

export function setProductionCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") return;
  document.cookie = buildProductionCookieString(name, value, maxAgeSeconds);
}
