import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_RECOVERY_ATTEMPTS,
  canAttemptAutoRecovery,
  getGlobalRecoveryAttemptCount,
  hasExceededRecoveryLimit,
  recordGlobalRecoveryAttempt,
  resetGlobalRecoveryCounters,
} from "@/lib/recovery-limit";

describe("recovery-limit", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
    resetGlobalRecoveryCounters();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("allows up to MAX_RECOVERY_ATTEMPTS automatic actions", () => {
    expect(MAX_RECOVERY_ATTEMPTS).toBe(3);
    expect(canAttemptAutoRecovery()).toBe(true);
    recordGlobalRecoveryAttempt();
    recordGlobalRecoveryAttempt();
    expect(getGlobalRecoveryAttemptCount()).toBe(2);
    expect(canAttemptAutoRecovery()).toBe(true);
    recordGlobalRecoveryAttempt();
    expect(hasExceededRecoveryLimit()).toBe(true);
    expect(canAttemptAutoRecovery()).toBe(false);
  });

  it("resets after manual user retry", () => {
    recordGlobalRecoveryAttempt();
    recordGlobalRecoveryAttempt();
    recordGlobalRecoveryAttempt();
    expect(hasExceededRecoveryLimit()).toBe(true);
    resetGlobalRecoveryCounters();
    expect(canAttemptAutoRecovery()).toBe(true);
  });
});
