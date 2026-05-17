import { Router, type IRouter, type Request } from "express";
import { adminAuth } from "../lib/firebase-admin";
import { logger } from "../lib/logger";
import { sendEmailOtp, verifyEmailOtp } from "../lib/email-otp";

/**
 * Public auth helper routes — no authentication required.
 *
 * POST /api/auth/check-reset-email
 *   Body: { email: string }
 *   Returns: { exists: boolean }
 *
 * POST /api/auth/send-otp
 *   Body: { email: string }
 *   Header: Authorization: Bearer <Firebase ID token>
 *
 * POST /api/auth/verify-otp
 *   Body: { email: string, otp: string }
 *   Header: Authorization: Bearer <Firebase ID token>
 */
const router: IRouter = Router();

function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice(7).trim() || undefined;
}

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

router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: unknown };
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "invalid_email", message: "Valid email required" });
    return;
  }

  const result = await sendEmailOtp(email, bearerToken(req));
  if (result.ok) {
    res.json({ ok: true, cooldownSeconds: result.cooldownSeconds });
    return;
  }

  const status =
    result.code === "invalid_email"
      ? 400
      : result.code === "unauthorized"
        ? 401
        : result.code === "user_not_found"
          ? 404
          : result.code === "cooldown" || result.code === "rate_limited"
            ? 429
            : 503;

  res.status(status).json({
    error: result.code,
    message: result.message,
    cooldownSeconds: result.cooldownSeconds,
  });
});

router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const { email, otp } = req.body as { email?: unknown; otp?: unknown };
  if (!email || typeof email !== "string" || !otp || typeof otp !== "string") {
    res.status(400).json({ error: "invalid_input", message: "Email and OTP required" });
    return;
  }

  const result = await verifyEmailOtp(email, otp, bearerToken(req));
  if (result.ok) {
    res.json({
      ok: true,
      user: result.user,
      session: { provider: "firebase" },
    });
    return;
  }

  const status =
    result.code === "invalid_input"
      ? 400
      : result.code === "unauthorized"
        ? 401
        : result.code === "not_found" || result.code === "expired"
          ? 404
          : result.code === "invalid_otp"
            ? 400
            : result.code === "too_many_attempts"
              ? 429
              : 503;

  res.status(status).json({
    error: result.code,
    message: result.message,
    attemptsRemaining: result.attemptsRemaining,
  });
});

export default router;
