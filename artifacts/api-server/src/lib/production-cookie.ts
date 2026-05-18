import type { CookieOptions } from "express";

/** Parent domain so session cookies survive apex → www redirect. */
export const PRODUCTION_COOKIE_DOMAIN = ".amynest.in";

export const productionCookieOptions: CookieOptions = {
  domain: PRODUCTION_COOKIE_DOMAIN,
  sameSite: "lax",
  secure: true,
  httpOnly: true,
  path: "/",
};
