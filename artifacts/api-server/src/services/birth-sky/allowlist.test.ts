import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isBirthSkyApiAllowed, isBirthSkyPublicEnabled } from "./allowlist.js";

describe("birth-sky allowlist", () => {
  it("allows demo@amynest.in by default", () => {
    delete process.env.BIRTH_SKY_PUBLIC_ENABLED;
    delete process.env.BIRTH_SKY_ALLOWLIST;
    assert.equal(isBirthSkyApiAllowed("demo@amynest.in"), true);
    assert.equal(isBirthSkyApiAllowed("Demo@AmyNest.in"), true);
    assert.equal(isBirthSkyApiAllowed("other@example.com"), false);
    assert.equal(isBirthSkyApiAllowed(null), false);
  });

  it("allows all when BIRTH_SKY_PUBLIC_ENABLED=1", () => {
    process.env.BIRTH_SKY_PUBLIC_ENABLED = "1";
    assert.equal(isBirthSkyPublicEnabled(), true);
    assert.equal(isBirthSkyApiAllowed("anyone@example.com"), true);
    delete process.env.BIRTH_SKY_PUBLIC_ENABLED;
  });

  it("honors BIRTH_SKY_ALLOWLIST extras", () => {
    delete process.env.BIRTH_SKY_PUBLIC_ENABLED;
    process.env.BIRTH_SKY_ALLOWLIST = "qa@amynest.in, eng@amynest.in";
    assert.equal(isBirthSkyApiAllowed("qa@amynest.in"), true);
    assert.equal(isBirthSkyApiAllowed("eng@amynest.in"), true);
    assert.equal(isBirthSkyApiAllowed("nope@amynest.in"), false);
    delete process.env.BIRTH_SKY_ALLOWLIST;
  });
});
