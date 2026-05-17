import { describe, expect, it } from "vitest";
import {
  CANONICAL_PRODUCTION_HOST,
  CANONICAL_PRODUCTION_ORIGIN,
  getCanonicalWebOrigin,
  shouldRedirectWwwToApex,
} from "./site-domain";

describe("site-domain", () => {
  it("flags www for apex redirect", () => {
    expect(shouldRedirectWwwToApex("www.amynest.in")).toBe(true);
    expect(shouldRedirectWwwToApex("amynest.in")).toBe(false);
    expect(shouldRedirectWwwToApex("localhost")).toBe(false);
  });

  it("returns apex origin for production hosts", () => {
    expect(getCanonicalWebOrigin()).toBe(CANONICAL_PRODUCTION_ORIGIN);
  });

  it("uses consistent canonical host constant", () => {
    expect(CANONICAL_PRODUCTION_HOST).toBe("amynest.in");
    expect(CANONICAL_PRODUCTION_ORIGIN).toBe("https://amynest.in");
  });
});
