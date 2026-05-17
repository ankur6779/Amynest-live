import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getEmailVerificationCallbackUrl } from "./email-verification";

describe("getEmailVerificationCallbackUrl", () => {
  const originalLocation = window.location;

  function mockHostname(hostname: string, origin?: string) {
    const o = origin ?? `https://${hostname}`;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { hostname, origin },
    });
  }

  beforeEach(() => {
    delete (import.meta.env as { VITE_EMAIL_VERIFICATION_CALLBACK_URL?: string })
      .VITE_EMAIL_VERIFICATION_CALLBACK_URL;
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("uses amynest.in on Render production host", () => {
    mockHostname("amynest-live-1.onrender.com", "https://amynest-live-1.onrender.com");
    expect(getEmailVerificationCallbackUrl()).toBe("https://amynest.in/auth/callback");
  });

  it("uses current origin on amynest.in", () => {
    mockHostname("amynest.in", "https://amynest.in");
    expect(getEmailVerificationCallbackUrl()).toBe("https://amynest.in/auth/callback");
  });

  it("uses current origin on localhost", () => {
    mockHostname("localhost", "http://localhost:5173");
    expect(getEmailVerificationCallbackUrl()).toBe("http://localhost:5173/auth/callback");
  });
});
