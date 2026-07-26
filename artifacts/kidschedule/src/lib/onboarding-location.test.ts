import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reverseGeocodeCountry } from "@/lib/onboarding-location";

describe("onboarding location timeouts", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }
          signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("aborts reverse geocode within the failsafe budget instead of hanging forever", async () => {
    vi.useFakeTimers();
    const pending = reverseGeocodeCountry(12.97, 77.59, 3_000);
    const expectation = expect(pending).resolves.toBeNull();
    await vi.advanceTimersByTimeAsync(3_000);
    await expectation;
  });
});
