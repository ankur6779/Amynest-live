import crypto from "node:crypto";

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MS = 5 * 60 * 1000;
export const MAX_OTP_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 45 * 1000;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const n = normalizeEmail(email);
  return n.length >= 5 && n.includes("@") && n.includes(".");
}

export function generateOtpCode(): string {
  return String(crypto.randomInt(100_000, 1_000_000));
}

export function hashOtpWithPepper(
  otp: string,
  email: string,
  salt: string,
  pepper: string,
): string {
  return crypto
    .createHmac("sha256", pepper)
    .update(`${salt}:${normalizeEmail(email)}:${otp}`)
    .digest("hex");
}

export function verifyOtpWithPepper(
  otp: string,
  email: string,
  salt: string,
  expected: string,
  pepper: string,
): boolean {
  const actual = hashOtpWithPepper(otp, email, salt, pepper);
  try {
    return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
