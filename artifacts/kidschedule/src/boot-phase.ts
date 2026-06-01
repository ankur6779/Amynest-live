/** Earliest boot breadcrumb — runs as soon as this leaf module evaluates. */
if (typeof window !== "undefined") {
  try {
    window.__amynestMark?.("bundle-loaded");
  } catch {
    /* breadcrumbs are best-effort */
  }
}
