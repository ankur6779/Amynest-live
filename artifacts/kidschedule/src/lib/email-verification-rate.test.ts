import { describe, expect, it, beforeEach } from "vitest";
import {
  getVerificationRateStatus,
  MAX_VERIFICATION_SEND_ATTEMPTS,
  recordVerificationSendSuccess,
  resetVerificationRateLimit,
  UX_COOLDOWN_MS,
} from "./email-verification-rate";

describe("email-verification-rate", () => {
  const uid = "test-user-rate";

  beforeEach(() => {
    sessionStorage.clear();
    resetVerificationRateLimit(uid);
  });

  it("allows first send without block", () => {
    const status = getVerificationRateStatus(uid);
    expect(status.canSend).toBe(true);
    expect(status.attempts).toBe(0);
    expect(status.blockedUntil).toBeNull();
  });

  it("blocks only after MAX attempts", () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_VERIFICATION_SEND_ATTEMPTS; i++) {
      recordVerificationSendSuccess(uid, now + i);
    }
    const status = getVerificationRateStatus(uid, now + MAX_VERIFICATION_SEND_ATTEMPTS);
    expect(status.canSend).toBe(false);
    expect(status.blockedUntil).not.toBeNull();
  });

  it("resets block after cooldown expires", () => {
    const now = 2_000_000;
    for (let i = 0; i < MAX_VERIFICATION_SEND_ATTEMPTS; i++) {
      recordVerificationSendSuccess(uid, now);
    }
    const blocked = getVerificationRateStatus(uid, now + 1);
    expect(blocked.canSend).toBe(false);

    const after = getVerificationRateStatus(uid, now + 61_000);
    expect(after.canSend).toBe(true);
    expect(after.attempts).toBe(0);
  });

  it("exposes UX cooldown after send", () => {
    const now = 3_000_000;
    recordVerificationSendSuccess(uid, now);
    const status = getVerificationRateStatus(uid, now + 5_000);
    expect(status.uxCooldownSeconds).toBeGreaterThan(0);
    expect(status.uxCooldownSeconds).toBeLessThanOrEqual(Math.ceil(UX_COOLDOWN_MS / 1000));
  });
});
