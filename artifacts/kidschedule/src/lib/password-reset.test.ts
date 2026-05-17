import { describe, expect, it, afterEach } from "vitest";
import { CANONICAL_FIREBASE_ACTION_URL } from "./firebase-action-url";
import {
  getPasswordResetContinueUrl,
  parsePasswordResetActionParams,
} from "./password-reset";

describe("password-reset", () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("uses canonical production URL on Render", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        hostname: "amynest-live-1.onrender.com",
        origin: "https://amynest-live-1.onrender.com",
        search: "",
        hash: "",
      },
    });
    expect(getPasswordResetContinueUrl()).toBe(CANONICAL_FIREBASE_ACTION_URL);
  });

  it("parses mode and oobCode from query string", () => {
    const params = parsePasswordResetActionParams({
      search: "?mode=resetPassword&oobCode=abc123",
      hash: "",
    } as Location);
    expect(params.mode).toBe("resetPassword");
    expect(params.oobCode).toBe("abc123");
  });

  it("parses mode and oobCode from hash", () => {
    const params = parsePasswordResetActionParams({
      search: "",
      hash: "#mode=resetPassword&oobCode=hash456",
    } as Location);
    expect(params.mode).toBe("resetPassword");
    expect(params.oobCode).toBe("hash456");
  });
});
