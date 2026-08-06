/** Path → observation screen labels. Presentation map only. */

export function classifyV2Screen(pathname: string): string {
  const path = (pathname.split("?")[0] || "/").replace(/\/+$/, "") || "/";

  if (path === "/front-door") return "Front Door";
  if (path === "/today") return "Today";
  if (path === "/today/mission") return "Mission";
  if (path.startsWith("/today/mission/")) return "Mission";
  if (path === "/today/coach-plan") return "Coach";
  if (path === "/amy-coach" || path.startsWith("/amy-coach/")) return "Coach";
  if (path === "/ask-amy" || path.startsWith("/ask-amy/")) return "Ask Amy";
  if (path === "/for-child" || path.startsWith("/for-child/")) return "For Child";
  if (path === "/premium" || path.startsWith("/premium/")) return "Premium";
  if (path === "/sign-up" || path.startsWith("/sign-up")) return "Signup";
  if (path === "/sign-in" || path.startsWith("/sign-in")) return "Sign In";
  if (path === "/" || path === "/landing") return "Landing";

  return path;
}

export function isTodayPath(pathname: string): boolean {
  const path = (pathname.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  return path === "/today";
}

export function isMissionPath(pathname: string): boolean {
  const label = classifyV2Screen(pathname);
  return label === "Mission";
}

export function isCoachPath(pathname: string): boolean {
  return classifyV2Screen(pathname) === "Coach";
}

export function isAskAmyPath(pathname: string): boolean {
  return classifyV2Screen(pathname) === "Ask Amy";
}

/** First-click targets that count as a meaningful parent action. */
export function isMeaningfulActionTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const el = target.closest(
    "button, a[href], [role='button'], [data-testid], input, textarea, select, label",
  );
  return Boolean(el);
}

export function describeActionTarget(target: EventTarget | null): string {
  if (!(target instanceof Element)) return "unknown";
  const el = target.closest(
    "button, a[href], [role='button'], [data-testid], input, textarea, select, label",
  );
  if (!(el instanceof Element)) return "unknown";
  const testId = el.getAttribute("data-testid");
  if (testId) return `testid:${testId}`;
  if (el instanceof HTMLAnchorElement && el.getAttribute("href")) {
    return `link:${el.getAttribute("href")}`;
  }
  const label =
    el.getAttribute("aria-label") ||
    (el.textContent || "").trim().slice(0, 48);
  if (label) return `label:${label}`;
  return el.tagName.toLowerCase();
}
