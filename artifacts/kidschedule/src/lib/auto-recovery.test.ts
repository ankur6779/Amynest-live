import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetAutoRecoveryCounters,
  resetAutoRecoveryStateForTests,
  shouldAttemptAutoRecovery,
  tryAutoRecovery,
} from "./auto-recovery";
import { resetGlobalRecoveryCounters } from "./recovery-limit";

describe("auto-recovery", () => {
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
    resetAutoRecoveryCounters();
    resetGlobalRecoveryCounters();
    resetAutoRecoveryStateForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips benign network errors", () => {
    expect(shouldAttemptAutoRecovery(new Error("Failed to fetch"))).toBe(false);
  });

  it("attempts recovery for real crashes", () => {
    expect(shouldAttemptAutoRecovery(new Error("Cannot read property 'x' of undefined"))).toBe(
      true,
    );
  });

  it("rate-limits repeated recoveries", () => {
    vi.stubGlobal("location", {
      href: "https://www.amynest.in/",
      origin: "https://www.amynest.in",
    });

    expect(tryAutoRecovery("test")).toBe(true);
    resetAutoRecoveryStateForTests();
    expect(tryAutoRecovery("test")).toBe(true);
    resetAutoRecoveryStateForTests();
    expect(tryAutoRecovery("test")).toBe(false);
  });
});
