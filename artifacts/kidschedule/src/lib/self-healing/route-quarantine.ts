/**
 * Level 5 — Disable failing routes for the current session (no code changes).
 */

const STORAGE_KEY = "amynest:quarantined-routes";

type QuarantineEntry = {
  route: string;
  component: string;
  fingerprint: string;
  quarantinedAt: number;
};

function readEntries(): QuarantineEntry[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QuarantineEntry[]) : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: QuarantineEntry[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-20)));
  } catch {
    /* ignore */
  }
}

export function quarantineRoute(component: string, fingerprint: string): void {
  const route = typeof window !== "undefined" ? window.location.pathname : component;
  const entries = readEntries();
  if (entries.some((e) => e.component === component && e.route === route)) return;
  entries.push({
    route,
    component,
    fingerprint,
    quarantinedAt: Date.now(),
  });
  writeEntries(entries);
}

export function isRouteQuarantined(component: string): boolean {
  const route = typeof window !== "undefined" ? window.location.pathname : "";
  return readEntries().some((e) => e.component === component && e.route === route);
}

export function isPathQuarantined(pathname: string): boolean {
  return readEntries().some((e) => e.route === pathname);
}

export function getQuarantinedRoutes(): QuarantineEntry[] {
  return readEntries();
}

export function clearRouteQuarantine(component?: string): void {
  if (!component) {
    writeEntries([]);
    return;
  }
  writeEntries(readEntries().filter((e) => e.component !== component));
}
