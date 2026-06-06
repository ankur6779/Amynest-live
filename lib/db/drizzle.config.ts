import { defineConfig } from "drizzle-kit";
import path from "path";

/** Render external URLs need FQDN + sslmode=require (see scripts/src/migrate-database.ts). */
export function normalizeDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    if (/^dpg-[a-z0-9]+$/i.test(u.hostname) && !u.hostname.includes(".")) {
      u.hostname = `${u.hostname}.singapore-postgres.render.com`;
    }
    if (u.hostname.includes("render.com") && !u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    return u.toString();
  } catch {
    return url;
  }
}

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const databaseUrl = normalizeDatabaseUrl(rawUrl);
const needsSsl = /render\.com|neon\.tech|supabase\.co|sslmode=require/i.test(
  databaseUrl,
);

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    ssl: needsSsl ? "require" : undefined,
  },
});
