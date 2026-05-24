import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { failedModuleUrl } from "./chunk-url.js";

describe("failedModuleUrl", () => {
  it("extracts chunk URL from dynamic import errors", () => {
    const err = new TypeError(
      "Failed to fetch dynamically imported module: https://www.amynest.in/assets/dashboard-Ct3TCpJH.js",
    );
    assert.equal(
      failedModuleUrl(err),
      "https://www.amynest.in/assets/dashboard-Ct3TCpJH.js",
    );
  });
});
