/** Canonical client route for Firebase email action links. */
export const FIREBASE_ACTION_PATH = "/auth/action";

/**
 * After Render/static hosts rewrite `/auth/action` → `/index.html`, recover the
 * intended SPA path so wouter and handlers see `/auth/action?mode=…&oobCode=…`.
 */
export function normalizeFirebaseActionUrl(
  location: Pick<Location, "pathname" | "search" | "hash"> = window.location,
): string | null {
  const pathname = location.pathname || "/";
  const search = location.search || "";
  const hash = location.hash || "";

  const params = new URLSearchParams(search);
  const mode = params.get("mode");
  const oobCode = params.get("oobCode") ?? params.get("oob_code");
  const hasFirebaseAction = Boolean(mode && oobCode);

  if (pathname === "/index.html" || pathname.endsWith("/index.html")) {
    if (hasFirebaseAction) {
      return `${FIREBASE_ACTION_PATH}${search}${hash}`;
    }
    const base = pathname.slice(0, -"/index.html".length) || "/";
    return `${base}${search}${hash}`;
  }

  if (hasFirebaseAction && pathname === "/") {
    return `${FIREBASE_ACTION_PATH}${search}${hash}`;
  }

  return null;
}
