import { describe, expect, it } from "vitest";
import { compareVersions, isVersionLessThan } from "./version-comparator";

describe("version comparator", () => {
  it("compares semantic versions numerically", () => {
    expect(compareVersions("1.0.0", "1.0")).toBe(0);
    expect(isVersionLessThan("1.9.9", "1.10.0")).toBe(true);
    expect(compareVersions("1.10.0", "1.9.9")).toBe(1);
    expect(compareVersions("2.0.0", "1.99.0")).toBe(1);
    expect(compareVersions("2.0.0", "1.99.99")).toBe(1);
    expect(compareVersions("10.0.0", "2.99.99")).toBe(1);
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
  });

  it("handles missing patch segments and build metadata", () => {
    expect(compareVersions("1.2+45", "1.2.0")).toBe(0);
    expect(compareVersions("1", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.1", "1")).toBe(1);
  });

  it("orders prerelease versions before stable releases", () => {
    expect(compareVersions("1.2.0-beta.1", "1.2.0")).toBe(-1);
    expect(compareVersions("1.2.0-beta.2", "1.2.0-beta.10")).toBe(-1);
  });

  it("rejects malformed and ambiguous versions", () => {
    const invalidVersions = [
      "",
      "   ",
      "1..2",
      "1.2.3.4",
      "01.2.3",
      "1.02.3",
      "1.2.03",
      "1.2.3-",
      "1.2.3+",
      null,
      undefined,
    ] as unknown[];

    for (const version of invalidVersions) {
      expect(() => compareVersions(version as string, "1.0.0")).toThrow();
    }
  });
});
