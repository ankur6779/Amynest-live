/** Render external URLs need FQDN + sslmode=require (CI, laptop, Hetzner). */
export function normalizeDatabaseUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    if (/^dpg-[a-z0-9]+$/i.test(u.hostname) && !u.hostname.includes(".")) {
      u.hostname = `${u.hostname}.singapore-postgres.render.com`;
    }
    if (u.hostname.includes("render.com") && !u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    return u.toString();
  } catch {
    return url.trim();
  }
}

export function databaseUrlNeedsSsl(url: string): boolean {
  return /render\.com|neon\.tech|supabase\.co|sslmode=require/i.test(url);
}
