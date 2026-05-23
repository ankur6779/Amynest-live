import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateOtaCheck,
  isPatchOnlyOtaBump,
  parseSemver,
} from "./otaService.js";

describe("otaService semver", () => {
  it("parseSemver accepts X.Y.Z", () => {
    assert.deepEqual(parseSemver("1.0.4"), [1, 0, 4]);
  });

  it("isPatchOnlyOtaBump allows patch increment only", () => {
    assert.equal(isPatchOnlyOtaBump("1.0.4", "1.0.5"), true);
    assert.equal(isPatchOnlyOtaBump("1.0.4", "1.1.0"), false);
    assert.equal(isPatchOnlyOtaBump("1.0.4", "2.0.0"), false);
  });
});

describe("evaluateOtaCheck", () => {
  it("returns none when OTA_ENABLED=false", () => {
    const prev = process.env.OTA_ENABLED;
    process.env.OTA_ENABLED = "false";
    const result = evaluateOtaCheck(
      { platform: "ios", version_build: "99", version_name: "1.0.0" },
      { builtinBundleVersion: "1.0.0" },
    );
    assert.equal(result.kind, "none");
    if (prev === undefined) delete process.env.OTA_ENABLED;
    else process.env.OTA_ENABLED = prev;
  });
});
