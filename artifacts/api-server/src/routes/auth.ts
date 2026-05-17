import { Router, type IRouter } from "express";
import { adminAuth } from "../lib/firebase-admin";
import { logger } from "../lib/logger";

/**
 * Public auth helper routes — no authentication required.
 *
 * POST /api/auth/check-reset-email
 *   Body: { email: string }
 *   Returns: { exists: boolean }
 */
const router: IRouter = Router();

router.post("/auth/check-reset-email", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: unknown };

  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }

  try {
    await adminAuth().getUserByEmail(email.trim().toLowerCase());
    res.json({ exists: true });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/user-not-found") {
      res.json({ exists: false });
      return;
    }
    logger.warn({ err, email }, "check-reset-email: unexpected Firebase Admin error");
    res.status(500).json({ error: "Could not verify email" });
  }
});

export default router;
