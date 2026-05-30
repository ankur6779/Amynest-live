import { describe, expect, it, beforeEach } from "vitest";
import {
  isPhonicsCircuitOpen,
  recordPhonicsCircuitOutcome,
  resetPhonicsCircuitBreakerForTests,
  shouldPhonicsPrefetch,
  shouldPhonicsUseCache,
} from "@/lib/phonics-circuit-breaker";

describe("phonics circuit breaker", () => {
  beforeEach(() => {
    resetPhonicsCircuitBreakerForTests();
  });

  it("opens after three consecutive real failures", () => {
    expect(shouldPhonicsPrefetch()).toBe(true);
    recordPhonicsCircuitOutcome(false, "phonics_play_failed");
    recordPhonicsCircuitOutcome(false, "phonics_play_failed");
    expect(isPhonicsCircuitOpen()).toBe(false);
    recordPhonicsCircuitOutcome(false, "phonics_play_failed");
    expect(isPhonicsCircuitOpen()).toBe(true);
    expect(shouldPhonicsPrefetch()).toBe(false);
    expect(shouldPhonicsUseCache()).toBe(false);
  });

  it("ignores cancel/supersede for circuit counting", () => {
    recordPhonicsCircuitOutcome(false, "phonics_cancelled");
    recordPhonicsCircuitOutcome(false, "phonics_superseded");
    expect(isPhonicsCircuitOpen()).toBe(false);
  });

  it("resets on success", () => {
    recordPhonicsCircuitOutcome(false, "phonics_play_failed");
    recordPhonicsCircuitOutcome(false, "phonics_play_failed");
    recordPhonicsCircuitOutcome(true);
    recordPhonicsCircuitOutcome(false, "phonics_play_failed");
    expect(isPhonicsCircuitOpen()).toBe(false);
  });
});
