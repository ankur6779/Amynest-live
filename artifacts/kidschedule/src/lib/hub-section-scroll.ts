/** Scroll expanded hub group into view when content would clip — minimal movement. */
export function scrollHubGroupIntoView(
  groupElementId: string,
  options?: { reducedMotion?: boolean; afterMs?: number },
): void {
  if (typeof window === "undefined") return;

  const reducedMotion =
    options?.reducedMotion ??
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const afterMs = options?.afterMs ?? 220;

  const run = () => {
    const panel = document.getElementById(`${groupElementId}-panel`);
    const group = document.getElementById(groupElementId);
    const target = panel ?? group;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const bottomMargin = 20;
    const topMargin = 64;

    if (rect.bottom > window.innerHeight - bottomMargin || rect.top < topMargin) {
      target.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "nearest",
      });
    }
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
  window.setTimeout(run, afterMs);
}
