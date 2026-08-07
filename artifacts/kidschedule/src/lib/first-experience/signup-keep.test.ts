import { describe, expect, it, beforeEach } from "vitest";
import {
  buildSignupKeepCopy,
  buildSignInKeepCopy,
  isFromFirstExperience,
} from "./signup-keep";
import {
  clearFirstExperienceContinuity,
  saveFirstExperienceContinuity,
  buildContinuityFromState,
} from "./continuity";
import type { FirstExperienceState } from "./types";
import { violatesAmyNestVoice } from "@/lib/amynest-philosophy";

describe("signup keep (R6)", () => {
  beforeEach(() => {
    clearFirstExperienceContinuity();
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });

  it("detects from=first-experience", () => {
    expect(isFromFirstExperience("?from=first-experience")).toBe(true);
    expect(isFromFirstExperience("")).toBe(false);
  });

  it("builds keep copy from continuity without pressure language", () => {
    const state: FirstExperienceState = {
      version: 1,
      step: "keep",
      childName: "Aria",
      ageBand: "5-7",
      todayContext: "home",
      nextThing: {
        id: "focus-block",
        title: "Give Aria one small focus win",
        detail: "Pick one short task.",
        minutes: 10,
        basedOn: ["It’s Thursday."],
      },
      completedAt: "2026-08-07T10:00:00.000Z",
      valueEarned: true,
      completionKind: "done",
      startedAt: "2026-08-07T09:00:00.000Z",
    };
    saveFirstExperienceContinuity(buildContinuityFromState(state)!);
    const copy = buildSignupKeepCopy({ fromFirstExperience: true });
    expect(copy.keepMode).toBe(true);
    expect(copy.title).toMatch(/Aria/);
    expect(copy.signInHref).toContain("from=first-experience");
    expect(violatesAmyNestVoice(`${copy.title} ${copy.subtitle} ${copy.cta}`)).toBe(
      false,
    );
  });

  it("sign-in keep copy continues the story", () => {
    const copy = buildSignInKeepCopy({ fromFirstExperience: true });
    expect(copy.keepMode).toBe(true);
    expect(copy.title).toMatch(/Continue/);
    expect(copy.signUpHref).toContain("from=first-experience");
  });
});
