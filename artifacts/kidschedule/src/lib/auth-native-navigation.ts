/**
 * Client-side navigation for Capacitor shells. Avoids `location.assign` full
 * reloads on `capacitor://localhost`, which re-trigger slow auth restore in WKWebView.
 */
export function spaNavigateAfterSignIn(path: string): void {
  if (typeof window === "undefined") return;

  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  let fullPath = `${base}${normalized}`.replace(/\/{2,}/g, "/") || "/";
  if (!fullPath.startsWith("/")) fullPath = `/${fullPath}`;

  const current = window.location.pathname + window.location.search;
  if (current !== fullPath) {
    window.history.pushState(null, "", fullPath);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}
