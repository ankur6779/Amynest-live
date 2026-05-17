import { describe, expect, it } from "vitest";
import { normalizeFirebaseActionUrl } from "./firebase-action-url-normalize";

describe("normalizeFirebaseActionUrl", () => {
  it("restores /auth/action when Render rewrites to /index.html", () => {
    expect(
      normalizeFirebaseActionUrl({
        pathname: "/index.html",
        search: "?mode=verifyEmail&oobCode=abc",
        hash: "",
      }),
    ).toBe("/auth/action?mode=verifyEmail&oobCode=abc");
  });

  it("maps / with firebase params to /auth/action", () => {
    expect(
      normalizeFirebaseActionUrl({
        pathname: "/",
        search: "?mode=resetPassword&oobCode=xyz",
        hash: "",
      }),
    ).toBe("/auth/action?mode=resetPassword&oobCode=xyz");
  });

  it("collapses /index.html without firebase params to /", () => {
    expect(
      normalizeFirebaseActionUrl({
        pathname: "/index.html",
        search: "",
        hash: "",
      }),
    ).toBe("/");
  });

  it("returns null when no change needed", () => {
    expect(
      normalizeFirebaseActionUrl({
        pathname: "/auth/action",
        search: "?mode=verifyEmail&oobCode=abc",
        hash: "",
        href: "https://amynest.in/auth/action?mode=verifyEmail&oobCode=abc",
      }),
    ).toBeNull();
  });

  it("strips continueUrl on /auth/action", () => {
    expect(
      normalizeFirebaseActionUrl({
        pathname: "/auth/action",
        search:
          "?mode=verifyEmail&oobCode=abc&continueUrl=https%3A%2F%2Famynest.in%2Fauth%2Faction",
        hash: "",
        href: "https://amynest.in/auth/action?mode=verifyEmail&oobCode=abc&continueUrl=https%3A%2F%2Famynest.in%2Fauth%2Faction",
      }),
    ).toBe("/auth/action?mode=verifyEmail&oobCode=abc");
  });
});
