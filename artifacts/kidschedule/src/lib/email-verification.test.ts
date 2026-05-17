import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  CANONICAL_EMAIL_VERIFICATION_URL,
  getEmailVerificationCallbackUrl,
} from "./email-verification";

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

  it("uses canonical amynest.in URL on Render (avoids unauthorized-continue-uri)", () => {
    mockHostname("amynest-live-1.onrender.com", "https://amynest-live-1.onrender.com");
    expect(getEmailVerificationCallbackUrl()).toBe(CANONICAL_EMAIL_VERIFICATION_URL);
  });

  it("uses canonical amynest.in URL on www", () => {
    mockHostname("www.amynest.in", "https://www.amynest.in");
    expect(getEmailVerificationCallbackUrl()).toBe(CANONICAL_EMAIL_VERIFICATION_URL);
  });

  it("uses localhost /verify-email for dev", () => {
    mockHostname("localhost", "http://localhost:5173");
    expect(getEmailVerificationCallbackUrl()).toBe("http://localhost:5173/verify-email");
  });
});
