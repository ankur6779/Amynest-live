// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { APP_ROUTE_PATTERNS, featureForRoute, matchAppRoute } from "./route-catalog";

const here = dirname(fileURLToPath(import.meta.url));

describe("route catalog", () => {
  it("lists every AppCore route exactly once", () => {
    const source = readFileSync(resolve(here, "../../AppCore.tsx"), "utf8");
    const declared = [...source.matchAll(/<Route path="([^"]+)"/g)].map((match) => match[1]);
    const unique = [...new Set(declared)];
    expect(unique.length).toBeGreaterThan(100);
    expect([...APP_ROUTE_PATTERNS].sort()).toEqual([...unique].sort());
  });

  it("matches static routes ahead of params", () => {
    expect(matchAppRoute("/children/new")).toBe("/children/new");
    expect(matchAppRoute("/children/42")).toBe("/children/:id");
    expect(matchAppRoute("/phonics/test/play")).toBe("/phonics/test/play");
    expect(featureForRoute("/dashboard")).toBe("today");
    expect(featureForRoute("/speech-coach-v2/session")).toBe("speech_session");
    expect(featureForRoute("/privacy")).toBeNull();
    expect(featureForRoute("/birth-sky/reveal")).toBe("birth_sky");
  });
});
