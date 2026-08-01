import { describe, expect, it } from "vitest";
import {
  V2_ROUTE_REDIRECTS,
  V2_ROUTE_REGISTRY,
  assertRouteRegistryValid,
  getRouteEntry,
  resolveRegisteredRoute,
  validateRouteRegistry,
} from "./index";

describe("Route Registry (S0-T02)", () => {
  it("loads and validates without issues", () => {
    expect(V2_ROUTE_REGISTRY.length).toBeGreaterThan(20);
    expect(validateRouteRegistry()).toEqual([]);
    expect(() => assertRouteRegistryValid()).not.toThrow();
  });

  it("assigns an owner to every MVP route entry", () => {
    for (const entry of V2_ROUTE_REGISTRY) {
      expect(entry.owner, entry.path).toBeTruthy();
    }
  });

  it("includes dashboard → Today and hub → For [Child] redirects", () => {
    expect(
      V2_ROUTE_REDIRECTS.find((r) => r.from === "/dashboard")?.to,
    ).toBe("/today");
    expect(
      V2_ROUTE_REDIRECTS.find((r) => r.from === "/parenting-hub")?.to,
    ).toBe("/for-child");
  });

  it("resolves legacy homes through the redirect map", () => {
    expect(resolveRegisteredRoute("/dashboard")).toMatchObject({
      canonical: "/today",
      redirected: true,
      owner: "today",
    });
    expect(resolveRegisteredRoute("/parenting-hub")).toMatchObject({
      canonical: "/for-child",
      redirected: true,
    });
    expect(resolveRegisteredRoute("/assistant")).toMatchObject({
      canonical: "/ask-amy",
      redirected: true,
    });
  });

  it("keeps speech canonical routes owned and non-redirected", () => {
    const speech = getRouteEntry("/speech-coach");
    expect(speech?.owner).toBe("feature");
    expect(speech?.featureId).toBe("speech_coach");
    expect(speech?.lifecycle).toBe("canonical");
    expect(resolveRegisteredRoute("/talking-amy").redirected).toBe(false);
  });

  it("falls unknown paths back to Today", () => {
    expect(resolveRegisteredRoute("/this-route-does-not-exist")).toMatchObject({
      canonical: "/today",
      redirected: true,
    });
  });
});
