import type { Request, Response, NextFunction } from "express";
import { getAuth } from "./auth.js";

/** Firebase UIDs with admin API access (comma-separated ADMIN_USER_IDS). */
export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const list = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

/**
 * Express middleware — requires an authenticated admin user.
 * Mount after requireAuth.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  next();
}
