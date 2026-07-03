import { Router, type IRouter } from "express";
import { z } from "zod";
import { adminAuth } from "../lib/firebase-admin";
import { checkDistributedRateLimit } from "../lib/distributed-rate-limit.js";
import { logger } from "../lib/logger";
import { recordApiDomainOutcome } from "../lib/api-domain-metrics";

/**
 * Public auth helper routes — no authentication required.
 *
 * POST /api/auth/check-reset-email
 *   Body: { email: string }
 *   Returns: { exists: boolean }
 */
const router: IRouter = Router();

const CheckResetEmailBody = z.object({
  email: z.string().trim().email().max(320),
});

router.post("/auth/check-reset-email", async (req, res): Promise<void> => {
  const started = Date.now();
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const rate = await checkDistributedRateLimit(`auth-check-reset:${ip}`, {
    windowMs: 60_000,
    maxPerWindow: 10,
  });
  if (!rate.allowed) {
    recordApiDomainOutcome("auth", false, Date.now() - started, "rate_limited");
    res.status(429).json({ error: "rate_limited", retryAfterMs: rate.retryAfterMs });
    return;
  }

  const parsed = CheckResetEmailBody.safeParse(req.body);
  if (!parsed.success) {
    recordApiDomainOutcome("auth", false, Date.now() - started, "invalid_body");
    res.status(400).json({ error: "Valid email required", issues: parsed.error.flatten() });
    return;
  }

  const email = parsed.data.email.toLowerCase();

  try {
    await adminAuth().getUserByEmail(email);
    recordApiDomainOutcome("auth", true, Date.now() - started);
    res.json({ exists: true });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/user-not-found") {
      recordApiDomainOutcome("auth", true, Date.now() - started);
      res.json({ exists: false });
      return;
    }
    logger.warn({ err, email }, "check-reset-email: unexpected Firebase Admin error");
    recordApiDomainOutcome("auth", false, Date.now() - started, "firebase_error");
    res.status(500).json({ error: "Could not verify email" });
  }
});

export default router;
