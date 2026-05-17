import { BRAND } from "./brand";

function resolveAmynestEnv(): "development" | "production" {
  const raw = process.env.EXPO_PUBLIC_AMYNEST_ENV?.trim().toLowerCase();
  if (raw === "dev" || raw === "development") return "development";
  if (raw === "prod" || raw === "production") return "production";
  return typeof __DEV__ !== "undefined" && __DEV__ ? "development" : "production";
}

const DEFAULT_ORIGINS = {
  production: "https://amynest-backend.onrender.com",
  development: "https://amynest-dev.onrender.com",
  local: "http://localhost:5000",
} as const;

function resolveApiOrigin(): string {
  const explicit =
    process.env.EXPO_PUBLIC_API_ORIGIN?.trim() ||
    process.env.EXPO_PUBLIC_DOMAIN?.trim() ||
    "";

  if (explicit) {
    return explicit.startsWith("http") ? explicit : `https://${explicit}`;
  }

  const env = resolveAmynestEnv();
  const useLocal = process.env.EXPO_PUBLIC_USE_LOCAL_API?.trim() === "1";
  const host = useLocal
    ? DEFAULT_ORIGINS.local
    : env === "production"
      ? DEFAULT_ORIGINS.production
      : DEFAULT_ORIGINS.development;

  return host;
}

export const AMYNEST_ENV = resolveAmynestEnv();
export const AMYNEST_PROFILE = AMYNEST_ENV === "development" ? "DEV" : "PROD";

const raw = resolveApiOrigin();

if (!raw && typeof __DEV__ !== "undefined" && __DEV__) {
  console.error(
    `[${BRAND.appName}] API origin is not set. ` +
      "Set EXPO_PUBLIC_API_ORIGIN or EXPO_PUBLIC_DOMAIN in .env.development.",
  );
} else if (!raw) {
  throw new Error(
    `[${BRAND.appName}] API origin is not set. ` +
      "Set EXPO_PUBLIC_API_ORIGIN in your EAS build environment.",
  );
}

export const API_BASE_URL = raw;

if (typeof __DEV__ !== "undefined" && __DEV__) {
  console.info(
    `[${BRAND.appName}] ${AMYNEST_PROFILE} — API ${API_BASE_URL} (EXPO_PUBLIC_API_ORIGIN / EXPO_PUBLIC_DOMAIN)`,
  );
}
