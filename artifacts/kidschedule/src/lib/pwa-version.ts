/** Deploy id from index.html — bump on every production release. */
export function getDeployVersion(): string {
  if (typeof document === "undefined") return "";
  return (
    document.querySelector('meta[name="amynest-deploy"]')?.getAttribute("content") ??
    ""
  );
}

/** Cache-bust service worker URL so browsers fetch the latest sw.js after deploy. */
export function serviceWorkerScriptUrl(basePath: string): string {
  const base = basePath.replace(/\/$/, "");
  const version = getDeployVersion();
  if (!version) return `${base}/sw.js`;
  return `${base}/sw.js?v=${encodeURIComponent(version)}`;
}
