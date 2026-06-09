import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  resetTtsCrossTabCoordForTests,
  ttsCrossTabLockKey,
  withCrossTabTtsLock,
} from "./tts-cross-tab-coord";

describe("tts-cross-tab-coord", () => {
  beforeEach(() => {
    resetTtsCrossTabCoordForTests();
  });

  afterEach(() => {
    resetTtsCrossTabCoordForTests();
  });

  it("builds stable lock keys from body fields", () => {
    expect(ttsCrossTabLockKey({ text: "hello", mode: "default" })).toContain("hello");
    expect(ttsCrossTabLockKey({ text: "hello", mode: "phonics" })).not.toEqual(
      ttsCrossTabLockKey({ text: "hello", mode: "default" }),
    );
  });

  it("runs fn under lock", async () => {
    const fn = vi.fn(async () => "ok");
    await expect(withCrossTabTtsLock("test-key", fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledOnce();
  });
});
