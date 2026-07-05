import { describe, expect, it, vi } from "vitest";
import {
  amyAnimationClockSubscriberCount,
  subscribeAmyAnimationClock,
} from "./amy-animation-clock";

describe("amy-animation-clock", () => {
  it("shares one clock across subscribers", () => {
    const fn = vi.fn();
    const unsub = subscribeAmyAnimationClock(fn);
    expect(amyAnimationClockSubscriberCount()).toBe(1);
    unsub();
    expect(amyAnimationClockSubscriberCount()).toBe(0);
  });
});
