/** Scroll behavior for chat threads — instant when user prefers reduced motion. */
export function resolveChatScrollBehavior(preferred: ScrollBehavior = "smooth"): ScrollBehavior {
  if (typeof window === "undefined") return preferred;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return "instant";
    }
  } catch {
    /* ignore */
  }
  return preferred;
}
