import { describe, expect, it } from "vitest";
import { formatAuthErrorForUi, parseFirebaseAuthError, prettyAuthError } from "./firebase-auth-error";

describe("firebase-auth-error", () => {
  it("parses Firebase error shape", () => {
    const parsed = parseFirebaseAuthError({
      code: "auth/unauthorized-continue-uri",
      message: "Firebase: Domain not allowlisted by project",
    });
    expect(parsed.code).toBe("auth/unauthorized-continue-uri");
    expect(parsed.userMessage).toContain("not allowed");
  });

  it("includes code in UI format for Firebase errors", () => {
    const ui = formatAuthErrorForUi({
      code: "auth/too-many-requests",
      message: "Firebase: Error",
    });
    expect(ui).toContain("auth/too-many-requests");
  });

  it("maps missing email", () => {
    expect(prettyAuthError({ code: "auth/missing-email" })).toContain("No email");
  });
});
