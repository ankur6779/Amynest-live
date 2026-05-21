import { describe, expect, it } from "vitest";
import {
  EMAIL_VERIFICATION_BYPASS_EMAILS,
  isEmailVerificationBypassEmail,
} from "./email-verification-bypass";

describe("email-verification-bypass", () => {
  it("includes Apple review account (case-insensitive)", () => {
    expect(EMAIL_VERIFICATION_BYPASS_EMAILS.has("amynestreview@amynest.in")).toBe(true);
    expect(isEmailVerificationBypassEmail("Amynestreview@amynest.in")).toBe(true);
    expect(isEmailVerificationBypassEmail("  amynestreview@amynest.in  ")).toBe(true);
  });

  it("matches any *review* inbox on amynest.in", () => {
    expect(isEmailVerificationBypassEmail("apple.review@amynest.in")).toBe(true);
    expect(isEmailVerificationBypassEmail("store.review.test@amynest.in")).toBe(true);
  });

  it("rejects normal users", () => {
    expect(isEmailVerificationBypassEmail("user@gmail.com")).toBe(false);
    expect(isEmailVerificationBypassEmail(null)).toBe(false);
  });
});
