import { CANONICAL_PRODUCTION_HOST, APEX_PRODUCTION_HOST } from "./canonical-host.js";

const LOCAL_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const NATIVE_SHELL_ORIGINS = [
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
];

const PRODUCTION_WEB_ORIGINS = [
  `https://${CANONICAL_PRODUCTION_HOST}`,
  `https://${APEX_PRODUCTION_HOST}`,
];

function parseExtraOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

const ALLOWED_ORIGINS = new Set([
  ...PRODUCTION_WEB_ORIGINS,
  ...LOCAL_DEV_ORIGINS,
  ...NATIVE_SHELL_ORIGINS,
  ...parseExtraOrigins(),
]);

/** Returns true when the request Origin is allowed (or absent — same-site / WebView). */
export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.protocol === "https:" && url.hostname.endsWith(".amynest.in")) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function resolveCorsOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void {
  if (isAllowedCorsOrigin(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error(`CORS origin not allowed: ${origin ?? "(empty)"}`));
}
