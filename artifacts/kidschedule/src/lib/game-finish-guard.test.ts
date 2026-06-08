import { describe, expect, it } from "vitest";

/**
 * Mirrors the finishGame lock in games.tsx — prevents duplicate server play
 * records when an unstable onFinish callback re-fires after refreshWallet().
 */
function createFinishGameLock() {
  let locked = false;
  return {
    tryBegin: () => {
      if (locked) return false;
      locked = true;
      return true;
    },
    reset: () => {
      locked = false;
    },
  };
}

describe("game finish lock", () => {
  it("allows the first finish and blocks a duplicate while the session is active", () => {
    const lock = createFinishGameLock();
    expect(lock.tryBegin()).toBe(true);
    expect(lock.tryBegin()).toBe(false);
  });

  it("allows a new finish after the play session resets", () => {
    const lock = createFinishGameLock();
    expect(lock.tryBegin()).toBe(true);
    lock.reset();
    expect(lock.tryBegin()).toBe(true);
  });
});
