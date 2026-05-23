import { describe, expect, it } from "vitest";
import {
  normalizeRoutePath,
  resolveRouteChunkLoader,
} from "@/lib/route-chunk-preload";

describe("route-chunk-preload", () => {
  it("normalizes trailing slashes and query strings", () => {
    expect(normalizeRoutePath("/dashboard/")).toBe("/dashboard");
    expect(normalizeRoutePath("/routines?tab=today")).toBe("/routines");
  });

  it("resolves exact and prefix routes", () => {
    expect(resolveRouteChunkLoader("/dashboard")).toBeTypeOf("function");
    expect(resolveRouteChunkLoader("/parenting-hub")).toBeTypeOf("function");
    expect(resolveRouteChunkLoader("/routines/generate")).toBeTypeOf("function");
    expect(resolveRouteChunkLoader("/unknown-page")).toBeNull();
  });
});
