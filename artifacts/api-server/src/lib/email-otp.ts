import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, emailOtpTable } from "@workspace/db";
import { sendEmail, isEmailConfigured } from "./email";
import { adminAuth } from "./firebase-admin";
import { logger } from "./logger";
import {
  generateOtpCode,
  hashOtpWithPepper,
  isValidEmail,
  MAX_OTP_ATTEMPTS,
  normalizeEmail,
  OTP_EXPIRY_MS,
  RESEND_COOLDOWN_MS,
  verifyOtpWithPepper,
} from "./email-otp-core";

export {
  OTP_LENGTH,
  OTP_EXPIRY_MS,
  MAX_OTP_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  normalizeEmail,
  isValidEmail,
  generateOtpCode,
} from "./email-otp-core";

const PEPPER = process.env.EMAIL_OTP_PEPPER ?? process.env.FIREBASE_PROJECT_ID ?? "amynest-email-otp";

export type SendOtpResult =
  | { ok: true; cooldownSeconds: number }
  | {
      ok: false;
      code:
        | "invalid_email"
        | "unauthorized"
        | "cooldown"
        | "user_not_found"
        | "email_send_failed"
        | "rate_limited";
      cooldownSeconds?: number;
      message?: string;
    };

export type VerifyOtpResult =
  | {
      ok: true;
      user: { uid: string; email: string; emailVerified: true };
    }
  | {
      ok: false;
      code:
        | "invalid_input"
        | "unauthorized"
        | "not_found"
        | "expired"
        | "invalid_otp"
        | "too_many_attempts"
        | "admin_unavailable";
      attemptsRemaining?: number;
      message?: string;
    };

export async function resolveUidForEmail(
  idToken: string | undefined,
  email: string,
): Promise<{ uid: string } | { error: "unauthorized" | "user_not_found" }> {
  if (!idToken) return { error: "unauthorized" };

  let decoded: { uid: string; email?: string };
  try {
    decoded = await adminAuth().verifyIdToken(idToken);
  } catch {
    return { error: "unauthorized" };
  }

  const normalized = normalizeEmail(email);
  if (decoded.email?.toLowerCase() === normalized) {
    return { uid: decoded.uid };
  }

  try {
    const user = await adminAuth().getUserByEmail(normalized);
    if (user.uid === decoded.uid) return { uid: decoded.uid };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/user-not-found") return { error: "user_not_found" };
    logger.warn({ err, email: normalized }, "resolveUidForEmail: getUserByEmail failed");
    return { error: "unauthorized" };
  }

  return { error: "unauthorized" };
}

