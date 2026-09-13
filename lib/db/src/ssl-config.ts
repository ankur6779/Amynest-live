import { readFileSync } from "node:fs";
import type { ConnectionOptions } from "tls";

function isProductionDbProfile(): boolean {
  const env = (process.env.AMYNEST_ENV ?? process.env.NODE_ENV ?? "").toLowerCase();
  return env === "production";
}

/**
 * Resolve PostgreSQL TLS options.
 * Production: certificate verification enabled (rejectUnauthorized: true).
 * Development: may opt into insecure TLS via DATABASE_SSL_REJECT_UNAUTHORIZED=0.
 */
export function resolvePgSslOptions(databaseUrl: string): ConnectionOptions | undefined {
  const needsSsl = /render\.com|neon\.tech|supabase\.co|sslmode=require/i.test(databaseUrl);
  if (!needsSsl) return undefined;

  const caPath = process.env.DATABASE_SSL_CA?.trim();
  if (caPath) {
    return {
      rejectUnauthorized: true,
      ca: readFileSync(caPath, "utf8"),
    };
  }

  if (!isProductionDbProfile() && process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "0") {
    return { rejectUnauthorized: false };
  }

  return { rejectUnauthorized: true };
}
