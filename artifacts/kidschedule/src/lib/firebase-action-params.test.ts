import { describe, expect, it } from "vitest";
import {
  buildCanonicalAuthActionHref,
  parseFirebaseActionParams,
} from "./firebase-action-params";

describe("parseFirebaseActionParams", () => {
  it("reads mode and oobCode from search", () => {
    const result = parseFirebaseActionParams({
      search: "?mode=resetPassword&oobCode=abc123",
      hash: "",
      href: "https://amynest.in/?mode=resetPassword&oobCode=abc123",
    });
    expect(result.mode).toBe("resetPassword");
    expect(result.oobCode).toBe("abc123");
  });

  it("reads from hash with path prefix", () => {
    const result = parseFirebaseActionParams({
      search: "",
      hash: "#/auth/action?mode=verifyEmail&oobCode=xyz",
      href: "https://amynest.in/#/auth/action?mode=verifyEmail&oobCode=xyz",
    });
    expect(result.mode).toBe("verifyEmail");
    expect(result.oobCode).toBe("xyz");
  });

  it("reads from full href when search is empty", () => {
    const result = parseFirebaseActionParams({
      search: "",
      hash: "",
      href: "https://amynest.in/auth/action?apiKey=x&mode=resetPassword&oobCode=code99&lang=en",
    });
    expect(result.mode).toBe("resetPassword");
    expect(result.oobCode).toBe("code99");
  });

  it("strips continueUrl from canonical href", () => {
    expect(
      buildCanonicalAuthActionHref({
        search:
          "?mode=verifyEmail&oobCode=abc&continueUrl=https%3A%2F%2Famynest.in%2Fauth%2Faction",
        hash: "",
        href: "https://amynest.in/auth/action?mode=verifyEmail&oobCode=abc&continueUrl=https%3A%2F%2Famynest.in%2Fauth%2Faction",
      }),
    ).toBe("/auth/action?mode=verifyEmail&oobCode=abc");
  });
});
