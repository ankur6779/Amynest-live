import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseFirebaseActionParams } from "@/lib/firebase-action-params";

describe("verify email action params", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: {
        search: "?mode=verifyEmail&oobCode=test-code-123",
        hash: "",
        href: "https://amynest.in/auth/action?mode=verifyEmail&oobCode=test-code-123",
      },
    });
  });

  it("reads mode and oobCode from search query", () => {
    const params = new URLSearchParams(window.location.search);
    expect(params.get("mode")).toBe("verifyEmail");
    expect(params.get("oobCode")).toBe("test-code-123");
  });

  it("parseFirebaseActionParams matches search on /auth/action", () => {
    const parsed = parseFirebaseActionParams(window.location);
    expect(parsed.mode).toBe("verifyEmail");
    expect(parsed.oobCode).toBe("test-code-123");
  });
});
