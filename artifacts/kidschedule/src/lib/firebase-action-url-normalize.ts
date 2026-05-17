import {
  buildCanonicalAuthActionHref,
  FIREBASE_ACTION_PATH,
} from "@/lib/firebase-action-params";

export { FIREBASE_ACTION_PATH };

/**
 * After Render/static hosts rewrite `/auth/action` → `/index.html`, recover the
 * intended SPA path so wouter and handlers see `/auth/action?mode=…&oobCode=…`.
 * Strips continueUrl and other params that can cause redirect loops.
 */
export function normalizeFirebaseActionUrl(
  location: Pick<Location, "pathname" | "search" | "hash"> &
    Partial<Pick<Location, "href">> = window.location,
): string | null {
  const pathname = location.pathname || "/";
  const hash = location.hash || "";
  const canonical = buildCanonicalAuthActionHref(location);

  if (pathname === "/index.html" || pathname.endsWith("/index.html")) {
    if (canonical) return canonical + hash;
    const base = pathname.slice(0, -"/index.html".length) || "/";
    return `${base}${location.search || ""}${hash}`;
  }

  if (canonical && pathname === "/") {
    return canonical + hash;
  }

  if (canonical && pathname === FIREBASE_ACTION_PATH) {
    const current = `${pathname}${location.search || ""}`;
    if (current !== canonical) return canonical + hash;
  }

  return null;
}
