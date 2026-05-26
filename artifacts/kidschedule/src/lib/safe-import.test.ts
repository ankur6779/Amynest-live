import { describe, it, expect } from "vitest";
import { failedModuleUrl } from "./chunk-url.js";

describe("failedModuleUrl", () => {
  it("extracts chunk URL from dynamic import errors", () => {
    const err = new TypeError(
      "Failed to fetch dynamically imported module: https://www.amynest.in/assets/dashboard-Ct3TCpJH.js",
    );
    expect(failedModuleUrl(err)).toBe(
      "https://www.amynest.in/assets/dashboard-Ct3TCpJH.js",
    );
  });
});
