import { describe, expect, it, afterEach } from "vitest";
import {
  redirectApexToCanonicalWww,
  CANONICAL_PRODUCTION_ORIGIN,
} from "./site-domain";

describe("redirectApexToCanonicalWww", () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("redirects bare apex to www with path and query", () => {
    let replaced: string | undefined;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        hostname: "amynest.in",
        pathname: "/sign-in",
        search: "?x=1",
        hash: "#top",
        replace: (url: string) => {
          replaced = url;
        },
      },
    });

    expect(redirectApexToCanonicalWww()).toBe(true);
    expect(replaced).toBe(`${CANONICAL_PRODUCTION_ORIGIN}/sign-in?x=1#top`);
  });

  it("no-op on www", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        hostname: "www.amynest.in",
        pathname: "/dashboard",
        search: "",
        hash: "",
        replace: () => {
          throw new Error("should not redirect");
        },
      },
    });
    expect(redirectApexToCanonicalWww()).toBe(false);
  });
});
