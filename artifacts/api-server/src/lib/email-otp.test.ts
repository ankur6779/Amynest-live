import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateOtpCode,
  hashOtpWithPepper,
  isValidEmail,
  normalizeEmail,
  OTP_LENGTH,
  verifyOtpWithPepper,
} from "./email-otp-core.js";

describe("email-otp-core", () => {
  it("normalizes email to lowercase trimmed", () => {
    assert.equal(normalizeEmail("  User@Example.COM  "), "user@example.com");
  });

  it("validates email shape", () => {
    assert.equal(isValidEmail("a@b.co"), true);
    assert.equal(isValidEmail("not-an-email"), false);
  });

  it("generates 6-digit numeric OTP", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateOtpCode();
      assert.match(code, /^\d{6}$/);
      assert.equal(code.length, OTP_LENGTH);
    }
  });

  it("hashes and verifies OTP with pepper", () => {
    const pepper = "test-pepper";
    const salt = "abc123";
    const email = "user@example.com";
    const otp = "123456";
    const hash = hashOtpWithPepper(otp, email, salt, pepper);
    assert.equal(hash.length, 64);
    assert.equal(verifyOtpWithPepper(otp, email, salt, hash, pepper), true);
    assert.equal(verifyOtpWithPepper("000000", email, salt, hash, pepper), false);
  });
});
