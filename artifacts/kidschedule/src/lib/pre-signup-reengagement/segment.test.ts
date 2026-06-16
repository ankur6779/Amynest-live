import { describe, expect, it } from "vitest";
import { evaluatePreSignupSegment, shouldExitPreSignupSegment } from "./segment";

describe("pre-signup segment", () => {
  it("includes PRE_SIGNUP_USER when all conditions met", () => {
    expect(
      evaluatePreSignupSegment({
        appInstalled: true,
        isAuthenticated: false,
        signupCompleted: false,
        notificationsEnabled: true,
        notificationsGranted: true,
      }),
    ).toBe("PRE_SIGNUP_USER");
  });

  it("excludes when permission not granted", () => {
    expect(
      evaluatePreSignupSegment({
        appInstalled: true,
        isAuthenticated: false,
        signupCompleted: false,
        notificationsEnabled: true,
        notificationsGranted: false,
      }),
    ).toBeNull();
  });

  it("excludes when authenticated or signup complete", () => {
    expect(
      evaluatePreSignupSegment({
        appInstalled: true,
        isAuthenticated: true,
        signupCompleted: false,
        notificationsEnabled: true,
        notificationsGranted: true,
      }),
    ).toBeNull();

    expect(
      shouldExitPreSignupSegment({
        appInstalled: true,
        isAuthenticated: false,
        signupCompleted: true,
        notificationsEnabled: true,
        notificationsGranted: true,
      }),
    ).toBe(true);
  });

  it("excludes when notifications disabled", () => {
    expect(
      evaluatePreSignupSegment({
        appInstalled: true,
        isAuthenticated: false,
        signupCompleted: false,
        notificationsEnabled: false,
        notificationsGranted: false,
      }),
    ).toBeNull();
  });
});
