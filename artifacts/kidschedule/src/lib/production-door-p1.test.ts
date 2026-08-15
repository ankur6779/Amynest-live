import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function src(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, rel), "utf8");
}

describe("P1-WELCOME production door containment", () => {
  it("first-experience no longer routes into /welcome", () => {
    const text = src("../pages/first-experience.tsx");
    expect(text).not.toMatch(/["']\/welcome["']/);
    expect(text).toMatch(/\/sign-in\?from=first-experience/);
  });

  it("Keep-mode auth fatigue exits return to /begin", () => {
    expect(src("../pages/sign-in.tsx")).toMatch(/href="\/begin"/);
    expect(src("../pages/sign-up.tsx")).toMatch(/href="\/begin"/);
    expect(src("../pages/sign-in.tsx")).not.toMatch(/href="\/welcome"/);
    expect(src("../pages/sign-up.tsx")).not.toMatch(/href="\/welcome"/);
  });

  it("marketing /welcome contains a /begin product-door link", () => {
    const landing = src("../pages/landing.tsx");
    expect(landing).toMatch(/href="\/begin"/);
    expect(landing).toMatch(/welcome-enter-begin/);
  });
});