export async function sendEmailOtp(
  email: string,
  idToken: string | undefined,
): Promise<SendOtpResult> {
  if (!isValidEmail(email)) {
    return { ok: false, code: "invalid_email", message: "Valid email required" };
  }

  const resolved = await resolveUidForEmail(idToken, email);
  if ("error" in resolved) {
    if (resolved.error === "user_not_found") {
      return { ok: false, code: "user_not_found", message: "No account found for this email" };
    }
    return { ok: false, code: "unauthorized", message: "Sign in required to request a code" };
  }

  const normalized = normalizeEmail(email);
  const now = Date.now();

  const [existing] = await db
    .select()
    .from(emailOtpTable)
    .where(eq(emailOtpTable.email, normalized))
    .limit(1);

  if (existing) {
    const sinceLastMs = now - existing.lastSentAt.getTime();
    if (sinceLastMs < RESEND_COOLDOWN_MS) {
      const cooldownSeconds = Math.ceil((RESEND_COOLDOWN_MS - sinceLastMs) / 1000);
      return { ok: false, code: "cooldown", cooldownSeconds };
    }
    if (existing.attemptCount >= MAX_OTP_ATTEMPTS) {
      const blockedUntil = existing.lastSentAt.getTime() + RESEND_COOLDOWN_MS;
      if (now < blockedUntil) {
        return {
          ok: false,
          code: "rate_limited",
          cooldownSeconds: Math.ceil((blockedUntil - now) / 1000),
          message: "Too many attempts. Please wait before requesting a new code.",
        };
      }
    }
  }

  const otp = generateOtpCode();
  const salt = crypto.randomBytes(16).toString("hex");
  const otpHash = hashOtpWithPepper(otp, normalized, salt, PEPPER);
  const expiresAt = new Date(now + OTP_EXPIRY_MS);
  const lastSentAt = new Date(now);

  if (existing) {
    await db
      .update(emailOtpTable)
      .set({
        otpHash,
        otpSalt: salt,
        attemptCount: 0,
        expiresAt,
        lastSentAt,
      })
      .where(eq(emailOtpTable.email, normalized));
  } else {
    await db.insert(emailOtpTable).values({
      email: normalized,
      otpHash,
      otpSalt: salt,
      attemptCount: 0,
      expiresAt,
      lastSentAt,
    });
  }

  const subject = "Your AmyNest verification code";
  const finalHtml = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="color:#1a0d40;font-size:22px">Verify your email</h1>
      <p style="color:#444;font-size:15px;line-height:1.5">Enter this code in the AmyNest app to finish signing up:</p>
      <p style="font-size:32px;font-weight:800;letter-spacing:8px;color:#7c3aed;margin:24px 0">${otp}</p>
      <p style="color:#888;font-size:13px">This code expires in 5 minutes. If you didn't request it, you can ignore this email.</p>
    </div>
  `;
  const text = `Your AmyNest verification code is ${otp}. It expires in 5 minutes.`;

  if (!isEmailConfigured()) {
    logger.warn(
      { email: normalized, otp: process.env.NODE_ENV !== "production" ? otp : "[redacted]" },
      "RESEND_API_KEY not set — OTP email not sent (dev log only)",
    );
    if (process.env.NODE_ENV === "production") {
      return { ok: false, code: "email_send_failed", message: "Email service unavailable" };
    }
    return { ok: true, cooldownSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000) };
  }

  const sent = await sendEmail({ to: normalized, subject, html: finalHtml, text });
  if (!sent.ok) {
    return { ok: false, code: "email_send_failed", message: "Could not send verification email" };
  }

  return { ok: true, cooldownSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000) };
}

export async function verifyEmailOtp(
  email: string,
  otp: string,
  idToken: string | undefined,
): Promise<VerifyOtpResult> {
  if (!isValidEmail(email) || !/^\d{6}$/.test(otp.trim())) {
    return { ok: false, code: "invalid_input", message: "Email and 6-digit code required" };
  }

  const resolved = await resolveUidForEmail(idToken, email);
  if ("error" in resolved) {
    if (resolved.error === "user_not_found") {
      return { ok: false, code: "not_found", message: "No account found for this email" };
    }
    return { ok: false, code: "unauthorized", message: "Sign in required" };
  }

  const normalized = normalizeEmail(email);
  const [row] = await db
    .select()
    .from(emailOtpTable)
    .where(eq(emailOtpTable.email, normalized))
    .limit(1);

  if (!row) {
    return { ok: false, code: "not_found", message: "No verification code found. Request a new one." };
  }

  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(emailOtpTable).where(eq(emailOtpTable.email, normalized));
    return { ok: false, code: "expired", message: "Code expired. Request a new one." };
  }

  if (row.attemptCount >= MAX_OTP_ATTEMPTS) {
    return {
      ok: false,
      code: "too_many_attempts",
      message: "Too many incorrect attempts. Request a new code.",
    };
  }

  const valid = verifyOtpWithPepper(otp.trim(), normalized, row.otpSalt, row.otpHash, PEPPER);
  if (!valid) {
    const nextAttempts = row.attemptCount + 1;
    await db
      .update(emailOtpTable)
      .set({ attemptCount: nextAttempts })
      .where(eq(emailOtpTable.email, normalized));

    if (nextAttempts >= MAX_OTP_ATTEMPTS) {
      return {
        ok: false,
        code: "too_many_attempts",
        message: "Too many incorrect attempts. Request a new code.",
      };
    }

    return {
      ok: false,
      code: "invalid_otp",
      attemptsRemaining: MAX_OTP_ATTEMPTS - nextAttempts,
      message: "Incorrect code. Try again.",
    };
  }

  try {
    await adminAuth().updateUser(resolved.uid, { emailVerified: true });
  } catch (err) {
    logger.error({ err, uid: resolved.uid }, "verifyEmailOtp: Firebase updateUser failed");
    return {
      ok: false,
      code: "admin_unavailable",
      message: "Could not verify email. Please try again shortly.",
    };
  }

  await db.delete(emailOtpTable).where(eq(emailOtpTable.email, normalized));

  return {
    ok: true,
    user: { uid: resolved.uid, email: normalized, emailVerified: true },
  };
}
