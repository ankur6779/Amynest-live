import { beforeEach, describe, expect, it } from "vitest";
import {
  clearActivationResume,
  readActivationResume,
  saveActivationResume,
} from "./activation-resume";

describe("activation-resume", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists and reads in-progress routine for today", () => {
    const today = new Date("2026-07-03T10:00:00");
    saveActivationResume({
      routineId: 42,
      href: "/routines/42",
      childName: "Ava",
      title: "Morning plan",
      done: 2,
      total: 5,
      dateKey: "2026-07-03",
    });
    const state = readActivationResume(today);
    expect(state?.routineId).toBe(42);
    expect(state?.done).toBe(2);
  });

  it("clears when routine is complete", () => {
    saveActivationResume({
      routineId: 7,
      href: "/routines/7",
      done: 3,
      total: 3,
      dateKey: "2026-07-03",
    });
    expect(readActivationResume()).toBeNull();
  });

  it("ignores stale dates", () => {
    saveActivationResume({
      routineId: 1,
      href: "/routines/1",
      done: 1,
      total: 4,
      dateKey: "2026-07-01",
    });
    expect(readActivationResume(new Date("2026-07-03"))).toBeNull();
  });

  it("clearActivationResume removes state", () => {
    saveActivationResume({
      routineId: 9,
      href: "/routines/9",
      done: 1,
      total: 3,
      dateKey: "2026-07-03",
    });
    clearActivationResume(9);
    expect(readActivationResume()).toBeNull();
  });
});
