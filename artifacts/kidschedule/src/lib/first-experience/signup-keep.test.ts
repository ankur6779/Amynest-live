import { describe, expect, it, beforeEach } from "vitest";
import {
  buildSignupKeepCopy,
  buildSignInKeepCopy,
  buildKeepKeepsake,
  buildVerifyKeepCopy,
  buildForgotKeepCopy,
  calmKeepAuthError,
  isFromFirstExperience,
} from "./signup-keep";
import {
  clearFirstExperienceContinuity,
  saveFirstExperienceContinuity,
  buildContinuityFromState,
} from "./continuity";
import type { FirstExperienceState } from "./types";
import { violatesAmyNestVoice } from "@/lib/amynest-philosophy";

function seedAriaContinuity(overrides?: Partial<FirstExperienceState>) {
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
    ...overrides,
  };
  saveFirstExperienceContinuity(buildContinuityFromState(state)!);
}

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
    seedAriaContinuity();
    const copy = buildSignupKeepCopy({ fromFirstExperience: true });
    expect(copy.keepMode).toBe(true);
    expect(copy.title).toMatch(/Aria/);
    expect(copy.signInHref).toContain("from=first-experience");
    expect(copy.invitation).toMatch(/protect/i);
    expect(copy.emailPathLabel).toMatch(/email/i);
    expect(violatesAmyNestVoice(`${copy.title} ${copy.subtitle} ${copy.cta}`)).toBe(
      false,
    );
  });

  it("shows keepsake with child, next thing, completion, safety", () => {
    seedAriaContinuity();
    const keepsake = buildKeepKeepsake();
    expect(keepsake).not.toBeNull();
    expect(keepsake!.childName).toBe("Aria");
    expect(keepsake!.nextThingTitle).toMatch(/focus/i);
    expect(keepsake!.completionLine).toMatch(/completed/i);
    expect(keepsake!.safetyLine).toMatch(/safe|protect/i);
  });

  it("sign-in keep copy continues the story", () => {
    seedAriaContinuity();
    const copy = buildSignInKeepCopy({ fromFirstExperience: true });
    expect(copy.keepMode).toBe(true);
    expect(copy.title).toMatch(/Continue/);
    expect(copy.signUpHref).toContain("from=first-experience");
  });

  it("verify email continues preservation story", () => {
    seedAriaContinuity();
    const copy = buildVerifyKeepCopy();
    expect(copy.keepMode).toBe(true);
    expect(copy.title).toMatch(/safely held/i);
    expect(copy.subtitle).toMatch(/Aria/);
    expect(violatesAmyNestVoice(`${copy.title} ${copy.subtitle}`)).toBe(false);
  });

  it("forgot password is find-your-way-back, not support portal", () => {
    seedAriaContinuity();
    const copy = buildForgotKeepCopy();
    expect(copy.keepMode).toBe(true);
    expect(copy.title).toMatch(/way back/i);
    expect(copy.sendCta).toMatch(/way back/i);
    expect(copy.title.toLowerCase()).not.toMatch(/reset password|support|help desk/);
  });

  it("calms technical auth errors without inventing success", () => {
    expect(calmKeepAuthError("Firebase: Error (auth/email-already-in-use).")).toMatch(
      /already protects/i,
    );
    expect(calmKeepAuthError("auth/wrong-password")).toMatch(/gentle try|way back/i);
    expect(calmKeepAuthError("auth/too-many-requests")).toMatch(/pause|moment/i);
    expect(calmKeepAuthError("Network request failed")).toMatch(/connection|device/i);
  });
});
