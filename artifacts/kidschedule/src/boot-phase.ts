/** Earliest boot breadcrumb — runs as soon as this leaf module evaluates. */
if (typeof window !== "undefined") {
  try {
    window.__amynestMark?.("bundle-loaded");
    window.__amynestFunnelTrack?.("react_bundle_started");
  } catch {
    /* breadcrumbs are best-effort */
  }
}
