import type { RequestHandler } from "express";
import { getAuth } from "../../lib/auth";
import { isBirthSkyApiAllowed } from "./allowlist";

/** 401 if unauthenticated; 403 if authenticated but outside Birth Sky canary allowlist. */
export const requireBirthSkyAllowlist: RequestHandler = (req, res, next) => {
  const { userId, email } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  if (!isBirthSkyApiAllowed(email)) {
    res.status(403).json({ error: "birth_sky_not_enabled" });
    return;
  }
  next();
};
